import React, { useState } from 'react';
import { HeroData } from '../types/game';
import { assignFormationPositions } from '../engine/rules';
import { buildPartyFromHeroes } from '../engine/loader';
import { X, ArrowUp, ArrowDown, Users, Shield, Sparkles, Plus, Minus, Info } from 'lucide-react';

interface ReorderModalProps {
  party: HeroData[];
  onClose: () => void;
  onSaveOrder: (newParty: HeroData[]) => void;
}

export const ReorderModal: React.FC<ReorderModalProps> = ({
  party,
  onClose,
  onSaveOrder,
}) => {
  const [orderedHeroes, setOrderedHeroes] = useState<HeroData[]>([...party]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);

  const partySize = orderedHeroes.length;
  const isTripartite = partySize > 6;

  // Calcul des seuils de lignes
  const frontCount = isTripartite ? Math.ceil(partySize / 3) : Math.min(3, Math.ceil(partySize / 2));
  const middleCount = isTripartite ? Math.round((partySize - frontCount) / 2) : 0;

  const getHeroLineInfo = (idx: number) => {
    if (idx < frontCount) {
      return {
        label: 'Avant',
        fullLabel: '⚔️ Première Ligne (Front)',
        badgeClass: 'bg-rose-950/70 text-rose-300 border border-rose-800/60',
      };
    }
    if (isTripartite && idx < frontCount + middleCount) {
      return {
        label: 'Milieu',
        fullLabel: '🛡️ Ligne Médiane (Mid)',
        badgeClass: 'bg-amber-950/70 text-amber-300 border border-amber-800/60',
      };
    }
    return {
      label: 'Arrière',
      fullLabel: '🏹 Arrière-Garde (Back)',
      badgeClass: 'bg-sky-950/70 text-sky-300 border border-sky-800/60',
    };
  };

  const moveUp = () => {
    if (selectedIndex === null || selectedIndex <= 0) return;
    const list = [...orderedHeroes];
    const item = list[selectedIndex];
    list[selectedIndex] = list[selectedIndex - 1];
    list[selectedIndex - 1] = item;
    setOrderedHeroes(list);
    setSelectedIndex(selectedIndex - 1);
  };

  const moveDown = () => {
    if (selectedIndex === null || selectedIndex >= orderedHeroes.length - 1) return;
    const list = [...orderedHeroes];
    const item = list[selectedIndex];
    list[selectedIndex] = list[selectedIndex + 1];
    list[selectedIndex + 1] = item;
    setOrderedHeroes(list);
    setSelectedIndex(selectedIndex + 1);
  };

  // Modifier la taille du groupe (de 3 à 12 héros)
  const handleChangePartySize = (newSize: number) => {
    if (newSize < 3 || newSize > 12) return;
    if (newSize === partySize) return;

    if (newSize < partySize) {
      const reduced = orderedHeroes.slice(0, newSize);
      setOrderedHeroes(reduced);
      if (selectedIndex !== null && selectedIndex >= newSize) {
        setSelectedIndex(newSize - 1);
      }
    } else {
      // Générer de nouveaux héros pour compléter
      const avgLevel = Math.max(1, Math.round(orderedHeroes.reduce((s, h) => s + h.level, 0) / (partySize || 1)));
      const freshParty = buildPartyFromHeroes(undefined, newSize, avgLevel);
      // Conserver les héros existants et compléter avec les nouveaux
      const existingNames = new Set(orderedHeroes.map((h) => h.name));
      const additions = freshParty.filter((h) => !existingNames.has(h.name));
      const combined = [...orderedHeroes, ...additions].slice(0, newSize);
      setOrderedHeroes(combined);
    }
  };

  const handleApply = () => {
    const updated = assignFormationPositions(orderedHeroes);
    onSaveOrder(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-3.5 sm:p-4 shadow-2xl flex flex-col space-y-3 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-stone-800">
          <div className="min-w-0 pr-2">
            <h3 className="font-bold text-sm sm:text-base text-stone-100 flex items-center gap-2 truncate">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
              <span>Formation & Ordre du groupe</span>
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-400 mt-0.5">
              {isTripartite
                ? 'Formation Tri-partite (Avant / Milieu / Arrière) activée pour > 6 héros.'
                : 'Formation tactique standard (Première Ligne & Arrière-Garde).'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Party Size Selector */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-stone-950/60 border border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-300 font-semibold">Taille du groupe :</span>
            <span className="font-bold text-amber-400 font-mono text-sm">{partySize} héros</span>
            {partySize >= 3 && partySize <= 5 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-medium">
                ★ Idéal 5e
              </span>
            )}
            {partySize > 6 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 font-medium">
                Tri-partite (3 rangs)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleChangePartySize(partySize - 1)}
              disabled={partySize <= 3}
              title="Réduire d'un aventurier"
              className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <select
              value={partySize}
              onChange={(e) => handleChangePartySize(Number(e.target.value))}
              className="px-2 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-xs font-semibold"
            >
              <option value={3}>3 héros (Idéal 5e)</option>
              <option value={4}>4 héros (Standard 5e)</option>
              <option value={5}>5 héros (Idéal 5e)</option>
              <option value={6}>6 héros (Classique)</option>
              <option value={7}>7 héros (Tri-partite)</option>
              <option value={8}>8 héros (Tri-partite)</option>
              <option value={9}>9 héros (Tri-partite)</option>
              <option value={10}>10 héros (Tri-partite)</option>
              <option value={12}>12 héros (Bataillon)</option>
            </select>
            <button
              type="button"
              onClick={() => handleChangePartySize(partySize + 1)}
              disabled={partySize >= 12}
              title="Ajouter un aventurier"
              className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Hero list with line tags */}
        <div className="border border-stone-800 rounded-xl overflow-hidden divide-y divide-stone-800 bg-stone-950/40 max-h-60 sm:max-h-68 overflow-y-auto combat-log-scrollbar">
          {orderedHeroes.map((hero, idx) => {
            const isSelected = selectedIndex === idx;
            const lineInfo = getHeroLineInfo(idx);

            return (
              <div
                key={hero.id}
                onClick={() => setSelectedIndex(idx)}
                className={`p-2 sm:p-2.5 flex items-center justify-between cursor-pointer transition-colors touch-manipulation ${
                  isSelected ? 'bg-amber-950/40 border-l-4 border-amber-500' : 'hover:bg-stone-800/40'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <span className="font-mono text-xs text-stone-500 w-4 shrink-0">{idx + 1}.</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-stone-200 truncate">{hero.name}</div>
                    <div className="text-[10px] text-stone-400 truncate">
                      {hero.class_type} • {hero.race} • Niv.{hero.level}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${lineInfo.badgeClass}`}
                  >
                    {lineInfo.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Up / Down Controls */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={moveUp}
            disabled={selectedIndex === null || selectedIndex <= 0}
            className="flex-1 py-1.5 sm:py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 disabled:opacity-40 text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors touch-manipulation"
          >
            <ArrowUp className="w-4 h-4" /> Monter
          </button>
          <button
            type="button"
            onClick={moveDown}
            disabled={selectedIndex === null || selectedIndex >= orderedHeroes.length - 1}
            className="flex-1 py-1.5 sm:py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 disabled:opacity-40 text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors touch-manipulation"
          >
            <ArrowDown className="w-4 h-4" /> Descendre
          </button>
        </div>

        {/* Tactical Breach Rule Note */}
        <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800/80 text-[10px] text-stone-400 leading-relaxed flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <span>
            <strong>Règle de mêlée & Brèche :</strong> Seule la première ligne peut être attaquée en mêlée. Si un héros y tombe sans protection (bouclier ou magie), une brèche s'ouvre permettant aux monstres de frapper la ligne suivante.
          </span>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="py-1.5 px-4 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow transition-colors"
          >
            Valider la Formation
          </button>
        </div>
      </div>
    </div>
  );
};
