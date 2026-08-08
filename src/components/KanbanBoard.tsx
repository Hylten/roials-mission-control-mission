import React from "react";
import { Plus, MoreHorizontal, Loader2, RefreshCw } from "lucide-react";
import { TasksAPI, SyncAPI, type Task } from "../api";

const KanbanBoard = () => {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [dragOver, setDragOver] = React.useState<string | null>(null);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await TasksAPI.getAll();
      setTasks(data);
    } catch (e) {
      console.error("Kunde inte ladda tasks:", e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadTasks();
    // Uppdatera när chatten skapar kort
    window.addEventListener("kanban-refresh", loadTasks);
    return () => window.removeEventListener("kanban-refresh", loadTasks);
  }, []);

  const handleDrop = async (newStatus: "todo" | "in-progress" | "done", taskId: string) => {
    setDragOver(null);
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    setTasks(updated);
    await TasksAPI.update(taskId, { status: newStatus });
  };

  const addTask = async (columnId: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: "Ny uppgift...",
      status: columnId as Task["status"],
      priority: "medium",
      assignedTo: "bo",
      category: "AI",
    };
    setTasks([...tasks, newTask]);
    await TasksAPI.add(newTask);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await SyncAPI.syncAll();
      console.log("Sync result:", r);
    } catch (e) {
      console.error("Sync fel:", e);
    } finally {
      setSyncing(false);
    }
  };

  const columns = [
    { id: "todo" as const, title: "ATT GÖRA", color: "text-amber-400" },
    { id: "in-progress" as const, title: "PÅGÅR", color: "text-blue-400" },
    { id: "done" as const, title: "KLART", color: "text-emerald-400" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
          Synka till ClickUp & Zoho
        </button>
        {syncing && <span className="text-xs text-muted-foreground">Synkar...</span>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col) => (
          <div
            key={col.id}
            className={`flex flex-col gap-4 rounded-2xl p-2 transition-colors ${
              dragOver === col.id ? "bg-white/5" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.id);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => {
              if (dragOverTaskId) {
                handleDrop(col.id, dragOverTaskId);
              }
            }}
          >
            <div className="flex justify-between items-center px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
              <h3 className={`text-xs font-bold tracking-widest ${col.color} uppercase`}>
                {col.title}
              </h3>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full opacity-60">
                {tasks.filter((t) => t.status === col.id).length}
              </span>
            </div>

            <div className="space-y-4">
              {tasks
                .filter((t) => t.status === col.id)
                .map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDragOverTaskId(task.id)}
                    onDragEnd={() => setDragOverTaskId(null)}
                    className="glass-card p-4 group cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all duration-300"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          task.priority === "high"
                            ? "bg-primary/20 border-primary/40 text-primary"
                            : "bg-white/5 border-white/10 text-muted-foreground"
                        }`}
                      >
                        {task.priority === "high" ? "Prio 1" : "Prio 2"}
                      </span>
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h4 className="text-sm font-semibold text-white mb-2 leading-snug">
                      {task.title}
                    </h4>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center gap-1.5 opacity-60">
                        <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px]">
                          {task.assignedTo[0].toUpperCase()}
                        </div>
                        <span className="text-[10px] capitalize">{task.assignedTo}</span>
                      </div>
                      <span className="text-[10px] font-bold text-primary opacity-80">
                        {task.category}
                      </span>
                    </div>
                  </div>
                ))}
              <button
                onClick={() => addTask(col.id)}
                className="w-full py-3 border border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs opacity-50 hover:bg-white/5 hover:opacity-100 transition-all font-bold uppercase tracking-widest text-primary/80"
              >
                <Plus className="w-3.5 h-3.5" />
                SKAPA UPPGIFT
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

let dragOverTaskId: string | null = null;
const setDragOverTaskId = (id: string | null) => {
  dragOverTaskId = id;
};

export default KanbanBoard;
