import React, { useState } from 'react';
import { HeroData } from '../types/game';
import { X, ArrowUp, ArrowDown, Users } from 'lucide-react';

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

  const handleApply = () => {
    // Update front/back position based on order (first 3 = front, remaining = back)
    const updated = orderedHeroes.map((hero, idx) => ({
      ...hero,
      position: (idx < 3 ? 'front' : 'back') as 'front' | 'back',
    }));
    onSaveOrder(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md p-4 shadow-2xl flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <h3 className="font-bold text-base text-stone-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Réordonner les héros
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-400">
          Sélectionnez un héros puis utilisez <strong>Monter</strong> / <strong>Descendre</strong>. Les 3 premiers héros forment la première ligne (Front-line).
        </p>

        {/* Hero list */}
        <div className="border border-stone-800 rounded-xl overflow-hidden divide-y divide-stone-800 bg-stone-950/40">
          {orderedHeroes.map((hero, idx) => {
            const isSelected = selectedIndex === idx;
            const isFront = idx < 3;
            return (
              <div
                key={hero.id}
                onClick={() => setSelectedIndex(idx)}
                className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected ? 'bg-amber-950/40 border-l-4 border-amber-500' : 'hover:bg-stone-800/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-stone-500 w-4">{idx + 1}.</span>
                  <div>
                    <div className="font-semibold text-xs text-stone-200">{hero.name}</div>
                    <div className="text-[10px] text-stone-400">
                      {hero.class_type} • {hero.race} • Niv.{hero.level}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isFront
                      ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                      : 'bg-blue-950/60 text-blue-300 border border-blue-800/50'
                  }`}
                >
                  {isFront ? 'Front' : 'Back'}
                </span>
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
            className="flex-1 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowUp className="w-4 h-4" /> Monter
          </button>
          <button
            type="button"
            onClick={moveDown}
            disabled={selectedIndex === null || selectedIndex >= orderedHeroes.length - 1}
            className="flex-1 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowDown className="w-4 h-4" /> Descendre
          </button>
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
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};
