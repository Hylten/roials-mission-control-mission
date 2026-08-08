import React from "react";
import { CloudOff, Wifi, Zap, X, Mic, Terminal, Copy, PlusSquare, Loader2 } from "lucide-react";
import { AgentsAPI, SyncAPI, TasksAPI, type Agent, type SyncStatus } from "../api";

const AgentPulse = () => {
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus | null>(null);
  const [selected, setSelected] = React.useState<Agent | null>(null);
  const [task, setTask] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; msg: string } | null>(null);
  const [listening, setListening] = React.useState(false);

  const loadAll = async () => {
    try {
      const [agentsData, status] = await Promise.all([AgentsAPI.getAll(), SyncAPI.status()]);
      setAgents(agentsData);
      setSyncStatus(status);
    } catch (e) {
      console.error("Kunde inte ladda agents/sync:", e);
    }
  };

  React.useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, []);

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setResult({ ok: false, msg: "Röst stöds inte här — använd Chrome." });
      return;
    }
    const rec = new SR();
    rec.lang = "sv-SE";
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      setTask((prev) => (prev ? prev + " " : "") + text);
    };
    rec.start();
  };

  const startAgent = async () => {
    if (!selected) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("http://127.0.0.1:9377/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: selected.id, task }),
      });
      const data = await res.json();
      setResult(res.ok ? { ok: true, msg: `✅ Startad i Terminal: ${data.cmd}` } : { ok: false, msg: data.detail || "Fel" });
    } catch (e: any) {
      setResult({ ok: false, msg: `Kunde inte nå tjänsten: ${e.message}` });
    } finally {
      setSending(false);
    }
  };

  const copyCmd = async () => {
    if (!selected) return;
    const cmd = (selected.start_cmd || "").replace("{task}", task || "…");
    try {
      await navigator.clipboard.writeText(cmd);
      setResult({ ok: true, msg: `📋 Kopierat: ${cmd}` });
    } catch {
      setResult({ ok: false, msg: "Kunde inte kopiera." });
    }
  };

  const createTask = async () => {
    if (!selected || !task.trim()) return;
    try {
      const all = await TasksAPI.getAll();
      all.push({
        id: `task-${Date.now()}`,
        title: task.trim().slice(0, 90),
        status: "todo",
        priority: "medium",
        assignedTo: selected.id,
        category: selected.name,
      });
      await TasksAPI.saveAll(all);
      window.dispatchEvent(new CustomEvent("kanban-refresh"));
      setResult({ ok: true, msg: `📌 Kort skapat åt ${selected.name}.` });
    } catch (e: any) {
      setResult({ ok: false, msg: e.message });
    }
  };

  const StatusBadge = ({ connected, label }: { connected: boolean; label: string }) => (
    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${connected ? "text-emerald-400" : "text-muted-foreground"}`}>
      {connected ? <Wifi className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
      {label}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
          <Zap className="w-3 h-3" /> MCP: SmartRouter (Mistral → Big Pickle)
        </div>
        <div className="flex items-center gap-4">
          {syncStatus && (
            <>
              <StatusBadge connected={syncStatus.clickup_connected} label="ClickUp" />
              <StatusBadge connected={syncStatus.zoho_connected} label="Zoho" />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => { setSelected(agent); setTask(""); setResult(null); }}
            className="glass-card p-4 relative flex flex-col items-center text-left hover:border-primary/40 transition-colors cursor-pointer"
            title={`Skriv till ${agent.name}`}
          >
            <div
              className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold mb-2 animate-pulse-slow"
              style={{ borderColor: agent.color, color: agent.color, boxShadow: `0 0 15px ${agent.color}44` }}
            >
              {agent.name[0]}
            </div>
            <h3 className="text-sm font-bold text-white">{agent.name}</h3>
            <p className="text-[10px] text-muted-foreground uppercase">{agent.role}</p>
            <div className="mt-2 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
              {agent.status === "active" ? "● Live" : agent.status === "thinking" ? "● Tänker..." : agent.status === "offline" ? "○ Offline" : "○ Idle"}
            </div>
            <p className="mt-2 text-[9px] text-center opacity-60 leading-tight">{agent.lastAction}</p>
            {agent.start_cmd && (
              <span className="mt-2 text-[8px] text-primary/70 uppercase tracking-wider">💬 Skriv till →</span>
            )}
          </button>
        ))}
      </div>

      {/* Modal: skriv till agent */}
      {selected && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="glass-card w-full max-w-md p-5 relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3 right-3 text-muted-foreground hover:text-white" onClick={() => setSelected(null)}>
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-white mb-1" style={{ color: selected.color }}>
              💬 Skriv till {selected.name}
            </h3>
            <p className="text-[10px] text-muted-foreground mb-3">{selected.role}</p>

            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Vad ska agenten göra? (eller tryck på 🎤 och diktera)"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 mb-2"
            />
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={startVoice}
                className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg transition-colors ${listening ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-white/5 hover:bg-white/10 text-white"}`}
              >
                <Mic className="w-3 h-3" /> {listening ? "Lyssnar…" : "Diktera"}
              </button>
              <span className="text-[9px] text-muted-foreground">sv-SE · Chrome</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={startAgent}
                disabled={sending}
                className="flex items-center gap-1.5 text-xs bg-primary hover:bg-primary-dark px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Terminal className="w-3 h-3" />}
                Starta i Terminal
              </button>
              <button
                onClick={copyCmd}
                className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
              >
                <Copy className="w-3 h-3" /> Kopiera kommando
              </button>
              <button
                onClick={createTask}
                disabled={!task.trim()}
                className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
              >
                <PlusSquare className="w-3 h-3" /> Skapa kort
              </button>
            </div>

            {result && (
              <p className={`mt-3 text-[11px] ${result.ok ? "text-emerald-400" : "text-red-400"} break-all`}>
                {result.msg}
              </p>
            )}
            {selected.start_cmd && (
              <p className="mt-2 text-[9px] text-muted-foreground opacity-60 font-mono break-all">
                Kommando: {selected.start_cmd.replace("{task}", task || "…")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentPulse;
