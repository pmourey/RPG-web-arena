import React, { useState } from 'react';
import { HeroData } from '../types/game';
import { runBatchSimulation, BatchSimulationResult } from '../engine/simulation';
import { X, Play, RefreshCw, Trophy, Skull, Sparkles, Shield, Award } from 'lucide-react';

interface BatchSimulationModalProps {
  onClose: () => void;
  onImportParty?: (newParty: HeroData[]) => void;
}

export const BatchSimulationModal: React.FC<BatchSimulationModalProps> = ({
  onClose,
  onImportParty,
}) => {
  const [combats, setCombats] = useState<number>(50);
  const [restFreq, setRestFreq] = useState<number>(20);
  const [maxMonsters, setMaxMonsters] = useState<number>(2);
  const [partyLevel, setPartyLevel] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [result, setResult] = useState<BatchSimulationResult | null>(null);

  const handleRun = () => {
    setIsSimulating(true);
    setTimeout(() => {
      try {
        const res = runBatchSimulation({
          maxCombats: combats,
          partySize: 6,
          maxMonsters,
          restFreq,
          partyLevel,
        });
        setResult(res);
      } catch (e: any) {
        console.error(e);
      } finally {
        setIsSimulating(false);
      }
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-4xl max-h-[92vh] p-4 sm:p-6 shadow-2xl flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div>
            <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Simulateur de Combat RPG (Mode Batch)
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Simule des dizaines ou centaines de combats automatisés, avec montée de niveau, butin, repos et statistiques détaillées.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-950/50 p-3 rounded-xl border border-stone-800 text-xs">
          <div>
            <label className="block text-stone-400 font-medium mb-1">Nombre de combats</label>
            <select
              value={combats}
              onChange={(e) => setCombats(Number(e.target.value))}
              disabled={isSimulating}
              className="w-full px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 font-semibold"
            >
              <option value={10}>10 combats</option>
              <option value={50}>50 combats</option>
              <option value={100}>100 combats</option>
              <option value={250}>250 combats</option>
              <option value={500}>500 combats</option>
              <option value={1000}>1000 combats</option>
            </select>
          </div>

          <div>
            <label className="block text-stone-400 font-medium mb-1">Repos à l'auberge tous les</label>
            <select
              value={restFreq}
              onChange={(e) => setRestFreq(Number(e.target.value))}
              disabled={isSimulating}
              className="w-full px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 font-semibold"
            >
              <option value={5}>5 combats</option>
              <option value={10}>10 combats</option>
              <option value={20}>20 combats</option>
              <option value={30}>30 combats</option>
              <option value={50}>50 combats</option>
            </select>
          </div>

          <div>
            <label className="block text-stone-400 font-medium mb-1">Max monstres / combat</label>
            <select
              value={maxMonsters}
              onChange={(e) => setMaxMonsters(Number(e.target.value))}
              disabled={isSimulating}
              className="w-full px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 font-semibold"
            >
              <option value={1}>1 monstre</option>
              <option value={2}>2 monstres</option>
              <option value={3}>3 monstres</option>
              <option value={4}>4 monstres</option>
            </select>
          </div>

          <div>
            <label className="block text-stone-400 font-medium mb-1">Niveau initial du groupe</label>
            <select
              value={partyLevel}
              onChange={(e) => setPartyLevel(Number(e.target.value))}
              disabled={isSimulating}
              className="w-full px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 font-semibold"
            >
              <option value={1}>Niveau 1</option>
              <option value={3}>Niveau 3</option>
              <option value={5}>Niveau 5</option>
              <option value={8}>Niveau 8</option>
              <option value={12}>Niveau 12</option>
              <option value={15}>Niveau 15</option>
            </select>
          </div>
        </div>

        {/* Launch Button */}
        <div>
          <button
            type="button"
            onClick={handleRun}
            disabled={isSimulating}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Simulation en cours...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Lancer la Simulation ({combats} combats)
              </>
            )}
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {result ? (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl">
                  <div className="text-[10px] text-stone-400 uppercase font-bold">Victoires</div>
                  <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <Trophy className="w-5 h-5" />
                    {result.victories} / {result.numCombats}
                  </div>
                  <div className="text-[10px] text-stone-400">
                    Taux: {Math.round((result.victories / (result.numCombats || 1)) * 100)}%
                  </div>
                </div>

                <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl">
                  <div className="text-[10px] text-stone-400 uppercase font-bold">Monstres Tués</div>
                  <div className="text-xl font-bold text-rose-400 flex items-center gap-1.5 mt-0.5">
                    <Skull className="w-5 h-5" />
                    {result.defeatedMonstersCount}
                  </div>
                  <div className="text-[10px] text-stone-400">ennemis terrassés</div>
                </div>

                <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl">
                  <div className="text-[10px] text-stone-400 uppercase font-bold">Sorts Lancés</div>
                  <div className="text-xl font-bold text-blue-400 flex items-center gap-1.5 mt-0.5">
                    <Sparkles className="w-5 h-5" />
                    {result.totalSpellsCast}
                  </div>
                  <div className="text-[10px] text-stone-400">incantations magiques</div>
                </div>

                <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl">
                  <div className="text-[10px] text-stone-400 uppercase font-bold">Survivants</div>
                  <div className="text-xl font-bold text-amber-400 flex items-center gap-1.5 mt-0.5">
                    <Shield className="w-5 h-5" />
                    {result.party.filter((h) => h.hp > 0).length} / {result.party.length}
                  </div>
                  <div className="text-[10px] text-stone-400">héros encore vivants</div>
                </div>
              </div>

              {/* Party Final Status */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider">État Final du Groupe</h4>
                  {onImportParty && (
                    <button
                      type="button"
                      onClick={() => {
                        onImportParty(result.party);
                        onClose();
                      }}
                      className="text-xs px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors flex items-center gap-1"
                    >
                      <Award className="w-3.5 h-3.5" />
                      Jouer avec ce groupe dans l'arène
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.party.map((hero) => (
                    <div
                      key={hero.id}
                      className={`p-2.5 rounded-xl border text-xs ${
                        hero.hp > 0
                          ? 'bg-stone-950/50 border-stone-800 text-stone-200'
                          : 'bg-stone-900/30 border-stone-800/40 text-stone-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-stone-100">{hero.name}</strong> • Niv.{hero.level} {hero.class_type} ({hero.race})
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            PV: {hero.hp}/{hero.max_hp} • {hero.weapon.name} ({hero.weapon.damage_dice.num_dice}d{hero.weapon.damage_dice.roll_dice}) • {hero.armor.name} (+{hero.armor.bonus} CA)
                          </div>
                        </div>
                        <div className="text-right text-[11px] font-mono text-amber-400 shrink-0">
                          {hero.gold} gp | {hero.xp} XP
                        </div>
                      </div>
                      {hero.spells.length > 0 && (
                        <div className="text-[10px] text-stone-400 truncate mt-1">
                          Sorts : {hero.spells.map((s) => `${s.level}:${s.name}`).join(' | ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Monsters killed stats by level */}
              <div>
                <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Statistiques des monstres tués par niveau
                </h4>
                <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1.5 text-xs font-mono max-h-48 overflow-y-auto">
                  {result.killedByLevel.map((bucket, idx) => {
                    const keys = Object.keys(bucket);
                    if (keys.length === 0) return null;
                    return (
                      <div key={idx} className="flex gap-2">
                        <span className="text-amber-400 font-bold w-12 shrink-0">Niv {idx + 1}:</span>
                        <span className="text-stone-300">
                          {keys.map((k) => `${k}: ${bucket[k]}`).join(', ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Spells cast stats by level */}
              <div>
                <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Statistiques des sorts lancés par niveau
                </h4>
                <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1.5 text-xs font-mono max-h-48 overflow-y-auto">
                  {result.spellsCastByLevel.map((bucket, idx) => {
                    const keys = Object.keys(bucket);
                    if (keys.length === 0) return null;
                    return (
                      <div key={idx} className="flex gap-2">
                        <span className="text-blue-400 font-bold w-12 shrink-0">Niv {idx + 1}:</span>
                        <span className="text-stone-300">
                          {keys.map((k) => `${k}: ${bucket[k]}`).join(', ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Log samples */}
              <div>
                <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Extraits du journal de simulation
                </h4>
                <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl font-mono text-[11px] text-stone-300 max-h-40 overflow-y-auto space-y-1">
                  {result.logSamples.map((log, idx) => (
                    <div key={idx} className="leading-relaxed">{log}</div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-stone-500 text-xs">
              Configurez les paramètres ci-dessus et cliquez sur <strong>Lancer la Simulation</strong> pour débuter.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
