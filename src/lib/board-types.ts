// Tipos do quadro, compartilhados entre a tela e a sincronização com a nuvem.

export type Status = "A fazer" | "Trabalhando" | "Em revisão" | "Concluído" | "Travado";
export type Priority = "Crítica" | "Alta" | "Média" | "Baixa";

// Anexo: "url" é o arquivo no Storage; "dataUrl" é o base64 embutido (legado).
// Anexos antigos em base64 são migrados para o Storage na abertura do quadro.
export type Attachment = { name: string; dataUrl?: string; url?: string; type: string };

export type Update = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  attachments?: Attachment[];
  edited?: boolean;
};

export type Task = {
  id: string;
  title: string;
  owner: string;
  status: Status;
  priority: Priority;
  sector?: string;
  due: string;
  notes?: string;
  updates?: Update[];
};

export type Group = {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
};

export type Board = {
  id: string;
  name: string;
  groups: Group[];
};

export function isBoardList(value: unknown): value is Board[] {
  return (
    Array.isArray(value) &&
    value.every(
      (b) =>
        b !== null &&
        typeof b === "object" &&
        typeof (b as { id?: unknown }).id === "string" &&
        Array.isArray((b as { groups?: unknown }).groups),
    )
  );
}
