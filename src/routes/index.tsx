import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  component: MondayBoard,
});

type Status = "A fazer" | "Trabalhando" | "Em revisão" | "Concluído" | "Travado";
type Priority = "Crítica" | "Alta" | "Média" | "Baixa";

type Task = {
  id: string;
  title: string;
  owner: string;
  status: Status;
  priority: Priority;
  due: string;
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
const PRIORITY_ORDER: Record<Priority, number> = {
  Crítica: 0,
  Alta: 1,
  Média: 2,
  Baixa: 3,
};

const STATUS_STYLE: Record<Status, string> = {
  "A fazer": "bg-slate-200 text-slate-800",
  Trabalhando: "bg-blue-600 text-white",
  "Em revisão": "bg-amber-400 text-slate-900",
  Concluído: "bg-emerald-500 text-white",
  Travado: "bg-red-500 text-white",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  Crítica: "bg-red-600 text-white",
  Alta: "bg-orange-500 text-white",
  Média: "bg-sky-500 text-white",
  Baixa: "bg-slate-400 text-white",
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
        color: "#2563eb",
        tasks: [
          { id: newId(), title: "Revisar relatório mensal", owner: "Robert", status: "Trabalhando", priority: "Alta", due: "2026-11-06" },
          { id: newId(), title: "Organizar documentos do mês", owner: "", status: "A fazer", priority: "Média", due: "2026-11-07" },
          { id: newId(), title: "Ligar para fornecedor", owner: "", status: "A fazer", priority: "Crítica", due: "2026-11-04" },
        ],
      },
      {
        id: newId(),
        name: "Próximas",
        color: "#059669",
        tasks: [
          { id: newId(), title: "Planejar a próxima semana", owner: "", status: "A fazer", priority: "Baixa", due: "" },
          { id: newId(), title: "Revisar orçamento", owner: "", status: "Em revisão", priority: "Alta", due: "2026-11-12" },
        ],
      },
    ],
  };
}

const STORAGE_KEY = "sistema2-monday-v2";

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
        color: "#dc2626",
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
        color: "#eab308",
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
        color: "#059669",
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
  if (!value) return "Sem prazo";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function MondayBoard() {
  const [boards, setBoards] = useState<Board[]>(() => [exampleBoard()]);
  const [boardId, setBoardId] = useState<string>("");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | Status>("Todos");
  const [sortByPriority, setSortByPriority] = useState(true);
  const [newBoardName, setNewBoardName] = useState("");

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
    updateBoard({
      ...board,
      groups: board.groups.map((g) =>
        g.id === groupId
          ? { ...g, tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }
          : g,
      ),
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

  const addGroup = () => {
    updateBoard({
      ...board,
      groups: [...board.groups, { id: newId(), name: "Novo grupo", color: "#7c3aed", tasks: [newTask()] }],
    });
  };

  const allTasks = board.groups.flatMap((g) => g.tasks.map((t) => ({ ...t, groupId: g.id })));
  const done = allTasks.filter((t) => t.status === "Concluído").length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = allTasks.filter((t) => t.due && t.due < today && t.status !== "Concluído").length;
  const critical = allTasks.filter((t) => t.priority === "Crítica" && t.status !== "Concluído").length;

  const matches = (t: Task) => {
    const bySearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.owner.toLowerCase().includes(search.toLowerCase());
    const byStatus = statusFilter === "Todos" || t.status === statusFilter;
    return bySearch && byStatus;
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

  const visibleTasks = useMemo(() => allTasks.filter(matches), [boards, boardId, search, statusFilter]);

  const createBoard = () => {
    const name = newBoardName.trim() || "Novo quadro";
    const next = { id: newId(), name, groups: [{ id: newId(), name: "A fazer", color: "#2563eb", tasks: [newTask("Primeira tarefa")] }] };
    setBoards((prev) => [...prev, next]);
    setBoardId(next.id);
    setNewBoardName("");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 flex-col gap-4 bg-slate-900 p-4 text-white md:flex">
          <div>
            <p className="text-lg font-bold">Sistema 2</p>
            <p className="text-xs text-slate-400">Quadros de tarefas, estilo Monday</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Quadros</p>
            <div className="flex flex-col gap-1">
              {boards.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBoardId(b.id)}
                  className={`rounded-md px-3 py-2 text-left text-sm ${b.id === board.id ? "bg-blue-600" : "hover:bg-slate-800"}`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <input
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Nome do novo quadro"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400"
            />
            <button onClick={createBoard} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500">
              + Novo quadro
            </button>
            <p className="text-xs leading-relaxed text-slate-400">
              Os dados ficam salvos neste navegador. Depois dá para ligar a um banco de dados, se quiser.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <input
                value={board.name}
                onChange={(e) => updateBoard({ ...board, name: e.target.value })}
                className="w-full bg-transparent text-2xl font-bold outline-none md:w-auto"
                aria-label="Nome do quadro"
              />
              <p className="text-sm text-slate-500">Organize por prioridade, responsável, status e prazo.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView("table")} className={`rounded-md px-3 py-2 text-sm font-semibold ${view === "table" ? "bg-slate-900 text-white" : "bg-white"}`}>
                Tabela
              </button>
              <button onClick={() => setView("kanban")} className={`rounded-md px-3 py-2 text-sm font-semibold ${view === "kanban" ? "bg-slate-900 text-white" : "bg-white"}`}>
                Kanban
              </button>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">Total de tarefas</p><p className="text-2xl font-bold">{allTasks.length}</p></div>
            <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">Concluídas</p><p className="text-2xl font-bold text-emerald-600">{done}</p></div>
            <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">Atrasadas</p><p className="text-2xl font-bold text-red-600">{overdue}</p></div>
            <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">Críticas abertas</p><p className="text-2xl font-bold text-orange-600">{critical}</p></div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarefa ou responsável..."
              className="min-w-60 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "Todos" | Status)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="Todos">Todos os status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => setSortByPriority((v) => !v)} className={`rounded-md px-3 py-2 text-sm font-semibold ${sortByPriority ? "bg-blue-600 text-white" : "bg-white"}`}>
              {sortByPriority ? "Ordenado por prioridade ✓" : "Ordenar por prioridade"}
            </button>
            <button onClick={addGroup} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">+ Novo grupo</button>
          </div>

          {view === "table" ? (
            <div className="flex flex-col gap-6">
              {board.groups.map((group) => {
                const tasks = orderedTasks(group.tasks);
                const groupDone = group.tasks.filter((t) => t.status === "Concluído").length;
                const progress = group.tasks.length ? Math.round((groupDone / group.tasks.length) * 100) : 0;
                return (
                  <section key={group.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color }} />
                      <input value={group.name} onChange={(e) => updateBoard({ ...board, groups: board.groups.map((g) => (g.id === group.id ? { ...g, name: e.target.value } : g)) })} className="font-bold outline-none" aria-label="Nome do grupo" />
                      <span className="text-xs text-slate-500">{group.tasks.length} tarefas · {progress}% concluído</span>
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} /></div>
                      <button onClick={() => addTask(group.id)} className="ml-auto rounded-md bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">+ Nova tarefa</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr><th className="px-4 py-2">Tarefa</th><th className="px-4 py-2">Responsável</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Prioridade</th><th className="px-4 py-2">Prazo</th><th className="px-4 py-2" /></tr>
                        </thead>
                        <tbody>
                          {tasks.map((task) => (
                            <tr key={task.id} className="border-t">
                              <td className="px-4 py-2"><input value={task.title} onChange={(e) => updateTask(group.id, task.id, { title: e.target.value })} className="w-full outline-none" /></td>
                              <td className="px-4 py-2"><input value={task.owner} onChange={(e) => updateTask(group.id, task.id, { owner: e.target.value })} placeholder="Quem?" className="w-full outline-none" /></td>
                              <td className="px-4 py-2"><select value={task.status} onChange={(e) => updateTask(group.id, task.id, { status: e.target.value as Status })} className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLE[task.status]}`}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></td>
                              <td className="px-4 py-2"><select value={task.priority} onChange={(e) => updateTask(group.id, task.id, { priority: e.target.value as Priority })} className={`rounded-full px-2 py-1 text-xs font-semibold ${PRIORITY_STYLE[task.priority]}`}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></td>
                              <td className="px-4 py-2"><input type="date" value={task.due} onChange={(e) => updateTask(group.id, task.id, { due: e.target.value })} className="outline-none" /></td>
                              <td className="px-4 py-2 text-right"><button onClick={() => removeTask(group.id, task.id)} className="text-slate-400 hover:text-red-600" aria-label="Excluir tarefa">✕</button></td>
                            </tr>
                          ))}
                          {tasks.length === 0 && <tr><td colSpan={6} className="px-4 py-4 text-center text-slate-500">Nenhuma tarefa com esse filtro.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {STATUSES.map((status) => (
                <section key={status} className="rounded-xl bg-slate-200/60 p-3">
                  <h3 className="mb-3 font-bold">{status}</h3>
                  <div className="flex flex-col gap-2">
                    {visibleTasks.filter((t) => t.status === status).map((t) => (
                      <article key={t.id} className="rounded-lg bg-white p-3 shadow-sm">
                        <p className="font-semibold">{t.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{t.owner || "Sem responsável"} · {formatDate(t.due)}</p>
                        <div className="mt-2 flex gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
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
        </main>
      </div>
    </div>
  );
}
