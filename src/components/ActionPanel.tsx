import React from 'react';
import { Combatant, HeroData, MonsterData, SpellData } from '../types/game';
import { isBeneficial } from '../engine/effects';
import { isDead } from '../engine/character';
import { Sword, Sparkles, Flame, HeartHandshake } from 'lucide-react';

interface ActionPanelProps {
  currentHero: HeroData | null;
  selectedTarget: Combatant | null;
  combatOver: boolean;
  onMelee: () => void;
  onCastSpell: (spell: SpellData) => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  currentHero,
  selectedTarget,
  combatOver,
  onMelee,
  onCastSpell,
}) => {
  const canAct = !combatOver && currentHero !== null;
  const targetIsLivingMonster = selectedTarget && !selectedTarget.is_hero && !isDead(selectedTarget);

  const canMelee = canAct && Boolean(targetIsLivingMonster);

  const isSpellTargetValid = (spell: SpellData): boolean => {
    if (!selectedTarget) return false;
    const beneficial = isBeneficial(spell);
    if (selectedTarget.hp <= 0) {
      // Revive spells can target dead hero allies
      const isRevive = spell.effect === 'cleanse' && ['Resurrection', 'Revivify'].includes(spell.name);
      return isRevive && selectedTarget.is_hero;
    }
    if (beneficial) return selectedTarget.is_hero;
    return !selectedTarget.is_hero;
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
          <Sword className="w-4 h-4 text-amber-500" />
          Actions disponibles
        </h3>
        {currentHero && (
          <span className="text-xs text-amber-400 font-medium">
            Attaques d'arme : <strong className="font-bold">{currentHero.multi_attack || 1}x</strong>
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Melee attack row */}
        <div>
          <button
            type="button"
            onClick={onMelee}
            disabled={!canMelee}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow transition-all ${
              canMelee
                ? 'bg-rose-700 hover:bg-rose-600 active:scale-[0.99] text-white shadow-rose-900/30'
                : 'bg-stone-800/80 text-stone-500 border border-stone-800 cursor-not-allowed'
            }`}
          >
            <Sword className="w-4 h-4" />
            <span>⚔️ Melee Attack {currentHero?.multi_attack && currentHero.multi_attack > 1 ? `(${currentHero.multi_attack}x)` : ''}</span>
          </button>
          {!canMelee && canAct && (
            <p className="text-[11px] text-stone-500 text-center mt-1">
              {!selectedTarget
                ? 'Sélectionnez un monstre pour attaquer en mêlée'
                : selectedTarget.is_hero
                ? 'Impossible d’attaquer un allié'
                : isDead(selectedTarget)
                ? 'Ce monstre est déjà vaincu'
                : ''}
            </p>
          )}
        </div>

        {/* Spells row */}
        {currentHero && (
          <div>
            <div className="text-[11px] text-stone-400 font-medium mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Sorts disponibles (cliquez pour lancer sur la cible sélectionnée) :
            </div>

            {currentHero.spells.length === 0 ? (
              <div className="p-3 text-center text-xs text-stone-500 bg-stone-950/40 rounded-xl border border-stone-800/60">
                {currentHero.name} n'est pas un lanceur de sorts.
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-stone-700">
                {currentHero.spells.map((spell, idx) => {
                  const slotsLeft = currentHero.current_spell_slots[spell.level - 1] || 0;
                  const slotsMax = currentHero.max_spell_slots[spell.level - 1] || 0;
                  const targetOk = spell.multi_target || isSpellTargetValid(spell);
                  const canCast = canAct && slotsLeft > 0 && targetOk;
                  const beneficial = isBeneficial(spell);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onCastSpell(spell)}
                      disabled={!canCast}
                      title={`${spell.name} (Niveau ${spell.level})\n${spell.description}`}
                      className={`shrink-0 p-2.5 rounded-xl border text-left transition-all min-w-[150px] max-w-[200px] flex flex-col justify-between ${
                        canCast
                          ? beneficial
                            ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-600/70 text-emerald-100 hover:border-emerald-400'
                            : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-600/70 text-amber-100 hover:border-amber-400'
                          : 'bg-stone-900/60 border-stone-800 text-stone-600 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="font-bold text-xs truncate flex items-center gap-1">
                          {beneficial ? (
                            <HeartHandshake className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">{spell.name}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-stone-400 flex items-center justify-between">
                        <span>Niv.{spell.level}</span>
                        <span className={`font-mono font-bold ${slotsLeft > 0 ? 'text-amber-400' : 'text-stone-600'}`}>
                          {slotsLeft}/{slotsMax}
                        </span>
                      </div>
                      <div className="text-[9px] text-stone-400/80 truncate mt-1">{spell.description}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
