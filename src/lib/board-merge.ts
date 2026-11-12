// Mesclagem de três vias do quadro.
//
// Quando duas pessoas editam ao mesmo tempo, cada navegador tem:
//   base   = último estado da nuvem que ele conhecia
//   local  = o que ele tem agora (com as edições dele)
//   remote = o que está na nuvem agora (com as edições do outro)
// A mesclagem junta as duas edições em vez de uma apagar a outra. Listas de
// itens com "id" (quadros, grupos, tarefas, atualizações) são mescladas item
// a item; campos simples, campo a campo. Só quando os dois mudaram o MESMO
// campo do MESMO item é que a edição deste navegador prevalece.

import type { Board, Group, Task } from "./board-types";

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => v !== null && typeof v === "object" && !Array.isArray(v);

const isIdArray = (v: unknown): v is Obj[] =>
  Array.isArray(v) && v.every((x) => isObj(x) && typeof x["id"] === "string");

// JSON com as chaves em ordem: dois objetos iguais com chaves em ordem
// diferente (comum com spread) contam como iguais.
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v === undefined ? null : v)).join(",")}]`;
  if (isObj(value)) {
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

const same = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);

export function merge3(base: unknown, local: unknown, remote: unknown): unknown {
  if (same(local, remote)) return local;
  if (same(base, local)) return remote;
  if (same(base, remote)) return local;
  if (isIdArray(local) && isIdArray(remote)) {
    return mergeIdArrays(isIdArray(base) ? base : [], local, remote);
  }
  if (isObj(local) && isObj(remote)) {
    const b = isObj(base) ? base : {};
    const out: Obj = {};
    const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
    for (const k of keys) {
      const v = merge3(b[k], local[k], remote[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  // Conflito real no mesmo valor: vale a edição deste navegador.
  return local;
}

function mergeIdArrays(base: Obj[], local: Obj[], remote: Obj[]): Obj[] {
  const byId = (arr: Obj[]) => new Map(arr.map((x) => [x["id"] as string, x]));
  const b = byId(base);
  const l = byId(local);
  const r = byId(remote);

  const kept = new Map<string, Obj>();
  for (const id of new Set([...l.keys(), ...r.keys()])) {
    const li = l.get(id);
    const ri = r.get(id);
    const bi = b.get(id);
    if (li && ri) {
      kept.set(id, merge3(bi, li, ri) as Obj);
    } else if (li && !bi) {
      kept.set(id, li); // criado aqui
    } else if (ri && !bi) {
      kept.set(id, ri); // criado pelo outro
    }
    // Existia na base e sumiu de um dos lados: foi excluído (ou movido para
    // outra lista) — a exclusão vale.
  }

  // Ordem: se este navegador reordenou, vale a ordem dele; senão a da nuvem.
  const common = (arr: Obj[]) => arr.map((x) => x["id"] as string).filter((id) => b.has(id) && l.has(id) && r.has(id));
  const localReordered = common(local).join("|") !== common(base).join("|");
  const primary = localReordered ? local : remote;
  const secondary = localReordered ? remote : local;

  const order: string[] = primary.map((x) => x["id"] as string).filter((id) => kept.has(id));
  const placed = new Set(order);
  secondary.forEach((x, i) => {
    const id = x["id"] as string;
    if (!kept.has(id) || placed.has(id)) return;
    // Insere logo depois do item que vinha antes dele na outra lista.
    let at = 0;
    for (let j = i - 1; j >= 0; j--) {
      const prev = secondary[j]?.["id"] as string | undefined;
      const pos = prev ? order.indexOf(prev) : -1;
      if (pos >= 0) {
        at = pos + 1;
        break;
      }
    }
    order.splice(at, 0, id);
    placed.add(id);
  });

  return order.map((id) => kept.get(id) as Obj);
}

// Uma tarefa nunca pode aparecer duas vezes no mesmo quadro (ex.: as duas
// pessoas moveram a mesma tarefa para grupos diferentes). Fica a posição
// que este navegador escolheu.
function dedupeTasks(board: Board, localBoard: Board | undefined): Board {
  const localGroupOf = new Map<string, string>();
  localBoard?.groups.forEach((g) => g.tasks.forEach((t) => localGroupOf.set(t.id, g.id)));
  const count = new Map<string, number>();
  board.groups.forEach((g) => g.tasks.forEach((t) => count.set(t.id, (count.get(t.id) ?? 0) + 1)));
  if ([...count.values()].every((n) => n === 1)) return board;
  const placed = new Set<string>();
  // Primeiro passa pelos grupos onde este navegador tem a tarefa.
  const keep = new Map<string, string>();
  board.groups.forEach((g) =>
    g.tasks.forEach((t) => {
      if ((count.get(t.id) ?? 0) > 1 && localGroupOf.get(t.id) === g.id) keep.set(t.id, g.id);
    }),
  );
  const groups: Group[] = board.groups.map((g) => ({
    ...g,
    tasks: g.tasks.filter((t: Task) => {
      if ((count.get(t.id) ?? 0) === 1) return true;
      const wanted = keep.get(t.id);
      if (wanted ? wanted !== g.id : placed.has(t.id)) return false;
      if (placed.has(t.id)) return false;
      placed.add(t.id);
      return true;
    }),
  }));
  return { ...board, groups };
}

export function mergeBoards(base: Board[] | null, local: Board[], remote: Board[]): Board[] {
  const merged = merge3(base ?? [], local, remote) as Board[];
  const localById = new Map(local.map((b) => [b.id, b]));
  return merged.map((b) => dedupeTasks(b, localById.get(b.id)));
}
