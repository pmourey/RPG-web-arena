import React, { useEffect, useRef, useState } from 'react';
import { ScrollText, Trash2, Copy, Check } from 'lucide-react';

interface CombatLogProps {
  logs: string[];
  onClear: () => void;
}

export const CombatLog: React.FC<CombatLogProps> = ({ logs, onClear }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getLogStyle = (msg: string) => {
    if (msg.includes('ROUND') || msg.includes('NOUVELLE RENCONTRE') || msg.includes('=')) {
      return 'text-amber-400 font-bold border-y border-stone-800/80 py-1 bg-amber-950/20';
    }
    if (msg.includes('VICTOIRE') || msg.includes('VICTORY')) {
      return 'text-emerald-400 font-bold text-sm bg-emerald-950/30 p-1.5 rounded border border-emerald-800/50';
    }
    if (msg.includes('DÉFAITE') || msg.includes('vaincu') || msg.includes('est mort')) {
      return 'text-rose-400 font-semibold';
    }
    if (msg.includes('COUP CRITIQUE') || msg.includes('AUTOMATIQUEMENT')) {
      return 'text-yellow-300 font-semibold';
    }
    if (msg.includes('ÉCHEC CRITIQUE')) {
      return 'text-rose-500 font-semibold';
    }
    if (msg.includes('[Sort]')) {
      return 'text-cyan-300';
    }
    if (msg.includes('magique') || msg.includes('trouve') || msg.includes('auto-équipe')) {
      return 'text-amber-300';
    }
    if (msg.includes('RATE')) {
      return 'text-stone-400 italic';
    }
    return 'text-stone-300';
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl flex flex-col h-full shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-200">
            Journal de combat
          </h3>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-400 font-mono">
            {logs.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-stone-400 flex items-center gap-1 cursor-pointer mr-1">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-stone-800 border-stone-700 text-amber-500 focus:ring-0 w-3 h-3"
            />
            Auto-scroll
          </label>
          <button
            type="button"
            onClick={handleCopy}
            title="Copier le journal"
            className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClear}
            title="Effacer le journal"
            className="p-1 rounded text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log lines */}
      <div
        ref={scrollRef}
        className="p-3 overflow-y-auto flex-1 font-mono text-[11px] leading-relaxed space-y-1 bg-stone-950/40 divide-y divide-stone-900/60"
      >
        {logs.length === 0 ? (
          <div className="p-8 text-center text-stone-500 text-xs">
            Le journal est vide. Cliquez sur Nouvelle Rencontre pour commencer !
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className={`pt-1 ${getLogStyle(log)}`}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
