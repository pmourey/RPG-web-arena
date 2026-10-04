import React from 'react';
import { X, Skull } from 'lucide-react';

interface KilledMonstersModalProps {
  killedMonsters: Record<string, number>;
  totalKills: number;
  onClose: () => void;
}

export const KilledMonstersModal: React.FC<KilledMonstersModalProps> = ({
  killedMonsters,
  totalKills,
  onClose,
}) => {
  const entries = Object.entries(killedMonsters).sort((a, b) => b[1] - a[1]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md p-3.5 sm:p-4 shadow-2xl flex flex-col space-y-3 sm:space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-stone-800">
          <h3 className="font-bold text-sm sm:text-base text-stone-100 flex items-center gap-2">
            <Skull className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
            <span>Monstres tués ({totalKills} au total)</span>
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-[11px] sm:text-xs text-stone-400">
          Récapitulatif des monstres abattus par votre groupe au cours de cette session :
        </div>

        <div className="border border-stone-800 rounded-xl overflow-hidden divide-y divide-stone-800 bg-stone-950/40 overflow-y-auto flex-1 max-h-64 sm:max-h-80">
          {entries.length === 0 ? (
            <div className="p-6 text-center text-stone-500 text-xs">
              Aucun monstre tué pour l'instant. Lancez une rencontre !
            </div>
          ) : (
            entries.map(([name, count]) => (
              <div key={name} className="p-2.5 flex items-center justify-between hover:bg-stone-800/30">
                <span className="font-medium text-xs text-stone-200">{name}</span>
                <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-stone-800 border border-stone-700">
                  {count}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2 px-4 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
