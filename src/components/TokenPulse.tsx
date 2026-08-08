import React, { useEffect, useState } from "react";
import { BarChart3, Activity, AlertTriangle } from "lucide-react";

interface TokenStatus {
  level: string;
  generated_at: string;
  today: { tokens: number; cost_sek: number };
  week: { tokens: number; cost_sek: number };
  month: { tokens: number; cost_sek: number };
  daily: { date: string; tokens: number }[];
  by_model: { model: string; tokens: number; cost_sek: number }[];
  warn_day_tokens: number;
  crit_day_tokens: number;
}

const fmtM = (n: number) => `${(n / 1e6).toFixed(1)}M`;

const TokenPulse = () => {
  const [data, setData] = useState<TokenStatus | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch("token_status.json") // relativ → respekterar vite base-url
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          setData(d);
          setErr(false);
        })
        .catch(() => setErr(true));
    load();
    const t = setInterval(load, 60_000); // uppdatera varje minut
    return () => clearInterval(t);
  }, []);

  if (err) {
    return (
      <div className="glass-card p-4 text-xs text-yellow-400 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" /> Token-data väntar på första körning…
      </div>
    );
  }
  if (!data) {
    return (
      <div className="glass-card p-4 text-xs text-muted-foreground flex items-center gap-2">
        <Activity className="w-4 h-4 animate-pulse" /> Läser token-data…
      </div>
    );
  }

  const lvl = data.level === "red" ? "🔴" : data.level === "yellow" ? "🟡" : "🟢";
  const maxDay = Math.max(...data.daily.map((d) => d.tokens), 1);
  const warnPct = data.warn_day_tokens ? (data.today.tokens / data.warn_day_tokens) * 100 : 0;

  return (
    <div className="glass-card p-4 border-emerald-400/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-primary font-bold text-xs uppercase tracking-widest flex items-center gap-2">
          <BarChart3 className="w-3 h-3" /> Token Monitor {lvl}
        </h3>
        <span className="text-[9px] text-muted-foreground">{data.generated_at}</span>
      </div>

      {/* Stapeldiagram: 7 dagar */}
      <div className="flex items-end gap-1.5 h-16 mb-2">
        {data.daily.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t bg-gradient-to-t from-primary/30 to-primary/80"
                 style={{ height: `${Math.max((d.tokens / maxDay) * 100, 4)}%` }}
                 title={`${d.date}: ${fmtM(d.tokens)} tok`} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-muted-foreground mb-3">
        {data.daily.map((d) => (
          <span key={d.date}>{d.date.slice(8)}/{d.date.slice(5, 7)}</span>
        ))}
      </div>

      {/* Siffror */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        {[
          ["Idag", fmtM(data.today.tokens)],
          ["7 dgr", fmtM(data.week.tokens)],
          ["30 dgr", fmtM(data.month.tokens)],
        ].map(([label, val]) => (
          <div key={label} className="bg-black/40 rounded-lg py-2">
            <div className="text-[9px] text-muted-foreground uppercase">{label}</div>
            <div className="text-sm font-bold text-white">{val}</div>
          </div>
        ))}
      </div>

      {/* Varningsstapel */}
      <div className="bg-black/40 rounded-lg p-2 mb-2">
        <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
          <span>Dagens användning vs varningsgräns (300M)</span>
          <span>{warnPct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${data.level === "red" ? "bg-red-500" : data.level === "yellow" ? "bg-yellow-400" : "bg-emerald-400"}`}
               style={{ width: `${Math.min(warnPct, 100)}%` }} />
        </div>
      </div>

      {/* Top-modeller */}
      <div className="space-y-1">
        {data.by_model.map((m) => (
          <div key={m.model} className="flex justify-between text-[9px]">
            <span className="text-muted-foreground truncate">{m.model}</span>
            <span className="text-white font-mono">{fmtM(m.tokens)}</span>
          </div>
        ))}
      </div>
      <p className="text-[8px] text-muted-foreground mt-2 opacity-60">
        Kostnad: 0 SEK (gratis-modeller) · Data från Hermes state.db
      </p>
    </div>
  );
};

export default TokenPulse;
