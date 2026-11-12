// Migração dos anexos antigos: prints guardados em base64 dentro do quadro
// vão para o Storage e o quadro passa a guardar só o link. Com isso o quadro
// cai de alguns MB para poucos KB, e o canal ao vivo do Supabase volta a
// entregar as mudanças (ele não entrega linhas grandes).

import type { Attachment, Board } from "./board-types";

export function collectInlineAttachments(boards: Board[]): Attachment[] {
  const seen = new Map<string, Attachment>();
  for (const b of boards)
    for (const g of b.groups)
      for (const t of g.tasks)
        for (const u of t.updates ?? [])
          for (const a of u.attachments ?? []) if (a.dataUrl && !a.url && !seen.has(a.dataUrl)) seen.set(a.dataUrl, a);
  return [...seen.values()];
}

// Troca cada anexo base64 pelo link já enviado (map: dataUrl → anexo com url).
export function replaceInlineAttachments(boards: Board[], uploaded: Map<string, Attachment>): Board[] {
  if (uploaded.size === 0) return boards;
  let changed = false;
  const next = boards.map((b) => ({
    ...b,
    groups: b.groups.map((g) => ({
      ...g,
      tasks: g.tasks.map((t) =>
        t.updates
          ? {
              ...t,
              updates: t.updates.map((u) =>
                u.attachments
                  ? {
                      ...u,
                      attachments: u.attachments.map((a) => {
                        const up = a.dataUrl && !a.url ? uploaded.get(a.dataUrl) : undefined;
                        if (!up) return a;
                        changed = true;
                        return up;
                      }),
                    }
                  : u,
              ),
            }
          : t,
      ),
    })),
  }));
  return changed ? next : boards;
}
