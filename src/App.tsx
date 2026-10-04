import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Combatant,
  HeroData,
  InitiativeEntry,
  MonsterData,
  SpellData,
} from './types/game';
import {
  buildPartyFromHeroes,
  createSampleMonsters,
  getLoadedGameData,
} from './engine/loader';
import {
  calculateInitiative,
  distributeLoot,
  meleeAttack,
} from './engine/battle';
import { isDead, tickEffects } from './engine/character';
import { isBeneficial, resolveSpellEffect } from './engine/effects';
import { CharacterCard } from './components/CharacterCard';
import { ActionPanel } from './components/ActionPanel';
import { CharacterSheetModal } from './components/CharacterSheetModal';
import { ReorderModal } from './components/ReorderModal';
import { KilledMonstersModal } from './components/KilledMonstersModal';
import { BatchSimulationModal } from './components/BatchSimulationModal';
import { CombatLog } from './components/CombatLog';
import {
  Swords,
  Tent,
  Save,
  Skull,
  Users,
  Sparkles,
  Download,
  Upload,
  ScrollText,
  ChevronRight,
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'rpg_combat_savegame_v1';

export const App: React.FC = () => {
  // Game data definitions
  const gameData = useRef(getLoadedGameData()).current;

  // Mobile/Tablet View mode for < lg
  const [mobileTab, setMobileTab] = useState<'arena' | 'log'>('arena');

  // Party & Monsters state
  const [party, setParty] = useState<HeroData[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.heroes && Array.isArray(parsed.heroes) && parsed.heroes.length > 0) {
          return parsed.heroes;
        }
      }
    } catch (e) {
      console.warn('Could not restore save from localStorage', e);
    }
    return buildPartyFromHeroes(undefined, 6, 1);
  });

  const [monsters, setMonsters] = useState<MonsterData[]>([]);

  // Turn management
  const [order, setOrder] = useState<InitiativeEntry[]>([]);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [currentHero, setCurrentHero] = useState<HeroData | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<Combatant | null>(null);
  const [combatOver, setCombatOver] = useState<boolean>(true);
  const [roundNum, setRoundNum] = useState<number>(0);

  // Statistics & Persistence
  const [killedMonsters, setKilledMonsters] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.killed_monsters || {};
      }
    } catch {}
    return {};
  });

  const [totalKills, setTotalKills] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.total_kills || 0;
      }
    } catch {}
    return 0;
  });

  // Combat Log
  const [logs, setLogs] = useState<string[]>([
    'Bienvenue dans le Simulateur de Combat RPG (D&D 5e) !',
    'Cliquez sur "Nouvelle Rencontre" pour affronter des monstres, ou sur une carte pour voir sa fiche.',
  ]);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, msg]);
  }, []);

  // Modals state
  const [sheetCharacter, setSheetCharacter] = useState<Combatant | null>(null);
  const [showReorderModal, setShowReorderModal] = useState<boolean>(false);
  const [showKilledModal, setShowKilledModal] = useState<boolean>(false);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);

  // Save game helper (silent by default to avoid cluttering combat log)
  const saveGame = useCallback(
    (customParty?: HeroData[], customKills?: Record<string, number>, customTotalKills?: number, notify = false) => {
      try {
        const p = customParty || party;
        const km = customKills || killedMonsters;
        const tk = customTotalKills ?? totalKills;
        const data = {
          heroes: p,
          party_order: p.map((h) => h.name),
          killed_monsters: km,
          total_kills: tk,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        if (notify) {
          addLog('💾 Partie sauvegardée.');
        }
      } catch (e: any) {
        if (notify) {
          addLog(`⚠️ Échec de la sauvegarde: ${e.message}`);
        }
      }
    },
    [party, killedMonsters, totalKills, addLog]
  );

  // Record a monster kill
  const recordKill = useCallback(
    (monster: MonsterData) => {
      const name = monster.name || 'Inconnu';
      setKilledMonsters((prev) => {
        const updated = { ...prev, [name]: (prev[name] || 0) + 1 };
        setTotalKills((prevTotal) => {
          const newTotal = prevTotal + 1;
          saveGame(party, updated, newTotal, false);
          return newTotal;
        });
        return updated;
      });
    },
    [party, saveGame]
  );

  // Check victory or defeat
  const checkCombatEnd = useCallback(
    (currentMonsters: MonsterData[], currentParty: HeroData[]): boolean => {
      // Victory: all monsters defeated
      if (currentMonsters.length > 0 && currentMonsters.every((m) => isDead(m))) {
        addLog('*** VICTOIRE ! ***');
        setCombatOver(true);
        setCurrentHero(null);
        setSelectedTarget(null);

        // Distribute XP and GP
        const totalXp = currentMonsters.reduce((sum, m) => sum + (m.xp || 0), 0);
        const totalGp = currentMonsters.reduce((sum, m) => sum + (m.gold || 0), 0);
        const survivors = currentParty.filter((h) => !isDead(h));

        if (survivors.length > 0 && (totalXp > 0 || totalGp > 0)) {
          const perXp = Math.floor(totalXp / survivors.length);
          const remXp = totalXp - perXp * survivors.length;
          const perGp = Math.floor(totalGp / survivors.length);
          const remGp = totalGp - perGp * survivors.length;

          survivors.forEach((h, i) => {
            const addXp = perXp + (i === 0 ? remXp : 0);
            const addGp = perGp + (i === 0 ? remGp : 0);
            h.xp += addXp;
            h.gold += addGp;
          });

          // Regrouper le message de collecte des XP et GP pour l'ensemble du groupe
          if (survivors.length === 1) {
            addLog(`🏅 ${survivors[0].name} reçoit ${totalXp} XP et ${totalGp} gp.`);
          } else {
            addLog(
              `🏅 Chaque membre du groupe reçoit ${perXp} XP et ${perGp} gp (Total : ${totalXp} XP, ${totalGp} gp partagés).`
            );
          }
        }

        // Distribute loot items (weapons, armors, shields, magic items)
        distributeLoot(currentMonsters, survivors, addLog);
        addLog('🧰 Butin distribué aux survivants.');

        saveGame(currentParty, undefined, undefined, false);
        return true;
      }

      // Defeat: all heroes defeated
      if (currentParty.every((h) => isDead(h))) {
        addLog('*** DÉFAITE... tout le groupe est tombé. ***');
        addLog("🏕️ Utilisez 'Repos complet' pour soigner le groupe et retenter votre chance.");
        setCombatOver(true);
        setCurrentHero(null);
        setSelectedTarget(null);
        return true;
      }

      return false;
    },
    [addLog, saveGame]
  );

  // Start a new combat encounter
  const newEncounter = useCallback(() => {
    const aliveHeroes = party.filter((h) => !isDead(h));
    if (aliveHeroes.length === 0) {
      addLog("⚠️ Tout le groupe est mort. Utilisez 'Repos complet' d'abord !");
      return;
    }

    const avgLevel = aliveHeroes.reduce((sum, h) => sum + h.level, 0) / aliveHeroes.length;
    let candidates = gameData.monsters.filter(
      (m) => avgLevel - 1 < m.hit_dice.num_dice && m.hit_dice.num_dice <= Math.ceil(avgLevel)
    );
    if (candidates.length === 0) candidates = gameData.monsters;

    const count = Math.floor(Math.random() * 3) + 2; // 2 to 4 monsters
    const newMonsters = createSampleMonsters(candidates, count);

    // Reset heroes effects for encounter
    const updatedParty = party.map((h) => ({ ...h, effects: [] }));
    setParty(updatedParty);
    setMonsters(newMonsters);
    setCombatOver(false);
    setSelectedTarget(null);
    setRoundNum(0);

    addLog('='.repeat(50));
    addLog('⚔️ NOUVELLE RENCONTRE !');
    addLog(`Ennemis apparus : ${newMonsters.map((m) => `${m.name} (Niv.${m.level})`).join(', ')}`);
    addLog('='.repeat(50));

    // Start Round 1
    const initOrder = calculateInitiative(updatedParty, newMonsters);
    setOrder(initOrder);
    setRoundNum(1);
    setTurnIndex(0);
  }, [party, gameData.monsters, addLog]);

  // Advance turn loop
  const advanceTurn = useCallback(
    (curOrder: InitiativeEntry[], curTurnIdx: number, curParty: HeroData[], curMonsters: MonsterData[]) => {
      let idx = curTurnIdx;

      while (idx < curOrder.length) {
        const combatant = curOrder[idx].combatant;

        // Skip dead
        if (isDead(combatant)) {
          idx++;
          continue;
        }

        // Paralyzed or unconscious skip
        if (['unconscious', 'paralyzed'].includes(combatant.condition)) {
          addLog(`💤 ${combatant.name} est ${combatant.condition} et passe son tour !`);
          idx++;
          continue;
        }

        if (combatant.is_hero) {
          // Player's turn! Wait for input
          setCurrentHero(combatant as HeroData);
          setTurnIndex(idx);
          return;
        }

        // Monster Turn: resolved automatically
        const monster = combatant as MonsterData;
        const livingHeroes = curParty.filter((h) => !isDead(h));
        if (livingHeroes.length > 0) {
          const frontHeroes = livingHeroes.filter((h) => h.position === 'front');
          const targetPool = frontHeroes.length > 0 ? frontHeroes : livingHeroes;
          const target = targetPool.reduce((max, h) => (h.hp > max.hp ? h : max));

          meleeAttack(monster, [target], addLog);
          if (isDead(target)) {
            addLog(`💀 ${target.name} est tombé au combat !`);
          }

          if (isDead(monster)) {
            recordKill(monster);
          }
        }

        idx++;

        if (checkCombatEnd(curMonsters, curParty)) {
          return;
        }
      }

      // End of round: tick active effects
      for (const c of [...curParty, ...curMonsters]) {
        const msgs = tickEffects(c);
        msgs.forEach((m) => addLog(m));
      }

      if (checkCombatEnd(curMonsters, curParty)) {
        return;
      }

      // Start next round
      const newRound = roundNum + 1;
      setRoundNum(newRound);
      addLog(`\n--- ROUND ${newRound} ---`);

      const aliveHeroes = curParty.filter((h) => !isDead(h));
      const aliveMonsters = curMonsters.filter((m) => !isDead(m));
      const nextOrder = calculateInitiative(aliveHeroes, aliveMonsters);
      setOrder(nextOrder);
      setTurnIndex(0);

      // Continue to next turn
      advanceTurn(nextOrder, 0, curParty, curMonsters);
    },
    [roundNum, addLog, checkCombatEnd, recordKill]
  );

  // When order changes or turn starts, check if we need to advance
  useEffect(() => {
    if (!combatOver && order.length > 0 && currentHero === null) {
      advanceTurn(order, turnIndex, party, monsters);
    }
  }, [combatOver, order, turnIndex, currentHero, party, monsters, advanceTurn]);

  // Finish Hero Action
  const finishHeroAction = () => {
    const nextIdx = turnIndex + 1;
    setCurrentHero(null);
    setSelectedTarget(null);
    setTurnIndex(nextIdx);

    if (checkCombatEnd(monsters, party)) {
      return;
    }

    advanceTurn(order, nextIdx, party, monsters);
  };

  // Melee attack action
  const handleMelee = () => {
    if (!currentHero || !selectedTarget || selectedTarget.is_hero || isDead(selectedTarget)) return;

    const monster = selectedTarget as MonsterData;
    const strikes = Math.max(1, currentHero.multi_attack || 1);

    for (let i = 0; i < strikes; i++) {
      if (isDead(monster) || isDead(currentHero)) break;
      meleeAttack(currentHero, [monster], addLog);

      if (isDead(monster)) {
        addLog(`💥 ${monster.name} est terrassé !`);
        recordKill(monster);
        break;
      }
    }

    setParty([...party]);
    setMonsters([...monsters]);
    finishHeroAction();
  };

  // Cast spell action
  const handleCastSpell = (spell: SpellData) => {
    if (!currentHero) return;
    const slotIdx = spell.level - 1;
    if (currentHero.current_spell_slots[slotIdx] <= 0) {
      addLog(`⚠️ Emplacements de sorts insuffisants pour ${spell.name}.`);
      return;
    }

    const beneficial = isBeneficial(spell);
    const livingAllies = party.filter(
      (h) => !isDead(h) || (spell.effect === 'cleanse' && ['Resurrection', 'Revivify'].includes(spell.name))
    );
    const livingMonsters = monsters.filter((m) => !isDead(m));

    let targets: Combatant[] = [];
    if (spell.multi_target) {
      targets = beneficial ? livingAllies : livingMonsters;
    } else {
      if (!selectedTarget) {
        addLog(`⚠️ Sélectionnez une cible pour lancer ${spell.name}.`);
        return;
      }
      targets = [selectedTarget];
    }

    // Deduct spell slot
    currentHero.current_spell_slots[slotIdx] -= 1;

    // Resolve spell effects
    const spellLogs = resolveSpellEffect(currentHero, spell, targets);
    spellLogs.forEach((l: string) => addLog(l));

    // Check defeated targets
    for (const t of targets) {
      if (!t.is_hero && isDead(t)) {
        addLog(`💥 ${t.name} est terrassé !`);
        recordKill(t as MonsterData);
      }
    }

    setParty([...party]);
    setMonsters([...monsters]);
    finishHeroAction();
  };

  // Full Rest (Camp / Inn)
  const handleRest = () => {
    const updated = party.map((h) => ({
      ...h,
      hp: h.max_hp,
      effects: [],
      current_spell_slots: [...h.max_spell_slots],
    }));
    setParty(updated);
    addLog('🏕️ Le groupe se repose : Points de vie et emplacements de sorts restaurés au maximum.');
    saveGame(updated);
    // Ready for new encounter
    setMonsters([]);
    setCombatOver(true);
    setCurrentHero(null);
    setSelectedTarget(null);
  };

  // Export save JSON
  const handleExportSave = () => {
    const data = {
      heroes: party,
      party_order: party.map((h) => h.name),
      killed_monsters: killedMonsters,
      total_kills: totalKills,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rpg_savegame.json';
    a.click();
    URL.revokeObjectURL(url);
    addLog('💾 Sauvegarde téléchargée au format JSON.');
  };

  // Import save JSON
  const handleImportSave = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.heroes && Array.isArray(parsed.heroes)) {
          setParty(parsed.heroes);
          if (parsed.killed_monsters) setKilledMonsters(parsed.killed_monsters);
          if (typeof parsed.total_kills === 'number') setTotalKills(parsed.total_kills);
          saveGame(parsed.heroes, parsed.killed_monsters, parsed.total_kills);
          addLog('♻️ Partie importée avec succès !');
        }
      } catch (err: any) {
        addLog(`⚠️ Erreur lecture fichier sauvegarde: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const lastLogLine = logs[logs.length - 1] || '';

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-stone-800 bg-stone-900/95 backdrop-blur-md px-3 sm:px-4 py-2.5 sm:py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shrink-0">
              <Swords className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-stone-100 flex items-center gap-1.5 truncate">
                <span className="truncate">RPG Combat Simulator</span>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/50 uppercase font-mono shrink-0">
                  D&D 5e
                </span>
              </h1>
              <p className="hidden sm:block text-[11px] text-stone-400 truncate">
                Arène tactique au tour par tour & simulateur d'évolution RPG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setShowBatchModal(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-stone-950 flex items-center gap-1 sm:gap-1.5 shadow transition-all touch-manipulation"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current shrink-0" />
              <span><span className="hidden sm:inline">Mode </span>Batch</span>
            </button>
            <button
              onClick={() => setShowKilledModal(true)}
              className="px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-200 border border-stone-700/60 flex items-center gap-1 sm:gap-1.5 transition-colors touch-manipulation"
            >
              <Skull className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Tués: {totalKills}</span>
            </button>
            <button
              onClick={() => setShowReorderModal(true)}
              className="px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-200 border border-stone-700/60 flex items-center gap-1 sm:gap-1.5 transition-colors touch-manipulation"
              title="Formation du groupe"
            >
              <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="hidden xs:inline">Formation</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-4 flex flex-col lg:grid lg:grid-cols-12 gap-3 sm:gap-4">
        {/* Mobile/Tablet View Switcher (< lg) */}
        <div className="lg:hidden flex bg-stone-900 border border-stone-800 rounded-xl p-1 shrink-0 shadow">
          <button
            onClick={() => setMobileTab('arena')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all touch-manipulation ${
              mobileTab === 'arena'
                ? 'bg-amber-600 text-stone-950 shadow-md font-extrabold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Arène de Combat</span>
          </button>
          <button
            onClick={() => setMobileTab('log')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all touch-manipulation ${
              mobileTab === 'log'
                ? 'bg-amber-600 text-stone-950 shadow-md font-extrabold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Journal ({logs.length})</span>
          </button>
        </div>

        {/* Left Column: Combat Arena (Monsters, Turn banner, Actions, Party Grid, Controls) */}
        <div className={`lg:col-span-7 flex flex-col space-y-3 sm:space-y-4 ${mobileTab === 'log' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Monsters Panel */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 sm:p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Skull className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Monstres ({monsters.filter((m) => !isDead(m)).length} vivants)</span>
              </h3>
              {monsters.length > 0 && (
                <span className="text-[10px] sm:text-[11px] text-stone-400">
                  Touchez pour cibler
                </span>
              )}
            </div>

            {monsters.length === 0 ? (
              <div className="p-6 sm:p-8 text-center bg-stone-950/40 rounded-xl border border-stone-800/60 text-xs text-stone-500">
                Aucun monstre présent. Cliquez sur <strong>🐉 Nouvelle Rencontre</strong> ci-dessous pour lancer un combat !
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
                {monsters.map((monster) => (
                  <CharacterCard
                    key={monster.id}
                    character={monster}
                    isSelected={selectedTarget === monster}
                    isCurrentTurn={false}
                    onClick={() => {
                      if (!combatOver && currentHero) {
                        setSelectedTarget(monster);
                      }
                    }}
                    onOpenSheet={() => setSheetCharacter(monster)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Turn Indicator Banner */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shadow">
            <div className="text-xs font-bold text-stone-200 flex items-center gap-2 truncate pr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
              {combatOver ? (
                party.every((h) => isDead(h)) ? (
                  <span className="text-rose-400 truncate">💀 Défaite. Reposez le groupe pour recommencer.</span>
                ) : (
                  <span className="text-emerald-400 truncate">🏆 Victoire ! Lancez une nouvelle rencontre.</span>
                )
              ) : currentHero ? (
                <span className="truncate">
                  🎯 Tour de : <strong className="text-amber-400">{currentHero.name}</strong> ({currentHero.class_type})
                </span>
              ) : (
                <span className="text-stone-400">Tour des monstres en cours...</span>
              )}
            </div>

            <div className="text-[10px] sm:text-[11px] text-stone-400 font-mono shrink-0">
              {!combatOver && `Round ${roundNum}`}
            </div>
          </div>

          {/* Action Panel */}
          <ActionPanel
            currentHero={currentHero}
            selectedTarget={selectedTarget}
            combatOver={combatOver}
            onMelee={handleMelee}
            onCastSpell={handleCastSpell}
          />

          {/* Adventurers Party Panel (3x2 Grid) */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 sm:p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Groupe d'aventuriers ({party.filter((h) => !isDead(h)).length}/6)</span>
              </h3>
              <span className="text-[10px] sm:text-[11px] text-stone-400">
                Double-clic ou ℹ️ pour la fiche
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
              {party.map((hero) => (
                <CharacterCard
                  key={hero.id}
                  character={hero}
                  isSelected={selectedTarget === hero}
                  isCurrentTurn={currentHero?.id === hero.id}
                  onClick={() => {
                    if (!combatOver && currentHero) {
                      setSelectedTarget(hero);
                    }
                  }}
                  onOpenSheet={() => setSheetCharacter(hero)}
                />
              ))}
            </div>
          </div>

          {/* Mobile Quick Log Ticker (< lg) */}
          <div className="lg:hidden p-2.5 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between gap-2 shadow">
            <div className="min-w-0 flex items-center gap-1.5 text-[11px]">
              <ScrollText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate text-stone-300 font-mono">{lastLogLine || 'Combat en attente...'}</span>
            </div>
            <button
              onClick={() => setMobileTab('log')}
              className="text-[10px] text-amber-400 font-bold hover:underline flex items-center shrink-0 pl-1"
            >
              <span>Journal</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Bottom Action Controls */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1">
            <button
              onClick={newEncounter}
              className="col-span-1 sm:flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white shadow-md shadow-rose-900/20 flex items-center justify-center gap-1.5 transition-all touch-manipulation"
            >
              🐉 Rencontre
            </button>
            <button
              onClick={handleRest}
              className="col-span-1 sm:flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white shadow-md shadow-emerald-900/20 flex items-center justify-center gap-1.5 transition-all touch-manipulation"
            >
              <Tent className="w-4 h-4 shrink-0" />
              Repos complet
            </button>
            <button
              onClick={() => saveGame(undefined, undefined, undefined, true)}
              className="col-span-1 sm:flex-none py-2.5 px-3 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-200 border border-stone-700/60 flex items-center justify-center gap-1.5 transition-colors touch-manipulation"
              title="Sauvegarder la partie"
            >
              <Save className="w-4 h-4 shrink-0" />
              Sauvegarder
            </button>
            <div className="col-span-1 sm:flex-none flex items-center gap-1.5">
              <button
                onClick={handleExportSave}
                className="flex-1 sm:flex-none py-2.5 px-3 rounded-xl text-xs bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-300 border border-stone-700/60 transition-colors flex items-center justify-center gap-1 touch-manipulation"
                title="Télécharger la sauvegarde JSON"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="sm:hidden text-[11px]">Export</span>
              </button>
              <label
                className="flex-1 sm:flex-none py-2.5 px-3 rounded-xl text-xs bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-300 border border-stone-700/60 cursor-pointer transition-colors flex items-center justify-center gap-1 touch-manipulation"
                title="Charger un fichier sauvegarde JSON"
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span className="sm:hidden text-[11px]">Import</span>
                <input type="file" accept=".json" onChange={handleImportSave} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Combat Log (5 cols on desktop, full tab on mobile/tablet) */}
        <div className={`lg:col-span-5 flex flex-col h-[520px] sm:h-[600px] lg:h-auto min-h-[400px] ${mobileTab === 'arena' ? 'hidden lg:flex' : 'flex'}`}>
          <CombatLog logs={logs} onClear={() => setLogs([])} />
        </div>
      </main>

      {/* Modals */}
      {sheetCharacter && (
        <CharacterSheetModal
          character={sheetCharacter}
          party={party}
          onClose={() => setSheetCharacter(null)}
          onUpdateParty={(updated) => {
            setParty(updated);
            saveGame(updated);
          }}
          onLog={addLog}
        />
      )}

      {showReorderModal && (
        <ReorderModal
          party={party}
          onClose={() => setShowReorderModal(false)}
          onSaveOrder={(newParty) => {
            setParty(newParty);
            saveGame(newParty);
            addLog(`🔀 Ordre du groupe modifié : ${newParty.map((h) => h.name).join(', ')}`);
          }}
        />
      )}

      {showKilledModal && (
        <KilledMonstersModal
          killedMonsters={killedMonsters}
          totalKills={totalKills}
          onClose={() => setShowKilledModal(false)}
        />
      )}

      {showBatchModal && (
        <BatchSimulationModal
          onClose={() => setShowBatchModal(false)}
          onImportParty={(newParty) => {
            setParty(newParty);
            saveGame(newParty);
            addLog('🏆 Groupe importé depuis la simulation batch !');
          }}
        />
      )}
    </div>
  );
};
export default App;
