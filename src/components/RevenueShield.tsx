import React from 'react';
import { Shield, ArrowRight, Zap } from 'lucide-react';
import tasksData from '../data/tasks.json';

const RevenueShield = () => {
  const activeTasks = tasksData.filter((t: any) => t.category === 'SDR' || t.priority === 'high');

  return (
    <div className="glass-card border-primary/30 relative overflow-hidden group">
      {/* Background glow for shield */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-all duration-500" />
      
      <div className="p-5 flex flex-col md:flex-row md:items-center gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/30 border border-primary/40 flex items-center justify-center flex-shrink-0 animate-breathe">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-primary">REVENUE SHIELD</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Prio-1 SDR Tasks — Focus Mode</p>
          </div>
        </div>
        
        <div className="flex-1 flex flex-wrap gap-3">
          {activeTasks.slice(0, 3).map((task: any) => (
            <div key={task.id} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group/item hover:border-primary/20">
               <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
               <span className="text-[11px] font-medium text-white max-w-[150px] truncate">{task.title}</span>
               <span className="text-[9px] font-bold text-muted-foreground opacity-60 uppercase">{task.assignedTo}</span>
            </div>
          ))}
          {activeTasks.length > 3 && (
            <div className="text-[10px] text-primary flex items-center gap-1 font-bold">
               +{activeTasks.length - 3} Mer
            </div>
          )}
        </div>
        
        <button className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all">
           Lansera Sekvenser
           <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default RevenueShield;
