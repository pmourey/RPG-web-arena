import React from 'react';
import { LevelUpResult } from '../engine/loader';
import { Sparkles, Heart, Shield, Zap, X, Award, ChevronRight } from 'lucide-react';

interface LevelUpModalProps {
  results: LevelUpResult[];
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ results, onClose }) => {
  if (!results || results.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-amber-500/60 rounded-2xl w-full max-w-2xl max-h-[90vh] p-3.5 sm:p-5 shadow-2xl flex flex-col space-y-3 sm:space-y-4 overflow-hidden relative">
        {/* Decorative Golden Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-32 bg-amber-500/20 blur-3xl pointer-events-none rounded-full" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-stone-800 shrink-0 relative z-10">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-amber-400 tracking-wide uppercase">
                  Montée de Niveau !
                </h2>
                <p className="text-[10px] sm:text-xs text-stone-400">
                  Le repos complet a permis à vos héros de développer leur puissance et d'assimiler de nouvelles compétences.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Leveled Up Heroes List */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 sm:space-y-3 pr-1 combat-log-scrollbar relative z-10">
          {results.map((res, idx) => {
            const h = res.hero;
            const activeSlots = res.newSpellSlots
              .map((slots, i) => (slots > 0 ? `L${i + 1}:${slots}` : null))
              .filter(Boolean);

            return (
              <div
                key={idx}
                className="bg-stone-950/70 border border-amber-500/30 rounded-xl p-3 sm:p-3.5 shadow-md space-y-2.5"
              >
                {/* Hero Header */}
                <div className="flex items-center justify-between gap-2 border-b border-stone-800/80 pb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-100 text-sm sm:text-base truncate">{h.name}</span>
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                        {h.class_type} ({h.race})
                      </span>
                    </div>
                  </div>
                  {/* Level Transition Badge */}
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-950/80 to-amber-900/50 border border-amber-500/50 px-2.5 py-1 rounded-lg text-amber-300 font-bold text-xs sm:text-sm shrink-0">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Niveau {res.oldLevel}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-amber-200 font-black">Niveau {res.newLevel}</span>
                  </div>
                </div>

                {/* Stat Bonuses Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {/* HP Gained */}
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>
                      <div className="text-[9px] text-stone-400 font-medium">Points de Vie</div>
                      <div className="font-bold text-stone-200">
                        <span className="text-emerald-400">+{res.hpGained} PV</span>{' '}
                        <span className="text-stone-400 text-[10px]">({res.newMaxHp} Max)</span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-attack or Attack Bonus */}
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="text-[9px] text-stone-400 font-medium">Attaques par Tour</div>
                      <div className="font-bold text-stone-200">
                        {h.multi_attack && h.multi_attack > 1 ? `${h.multi_attack}x par tour` : '1x par tour'}
                      </div>
                    </div>
                  </div>

                  {/* Spell Slots */}
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800 flex items-center gap-2 col-span-2 sm:col-span-1">
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[9px] text-stone-400 font-medium">Emplacements de sorts</div>
                      <div className="font-bold text-stone-200 text-[10px] sm:text-[11px] truncate">
                        {activeSlots.length > 0 ? activeSlots.join(' ') : 'Non lanceur'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Newly Learned Spells */}
                {res.newSpells.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-stone-900/90 border border-amber-500/30 space-y-1.5">
                    <div className="text-[10px] sm:text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Nouveau{res.newSpells.length > 1 ? 'x sorts appris' : ' sort appris'} :
                    </div>
                    <div className="space-y-1">
                      {res.newSpells.map((s, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-1.5 rounded-md bg-stone-950/60 border border-stone-800 text-xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-stone-100">{s.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-950 text-amber-300 border border-amber-700/60 font-medium">
                              Niv. {s.level}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400 truncate max-w-sm">{s.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-stone-800 shrink-0 flex justify-end relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 shadow-md shadow-amber-600/20 transition-all active:scale-[0.98] touch-manipulation flex items-center justify-center gap-2"
          >
            <span>Continuer l'aventure</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
