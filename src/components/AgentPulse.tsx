import React from "react";
import { Cloud, CloudOff, Wifi, Zap } from "lucide-react";
import { AgentsAPI, SyncAPI, type Agent, type SyncStatus } from "../api";

const AgentPulse = () => {
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus | null>(null);

  const loadAll = async () => {
    try {
      const [agentsData, status] = await Promise.all([
        AgentsAPI.getAll(),
        SyncAPI.status(),
      ]);
      setAgents(agentsData);
      setSyncStatus(status);
    } catch (e) {
      console.error("Kunde inte ladda agents/sync:", e);
    }
  };

  React.useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  const StatusBadge = ({ connected, label }: { connected: boolean; label: string }) => (
    <div
      className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
        connected ? "text-emerald-400" : "text-muted-foreground"
      }`}
    >
      {connected ? <Wifi className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
      {label}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Sync Status Row */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
          <Zap className="w-3 h-3" />
          MCP: SmartRouter (Mistral → Big Pickle)
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

      {/* Agent Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="glass-card p-4 relative flex flex-col items-center">
            <div
              className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold mb-2 animate-pulse-slow"
              style={{
                borderColor: agent.color,
                color: agent.color,
                boxShadow: `0 0 15px ${agent.color}44`,
              }}
            >
              {agent.name[0]}
            </div>
            <h3 className="text-sm font-bold text-white">{agent.name}</h3>
            <p className="text-[10px] text-muted-foreground uppercase">{agent.role}</p>
            <div className="mt-2 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
              {agent.status === "active"
                ? "● Live"
                : agent.status === "thinking"
                ? "● Tänker..."
                : agent.status === "offline"
                ? "○ Offline"
                : "○ Idle"}
            </div>
            <p className="mt-2 text-[9px] text-center opacity-60 leading-tight">
              {agent.lastAction}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentPulse;
