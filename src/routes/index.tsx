import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: MondayBoard,
});

type Status = "A fazer" | "Trabalhando" | "Em revisão" | "Concluído" | "Travado";
type Priority = "Crítica" | "Alta" | "Média" | "Baixa";

type Update = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  attachments?: { name: string; dataUrl: string; type: string }[];
  edited?: boolean;
};

type Task = {
  id: string;
  title: string;
  owner: string;
  status: Status;
  priority: Priority;
  due: string;
  notes?: string;
  updates?: Update[];
};

type Group = {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
};

type Board = {
  id: string;
  name: string;
  groups: Group[];
};

const STATUSES: Status[] = ["A fazer", "Trabalhando", "Em revisão", "Concluído", "Travado"];
const PRIORITIES: Priority[] = ["Crítica", "Alta", "Média", "Baixa"];
const USERS = ["Johnnathan", "Emanuel"];
const PRIORITY_ORDER: Record<Priority, number> = {
  Crítica: 0,
  Alta: 1,
  Média: 2,
  Baixa: 3,
};

// Cores no estilo Monday: a cor vai no fundo da etiqueta, o texto da tarefa fica escuro.
const STATUS_BG: Record<Status, string> = {
  "A fazer": "#c4c4c4",
  Trabalhando: "#fdab3d",
  "Em revisão": "#a25ddc",
  Concluído: "#00c875",
  Travado: "#e2445c",
};

const PRIORITY_BG: Record<Priority, string> = {
  Crítica: "#e2445c",
  Alta: "#fdab3d",
  Média: "#579bfc",
  Baixa: "#c4c4c4",
};

// Lista de cores própria, em vez de <select> nativo: o seletor do navegador
// mostra as opções sem cor, só o valor selecionado ficava colorido.
// Aqui cada opção já nasce com a sua cor de fundo.
function ColorDropdown({
  value,
  options,
  colors,
  onChange,
  ariaLabel,
  buttonClassName,
}: {
  value: string;
  options: string[];
  colors: Record<string, string>;
  onChange: (value: string) => void;
  ariaLabel: string;
  buttonClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const menuHeight = options.length * 36;
  const top = rect
    ? rect.bottom + menuHeight > window.innerHeight
      ? Math.max(8, rect.top - menuHeight - 2)
      : rect.bottom + 2
    : 0;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => {
          if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
          setOpen((v) => !v);
        }}
        aria-label={ariaLabel}
        className={buttonClassName}
        style={{ backgroundColor: colors[value] }}
      >
        {value} ▾
      </button>
      {open && rect && (
        <div
          ref={menuRef}
          className="fixed z-[100] overflow-hidden rounded-md shadow-lg"
          style={{ top, left: rect.left, width: Math.max(rect.width, 150) }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-center text-sm font-medium text-white hover:opacity-90"
              style={{ backgroundColor: colors[opt] }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newTask(title = "Nova tarefa"): Task {
  return {
    id: newId(),
    title,
    owner: "",
    status: "A fazer",
    priority: "Média",
    due: "",
    notes: "",
  };
}

function exampleBoard(): Board {
  return {
    id: newId(),
    name: "Meu trabalho",
    groups: [
      {
        id: newId(),
        name: "Esta semana",
        color: "#579bfc",
        tasks: [
          { id: newId(), title: "Revisar relatório mensal", owner: "Johnnathan", status: "Trabalhando", priority: "Alta", due: "2026-11-06" },
          { id: newId(), title: "Organizar documentos do mês", owner: "", status: "A fazer", priority: "Média", due: "2026-11-07" },
          { id: newId(), title: "Ligar para fornecedor", owner: "", status: "A fazer", priority: "Crítica", due: "2026-11-04" },
        ],
      },
      {
        id: newId(),
        name: "Próximas",
        color: "#a25ddc",
        tasks: [
          { id: newId(), title: "Planejar a próxima semana", owner: "", status: "A fazer", priority: "Baixa", due: "" },
          { id: newId(), title: "Revisar orçamento", owner: "", status: "Em revisão", priority: "Alta", due: "2026-11-12" },
        ],
      },
    ],
  };
}

const STORAGE_KEY = "sistema2-monday-v3";

function pendenciasBoard(): Board {
  const urgent = (title: string): Task => ({ id: newId(), title, owner: "Emanuel", status: "A fazer", priority: "Crítica", due: "" });
  const lessUrgent = (title: string): Task => ({ id: newId(), title, owner: "Emanuel", status: "A fazer", priority: "Baixa", due: "" });
  const done = (title: string): Task => ({ id: newId(), title, owner: "Emanuel", status: "Concluído", priority: "Média", due: "" });
  return {
    id: newId(),
    name: "Pendências do Sistema",
    groups: [
      {
        id: newId(),
        name: "Urgentes",
        color: "#e2445c",
        tasks: [
          urgent("Transferência de créditos e diárias"),
          urgent("Criar Caixas dos Usuários da recepção e reservas"),
          urgent("Opção de lançar consumo, serviços e pgmts para todos os integrantes da reserva"),
          urgent("Ajustar o sistema para contabilizar a comissão dos vendedores dos bares."),
          urgent("Relatórios: Receita por pdv, Receita de taxas de serviço, Consumos lançados, Comissão vendedores, Movimentação de estoque, Requisições feitas, Descontos e estornos feitos, recebimentos feitos."),
          urgent("Criar a opção de cortesia e uso da casa"),
          urgent("Permitindo checkin sem pgmt"),
          urgent("Relatório de recebimentos para os auditores"),
          urgent("Emprestimo/Cauçao de pulseiras e toalhas"),
          urgent("Requisição do almoxarifado ir direto para o compras. Não ter que ajustar o estoque para liberar para mandar para o compras."),
          urgent("Criar o Portal do contador"),
        ],
      },
      {
        id: newId(),
        name: "Menos urgentes",
        color: "#fdab3d",
        tasks: [
          lessUrgent("Opção de lançar pagamento Cortesia e Uso da Casa"),
          lessUrgent("Botão de 360 dias para o Painel de Compras"),
          lessUrgent("Diretório já puxar as informações dos hospedes e não precisar cadastrar"),
          lessUrgent("Alterar o item lançado na conta do hospede para não precisar estornar"),
          lessUrgent("Informações de crianças no resumo, e faxetaria de crianças"),
          lessUrgent("Criar a opção de bloqueio e saída do inventario"),
          lessUrgent("Conversão de produtos na base do sistema para aceitar alterar unidade de medida"),
          lessUrgent("Tirar a opçao de forma de pagamento e parcelamento do cadastro do fornecedor."),
          lessUrgent("Distrinchar mais no modulo Resultado linha por linha, com a nota fiscal. Ainda não dá pra identificar"),
        ],
      },
      {
        id: newId(),
        name: "Resolvidos",
        color: "#00c875",
        tasks: [
          done("Opção de pagamento A Faturar – Ok"),
          done("Painel de Pedidos para os bares - Ok"),
        ],
      },
    ],
  };
}

function loadBoards(): Board[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [pendenciasBoard(), exampleBoard()];
    const parsed = JSON.parse(raw) as Board[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [pendenciasBoard(), exampleBoard()];
    return parsed;
  } catch {
    return [pendenciasBoard(), exampleBoard()];
  }
}

function formatDate(value: string) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function MondayBoard() {
  const [boards, setBoards] = useState<Board[]>(() => [exampleBoard()]);
  const [boardId, setBoardId] = useState<string>("");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | Status>("Todos");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [newBoardName, setNewBoardName] = useState("");
  const [selected, setSelected] = useState<{ groupId: string; taskId: string } | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editingUpdateText, setEditingUpdateText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<{ name: string; dataUrl: string; type: string }[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const [updateAuthor, setUpdateAuthor] = useState("Johnnathan");
  const [dragTask, setDragTask] = useState<{ groupId: string; taskId: string } | null>(null);

  useEffect(() => {
    const loaded = loadBoards();
    setBoards(loaded);
    setBoardId(loaded[0].id);
  }, []);

  useEffect(() => {
    setEditingUpdateId(null);
    setEditingUpdateText("");
  }, [selected?.taskId]);

  useEffect(() => {
    if (boards.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  }, [boards]);


  const wrapSelection = (before: string, after: string) => {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = updateText.slice(start, end) || "texto";
    setUpdateText(`${updateText.slice(0, start)}${before}${selectedText}${after}${updateText.slice(end)}`);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const mentionMatch = updateText.slice(0, cursorPos).match(/@([\wÀ-ÿ]*)$/);
  const mentionQuery = mentionMatch ? mentionMatch[1] : null;
  const mentionOptions = mentionQuery !== null ? USERS.filter((u) => u.toLowerCase().startsWith(mentionQuery.toLowerCase())) : [];
  const insertMention = (user: string) => {
    if (mentionQuery === null) return;
    const before = updateText.slice(0, cursorPos - mentionQuery.length - 1);
    const after = updateText.slice(cursorPos);
    setUpdateText(`${before}@${user} ${after}`);
    setCursorPos(before.length + user.length + 2);
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const board = boards.find((b) => b.id === boardId) ?? boards[0];
  if (!board) return null;

  const updateBoard = (next: Board) => {
    setBoards((prev) => prev.map((b) => (b.id === next.id ? next : b)));
  };

  const updateTask = (groupId: string, taskId: string, patch: Partial<Task>) => {
    const source = board.groups.find((g) => g.id === groupId);
    const task = source?.tasks.find((t) => t.id === taskId);
    if (!source || !task) return;
    // Reabrir uma tarefa concluída: ela sai do grupo Resolvidos e volta para um grupo normal.
    if (patch.status && patch.status !== "Concluído" && (source.name === "Resolvidos" || source.name === "Concluídas")) {
      const target = board.groups.find((g) => g.name !== "Resolvidos" && g.name !== "Concluídas") ?? { id: newId(), name: "A fazer", color: "#579bfc", tasks: [] as Task[] };
      const moved = { ...task, ...patch };
      const groupsWithout = board.groups.map((g) => (g.id === groupId ? { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) } : g));
      const targetExists = board.groups.some((g) => g.id === target.id);
      updateBoard({
        ...board,
        groups: targetExists
          ? groupsWithout.map((g) => (g.id === target.id ? { ...g, tasks: [...g.tasks, moved] } : g))
          : [...groupsWithout, { ...target, tasks: [moved] }],
      });
      return;
    }
    if (patch.status === "Concluído" && source.name !== "Resolvidos" && source.name !== "Concluídas") {
      const doneGroup = board.groups.find((g) => g.name === "Resolvidos" || g.name === "Concluídas");
      const moved = { ...task, ...patch };
      if (doneGroup) {
        updateBoard({
          ...board,
          groups: board.groups.map((g) => {
            if (g.id === groupId) return { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) };
            if (g.id === doneGroup.id) return { ...g, tasks: [...g.tasks, moved] };
            return g;
          }),
        });
      } else {
        updateBoard({
          ...board,
          groups: [
            ...board.groups.map((g) => (g.id === groupId ? { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) } : g)),
            { id: newId(), name: "Resolvidos", color: "#00c875", tasks: [moved] },
          ],
        });
      }
      return;
    }
    // Prioridade manda no grupo: Crítica sobe para Urgentes, Baixa vai para Menos urgentes.
    // Só vale se o quadro tiver esse grupo e a tarefa não estiver concluída.
    if (patch.priority && patch.status !== "Concluído" && task.status !== "Concluído") {
      const targetName = patch.priority === "Crítica" ? "Urgentes" : patch.priority === "Baixa" ? "Menos urgentes" : null;
      const target = targetName ? board.groups.find((g) => g.name === targetName) : undefined;
      if (target && target.id !== groupId) {
        const moved = { ...task, ...patch };
        updateBoard({
          ...board,
          groups: board.groups.map((g) => {
            if (g.id === groupId) return { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) };
            if (g.id === target.id) return { ...g, tasks: [moved, ...g.tasks] };
            return g;
          }),
        });
        return;
      }
    }
    updateBoard({
      ...board,
      groups: board.groups.map((g) =>
        g.id === groupId
          ? { ...g, tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }
          : g,
      ),
    });
  };

  const moveTaskToGroup = (fromGroupId: string, taskId: string, toGroupId: string) => {
    if (fromGroupId === toGroupId) return;
    const source = board.groups.find((g) => g.id === fromGroupId);
    const dest = board.groups.find((g) => g.id === toGroupId);
    const task = source?.tasks.find((t) => t.id === taskId);
    if (!source || !dest || !task) return;
    const status: Status =
      dest.name === "Resolvidos" || dest.name === "Concluídas"
        ? "Concluído"
        : task.status === "Concluído"
          ? "A fazer"
          : task.status;
    updateBoard({
      ...board,
      groups: board.groups.map((g) => {
        if (g.id === fromGroupId) return { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) };
        if (g.id === toGroupId) return { ...g, tasks: [...g.tasks, { ...task, status }] };
        return g;
      }),
    });
  };

  const addTask = (groupId: string) => {
    updateBoard({
      ...board,
      groups: board.groups.map((g) =>
        g.id === groupId ? { ...g, tasks: [...g.tasks, newTask()] } : g,
      ),
    });
  };

  const removeTask = (groupId: string, taskId: string) => {
    updateBoard({
      ...board,
      groups: board.groups.map((g) =>
        g.id === groupId ? { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) } : g,
      ),
    });
  };

  const addUpdate = (groupId: string, taskId: string) => {
    const text = updateText.trim();
    // Um print sozinho, sem texto, também tem que salvar. Antes isso voltava sem fazer nada.
    if (!text && pendingAttachments.length === 0) return;
    const group = board.groups.find((g) => g.id === groupId);
    const task = group?.tasks.find((t) => t.id === taskId);
    if (!group || !task) return;
    const update: Update = {
      id: newId(),
      author: updateAuthor,
      text,
      createdAt: new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
      attachments: pendingAttachments,
    };
    updateBoard({
      ...board,
      groups: board.groups.map((g) =>
        g.id === groupId
          ? { ...g, tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, updates: [...(t.updates ?? []), update] } : t)) }
          : g,
      ),
    });
    setUpdateText("");
    setPendingAttachments([]);
  };

  const addAttachmentsFromFiles = (files: File[]) => {
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const max = 1200;
          let w = img.width;
          let h = img.height;
          if (Math.max(w, h) > max) {
            const scale = max / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            setPendingAttachments((prev) => [...prev, { name: file.name || "imagem.jpg", dataUrl, type: "image/jpeg" }]);
          }
          URL.revokeObjectURL(url);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              setPendingAttachments((prev) => [...prev, { name: file.name || "imagem.jpg", dataUrl: reader.result as string, type: file.type }]);
            }
          };
          reader.readAsDataURL(file);
        };
        img.src = url;
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            setPendingAttachments((prev) => [...prev, { name: file.name, dataUrl: reader.result as string, type: file.type }]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // Colar igual no chat: com o card de atualização aberto, Ctrl+V em qualquer
  // lugar do card anexa o print, sem precisar estar com o cursor dentro da caixa
  // de texto e sem botão de anexar. Antes só funcionava colando dentro do textarea.
  const handleWindowPaste = (e: ClipboardEvent) => {
    const target = e.target as HTMLElement | null;
    // Não rouba o colar da edição de uma atualização já postada.
    if (target instanceof HTMLTextAreaElement && target.placeholder !== "Escreva uma atualização...") return;
    const items = e.clipboardData?.items;
    const files: File[] = [];
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file" || items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
    }
    // Alguns navegadores entregam o arquivo em clipboardData.files, não em items.
    if (files.length === 0 && e.clipboardData?.files?.length) {
      files.push(...Array.from(e.clipboardData.files));
    }
    if (files.length > 0) {
      e.preventDefault();
      addAttachmentsFromFiles(files);
      return;
    }
    // Último recurso: se o clipboard diz que tem imagem mas o evento não a entregou,
    // tenta ler direto do clipboard (pode pedir permissão ao navegador).
    if (e.clipboardData?.types?.some((t) => t.startsWith("image/"))) {
      void (async () => {
        try {
          const clipboardItems = await navigator.clipboard.read();
          for (const item of clipboardItems) {
            for (const type of item.types) {
              if (type.startsWith("image/")) {
                const blob = await item.getType(type);
                addAttachmentsFromFiles([new File([blob], "print.png", { type })]);
              }
            }
          }
        } catch {
          // Sem permissão ou sem imagem: deixa o colar normal seguir.
        }
      })();
    }
  };

  useEffect(() => {
    if (!selected) return;
    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [selected?.taskId]);

  const editUpdate = (groupId: string, taskId: string, updateId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    updateBoard({
      ...board,
      groups: board.groups.map((g) =>
        g.id === groupId
          ? { ...g, tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, updates: (t.updates ?? []).map((u) => (u.id === updateId ? { ...u, text: trimmed, edited: true } : u)) } : t)) }
          : g,
      ),
    });
    setEditingUpdateId(null);
    setEditingUpdateText("");
  };

  const removeUpdate = (groupId: string, taskId: string, updateId: string) => {
    updateBoard({
      ...board,
      groups: board.groups.map((g) =>
        g.id === groupId
          ? { ...g, tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, updates: (t.updates ?? []).filter((u) => u.id !== updateId) } : t)) }
          : g,
      ),
    });
  };

  const deleteBoard = (id: string) => {
    const target = boards.find((b) => b.id === id);
    if (!target) return;
    const total = target.groups.flatMap((g) => g.tasks).length;
    if (total > 0 && !window.confirm(`Excluir o quadro "${target.name}" com ${total} tarefa(s)?`)) return;
    const remaining = boards.filter((b) => b.id !== id);
    if (remaining.length === 0) {
      const fresh = { id: newId(), name: "Novo quadro", groups: [{ id: newId(), name: "A fazer", color: "#579bfc", tasks: [newTask("Primeira tarefa")] }] };
      setBoards([fresh]);
      setBoardId(fresh.id);
    } else {
      setBoards(remaining);
      if (boardId === id) setBoardId(remaining[0].id);
    }
  };

  const deleteGroup = (groupId: string) => {
    const group = board.groups.find((g) => g.id === groupId);
    if (!group) return;
    if (group.tasks.length > 0 && !window.confirm(`Excluir o grupo "${group.name}" com ${group.tasks.length} tarefa(s)?`)) return;
    updateBoard({ ...board, groups: board.groups.filter((g) => g.id !== groupId) });
  };

  const addTaskWithStatus = (status: Status) => {
    if (status === "Concluído") {
      const doneGroup = board.groups.find((g) => g.name === "Resolvidos" || g.name === "Concluídas");
      if (doneGroup) {
        updateBoard({ ...board, groups: board.groups.map((g) => (g.id === doneGroup.id ? { ...g, tasks: [...g.tasks, { ...newTask(), status }] } : g)) });
        return;
      }
    }
    const first = board.groups[0];
    if (!first) {
      addGroup();
      return;
    }
    updateBoard({ ...board, groups: board.groups.map((g) => (g.id === first.id ? { ...g, tasks: [...g.tasks, { ...newTask(), status }] } : g)) });
  };

  const addGroup = () => {
    updateBoard({
      ...board,
      groups: [...board.groups, { id: newId(), name: "Novo grupo", color: "#a25ddc", tasks: [newTask()] }],
    });
  };

  const allTasks = board.groups.flatMap((g) => g.tasks.map((t) => ({ ...t, groupId: g.id })));

  const matches = (t: Task) => {
    const bySearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.owner.toLowerCase().includes(search.toLowerCase());
    const byStatus = statusFilter === "Todos" || t.status === statusFilter;
    return bySearch && byStatus;
  };

  const orderedTasks = (tasks: Task[]) => tasks.filter(matches);

  const visibleTasks = useMemo(() => allTasks.filter(matches), [boards, boardId, search, statusFilter]);

  const createBoard = () => {
    const name = newBoardName.trim() || "Novo quadro";
    const next = { id: newId(), name, groups: [{ id: newId(), name: "A fazer", color: "#579bfc", tasks: [newTask("Primeira tarefa")] }] };
    setBoards((prev) => [...prev, next]);
    setBoardId(next.id);
    setNewBoardName("");
  };

  const toggleCollapse = (groupId: string) => {
    setCollapsed((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]));
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 flex-col gap-5 border-r border-slate-200 bg-white p-4 md:flex">
          <div>
            <p className="text-lg font-bold">Sistema 2</p>
            <p className="text-xs text-slate-500">Quadros de tarefas</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quadros</p>
            <div className="flex flex-col gap-1">
              {boards.map((b) => (
                <div key={b.id} className={`flex items-center rounded-md ${b.id === board.id ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                  <button
                    onClick={() => setBoardId(b.id)}
                    className={`flex-1 px-3 py-2 text-left text-sm ${b.id === board.id ? "font-semibold" : ""}`}
                  >
                    {b.name}
                  </button>
                  <button onClick={() => deleteBoard(b.id)} title="Excluir quadro" aria-label={`Excluir quadro ${b.name}`} className="px-2 text-slate-400 hover:text-red-600">✕</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Usuários</p>
            <div className="flex flex-col gap-1">
              {USERS.map((u) => (
                <span key={u} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold">{u[0]}</span>
                  {u}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <input
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Nome do novo quadro"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <button onClick={createBoard} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
              + Novo quadro
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <input
                value={board.name}
                onChange={(e) => updateBoard({ ...board, name: e.target.value })}
                className="w-full bg-transparent text-3xl font-bold text-slate-900 outline-none md:w-auto"
                aria-label="Nome do quadro"
              />
              <p className="mt-1 text-sm text-slate-500">Organize por prioridade, responsável, status e prazo.</p>
            </div>
            <div className="flex items-center gap-2">
              {USERS.map((u) => (
                <span key={u} title={u} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-bold">{u[0]}</span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 border-b border-slate-200 text-sm">
            <button onClick={() => setView("table")} className={`border-b-2 px-1 pb-2 font-semibold ${view === "table" ? "border-slate-900" : "border-transparent text-slate-500"}`}>
              Tabela Principal
            </button>
            <button onClick={() => setView("kanban")} className={`border-b-2 px-1 pb-2 ${view === "kanban" ? "border-slate-900 font-semibold" : "border-transparent text-slate-500"}`}>
              Kanban
            </button>
            <button onClick={addGroup} className="border-b-2 border-transparent px-1 pb-2 text-slate-500">
              + Novo grupo
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <button
              onClick={() => {
                if (board.groups[0]) addTask(board.groups[0].id);
                else addGroup();
              }}
              className="rounded-md bg-[#0073ea] px-4 py-2 font-semibold text-white"
            >
              Nova Tarefa
            </button>
            <label className="flex items-center gap-1">
              <span>⌕</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" className="w-32 outline-none" />
            </label>
            <label className="flex items-center gap-1">
              <span>▽</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "Todos" | Status)} className="bg-transparent outline-none">
                <option value="Todos">Filtrar</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          {view === "table" ? (
            <div className="mt-6 flex flex-col gap-10">
              {board.groups.map((group) => {
                const tasks = orderedTasks(group.tasks);
                const isCollapsed = collapsed.includes(group.id);
                return (
                  <section
                    key={group.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragTask) {
                        moveTaskToGroup(dragTask.groupId, dragTask.taskId, group.id);
                        setDragTask(null);
                      }
                    }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        type="color"
                        value={group.color}
                        onChange={(e) => updateBoard({ ...board, groups: board.groups.map((g) => (g.id === group.id ? { ...g, color: e.target.value } : g)) })}
                        title="Cor do grupo"
                        aria-label="Cor do grupo"
                        className="h-6 w-6 cursor-pointer rounded border border-slate-200 bg-transparent p-0"
                      />
                      <button onClick={() => toggleCollapse(group.id)} className="text-sm text-slate-500" aria-label={isCollapsed ? "Expandir grupo" : "Recolher grupo"}>
                        {isCollapsed ? "›" : "⌄"}
                      </button>
                      <input
                        value={group.name}
                        onChange={(e) => updateBoard({ ...board, groups: board.groups.map((g) => (g.id === group.id ? { ...g, name: e.target.value } : g)) })}
                        className="bg-transparent text-lg font-semibold outline-none"
                        style={{ color: group.color }}
                        aria-label="Nome do grupo"
                      />
                      <button onClick={() => deleteGroup(group.id)} className="ml-auto text-xs text-slate-400 hover:text-red-600">
                        Excluir grupo
                      </button>
                    </div>
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] border-collapse text-sm">
                          <thead>
                            <tr className="text-slate-700">
                              <th className="w-2 border border-slate-200" style={{ backgroundColor: group.color }} />
                              <th className="w-10 border border-slate-200 px-2 py-2 font-normal" />
                              <th className="border border-slate-200 px-2 py-2 font-normal">Tarefa</th>
                              <th className="w-10 border border-slate-200 px-2 py-2 font-normal" />
                              <th className="w-28 border border-slate-200 px-2 py-2 font-normal">Pessoa</th>
                              <th className="w-44 border border-slate-200 px-2 py-2 font-normal">Status</th>
                              <th className="w-36 border border-slate-200 px-2 py-2 font-normal">Prioridade</th>
                              <th className="w-32 border border-slate-200 px-2 py-2 font-normal">Data</th>
                              <th className="w-10 border border-slate-200 px-2 py-2 font-normal">+</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tasks.map((task) => (
                              <tr
                                key={task.id}
                                className="hover:bg-slate-50"
                                draggable
                                onDragStart={() => setDragTask({ groupId: group.id, taskId: task.id })}
                                onDragEnd={() => setDragTask(null)}
                              >
                                <td className="border border-slate-200" style={{ backgroundColor: group.color }} />
                                <td className="border border-slate-200 px-2 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={task.status === "Concluído"}
                                    onChange={(e) => updateTask(group.id, task.id, { status: e.target.checked ? "Concluído" : "A fazer" })}
                                    aria-label="Marcar como concluída"
                                  />
                                </td>
                                <td className="border border-slate-200 px-3 py-2">
                                  <input
                                    value={task.title}
                                    onChange={(e) => updateTask(group.id, task.id, { title: e.target.value })}
                                    placeholder="Nova tarefa"
                                    aria-label="Título da tarefa"
                                    className="w-full bg-transparent text-slate-900 outline-none"
                                  />
                                </td>
                                <td className="border border-slate-200 px-2 py-2 text-center">
                                  <button
                                    onClick={() => setSelected({ groupId: group.id, taskId: task.id })}
                                    title="Abrir atualização"
                                    className="relative mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm"
                                  >
                                    💬
                                    {(task.updates ?? []).length > 0 && (
                                      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white">
                                        {(task.updates ?? []).length}
                                      </span>
                                    )}
                                  </button>
                                </td>
                                <td className="border border-slate-200 px-2 py-2 text-center">
                                  <button onClick={() => setSelected({ groupId: group.id, taskId: task.id })} title={task.owner || "Sem responsável"} className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold">
                                    {task.owner ? task.owner[0] : "○"}
                                  </button>
                                </td>
                                <td className="border border-slate-200 p-0">
                                  <ColorDropdown
                                    value={task.status}
                                    options={STATUSES}
                                    colors={STATUS_BG}
                                    onChange={(v) => updateTask(group.id, task.id, { status: v as Status })}
                                    ariaLabel="Status da tarefa"
                                    buttonClassName="w-full px-2 py-2.5 text-center font-medium text-white outline-none"
                                  />
                                </td>
                                <td className="border border-slate-200 p-0">
                                  <ColorDropdown
                                    value={task.priority}
                                    options={PRIORITIES}
                                    colors={PRIORITY_BG}
                                    onChange={(v) => updateTask(group.id, task.id, { priority: v as Priority })}
                                    ariaLabel="Prioridade da tarefa"
                                    buttonClassName="w-full px-2 py-2.5 text-center font-medium text-white outline-none"
                                  />
                                </td>
                                <td className="border border-slate-200 px-2 py-2 text-center text-slate-500">
                                  <input type="date" value={task.due} onChange={(e) => updateTask(group.id, task.id, { due: e.target.value })} className="bg-transparent text-center outline-none" />
                                </td>
                                <td className="border border-slate-200 px-2 py-2 text-center">
                                  <button onClick={() => removeTask(group.id, task.id)} className="text-slate-400 hover:text-red-600" aria-label="Excluir tarefa">✕</button>
                                </td>
                              </tr>
                            ))}
                            <tr>
                              <td className="border border-slate-200" style={{ backgroundColor: group.color }} />
                              <td colSpan={8} className="border border-slate-200 px-3 py-2">
                                <button onClick={() => addTask(group.id)} className="text-slate-500">+ Adicionar Tarefa</button>
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={5} className="border border-slate-200" />
                              <td className="border border-slate-200 px-2 py-2">
                                <div className="flex h-4 w-full overflow-hidden">
                                  {STATUSES.map((s) => {
                                    const count = group.tasks.filter((t) => t.status === s).length;
                                    if (!count || !group.tasks.length) return null;
                                    return <div key={s} title={`${s}: ${count}`} style={{ width: `${(count / group.tasks.length) * 100}%`, backgroundColor: STATUS_BG[s] }} />;
                                  })}
                                </div>
                              </td>
                              <td className="border border-slate-200" />
                              <td colSpan={2} className="border border-slate-200" />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {STATUSES.map((status) => (
                <section
                  key={status}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragTask) {
                      updateTask(dragTask.groupId, dragTask.taskId, { status });
                      setDragTask(null);
                    }
                  }}
                >
                  <h3 className="mb-3 font-bold text-slate-900">{status} ({visibleTasks.filter((t) => t.status === status).length})</h3>
                  <div className="flex flex-col gap-2">
                    {visibleTasks.filter((t) => t.status === status).map((t) => (
                      <article
                        key={t.id}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                        draggable
                        onDragStart={() => setDragTask({ groupId: t.groupId, taskId: t.id })}
                        onDragEnd={() => setDragTask(null)}
                      >
                        <input
                          value={t.title}
                          onChange={(e) => updateTask(t.groupId, t.id, { title: e.target.value })}
                          placeholder="Nova tarefa"
                          aria-label="Título da tarefa"
                          className="w-full bg-transparent font-semibold text-slate-900 outline-none"
                        />
                        <button onClick={() => setSelected({ groupId: t.groupId, taskId: t.id })} title="Abrir atualização" className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          💬 Atualização{(t.updates ?? []).length > 0 ? ` (${(t.updates ?? []).length})` : ""}
                        </button>
                        <p className="mt-1 text-xs text-slate-500">{t.owner || "Sem responsável"} · {formatDate(t.due) || "Sem prazo"}</p>
                        <div className="mt-2 flex gap-2">
                          <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: PRIORITY_BG[t.priority] }}>{t.priority}</span>
                          <ColorDropdown
                            value={t.status}
                            options={STATUSES}
                            colors={STATUS_BG}
                            onChange={(v) => updateTask(t.groupId, t.id, { status: v as Status })}
                            ariaLabel="Status da tarefa"
                            buttonClassName="rounded-md px-2 py-1 text-xs font-medium text-white"
                          />
                        </div>
                      </article>
                    ))}
                    {visibleTasks.filter((t) => t.status === status).length === 0 && <p className="text-sm text-slate-500">Nenhuma tarefa aqui.</p>}
                    <button onClick={() => addTaskWithStatus(status)} className="mt-1 rounded-md bg-white px-3 py-2 text-left text-sm text-slate-500 hover:text-slate-900">
                      + Adicionar tarefa
                    </button>
                  </div>
                </section>
              ))}
            </div>
          )}

          {(() => {
            const selGroup = selected ? board.groups.find((g) => g.tasks.some((t) => t.id === selected.taskId)) : undefined;
            const selTask = selGroup?.tasks.find((t) => t.id === selected?.taskId);
            if (!selected || !selGroup || !selTask) return null;
            const updates = [...(selTask.updates ?? [])].reverse();
            return (
              <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setSelected(null)}>
                <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between gap-3 px-6 pt-5">
                    <button onClick={() => setSelected(null)} className="text-xl text-slate-500" aria-label="Fechar">✕</button>
                  </div>
                  <h2 className="px-6 pt-2 text-2xl font-bold text-slate-900">{selTask.title || "Sem título"}</h2>
                  <p className="px-6 pb-1 text-sm text-slate-500">
                    {selTask.owner || "Sem responsável"} · {selTask.status} · {selTask.priority} · {selTask.due ? formatDate(selTask.due) : "Sem prazo"} · Grupo: {selGroup.name}
                  </p>
                  <button onClick={() => setShowDetails((v) => !v)} className="px-6 pb-3 text-left text-sm text-slate-500">
                    Editar detalhes {showDetails ? "▾" : "▸"}
                  </button>
                  {showDetails && (
                    <div className="mx-6 mb-4 rounded-lg border border-slate-200 p-4">
                      <div className="mb-3 grid grid-cols-2 gap-3">
                        <label className="block text-sm font-semibold">Responsável
                          <select value={selTask.owner} onChange={(e) => updateTask(selGroup.id, selTask.id, { owner: e.target.value })} className="mt-1 w-full rounded-md border px-2 py-2 font-normal"><option value="">Sem responsável</option>{USERS.map((u) => <option key={u} value={u}>{u}</option>)}</select>
                        </label>
                        <label className="block text-sm font-semibold">Status
                          <ColorDropdown value={selTask.status} options={STATUSES} colors={STATUS_BG} onChange={(v) => updateTask(selGroup.id, selTask.id, { status: v as Status })} ariaLabel="Status da tarefa" buttonClassName="mt-1 w-full rounded-md px-2 py-2 text-center font-medium text-white" />
                        </label>
                        <label className="block text-sm font-semibold">Prioridade
                          <ColorDropdown value={selTask.priority} options={PRIORITIES} colors={PRIORITY_BG} onChange={(v) => updateTask(selGroup.id, selTask.id, { priority: v as Priority })} ariaLabel="Prioridade da tarefa" buttonClassName="mt-1 w-full rounded-md px-2 py-2 text-center font-medium text-white" />
                        </label>
                        <label className="block text-sm font-semibold">Prazo
                          <input type="date" value={selTask.due} onChange={(e) => updateTask(selGroup.id, selTask.id, { due: e.target.value })} className="mt-1 w-full rounded-md border px-2 py-2 font-normal" />
                        </label>
                      </div>
                      <button
                        onClick={() => {
                          removeTask(selGroup.id, selTask.id);
                          setSelected(null);
                        }}
                        className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                      >
                        Excluir tarefa
                      </button>
                    </div>
                  )}
                  {(
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                      <div className="mb-3 flex items-center gap-2 text-sm">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 font-bold">{updateAuthor[0]}</span>
                        <label className="font-semibold">Quem está escrevendo?
                          <select value={updateAuthor} onChange={(e) => setUpdateAuthor(e.target.value)} className="ml-2 rounded-md border px-2 py-1.5 font-normal">{USERS.map((u) => <option key={u} value={u}>{u}</option>)}</select>
                        </label>
                      </div>
                      <div className="rounded-lg border border-slate-300">
                        <div className="flex flex-wrap gap-1 border-b border-slate-200 px-3 py-2 text-sm text-slate-500">
                          <button onClick={() => wrapSelection("**", "**")} className="px-1.5 font-bold" title="Negrito">B</button>
                          <button onClick={() => wrapSelection("*", "*")} className="px-1.5 italic" title="Itálico">I</button>
                          <button onClick={() => wrapSelection("__", "__")} className="px-1.5 underline" title="Sublinhado">U</button>
                          <button onClick={() => wrapSelection("~~", "~~")} className="px-1.5 line-through" title="Riscado">S</button>
                        </div>
                        <textarea
                          ref={editorRef}
                          value={updateText}
                          onChange={(e) => {
                            setUpdateText(e.target.value);
                            setCursorPos(e.target.selectionStart ?? e.target.value.length);
                          }}
                          onSelect={(e) => setCursorPos(e.currentTarget.selectionStart)}
                          onKeyDown={(e) => {
                            if (e.ctrlKey && e.key === "Enter") addUpdate(selGroup.id, selTask.id);
                          }}
                          rows={4}
                          placeholder="Escreva uma atualização..."
                          className="w-full resize-none px-4 py-3 text-sm outline-none"
                        />
                        {mentionQuery !== null && mentionOptions.length > 0 && (
                          <div className="border-t border-slate-200 px-4 py-2">
                            <p className="mb-1 text-xs text-slate-500">Marcar alguém:</p>
                            <div className="flex flex-wrap gap-2">
                              {mentionOptions.map((u) => (
                                <button key={u} onClick={() => insertMention(u)} className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-600">
                                  @{u}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {pendingAttachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {pendingAttachments.map((att, i) => (
                            <div key={i} className="relative rounded-md border border-slate-200 p-1">
                              {att.type.startsWith("image") ? (
                                <img src={att.dataUrl} alt={att.name} className="h-20 w-auto rounded" />
                              ) : (
                                <span className="text-sm">{att.name}</span>
                              )}
                              <button onClick={() => setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs text-white" aria-label="Remover anexo">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">Cole o print aqui na conversa (Ctrl+V) que ele anexa sozinho. Dá para enviar só o print, sem texto. Ctrl+Enter envia.</p>
                        <button onClick={() => addUpdate(selGroup.id, selTask.id)} className="shrink-0 rounded-md bg-[#0073ea] px-4 py-2 text-sm font-semibold text-white">
                          Atualizar
                        </button>
                      </div>

                      {updates.length === 0 ? (
                        <div className="mt-8 text-center">
                          <p className="text-4xl">💬</p>
                          <p className="mt-3 text-lg font-bold">Nenhuma atualização ainda</p>
                          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Compartilhe o progresso, mencione um colega ou envie um arquivo para fazer as coisas andarem.</p>
                        </div>
                      ) : (
                        <div className="mt-6 flex flex-col gap-4">
                          {updates.map((u) => (
                            <div key={u.id} className="flex gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold">{u.author[0]}</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold">{u.author}</p>
                                  <span className="text-xs text-slate-400">{u.createdAt}{u.edited ? " · editado" : ""}</span>
                                  <button
                                    onClick={() => {
                                      setEditingUpdateId(u.id);
                                      setEditingUpdateText(u.text);
                                    }}
                                    className="text-xs text-slate-500 hover:text-slate-900"
                                    aria-label="Editar atualização"
                                  >
                                    Editar
                                  </button>
                                  <button onClick={() => removeUpdate(selGroup.id, selTask.id, u.id)} className="text-xs text-slate-400 hover:text-red-600" aria-label="Excluir atualização">✕</button>
                                </div>
                                {editingUpdateId === u.id ? (
                                  <div className="mt-1">
                                    <textarea
                                      value={editingUpdateText}
                                      onChange={(e) => setEditingUpdateText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.ctrlKey && e.key === "Enter") editUpdate(selGroup.id, selTask.id, u.id, editingUpdateText);
                                      }}
                                      rows={3}
                                      className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none"
                                    />
                                    <div className="mt-2 flex gap-2">
                                      <button onClick={() => editUpdate(selGroup.id, selTask.id, u.id, editingUpdateText)} className="rounded-md bg-[#0073ea] px-3 py-1.5 text-sm font-semibold text-white">
                                        Salvar
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingUpdateId(null);
                                          setEditingUpdateText("");
                                        }}
                                        className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{u.text}</p>
                                )}
                                {(u.attachments ?? []).length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {(u.attachments ?? []).map((att, ai) => (
                                      att.type.startsWith("image") ? (
                                        <img key={ai} src={att.dataUrl} alt={att.name} className="max-h-48 rounded-md border border-slate-200" />
                                      ) : (
                                        <a key={ai} href={att.dataUrl} download={att.name} className="text-sm underline">{att.name}</a>
                                      )
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}
