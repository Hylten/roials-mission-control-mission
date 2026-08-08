import React, { useEffect, useState } from "react";
import { Sunrise, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface BriefSection {
  title: string;
  icon: string;
  items: string[];
}

interface MorningBriefData {
  date: string;
  generated_at: string;
  needs_attention: boolean;
  summary: string;
  sections: BriefSection[];
}

const MorningBrief = () => {
  const [data, setData] = useState<MorningBriefData | null>(null);
  const [open, setOpen] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch("morning_brief.json")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          setData(d);
          setErr(false);
        })
        .catch(() => setErr(true));
    load();
    const t = setInterval(load, 300_000); // var 5:e minut
    return () => clearInterval(t);
  }, []);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground tracking-widest uppercase">
          <Sunrise className="w-4 h-4 text-primary" />
          Morning Brief
          {data?.needs_attention && (
            <span className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full normal-case text-[9px]">
              <AlertTriangle className="w-2.5 h-2.5" /> kräver uppmärksamhet
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-muted-foreground hover:text-primary transition-colors"
          title={open ? "Minimera" : "Visa"}
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className="glass-card p-4">
          {err && (
            <p className="text-xs text-yellow-400">
              Briefen genereras automatiskt 07:00 — eller kör: ./run.sh scripts/morning_brief.py
            </p>
          )}
          {data && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white">{data.summary}</span>
                <span className="text-[9px] text-muted-foreground ml-3 shrink-0">
                  🌅 {data.date} · {data.generated_at.slice(11, 16)}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.sections.map((sec) => (
                  <div key={sec.title} className="bg-black/40 rounded-lg p-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
                      {sec.icon} {sec.title}
                    </h4>
                    <ul className="space-y-1">
                      {sec.items.map((item, i) => (
                        <li key={i} className="text-[11px] text-white/80 leading-snug">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};

export default MorningBrief;
