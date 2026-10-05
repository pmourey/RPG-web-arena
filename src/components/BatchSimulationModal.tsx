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
  const [partySize, setPartySize] = useState<number>(4);
  const [maxMonsters, setMaxMonsters] = useState<number>(3);
  const [partyLevel, setPartyLevel] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [result, setResult] = useState<BatchSimulationResult | null>(null);

  const handleRun = () => {
    setIsSimulating(true);
    setTimeout(() => {
      try {
        const res = runBatchSimulation({
          maxCombats: combats,
          partySize,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] p-3 sm:p-5 shadow-2xl flex flex-col space-y-3 sm:space-y-4 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-stone-800 shrink-0">
          <div className="min-w-0 pr-2">
            <h2 className="text-sm sm:text-lg font-bold text-stone-100 flex items-center gap-1.5 sm:gap-2 truncate">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
              <span className="truncate">Simulateur RPG (Mode Batch)</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-stone-400 mt-0.5 truncate">
              Combats automatisés, progression D&D 5e, butin et statistiques.
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

        {/* D&D 5e Guidance Tip */}
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2 sm:p-2.5 text-[10.5px] sm:text-xs text-amber-200/90 flex items-start sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Règles D&D 5e :</strong> Le nombre d'aventuriers idéal recommandé pour un groupe équilibré est situé entre <strong>3 à 5 héros</strong>. Vous pouvez néanmoins simuler de 1 jusqu'à 12 héros et jusqu'à 16 monstres simultanés.
            </span>
          </div>
        </div>

        {/* Configuration Controls */}
        <div className="bg-stone-950/50 p-2.5 sm:p-3 rounded-xl border border-stone-800 space-y-2.5 shrink-0 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
            {/* Party Size (Heroes count) - Direct Numeric Input & Presets */}
            <div className="space-y-1">
              <label className="block text-stone-300 font-semibold truncate flex items-center justify-between">
                <span>Héros (Aventuriers)</span>
                {partySize >= 3 && partySize <= 5 ? (
                  <span className="text-[9px] px-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-bold">
                    ★ Idéal 5e
                  </span>
                ) : partySize > 6 ? (
                  <span className="text-[9px] px-1 rounded bg-amber-950 text-amber-300 border border-amber-800/80 font-bold">
                    Tri-partite
                  </span>
                ) : null}
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={partySize}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setPartySize(Math.max(1, Math.min(20, val)));
                  }}
                  disabled={isSimulating}
                  aria-label="Nombre de héros"
                  className="w-20 px-2 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 font-bold text-center focus:outline-none focus:border-amber-500 font-mono"
                />
                <select
                  value={[3, 4, 5, 6, 8, 10, 12, 16, 20].includes(partySize) ? partySize : ''}
                  onChange={(e) => {
                    if (e.target.value) setPartySize(Number(e.target.value));
                  }}
                  disabled={isSimulating}
                  aria-label="Préréglages de taille du groupe"
                  className="flex-1 px-1.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-[11px]"
                >
                  <option value="" disabled>
                    Préréglage...
                  </option>
                  <option value={3}>3 héros ★ Idéal 5e</option>
                  <option value={4}>4 héros ★ Idéal 5e (Standard)</option>
                  <option value={5}>5 héros ★ Idéal 5e</option>
                  <option value={6}>6 héros (Groupe large)</option>
                  <option value={8}>8 héros (Tri-partite)</option>
                  <option value={10}>10 héros (Tri-partite)</option>
                  <option value={12}>12 héros (Bataillon)</option>
                  <option value={16}>16 héros (Grande Troupe)</option>
                  <option value={20}>20 héros (Armée)</option>
                </select>
              </div>
              <p className="text-[9.5px] text-stone-400">
                {partySize >= 3 && partySize <= 5 ? (
                  <span className="text-emerald-400 font-medium">Équilibre optimal selon D&D 5e</span>
                ) : partySize > 6 ? (
                  <span className="text-amber-400 font-medium">Formation tri-partite (3 rangs)</span>
                ) : partySize < 3 ? (
                  <span className="text-stone-500">Groupe restreint</span>
                ) : (
                  <span className="text-stone-400">Groupe standard (6 aventuriers)</span>
                )}
              </p>
            </div>

            {/* Max Monsters - Direct Numeric Input & Presets */}
            <div className="space-y-1">
              <label className="block text-stone-300 font-semibold truncate flex items-center justify-between">
                <span>Max Monstres</span>
                <span className="text-[9.5px] text-stone-400 font-mono">{maxMonsters} max</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={maxMonsters}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setMaxMonsters(Math.max(1, Math.min(30, val)));
                  }}
                  disabled={isSimulating}
                  aria-label="Nombre maximum de monstres"
                  className="w-20 px-2 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 font-bold text-center focus:outline-none focus:border-amber-500 font-mono"
                />
                <select
                  value={[1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 30].includes(maxMonsters) ? maxMonsters : ''}
                  onChange={(e) => {
                    if (e.target.value) setMaxMonsters(Number(e.target.value));
                  }}
                  disabled={isSimulating}
                  aria-label="Préréglages de monstres"
                  className="flex-1 px-1.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-[11px]"
                >
                  <option value="" disabled>
                    Préréglage...
                  </option>
                  <option value={1}>1 (Duel)</option>
                  <option value={2}>2 monstres</option>
                  <option value={3}>3 monstres</option>
                  <option value={4}>4 monstres</option>
                  <option value={6}>6 (Meute)</option>
                  <option value={8}>8 (Horde)</option>
                  <option value={12}>12 monstres</option>
                  <option value={16}>16 (Légion)</option>
                  <option value={20}>20 monstres</option>
                  <option value={24}>24 monstres</option>
                  <option value={30}>30 monstres (Armée)</option>
                </select>
              </div>
              <p className="text-[9.5px] text-stone-400">
                Saisissez jusqu'à 30 monstres simultanés
              </p>
            </div>

            {/* Combats Count */}
            <div className="space-y-1">
              <label className="block text-stone-300 font-semibold truncate flex items-center justify-between">
                <span>Combats</span>
                <span className="text-[9.5px] text-stone-400 font-mono">{combats}</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={2000}
                  step={10}
                  value={combats}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setCombats(Math.max(1, Math.min(2000, val)));
                  }}
                  disabled={isSimulating}
                  aria-label="Nombre de combats"
                  className="w-20 px-2 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 font-bold text-center focus:outline-none focus:border-amber-500 font-mono"
                />
                <select
                  value={[10, 50, 100, 250, 500, 1000, 2000].includes(combats) ? combats : ''}
                  onChange={(e) => {
                    if (e.target.value) setCombats(Number(e.target.value));
                  }}
                  disabled={isSimulating}
                  aria-label="Préréglages de combats"
                  className="flex-1 px-1.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-[11px]"
                >
                  <option value="" disabled>
                    Préréglage...
                  </option>
                  <option value={10}>10 combats</option>
                  <option value={50}>50 combats</option>
                  <option value={100}>100 combats</option>
                  <option value={250}>250 combats</option>
                  <option value={500}>500 combats</option>
                  <option value={1000}>1000 combats</option>
                  <option value={2000}>2000 combats</option>
                </select>
              </div>
              <p className="text-[9.5px] text-stone-400">Total de simulations à exécuter</p>
            </div>

            {/* Rest Frequency */}
            <div className="space-y-1">
              <label className="block text-stone-300 font-semibold truncate flex items-center justify-between">
                <span>Repos tous les</span>
                <span className="text-[9.5px] text-stone-400 font-mono">/{restFreq} cbts</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={restFreq}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setRestFreq(Math.max(1, Math.min(100, val)));
                  }}
                  disabled={isSimulating}
                  aria-label="Fréquence de repos"
                  className="w-20 px-2 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 font-bold text-center focus:outline-none focus:border-amber-500 font-mono"
                />
                <select
                  value={[5, 10, 20, 30, 50].includes(restFreq) ? restFreq : ''}
                  onChange={(e) => {
                    if (e.target.value) setRestFreq(Number(e.target.value));
                  }}
                  disabled={isSimulating}
                  aria-label="Préréglages de fréquence de repos"
                  className="flex-1 px-1.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-[11px]"
                >
                  <option value="" disabled>
                    Préréglage...
                  </option>
                  <option value={5}>Tous les 5 combats</option>
                  <option value={10}>Tous les 10 combats</option>
                  <option value={20}>Tous les 20 combats</option>
                  <option value={30}>Tous les 30 combats</option>
                  <option value={50}>Tous les 50 combats</option>
                </select>
              </div>
              <p className="text-[9.5px] text-stone-400">Déclenche montée de niveau D&D 5e</p>
            </div>

            {/* Initial Level */}
            <div className="space-y-1">
              <label className="block text-stone-300 font-semibold truncate flex items-center justify-between">
                <span>Niveau initial</span>
                <span className="text-[9.5px] text-amber-300 font-mono font-bold">Niv.{partyLevel}</span>
              </label>
              <select
                value={partyLevel}
                onChange={(e) => setPartyLevel(Number(e.target.value))}
                disabled={isSimulating}
                aria-label="Niveau initial des héros"
                className="w-full px-2 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 font-semibold"
              >
                <option value={1}>Niveau 1 (Novice)</option>
                <option value={3}>Niveau 3 (Aventurier)</option>
                <option value={5}>Niveau 5 (Héros / 2e attaque)</option>
                <option value={8}>Niveau 8 (Vétéran)</option>
                <option value={11}>Niveau 11 (Maître / 3e attaque)</option>
                <option value={15}>Niveau 15 (Champion)</option>
                <option value={20}>Niveau 20 (Légende)</option>
              </select>
              <p className="text-[9.5px] text-stone-400">Progression selon table XP 5e</p>
            </div>
          </div>
        </div>

        {/* Launch Button */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={handleRun}
            disabled={isSimulating}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 touch-manipulation"
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
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 sm:space-y-4 pr-1 combat-log-scrollbar">
          {result ? (
            <div className="space-y-3 sm:space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                <div className="p-2.5 sm:p-3 bg-stone-950/70 border border-stone-800 rounded-xl">
                  <div className="text-[9px] sm:text-[10px] text-stone-400 uppercase font-bold">Victoires</div>
                  <div className="text-base sm:text-xl font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span>{result.victories} / {result.numCombats}</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-stone-400">
                    Taux: {Math.round((result.victories / (result.numCombats || 1)) * 100)}%
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 bg-stone-950/70 border border-stone-800 rounded-xl">
                  <div className="text-[9px] sm:text-[10px] text-stone-400 uppercase font-bold">Monstres Tués</div>
                  <div className="text-base sm:text-xl font-bold text-rose-400 flex items-center gap-1 mt-0.5">
                    <Skull className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span>{result.defeatedMonstersCount}</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-stone-400">ennemis vaincus</div>
                </div>

                <div className="p-2.5 sm:p-3 bg-stone-950/70 border border-stone-800 rounded-xl">
                  <div className="text-[9px] sm:text-[10px] text-stone-400 uppercase font-bold">Sorts Lancés</div>
                  <div className="text-base sm:text-xl font-bold text-blue-400 flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span>{result.totalSpellsCast}</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-stone-400">incantations</div>
                </div>

                <div className="p-2.5 sm:p-3 bg-stone-950/70 border border-stone-800 rounded-xl">
                  <div className="text-[9px] sm:text-[10px] text-stone-400 uppercase font-bold">Survivants</div>
                  <div className="text-base sm:text-xl font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span>{result.party.filter((h) => h.hp > 0).length} / {result.party.length}</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-stone-400">héros vivants</div>
                </div>
              </div>

              {/* Party Final Status */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                  <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider">État Final du Groupe</h4>
                  {onImportParty && (
                    <button
                      type="button"
                      onClick={() => {
                        onImportParty(result.party);
                        onClose();
                      }}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors flex items-center justify-center gap-1 shadow"
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
                      <div className="flex justify-between items-start gap-1">
                        <div className="min-w-0">
                          <strong className="text-stone-100">{hero.name}</strong> • Niv.{hero.level} {hero.class_type} ({hero.race})
                          <div className="text-[11px] text-stone-400 mt-0.5 truncate">
                            PV: {hero.hp}/{hero.max_hp} • {hero.weapon.name} • {hero.armor.name}
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
                <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                  Statistiques des monstres tués par niveau
                </h4>
                <div className="p-2.5 sm:p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1.5 text-xs font-mono max-h-40 sm:max-h-48 overflow-y-auto">
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
                <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                  Statistiques des sorts lancés par niveau
                </h4>
                <div className="p-2.5 sm:p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1.5 text-xs font-mono max-h-40 sm:max-h-48 overflow-y-auto">
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
                <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                  Extraits du journal de simulation
                </h4>
                <div className="p-2.5 sm:p-3 bg-stone-950 border border-stone-800 rounded-xl font-mono text-[10px] sm:text-[11px] text-stone-300 max-h-36 overflow-y-auto space-y-1">
                  {result.logSamples.map((log, idx) => (
                    <div key={idx} className="leading-relaxed">{log}</div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 sm:p-12 text-center text-stone-500 text-xs">
              Configurez les paramètres ci-dessus et cliquez sur <strong>Lancer la Simulation</strong> pour débuter.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-stone-800 flex justify-end shrink-0">
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
