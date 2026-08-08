// Roials Mission Control — API Client
// Pratar med Sync Service (port 9377)

const API = "http://127.0.0.1:9377";

export type Task = {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "done";
  priority: "high" | "medium" | "low";
  assignedTo: string;
  category: string;
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  status: "active" | "idle" | "thinking" | "offline";
  lastAction: string;
  color: string;
  start_cmd?: string;
};

export type SyncStatus = {
  clickup_connected: boolean;
  zoho_connected: boolean;
  clickup_list_id: string | null;
};

async function api<T>(path: string, method: string = "GET", body?: any): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

export const TasksAPI = {
  getAll: () => api<Task[]>("/tasks"),
  saveAll: (tasks: Task[]) => api<{ saved: boolean }>("/tasks", "POST", tasks),
  add: async (task: Task) => {
    const all = await TasksAPI.getAll();
    all.push(task);
    return TasksAPI.saveAll(all);
  },
  update: async (id: string, changes: Partial<Task>) => {
    const all = await TasksAPI.getAll();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...changes };
    return TasksAPI.saveAll(all);
  },
  remove: async (id: string) => {
    const all = await TasksAPI.getAll();
    return TasksAPI.saveAll(all.filter((t) => t.id !== id));
  },
};

export const AgentsAPI = {
  getAll: () => api<Agent[]>("/agents"),
  saveAll: (agents: Agent[]) => api<{ saved: boolean }>("/agents", "POST", agents),
  update: async (id: string, changes: Partial<Agent>) => {
    const all = await AgentsAPI.getAll();
    const idx = all.findIndex((a) => a.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...changes };
    return AgentsAPI.saveAll(all);
  },
};

export const SyncAPI = {
  status: () => api<SyncStatus>("/status"),
  syncAll: () => api<{ clickup: string[]; zoho: string[]; errors: string[] }>("/sync", "POST"),
};
