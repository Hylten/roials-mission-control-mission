import React from 'react';
import { Crown, Signal, Clock, Layout, MessageSquare, Zap, Bot } from "lucide-react";
import MissionChat from "./components/MissionChat";
import AgentPulse from "./components/AgentPulse";
import KanbanBoard from "./components/KanbanBoard";
import RevenueShield from "./components/RevenueShield";
import TokenPulse from "./components/TokenPulse";
import MorningBrief from "./components/MorningBrief";

const App = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-inter selection:bg-primary/30">
      {/* Dynamic Grid background */}
      <div
        className="absolute inset-0 animate-grid-pulse pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      
      {/* Radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-primary/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Upper Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-2xl shadow-primary/20 animate-breathe">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-outfit text-3xl font-bold tracking-tight text-white">
                ROI<span className="text-primary italic">ALS</span> MISSION CONTROL
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] opacity-80">
                Autonomous Agent Command Center — Jonas Hylten
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-1 px-4 py-2 glass-card border-emerald-400/20">
               <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Signal className="w-4 h-4 animate-pulse" />
                  <span>ALL SYSTEMS OPERATIONAL</span>
               </div>
               <span className="text-[9px] text-muted-foreground opacity-60">Last updated: Just now</span>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-3 space-y-6">
            {/* HERMES — primär (Jonas huvud-agent) */}
            <div className="glass-card p-6 h-auto border-primary/30 shadow-2xl shadow-primary/10">
              <h3 className="text-primary font-bold text-xs uppercase mb-4 tracking-widest flex items-center gap-2">
                <Bot className="w-3 h-3" />
                Hermes Core
              </h3>
              <div className="space-y-1.5 text-[11px] text-white/85">
                <p>🤖 Din huvud-agent — allt går igenom mig</p>
                <p>⚡ Kör just nu: DeepSeek (gratis)</p>
                <p>🔄 Motorn tickar var 10:e minut</p>
                <p>📅 12 automatiska jobb varje dag</p>
                <p>🛟 11 gratis-modeller i reservkedjan</p>
                <p>🧠 Självlärande via lokal AI ($0)</p>
              </div>
            </div>

            {/* TOKEN MONITOR — visuell förbrukning */}
            <TokenPulse />

            {/* Tipsruta: hur man pratar med agenter */}
            <div className="glass-card p-4 h-auto opacity-80">
              <h3 className="text-white/70 font-bold text-xs uppercase mb-3 tracking-widest">
                💬 Prata med agenter
              </h3>
              <p className="text-[10px] text-white/60 leading-relaxed">
                Längre ner i "AI Agent Squad" — klicka på en agent (t.ex. Codex, Claude
                eller Agent Zero), diktera med 🎤 eller skriv en uppgift, och den
                startar direkt i din Terminal.
              </p>
            </div>
          </div>
          
          <div className="md:col-span-9">
             <div className="flex items-center gap-2 px-2 pb-4 text-xs font-bold text-muted-foreground tracking-widest uppercase">
               <Layout className="w-4 h-4 text-primary" />
               MISSION OBJECTIVES & TASK FLOW
             </div>
             <KanbanBoard />
          </div>
        </div>

        {/* Priority SDR Focus Layer */}
        <RevenueShield />

        {/* Live Agent Dashboard */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2 text-xs font-bold text-muted-foreground tracking-widest uppercase">
            <Zap className="w-4 h-4 text-primary" />
            AI AGENT SQUAD — LIVE TELEMETRY
          </div>
          <AgentPulse />
        </section>

        {/* Morning Brief (längst ner, minimerbar) */}
        <MorningBrief />
      </div>

      {/* Floating Mission Chat (Fixed at Top-Right in component) */}
      <MissionChat />
    </div>
  );
};

export default App;
