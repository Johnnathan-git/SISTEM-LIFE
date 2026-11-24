// Cadastro de usuários do quadro (nome + foto), guardado na nuvem.
//
// A lista mora numa linha própria da tabela "boards" (id "users"), separada
// do quadro: assim o cadastro não mexe na sincronização das tarefas. As fotos
// vão para o Storage (bucket "attachments", pasta avatars/) e a lista guarda
// só o link. Mudanças chegam aos outros navegadores pelo canal ao vivo e por
// uma consulta a cada 20s.

import type { SupabaseClient } from "@supabase/supabase-js";

export type AppUser = { id: string; name: string; photoUrl?: string };

const TABLE = "boards";
const ROW_ID = "users";
const BUCKET = "attachments";

// Quem já usava o quadro antes do cadastro existir. As fotos deles continuam
// embutidas no código e valem enquanto não houver foto cadastrada.
export const DEFAULT_USERS: AppUser[] = [
  { id: "johnnathan", name: "Johnnathan" },
  { id: "emanuel", name: "Emanuel" },
];

export function isUserList(value: unknown): value is AppUser[] {
  return (
    Array.isArray(value) &&
    value.every(
      (u) =>
        u !== null &&
        typeof u === "object" &&
        typeof (u as { id?: unknown }).id === "string" &&
        typeof (u as { name?: unknown }).name === "string",
    )
  );
}

export function newUserId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function fetchUsers(client: SupabaseClient): Promise<AppUser[] | null> {
  const { data, error } = await client.from(TABLE).select("data").eq("id", ROW_ID).maybeSingle();
  if (error) return null;
  const list = (data as { data?: unknown } | null)?.data;
  return isUserList(list) ? list : DEFAULT_USERS;
}

// Lê a lista mais recente, aplica a mudança e grava só se ninguém gravou no
// meio (controle pelo carimbo updated_at). Se alguém gravou, tenta de novo
// em cima da versão nova — nenhuma alteração apaga a de outra pessoa.
export async function saveUsersChange(
  client: SupabaseClient,
  change: (current: AppUser[]) => AppUser[],
): Promise<AppUser[]> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const read = await client.from(TABLE).select("data, updated_at").eq("id", ROW_ID).maybeSingle();
    if (read.error) throw new Error(read.error.message);
    const row = read.data as { data?: unknown; updated_at?: string | null } | null;
    const current = row && isUserList(row.data) ? row.data : DEFAULT_USERS;
    const next = change(current);
    if (!row) {
      const ins = await client.from(TABLE).insert({ id: ROW_ID, data: next, updated_by: "cadastro-usuarios" });
      if (!ins.error) return next;
      if (ins.error.code === "23505") continue;
      throw new Error(ins.error.message);
    }
    let query = client.from(TABLE).update({ data: next, updated_by: "cadastro-usuarios" }).eq("id", ROW_ID);
    query = row.updated_at ? query.eq("updated_at", row.updated_at) : query.is("updated_at", null);
    const upd = await query.select("updated_at");
    if (upd.error) throw new Error(upd.error.message);
    if ((upd.data ?? []).length > 0) return next;
  }
  throw new Error("Outra pessoa está alterando os usuários agora. Tente de novo.");
}

export function subscribeUsers(client: SupabaseClient, onChange: (users: AppUser[]) => void): () => void {
  let stopped = false;
  const refresh = () => {
    void fetchUsers(client).then((list) => {
      if (!stopped && list) onChange(list);
    });
  };
  const channel = client
    .channel(`users-sync-${newUserId()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: `id=eq.${ROW_ID}` }, refresh)
    .subscribe();
  refresh();
  const timer = setInterval(refresh, 20000);
  const onFocus = () => refresh();
  if (typeof window !== "undefined") window.addEventListener("focus", onFocus);
  return () => {
    stopped = true;
    clearInterval(timer);
    if (typeof window !== "undefined") window.removeEventListener("focus", onFocus);
    void client.removeChannel(channel);
  };
}

// Recorta a foto em quadrado no centro e reduz para 256 px (JPEG), para a
// foto carregar rápido em todo lugar onde o nome aparece.
export function resizePhoto(file: File, size = 256): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Não foi possível processar a imagem."));
        return;
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível processar a imagem."))), "image/jpeg", 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Arquivo de imagem inválido."));
    };
    img.src = url;
  });
}

export async function uploadUserPhoto(client: SupabaseClient, file: File): Promise<string> {
  const blob = await resizePhoto(file);
  const path = `avatars/${newUserId()}.jpg`;
  const { error } = await client.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);
  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
