import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, X, PlusSquare, Loader2, Zap, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TasksAPI, type Task } from "../api";

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  isAgent: boolean;
}

const API = "http://127.0.0.1:9377";

const MissionChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("big-pickle");
  const [models, setModels] = useState<Record<string, string>>({
    "big-pickle": "Big Pickle",
    "deepseek-v4-flash-free": "DeepSeek V4 Flash",
  });
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Ladda tillgängliga modeller
  useEffect(() => {
    fetch(`${API}/chat/models`)
      .then((r) => r.json())
      .then((d) => setModels(d.models || models))
      .catch(() => {});
  }, []);

  // Persistens
  useEffect(() => {
    const saved = localStorage.getItem("mission_chat_history");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0)
      localStorage.setItem("mission_chat_history", JSON.stringify(messages));
  }, [messages]);

  // System-prompt med kontext om brädan
  const buildSystemPrompt = () => {
    return `Du är Mission Control-assistenten för Jonas Hylténs Roials Capital.
Du svarar ALLTID på svenska, kort och koncist (max 5 meningar om inget annat begärs).
Du hjälper Jonas med hans AI-agents kanban-bräda (Roials Mission Control).
Aktiva agenter på brädan: Hermes Core (orkestrerar 12 cron-jobb), Mr. Writer (content-loop 8 bloggar), Inbox Manager (replied leads), Roials Alpha GTM (outreach/prospektsourcing/bounce).
Om Jonas ber dig skapa en uppgift, svara med exakt format: TASK: <titel> | prio: high|medium|low | agent: hermes-core|mr-writer|inbox-manager|roials-alpha | kategori: <kategori>
Skriv aldrig ut hemligheter eller API-nycklar.`;
  };

  const parseSSE = async (resp: Response, onDelta: (text: string) => void): Promise<string> => {
    if (!resp.body) return "";
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const chunk = JSON.parse(data);
          if (chunk.error) {
            full += `\n[Fel: ${chunk.error}]`;
            onDelta(full);
            continue;
          }
          const delta = chunk.choices?.[0]?.delta?.content || "";
          if (delta) {
            full += delta;
            onDelta(full);
          }
        } catch {}
      }
    }
    return full;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "Jonas",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isAgent: false,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamText("");

    // Bygg historik (senaste 12 meddelanden + system)
    const history = [
      { role: "system", content: buildSystemPrompt() },
      ...messages
        .slice(-12)
        .map((m) => ({ role: m.isAgent ? "assistant" : "user", content: m.text })),
      { role: "user", content: text },
    ];

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, model }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${err.slice(0, 100)}`);
      }

      const full = await parseSSE(resp, (t) => setStreamText(t));

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "Mission Control",
        text: full.trim() || "(tomt svar)",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isAgent: true,
      };
      setMessages((prev) => [...prev, agentMsg]);

      // Chat-to-task: om svaret innehåller TASK: -mönstret
      const taskMatch = full.match(/TASK:\s*(.+?)\s*\|\s*prio:\s*(\w+)\s*\|\s*agent:\s*(\w+)\s*\|\s*kategori:\s*(\w+)/i);
      if (taskMatch) {
        await createTaskFromChat(taskMatch[1], taskMatch[2], taskMatch[3], taskMatch[4]);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        const errMsg: Message = {
          id: (Date.now() + 2).toString(),
          sender: "Mission Control",
          text: `⚠️ Kunde inte nå modellen: ${e.message}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isAgent: true,
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } finally {
      setStreaming(false);
      setStreamText("");
      abortRef.current = null;
    }
  };

  const createTaskFromChat = async (title: string, prio: string, agent: string, cat: string) => {
    try {
      const all = await TasksAPI.getAll();
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: title.trim(),
        status: "todo",
        priority: (prio === "high" || prio === "medium" || prio === "low" ? prio : "medium") as Task["priority"],
        assignedTo: ["hermes-core", "mr-writer", "inbox-manager", "roials-alpha"].includes(agent)
          ? agent
          : "hermes-core",
        category: cat || "AI",
      };
      all.push(newTask);
      await TasksAPI.saveAll(all);
      const confirm: Message = {
        id: (Date.now() + 3).toString(),
        sender: "Mission Control",
        text: `✅ Kort skapat: "${newTask.title}" (${newTask.priority}, ${newTask.assignedTo})`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isAgent: true,
      };
      setMessages((prev) => [...prev, confirm]);
      window.dispatchEvent(new CustomEvent("kanban-refresh"));
    } catch (e: any) {
      console.error("Task-skapande misslyckades:", e);
    }
  };

  const convertLastAgentMsgToTask = () => {
    const lastAgent = [...messages].reverse().find((m) => m.isAgent);
    if (!lastAgent) return;
    const match = lastAgent.text.match(/TASK:\s*(.+?)\s*\|\s*prio:\s*(\w+)\s*\|\s*agent:\s*(\w+)\s*\|\s*kategori:\s*(\w+)/i);
    if (match) {
      createTaskFromChat(match[1], match[2], match[3], match[4]);
    } else {
      createTaskFromChat(lastAgent.text.slice(0, 80), "medium", "hermes-core", "AI");
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Senaste meddelanden (mini-view) */}
      {!isOpen && messages.length > 0 && (
        <div className="flex flex-col gap-2 mb-2 items-end">
          {messages.slice(-3).map((m: Message) => (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              key={m.id}
              className="glass-card px-3 py-1.5 text-xs max-w-[220px] border-primary/20"
            >
              <span className="font-bold text-primary mr-1">{m.sender}:</span>
              {m.text}
            </motion.div>
          ))}
        </div>
      )}

      {/* Main Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-card w-[22rem] h-[520px] flex flex-col shadow-2xl relative overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Mission Chat</h3>
                <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                  <Zap className="w-2.5 h-2.5" />
                  {model === "big-pickle" ? "Big Pickle" : "DeepSeek"}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4 hover:text-primary transition-colors" />
                </button>
              </div>
            </div>

            {/* Modellväljare */}
            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 bg-white/[0.02]">
              <Cpu className="w-3 h-3 text-muted-foreground" />
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={streaming}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] flex-1 focus:outline-none focus:border-primary/50 disabled:opacity-50"
              >
                {Object.entries(models).map(([id, label]) => (
                  <option key={id} value={id} className="bg-[#0a0f1e]">
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !streaming && (
                <div className="text-center text-xs text-muted-foreground pt-8 space-y-1">
                  <p className="text-base">🚀</p>
                  <p>Fråga mig om brädan, agenterna eller uppgifterna.</p>
                  <p className="opacity-60">
                    Säg t.ex. "skapa en uppgift att ringa X" så gör jag ett kort.
                  </p>
                </div>
              )}
              {messages.map((m: Message) => (
                <div key={m.id} className={`flex flex-col ${m.isAgent ? "items-start" : "items-end"}`}>
                  <div
                    className={`px-3 py-2 rounded-xl text-sm ${
                      m.isAgent
                        ? "bg-white/10"
                        : "bg-primary/20 border border-primary/30"
                    } max-w-[85%] relative group`}
                  >
                    {m.text}
                    {m.isAgent && (
                      <button
                        onClick={() => convertLastAgentMsgToTask()}
                        className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Skapa Kanban-kort"
                      >
                        <PlusSquare className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {m.sender} • {m.time}
                  </span>
                </div>
              ))}
              {streaming && (
                <div className="flex flex-col items-start">
                  <div className="px-3 py-2 rounded-xl text-sm bg-white/10 max-w-[85%]">
                    {streamText || (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Tänker...
                      </span>
                    )}
                    {streamText && <span className="inline-block w-1.5 h-3 bg-primary ml-0.5 animate-pulse" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">Mission Control</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={streaming ? "Skriver..." : "Skriv till Mission Control..."}
                  disabled={streaming}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs flex-1 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={streaming || !input.trim()}
                  className="bg-primary hover:bg-primary-dark p-2 rounded-lg transition-colors disabled:opacity-40"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 relative"
      >
        <MessageSquare className="w-6 h-6 text-white" />
        {streaming && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
        )}
      </button>
    </div>
  );
};

export default MissionChat;
