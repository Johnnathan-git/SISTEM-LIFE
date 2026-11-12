// Sincronização do quadro com a nuvem (Supabase, tabela "boards", linha "main").
//
// Como funciona:
// - Cada navegador guarda a "base": o último estado da nuvem que ele viu e o
//   carimbo updated_at dessa versão. A base fica também no armazenamento local,
//   para uma edição não enviada sobreviver a fechar a aba ou cair a internet.
// - Salvar é condicional: só grava se a nuvem ainda está na versão da base
//   (updated_at igual). Se outra pessoa salvou antes, a gravação não acontece;
//   o app lê a versão nova, mescla as duas edições e tenta de novo. Ninguém
//   apaga a edição do outro, e nada depende do relógio de cada computador.
// - Mudanças dos outros chegam pelo canal ao vivo do Supabase e, como reserva,
//   por uma consulta leve a cada 5s (só o carimbo; o quadro só é baixado
//   quando mudou), ao voltar para a aba e quando a internet volta.
// - Falhas de rede não param nada: o salvamento tenta de novo sozinho, com
//   espera crescente até 30s, para sempre, até conseguir.

import type { SupabaseClient } from "@supabase/supabase-js";
import { stableStringify } from "./board-merge";

export type CloudStatus = "connecting" | "on" | "saving" | "error";
export type CloudBase<T> = { data: T; at: string };

export type BoardSyncOptions<T> = {
  client: SupabaseClient;
  table: string;
  rowId: string;
  initial: T;
  storedBase: CloudBase<T> | null;
  validate: (value: unknown) => value is T;
  merge: (base: T | null, local: T, remote: T) => T;
  onRemote: (data: T) => void;
  onBase: (base: CloudBase<T>) => void;
  onStatus: (status: CloudStatus) => void;
  onRealtime: (ok: boolean | null) => void;
  onReady?: () => void;
  // Sem base guardada (primeira vez nesta versão) e o quadro local difere da
  // nuvem: a nuvem vale, e o quadro local é entregue aqui para backup.
  onDiscardLocal?: (local: T) => void;
  pollMs?: number;
};

type Row = { data?: unknown; updated_at?: string | null };

export class BoardSync<T> {
  private readonly o: BoardSyncOptions<T>;
  private readonly sessionId = newSessionId();
  private local: T;
  private localJson: string;
  private base: T | null = null;
  private baseJson = "";
  private baseAt: string | null = null; // null = linha ainda não existe
  private rowExists = false;
  private ready = false;
  private stopped = false;
  private chain: Promise<void> = Promise.resolve();
  private pullQueued = false;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private retryDelay = 2000;
  private channel: ReturnType<SupabaseClient["channel"]> | null = null;
  private status: CloudStatus = "connecting";

  constructor(options: BoardSyncOptions<T>) {
    this.o = options;
    this.local = options.initial;
    this.localJson = stableStringify(options.initial);
  }

  start() {
    this.setStatus("connecting");
    this.o.onRealtime(null);
    this.channel = this.o.client
      .channel(`boards-sync-${this.sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: this.o.table, filter: `id=eq.${this.o.rowId}` },
        // Não confia no conteúdo do evento (o Supabase corta linhas grandes):
        // o evento só avisa que mudou, e o quadro é lido de novo.
        () => this.requestPull(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.o.onRealtime(true);
          this.requestPull(); // pega o que mudou enquanto conectava
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (!this.stopped) this.o.onRealtime(false);
        }
      });
    this.requestPull();
    this.pollTimer = setInterval(() => this.requestPull(), this.o.pollMs ?? 5000);
    if (typeof window !== "undefined") {
      window.addEventListener("focus", this.onWake);
      window.addEventListener("online", this.onOnline);
      document.addEventListener("visibilitychange", this.onWake);
    }
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.saveTimer);
    clearInterval(this.pollTimer);
    if (this.channel) void this.o.client.removeChannel(this.channel);
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", this.onWake);
      window.removeEventListener("online", this.onOnline);
      document.removeEventListener("visibilitychange", this.onWake);
    }
  }

  // A tela chama isto a cada mudança do quadro (edição ou dado vindo da nuvem).
  localChange(data: T) {
    const json = stableStringify(data);
    if (json === this.localJson) return;
    this.local = data;
    this.localJson = json;
    if (this.ready && this.dirty()) this.scheduleSave(800);
  }

  // Envia agora o que estiver pendente (ex.: antes de fechar a aba).
  flush() {
    if (this.ready && this.dirty()) this.scheduleSave(0);
  }

  private onWake = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    this.requestPull();
  };

  private onOnline = () => {
    this.retryDelay = 2000;
    this.requestPull();
    this.flush();
  };

  private dirty() {
    return this.localJson !== this.baseJson;
  }

  private setStatus(s: CloudStatus) {
    if (s === this.status && s !== "connecting") return;
    this.status = s;
    this.o.onStatus(s);
  }

  private enqueue(fn: () => Promise<void>) {
    this.chain = this.chain.then(() => (this.stopped ? undefined : fn())).catch((err) => {
      console.warn("Sincronização do quadro:", err);
    });
  }

  private requestPull() {
    if (this.pullQueued || this.stopped) return;
    this.pullQueued = true;
    this.enqueue(async () => {
      this.pullQueued = false;
      await this.pull();
    });
  }

  private scheduleSave(delay: number) {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.enqueue(() => this.save()), delay);
  }

  private setBase(data: T, json: string, at: string) {
    this.base = data;
    this.baseJson = json;
    this.baseAt = at;
    this.rowExists = true;
    this.o.onBase({ data, at });
  }

  private applyRemote(data: T, json: string) {
    this.local = data;
    this.localJson = json;
    this.o.onRemote(data);
  }

  private async pull(): Promise<void> {
    const { client, table, rowId } = this.o;

    // Consulta leve: só o carimbo. Se não mudou, não baixa o quadro.
    if (this.ready && this.rowExists) {
      const head = await client.from(table).select("updated_at").eq("id", rowId).maybeSingle();
      if (head.error) {
        this.setStatus("error");
        return;
      }
      const at = (head.data as Row | null)?.updated_at ?? "";
      if (head.data && at === this.baseAt) {
        if (this.status === "error" || this.status === "connecting") this.setStatus(this.dirty() ? "saving" : "on");
        return;
      }
    }

    const res = await client.from(table).select("data, updated_at").eq("id", rowId).maybeSingle();
    if (res.error) {
      this.setStatus("error");
      return;
    }
    const row = res.data as Row | null;

    if (!row) {
      // Nuvem vazia: este navegador cria a linha com o quadro dele.
      this.rowExists = false;
      this.baseAt = null;
      this.base = null;
      this.baseJson = "";
      this.markReady();
      this.scheduleSave(0);
      return;
    }

    if (!this.o.validate(row.data)) {
      console.warn("Sincronização do quadro: dado inválido na nuvem — ignorado.");
      this.setStatus("error");
      return;
    }
    const remote = row.data;
    const remoteJson = stableStringify(remote);
    const at = row.updated_at ?? "";

    // Na abertura, a base é a que ficou guardada neste navegador.
    const known: CloudBase<T> | null = this.ready
      ? this.base !== null && this.baseAt !== null
        ? { data: this.base, at: this.baseAt }
        : null
      : this.o.storedBase;
    const knownJson = known ? stableStringify(known.data) : "";

    if (!known) {
      // Sem histórico: a nuvem vale (o quadro local vai para backup).
      if (this.localJson !== remoteJson) {
        this.o.onDiscardLocal?.(this.local);
        this.applyRemote(remote, remoteJson);
      }
      this.setBase(remote, remoteJson, at);
    } else if (known.at === at && knownJson === remoteJson) {
      // Nuvem não mudou desde a base: edições locais pendentes seguem para envio.
      this.setBase(remote, remoteJson, at);
    } else {
      const locallyEdited = this.localJson !== knownJson;
      if (!locallyEdited) {
        this.applyRemote(remote, remoteJson);
      } else if (this.localJson !== remoteJson) {
        const merged = this.o.merge(known.data, this.local, remote);
        this.applyRemote(merged, stableStringify(merged));
      }
      this.setBase(remote, remoteJson, at);
    }

    this.markReady();
    if (this.dirty()) {
      this.setStatus("saving");
      this.scheduleSave(300);
    } else {
      this.setStatus("on");
    }
  }

  private markReady() {
    if (this.ready) return;
    this.ready = true;
    this.o.onReady?.();
  }

  private async save(): Promise<void> {
    if (!this.ready || !this.dirty()) return;
    const { client, table, rowId } = this.o;
    this.setStatus("saving");
    const sending = this.local;
    const sendingJson = this.localJson;
    const stamp = new Date().toISOString();
    const payload = { data: sending, updated_by: this.sessionId, updated_at: stamp };

    let newAt: string | null = null;
    if (!this.rowExists) {
      const res = await client.from(table).insert({ id: rowId, ...payload }).select("updated_at").maybeSingle();
      if (res.error) {
        if (res.error.code === "23505") {
          // Outro navegador criou a linha ao mesmo tempo: lê, mescla e tenta de novo.
          await this.pull();
          return;
        }
        this.failSave(res.error.message);
        return;
      }
      newAt = (res.data as Row | null)?.updated_at ?? stamp;
    } else {
      let query = client.from(table).update(payload).eq("id", rowId);
      query = this.baseAt ? query.eq("updated_at", this.baseAt) : query.is("updated_at", null);
      const res = await query.select("updated_at");
      if (res.error) {
        this.failSave(res.error.message);
        return;
      }
      const rows = (res.data ?? []) as Row[];
      if (rows.length === 0) {
        // Alguém salvou antes: lê a versão nova, mescla e o pull agenda o reenvio.
        const before = this.baseAt;
        await this.pull();
        // A nuvem não mudou e mesmo assim nada foi gravado: o banco recusou a
        // gravação (ex.: falta permissão de UPDATE). Espera antes de insistir.
        if (this.baseAt === before) this.failSave("a nuvem recusou a gravação (verifique as permissões da tabela boards)");
        return;
      }
      newAt = rows[0]?.updated_at ?? stamp;
    }

    this.retryDelay = 2000;
    this.setBase(sending, sendingJson, newAt ?? stamp);
    if (this.dirty()) {
      this.scheduleSave(300);
    } else {
      this.setStatus("on");
    }
  }

  private failSave(message: string) {
    console.warn("Sincronização do quadro: falha ao salvar —", message);
    this.setStatus("error");
    this.scheduleSave(this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, 30000);
  }
}

function newSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
