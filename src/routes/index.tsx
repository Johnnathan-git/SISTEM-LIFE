import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

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
  const [personFilter, setPersonFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState<"Todos" | Status>("Todos");
  const [sortByPriority, setSortByPriority] = useState(true);
  const [showPriority, setShowPriority] = useState(true);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [newBoardName, setNewBoardName] = useState("");
  const [selected, setSelected] = useState<{ groupId: string; taskId: string } | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [updateAuthor, setUpdateAuthor] = useState("Johnnathan");
  const [dragTask, setDragTask] = useState<{ groupId: string; taskId: string } | null>(null);

  useEffect(() => {
    const loaded = loadBoards();
    setBoards(loaded);
    setBoardId(loaded[0].id);
  }, []);

  useEffect(() => {
    if (boards.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  }, [boards]);

  const board = boards.find((b) => b.id === boardId) ?? boards[0];
  if (!board) return null;

  const updateBoard = (next: Board) => {
    setBoards((prev) => prev.map((b) => (b.id === next.id ? next : b)));
  };

  const updateTask = (groupId: string, taskId: string, patch: Partial<Task>) => {
    const source = board.groups.find((g) => g.id === groupId);
    const task = source?.tasks.find((t) => t.id === taskId);
    if (!source || !task) return;
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
    if (!text) return;
    const group = board.groups.find((g) => g.id === groupId);
    const task = group?.tasks.find((t) => t.id === taskId);
    if (!group || !task) return;
    const update: Update = {
      id: newId(),
      author: updateAuthor,
      text,
      createdAt: new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
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
    const byPerson = personFilter === "Todos" || t.owner === personFilter;
    return bySearch && byStatus && byPerson;
  };

  const orderedTasks = (tasks: Task[]) => {
    const filtered = tasks.filter(matches);
    if (!sortByPriority) return filtered;
    return [...filtered].sort((a, b) => {
      if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });
  };

  const visibleTasks = useMemo(() => allTasks.filter(matches), [boards, boardId, search, statusFilter, personFilter]);

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
                <button
                  key={b.id}
                  onClick={() => setBoardId(b.id)}
                  className={`rounded-md px-3 py-2 text-left text-sm ${b.id === board.id ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`}
                >
                  {b.name}
                </button>
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
              Main Table
            </button>
            <button onClick={() => setView("kanban")} className={`border-b-2 px-1 pb-2 ${view === "kanban" ? "border-slate-900 font-semibold" : "border-transparent text-slate-500"}`}>
              Kanban
            </button>
            <button onClick={addGroup} className="px-1 pb-2 text-slate-500">+</button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <button onClick={() => addTask(board.groups[0]?.id ?? "")} className="rounded-md bg-[#0073ea] px-4 py-2 font-semibold text-white">
              New Task
            </button>
            <label className="flex items-center gap-1">
              <span>⌕</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-32 outline-none" />
            </label>
            <label className="flex items-center gap-1">
              <span>👤</span>
              <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} className="bg-transparent outline-none">
                <option value="Todos">Person</option>
                {USERS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1">
              <span>▽</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "Todos" | Status)} className="bg-transparent outline-none">
                <option value="Todos">Filter</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <button onClick={() => setSortByPriority((v) => !v)} className="flex items-center gap-1">
              ↕ Sort{sortByPriority ? " ✓" : ""}
            </button>
            <button onClick={() => setShowPriority((v) => !v)} className="flex items-center gap-1">
              👁 Hide{showPriority ? "" : " (prioridade oculta)"}
            </button>
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
                    <button onClick={() => toggleCollapse(group.id)} className="mb-2 flex items-center gap-2 text-lg font-semibold" style={{ color: group.color }}>
                      <span className="text-sm text-slate-500">{isCollapsed ? "›" : "⌄"}</span>
                      {group.name}
                      <span className="text-sm font-normal text-slate-400">({group.tasks.length})</span>
                    </button>
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] border-collapse text-sm">
                          <thead>
                            <tr className="text-slate-700">
                              <th className="w-2 border border-slate-200" style={{ backgroundColor: group.color }} />
                              <th className="w-10 border border-slate-200 px-2 py-2 font-normal" />
                              <th className="border border-slate-200 px-2 py-2 font-normal">Task</th>
                              <th className="w-10 border border-slate-200 px-2 py-2 font-normal" />
                              <th className="w-28 border border-slate-200 px-2 py-2 font-normal">Person</th>
                              <th className="w-44 border border-slate-200 px-2 py-2 font-normal">Status</th>
                              {showPriority && <th className="w-36 border border-slate-200 px-2 py-2 font-normal">Priority</th>}
                              <th className="w-32 border border-slate-200 px-2 py-2 font-normal">Date</th>
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
                                  <button onClick={() => setSelected({ groupId: group.id, taskId: task.id })} className="text-left text-slate-900" title="Abrir tarefa e ver observações">
                                    {task.title || "Sem título"}
                                  </button>
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
                                  <select
                                    value={task.status}
                                    onChange={(e) => updateTask(group.id, task.id, { status: e.target.value as Status })}
                                    className="w-full appearance-none px-2 py-2.5 text-center font-medium text-white outline-none"
                                    style={{ backgroundColor: STATUS_BG[task.status] }}
                                  >
                                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </td>
                                {showPriority && (
                                  <td className="border border-slate-200 p-0">
                                    <select
                                      value={task.priority}
                                      onChange={(e) => updateTask(group.id, task.id, { priority: e.target.value as Priority })}
                                      className="w-full appearance-none px-2 py-2.5 text-center font-medium text-white outline-none"
                                      style={{ backgroundColor: PRIORITY_BG[task.priority] }}
                                    >
                                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                  </td>
                                )}
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
                              <td colSpan={showPriority ? 8 : 7} className="border border-slate-200 px-3 py-2">
                                <button onClick={() => addTask(group.id)} className="text-slate-500">+ Add Task</button>
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
                              {showPriority && <td className="border border-slate-200" />}
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
                  <h3 className="mb-3 font-bold text-slate-900">{status}</h3>
                  <div className="flex flex-col gap-2">
                    {visibleTasks.filter((t) => t.status === status).map((t) => (
                      <article
                        key={t.id}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                        draggable
                        onDragStart={() => setDragTask({ groupId: t.groupId, taskId: t.id })}
                        onDragEnd={() => setDragTask(null)}
                      >
                        <button onClick={() => setSelected({ groupId: t.groupId, taskId: t.id })} className="text-left font-semibold text-slate-900" title="Abrir tarefa e ver observações">{t.title}</button>
                        <button onClick={() => setSelected({ groupId: t.groupId, taskId: t.id })} title="Abrir atualização" className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          💬 Atualização{(t.updates ?? []).length > 0 ? ` (${(t.updates ?? []).length})` : ""}
                        </button>
                        <p className="mt-1 text-xs text-slate-500">{t.owner || "Sem responsável"} · {formatDate(t.due) || "Sem prazo"}</p>
                        <div className="mt-2 flex gap-2">
                          <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: PRIORITY_BG[t.priority] }}>{t.priority}</span>
                          <select value={t.status} onChange={(e) => updateTask(t.groupId, t.id, { status: e.target.value as Status })} className="rounded-md border px-1 py-0.5 text-xs">
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </article>
                    ))}
                    {visibleTasks.filter((t) => t.status === status).length === 0 && <p className="text-sm text-slate-500">Nenhuma tarefa aqui.</p>}
                  </div>
                </section>
              ))}
            </div>
          )}

          {(() => {
            // Procura pela tarefa em qualquer grupo, para o card não fechar
            // quando ela mudar de grupo ao ser concluída.
            const selGroup = selected ? board.groups.find((g) => g.tasks.some((t) => t.id === selected.taskId)) : undefined;
            const selTask = selGroup?.tasks.find((t) => t.id === selected?.taskId);
            if (!selected || !selGroup || !selTask) return null;
            const updates = selTask.updates ?? [];
            return (
              <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setSelected(null)}>
                <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Atualização</h2>
                      <p className="text-sm text-slate-500">Grupo: {selGroup.name}</p>
                    </div>
                    <button onClick={() => setSelected(null)} className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold">Fechar ✕</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5">
                    <label className="mb-3 block text-sm font-semibold">Tarefa
                      <input value={selTask.title} onChange={(e) => updateTask(selGroup.id, selTask.id, { title: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 font-normal" />
                    </label>
                    <div className="mb-5 grid grid-cols-2 gap-3">
                      <label className="block text-sm font-semibold">Responsável
                        <select value={selTask.owner} onChange={(e) => updateTask(selGroup.id, selTask.id, { owner: e.target.value })} className="mt-1 w-full rounded-md border px-2 py-2 font-normal"><option value="">Sem responsável</option>{USERS.map((u) => <option key={u} value={u}>{u}</option>)}</select>
                      </label>
                      <label className="block text-sm font-semibold">Status
                        <select value={selTask.status} onChange={(e) => updateTask(selGroup.id, selTask.id, { status: e.target.value as Status })} className="mt-1 w-full rounded-md border px-2 py-2 font-normal">{STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}</select>
                      </label>
                      <label className="block text-sm font-semibold">Prioridade
                        <select value={selTask.priority} onChange={(e) => updateTask(selGroup.id, selTask.id, { priority: e.target.value as Priority })} className="mt-1 w-full rounded-md border px-2 py-2 font-normal">{PRIORITIES.map((pr) => <option key={pr} value={pr}>{pr}</option>)}</select>
                      </label>
                      <label className="block text-sm font-semibold">Prazo
                        <input type="date" value={selTask.due} onChange={(e) => updateTask(selGroup.id, selTask.id, { due: e.target.value })} className="mt-1 w-full rounded-md border px-2 py-2 font-normal" />
                      </label>
                    </div>
                    <h3 className="mb-3 font-bold">Observações — como um bate-papo</h3>
                    {updates.length === 0 ? (
                      <p className="mb-4 rounded-md bg-slate-50 p-3 text-sm text-slate-500">Nenhuma atualização ainda. Escreva a primeira observação abaixo.</p>
                    ) : (
                      <div className="mb-4 flex flex-col gap-3">
                        {updates.map((u) => (
                          <div key={u.id} className="flex gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold">{u.author[0]}</span>
                            <div className="flex-1 rounded-lg border border-slate-200 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold">{u.author}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400">{u.createdAt}</span>
                                  <button onClick={() => removeUpdate(selGroup.id, selTask.id, u.id)} className="text-xs text-slate-400 hover:text-red-600" aria-label="Excluir atualização">✕</button>
                                </div>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-sm">{u.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                  <div className="border-t border-slate-200 p-4">
                    <label className="mb-2 block text-sm font-semibold">Quem está escrevendo?
                      <select value={updateAuthor} onChange={(e) => setUpdateAuthor(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-2 font-normal">{USERS.map((u) => <option key={u} value={u}>{u}</option>)}</select>
                    </label>
                    <textarea value={updateText} onChange={(e) => setUpdateText(e.target.value)} rows={3} placeholder="Escreva uma atualização..." className="w-full rounded-md border px-3 py-2 text-sm" />
                    <button onClick={() => addUpdate(selGroup.id, selTask.id)} className="mt-2 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                      Enviar atualização
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}
