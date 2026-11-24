import { useEffect, useRef, useState } from "react";
import { Camera, Pencil, Plus, Trash2, X } from "lucide-react";
import type { AppUser } from "../lib/users-store";

type Props = {
  users: AppUser[];
  photoFor: (user: AppUser) => string | undefined;
  onSave: (input: { id: string | null; name: string; file: File | null }) => Promise<void>;
  onRemove: (user: AppUser) => Promise<void>;
  onClose: () => void;
};

// Tela de usuários: lista, adicionar, editar (nome e foto) e remover.
export function UsersManager({ users, photoFor, onSave, onRemove, onClose }: Props) {
  const [editing, setEditing] = useState<string | null>(null); // id, "new" ou null
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const startNew = () => {
    setEditing("new");
    setName("");
    setFile(null);
    setPreview(undefined);
    setError("");
  };

  const startEdit = (user: AppUser) => {
    setEditing(user.id);
    setName(user.name);
    setFile(null);
    setPreview(photoFor(user));
    setError("");
  };

  const cancel = () => {
    setEditing(null);
    setFile(null);
    setPreview(undefined);
    setError("");
  };

  const save = async () => {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return setError("Digite o nome.");
    const editingId = editing === "new" ? null : editing;
    if (users.some((u) => u.id !== editingId && u.name.toLowerCase() === clean.toLowerCase())) {
      return setError("Já existe um usuário com esse nome.");
    }
    setBusy(true);
    setError("");
    try {
      await onSave({ id: editingId, name: clean, file });
      cancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (user: AppUser) => {
    if (users.length <= 1) return setError("Precisa ficar pelo menos um usuário.");
    if (!window.confirm(`Remover ${user.name}? As tarefas e atualizações dele(a) continuam com o nome.`)) return;
    setBusy(true);
    setError("");
    try {
      await onRemove(user);
      if (editing === user.id) cancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível remover. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  const form = (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-dashed border-slate-300 bg-white text-slate-400 hover:border-slate-400"
        title="Escolher foto"
        aria-label="Escolher foto"
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <Camera className="mx-auto h-5 w-5" />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
          e.target.value = "";
        }}
      />
      <div className="min-w-0 flex-1">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
          }}
          placeholder="Nome"
          aria-label="Nome do usuário"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500">Clique no círculo para escolher a foto.</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={cancel} disabled={busy} className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/30 p-4 pt-20" onMouseDown={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-label="Usuários"
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold">Usuários</h2>
          <button type="button" onClick={onClose} disabled={busy} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto px-5 py-4">
          {users.map((user) =>
            editing === user.id ? (
              <div key={user.id}>{form}</div>
            ) : (
              <div key={user.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                {photoFor(user) ? (
                  <img src={photoFor(user)} alt={user.name} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold">{user.name[0]}</span>
                )}
                <span className="flex-1 text-sm">{user.name}</span>
                <button type="button" onClick={() => startEdit(user)} disabled={busy} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Editar" aria-label={`Editar ${user.name}`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => void remove(user)} disabled={busy} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Remover" aria-label={`Remover ${user.name}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          )}
          {editing === "new" ? (
            form
          ) : (
            <button
              type="button"
              onClick={startNew}
              disabled={busy || editing !== null}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Adicionar usuário
            </button>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
