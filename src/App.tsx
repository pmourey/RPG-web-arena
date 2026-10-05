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
  levelUpHero,
  LevelUpResult,
} from './engine/loader';
import {
  canHeroLevelUp,
  evaluateTacticalFormation,
  assignFormationPositions,
  getXpForNextLevel,
  sortSpellsByLevel,
} from './engine/rules';
import {
  calculateInitiative,
  distributeLoot,
  meleeAttack,
} from './engine/battle';
import { isDead, tickEffects } from './engine/character';
import { isBeneficial, resolveSpellEffect } from './engine/effects';
import { getAbilityModifier } from './engine/dice';
import { CharacterCard } from './components/CharacterCard';
import { ActionPanel } from './components/ActionPanel';
import { CharacterSheetModal } from './components/CharacterSheetModal';
import { ReorderModal } from './components/ReorderModal';
import { KilledMonstersModal } from './components/KilledMonstersModal';
import { BatchSimulationModal } from './components/BatchSimulationModal';
import { LevelUpModal } from './components/LevelUpModal';
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
  Maximize,
  Minimize,
  GripVertical,
  SlidersHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Columns,
  Rows,
  X,
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'rpg_combat_savegame_v1';

export const App: React.FC = () => {
  // Game data definitions
  const gameData = useRef(getLoadedGameData()).current;

  // Mobile/Tablet View mode for < lg
  const [mobileTab, setMobileTab] = useState<'arena' | 'log'>('arena');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== 'undefined' && Boolean(document.fullscreenElement);
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  // Party & Monsters state
  const [party, setParty] = useState<HeroData[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.heroes && Array.isArray(parsed.heroes) && parsed.heroes.length > 0) {
          const withSpellsSorted = parsed.heroes.map((h: HeroData) => ({
            ...h,
            spells: h.spells ? sortSpellsByLevel(h.spells) : [],
          }));
          return assignFormationPositions(withSpellsSorted);
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
  const [levelUpResults, setLevelUpResults] = useState<LevelUpResult[] | null>(null);

  // Main container ref & desktop state
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });

  // User configurable screen width state (in px, or -1 for 100% full width)
  const [screenWidthVal, setScreenWidthVal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rpg_screen_width_val');
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && (n === -1 || (n >= 960 && n <= 2400))) return n;
      }
    } catch {}
    return 1240;
  });
  const [showWidthMenu, setShowWidthMenu] = useState<boolean>(false);
  const widthDropdownRef = useRef<HTMLDivElement>(null);

  const handleSetScreenWidth = (w: number) => {
    setScreenWidthVal(w);
    try {
      localStorage.setItem('rpg_screen_width_val', String(w));
    } catch {}
  };

  // User configurable card size state (bounded strictly between 96px and 138px to fit screen without scrolling)
  const [cardSizeVal, setCardSizeVal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rpg_card_size_val');
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 96 && n <= 138) return n;
      }
    } catch {}
    return 112; // Default 112px for seamless single-screen view without scrolling on laptop and tablet
  });

  const handleSetCardSize = (size: number) => {
    const clamped = Math.min(138, Math.max(96, size));
    setCardSizeVal(clamped);
    try {
      localStorage.setItem('rpg_card_size_val', String(clamped));
    } catch {}
  };

  // Toggle combat log visibility state (for desktop, tablet, standard screens)
  const [showCombatLog, setShowCombatLog] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rpg_show_combat_log');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  // Formation view mode state: 'columns' (Grand écran / 3 colonnes côte-à-côte) vs 'rows' (Rangs horizontaux)
  const [formationViewMode, setFormationViewMode] = useState<'columns' | 'rows'>(() => {
    try {
      const saved = localStorage.getItem('rpg_formation_view_mode');
      if (saved === 'columns' || saved === 'rows') return saved;
      return typeof window !== 'undefined' && window.innerWidth >= 1200 ? 'columns' : 'rows';
    } catch {
      return 'rows';
    }
  });

  const toggleFormationViewMode = () => {
    setFormationViewMode((prev) => {
      const next = prev === 'columns' ? 'rows' : 'columns';
      try {
        localStorage.setItem('rpg_formation_view_mode', next);
      } catch {}
      return next;
    });
  };

  const toggleCombatLog = () => {
    setShowCombatLog((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('rpg_show_combat_log', String(next));
      } catch {}
      return next;
    });
  };

  // Click outside to close width dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (widthDropdownRef.current && !widthDropdownRef.current.contains(e.target as Node)) {
        setShowWidthMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resizable split ratio between left arena and right combat log (percentage, e.g. 62%)
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rpg_panel_split_ratio');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 35 && val <= 80) return val;
      }
    } catch {}
    return 62;
  });
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);

  // Height synchronization so Combat Log matches the exact height of the left arena panel on desktop
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const [leftColHeight, setLeftColHeight] = useState<number | undefined>(undefined);

  const updateLeftHeight = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024 && leftColumnRef.current) {
      setLeftColHeight(Math.round(leftColumnRef.current.offsetHeight));
    } else {
      setLeftColHeight(undefined);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      updateLeftHeight();
    };

    updateLeftHeight();

    const el = leftColumnRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      updateLeftHeight();
    });
    ro.observe(el);

    window.addEventListener('resize', handleResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [updateLeftHeight, party, monsters, roundNum, combatOver, splitRatio]);

  // Splitter pointer event handlers
  const handleSplitterPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleSplitterPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSplitter || !mainContainerRef.current) return;
    const rect = mainContainerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const totalWidth = rect.width;
    if (totalWidth <= 0) return;

    let newRatio = (currentX / totalWidth) * 100;
    if (newRatio < 35) newRatio = 35;
    if (newRatio > 80) newRatio = 80;

    setSplitRatio(newRatio);
  };

  const handleSplitterPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSplitter) {
      setIsDraggingSplitter(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      try {
        localStorage.setItem('rpg_panel_split_ratio', splitRatio.toFixed(1));
      } catch {}
    }
  };

  const resetSplitRatio = () => {
    setSplitRatio(62);
    try {
      localStorage.setItem('rpg_panel_split_ratio', '62');
    } catch {}
  };

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

          // Check if any hero is now ready to level up during a Long Rest
          const readyToLevel = survivors.filter((h) => canHeroLevelUp(h));
          if (readyToLevel.length > 0) {
            addLog(
              `⭐ ${readyToLevel.map((h) => h.name).join(', ')} possède assez d'XP pour monter de niveau ! Utilisez 'Repos complet' pour finaliser la montée de niveau.`
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

    // Start Round 1
    const initOrder = calculateInitiative(updatedParty, newMonsters);
    setOrder(initOrder);
    setRoundNum(1);
    setTurnIndex(0);

    addLog('='.repeat(50));
    addLog('⚔️ NOUVELLE RENCONTRE !');
    addLog(`Ennemis apparus : ${newMonsters.map((m) => `${m.name} (Niv.${m.level})`).join(', ')}`);
    addLog(`🎲 Ordre d'initiative (Round 1) :`);
    initOrder.forEach((entry, idx) => {
      const icon = entry.combatant.is_hero ? '🛡️' : '🐉';
      const dexMod = entry.dexMod ?? getAbilityModifier(entry.combatant.abilities.dexterity);
      const sign = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;
      addLog(`  ${idx + 1}. ${icon} ${entry.combatant.name} : ${entry.initiative} (d20: ${entry.roll ?? '?'} ${sign} dex)`);
    });
    if (!initOrder[0].combatant.is_hero) {
      addLog(`⚡ ${initOrder[0].combatant.name} a obtenu la plus haute initiative (${initOrder[0].initiative}) et prend l'avantage en attaquant en premier !`);
    } else {
      addLog(`🛡️ ${initOrder[0].combatant.name} a obtenu la plus haute initiative (${initOrder[0].initiative}) et ouvre les hostilités !`);
    }
    addLog('='.repeat(50));
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

        // Monster Turn: resolved automatically following tactical formation rules (breach & line protection)
        const monster = combatant as MonsterData;
        const livingHeroes = curParty.filter((h) => !isDead(h));
        if (livingHeroes.length > 0) {
          const formation = evaluateTacticalFormation(curParty);
          const targetPool = formation.targetPool.length > 0 ? formation.targetPool : livingHeroes;

          let target: HeroData;
          if (formation.isBreached) {
            // Monsters exploit the breach: 60% chance to rush through to the exposed secondary line!
            const secondaryLiving = targetPool.filter((h) => h.position !== 'front');
            if (secondaryLiving.length > 0 && Math.random() < 0.6) {
              target = secondaryLiving.reduce((min, h) => (h.hp < min.hp ? h : min));
            } else {
              target = targetPool.reduce((max, h) => (h.hp > max.hp ? h : max));
            }
          } else {
            target = targetPool.reduce((max, h) => (h.hp > max.hp ? h : max));
          }

          const monsterInit = curOrder[idx]?.initiative;
          const lineName =
            target.position === 'front'
              ? 'Première Ligne'
              : target.position === 'middle'
              ? 'Ligne Médiane'
              : 'Ligne Arrière';
          const breachNotice =
            target.position !== 'front'
              ? ` ⚠️ [Brèche Tactique !] La première ligne ayant subi des pertes sans protection, ${monster.name} s'engouffre et atteint la ${lineName} !`
              : '';

          addLog(`🐉 [Tour du Monstre] ${monster.name} (Init ${monsterInit}) attaque ${target.name} (${lineName}) !${breachNotice}`);
          meleeAttack(monster, [target], addLog);
          if (isDead(target)) {
            addLog(`💀 ${target.name} (${lineName}) est tombé au combat !`);
          }

          if (isDead(monster)) {
            recordKill(monster);
          }

          // Immediate state sync so hero card shows HP loss in real time
          setParty([...curParty]);
          setMonsters([...curMonsters]);
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

      addLog(`🎲 Ordre d'initiative (Round ${newRound}) :`);
      nextOrder.forEach((entry, i) => {
        const icon = entry.combatant.is_hero ? '🛡️' : '🐉';
        const dexMod = entry.dexMod ?? getAbilityModifier(entry.combatant.abilities.dexterity);
        const sign = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;
        addLog(`  ${i + 1}. ${icon} ${entry.combatant.name} : ${entry.initiative} (d20: ${entry.roll ?? '?'} ${sign} dex)`);
      });

      if (!nextOrder[0].combatant.is_hero) {
        addLog(`⚡ ${nextOrder[0].combatant.name} a obtenu la plus haute initiative (${nextOrder[0].initiative}) et attaque en premier !`);
      }

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

  // Defend / Protect the line action: locks breaches and gives +2 AC for 1 round
  const handleDefendLine = () => {
    if (!currentHero) return;
    currentHero.effects.push({
      kind: 'protection',
      turns: 1,
      magnitude: 2,
      spell_name: 'Posture Défensive',
      just_applied: true,
    });
    addLog(
      `🛡️ ${currentHero.name} prend une posture défensive : +2 CA et verrouille sa ligne contre toute brèche tactique pour 1 round !`
    );
    setParty([...party]);
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
        // Smart auto-targeting when user clicks without explicit selection
        if (beneficial) {
          const mostWounded = livingAllies.reduce(
            (min, h) => (h.hp / h.max_hp < min.hp / min.max_hp ? h : min),
            currentHero
          );
          targets = [mostWounded];
          addLog(
            `✨ [Cible auto] ${currentHero.name} lance ${spell.name} sur ${mostWounded.name} (${mostWounded.hp}/${mostWounded.max_hp} PV).`
          );
        } else if (livingMonsters.length > 0) {
          targets = [livingMonsters[0]];
          addLog(`🎯 [Cible auto] ${currentHero.name} lance ${spell.name} sur ${livingMonsters[0].name}.`);
        } else {
          addLog(`⚠️ Aucune cible valide sur le champ de bataille pour ${spell.name}.`);
          return;
        }
      } else {
        targets = [selectedTarget];
      }
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

  // Full Rest (Camp / Inn) - Executes character Level Up for eligible heroes (D&D 5e rule)
  const handleRest = () => {
    const levelUps: LevelUpResult[] = [];
    const updated = party.map((h) => {
      const heroCopy = { ...h };
      // D&D 5e rule: characters level up during a Long Rest if they have enough XP
      while (heroCopy.level < 20 && canHeroLevelUp(heroCopy)) {
        const res = levelUpHero(heroCopy, gameData.spells);
        levelUps.push(res);
      }
      heroCopy.hp = heroCopy.max_hp;
      heroCopy.effects = [];
      heroCopy.current_spell_slots = [...heroCopy.max_spell_slots];
      return heroCopy;
    });

    setParty(updated);
    addLog('🏕️ Le groupe se repose : Points de vie et emplacements de sorts restaurés au maximum.');

    if (levelUps.length > 0) {
      setLevelUpResults(levelUps);
      for (const res of levelUps) {
        const spellTxt =
          res.newSpells.length > 0
            ? ` · Nouveaux sorts: ${res.newSpells.map((s) => s.name).join(', ')}`
            : '';
        addLog(
          `🎉 MONTÉE DE NIVEAU ! ${res.hero.name} atteint le Niveau ${res.newLevel} ! (+${res.hpGained} PV Max = ${res.newMaxHp} PV, Emplacements de sorts mis à jour${spellTxt})`
        );
      }
    } else {
      const xpReport = updated
        .map((h) => `${h.name}: ${h.xp}/${getXpForNextLevel(h.level)} XP`)
        .join(' · ');
      addLog(`📈 Progression XP vers le prochain niveau : ${xpReport}`);
    }

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
          const withFormation = assignFormationPositions(parsed.heroes);
          setParty(withFormation);
          if (parsed.killed_monsters) setKilledMonsters(parsed.killed_monsters);
          if (typeof parsed.total_kills === 'number') setTotalKills(parsed.total_kills);
          saveGame(withFormation, parsed.killed_monsters, parsed.total_kills);
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
      <header className="border-b border-stone-800 bg-stone-900/95 backdrop-blur-md px-3 sm:px-5 py-1.5 sm:py-2 sticky top-0 z-30 shadow-md">
        <div
          className="w-full mx-auto flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5 transition-all duration-150"
          style={{ maxWidth: screenWidthVal === -1 ? '100%' : `${screenWidthVal}px` }}
        >
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

            {/* Toggle Combat Log Visibility Button (Standard screen & Tablet) */}
            <button
              onClick={toggleCombatLog}
              title={showCombatLog ? 'Masquer le journal de combat' : 'Afficher le journal de combat'}
              className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border flex items-center gap-1 sm:gap-1.5 transition-colors touch-manipulation ${
                showCombatLog
                  ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700/60'
                  : 'bg-amber-950/70 text-amber-300 border-amber-500/70 hover:bg-amber-900/70 shadow-xs'
              }`}
            >
              {showCombatLog ? (
                <>
                  <PanelRightClose className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Masquer Journal</span>
                  <span className="sm:hidden">Journal</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Afficher Journal</span>
                  <span className="sm:hidden">Journal</span>
                </>
              )}
            </button>

            {/* User Configurable Display & Sizing Menu */}
            <div className="relative" ref={widthDropdownRef}>
              <button
                onClick={() => setShowWidthMenu(!showWidthMenu)}
                title="Modifier l'affichage (largeur écran, taille des cartes, journal)"
                className="px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-200 border border-stone-700/60 flex items-center gap-1 sm:gap-1.5 transition-colors touch-manipulation"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">
                  Affichage ({screenWidthVal === -1 ? '100%' : `${screenWidthVal}px`})
                </span>
                <span className="sm:hidden">
                  {screenWidthVal === -1 ? '100%' : `${screenWidthVal}px`}
                </span>
              </button>

              {showWidthMenu && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-stone-900 border border-stone-700 rounded-2xl p-3.5 shadow-2xl z-50 text-xs flex flex-col space-y-3.5 animate-in fade-in zoom-in-95 duration-100 max-h-[85vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-1.5 border-b border-stone-800">
                    <span className="font-bold text-stone-100 flex items-center gap-1.5 text-xs sm:text-sm">
                      <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                      Affichage & Dimensions
                    </span>
                    <button
                      onClick={() => setShowWidthMenu(false)}
                      className="text-stone-400 hover:text-stone-200 p-0.5 rounded-md hover:bg-stone-800"
                      aria-label="Fermer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Section 1: Largeur de l'écran de jeu */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-200 text-[11px] uppercase tracking-wider text-amber-400">
                        1. Largeur de l'écran
                      </span>
                      <span className="font-mono text-amber-300 font-bold text-[11px]">
                        {screenWidthVal === -1 ? '100% (Plein)' : `${screenWidthVal}px`}
                      </span>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: 'Compact', width: 1080 },
                        { label: 'Standard', width: 1240 },
                        { label: 'Large (1440p)', width: 1440 },
                        { label: 'Grand Écran (1800p)', width: 1800 },
                        { label: 'Plein 100%', width: -1 },
                      ].map((p) => {
                        const isActive = screenWidthVal === p.width;
                        return (
                          <button
                            key={p.label}
                            onClick={() => handleSetScreenWidth(p.width)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center border transition-all ${
                              isActive
                                ? 'bg-amber-600 text-stone-950 border-amber-500 font-bold shadow'
                                : 'bg-stone-800/80 text-stone-300 border-stone-700/60 hover:bg-stone-800'
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Range Slider */}
                    <div className="space-y-1 pt-1">
                      <input
                        type="range"
                        min="960"
                        max="2400"
                        step="20"
                        value={screenWidthVal === -1 ? 2400 : screenWidthVal}
                        onChange={(e) => handleSetScreenWidth(parseInt(e.target.value, 10))}
                        className="w-full accent-amber-500 bg-stone-800 h-1.5 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-stone-500 font-mono">
                        <span>960px</span>
                        <span>1440px</span>
                        <span>1800px</span>
                        <span>2400px</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Dimensionnement des cartes de combattants (Strictement Carrées) */}
                  <div className="space-y-2 pt-2 border-t border-stone-800">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-200 text-[11px] uppercase tracking-wider text-amber-400">
                        2. Taille des cartes (carrées)
                      </span>
                      <span className="font-mono text-amber-300 font-bold text-[11px]">
                        {cardSizeVal}px × {cardSizeVal}px
                      </span>
                    </div>

                    <p className="text-[10px] text-stone-400 leading-snug">
                      Format calibré (<strong>96px</strong> à <strong>138px</strong>) pour conserver tous les héros et monstres visibles sans défilement vertical.
                    </p>

                    {/* Presets */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Compacte', size: 102 },
                        { label: 'Équilibrée', size: 112 },
                        { label: 'Confort', size: 126 },
                      ].map((c) => {
                        const isActive = cardSizeVal === c.size;
                        return (
                          <button
                            key={c.label}
                            onClick={() => handleSetCardSize(c.size)}
                            className={`py-1.5 px-1.5 rounded-lg text-xs font-semibold text-center border transition-all ${
                              isActive
                                ? 'bg-amber-600 text-stone-950 border-amber-500 font-bold shadow'
                                : 'bg-stone-800/80 text-stone-300 border-stone-700/60 hover:bg-stone-800'
                            }`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Range Slider for Cards */}
                    <div className="space-y-1 pt-1">
                      <input
                        type="range"
                        min="96"
                        max="138"
                        step="2"
                        value={cardSizeVal}
                        onChange={(e) => handleSetCardSize(parseInt(e.target.value, 10))}
                        className="w-full accent-amber-500 bg-stone-800 h-1.5 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-stone-500 font-mono">
                        <span>Min (96px)</span>
                        <span>Idéal (112px)</span>
                        <span>Max (138px)</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Journal de combat */}
                  <div className="space-y-2 pt-2 border-t border-stone-800">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-200 text-[11px] uppercase tracking-wider text-amber-400">
                        3. Journal de combat
                      </span>
                      <span className={`text-[10px] font-bold ${showCombatLog ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {showCombatLog ? 'Affiché' : 'Masqué'}
                      </span>
                    </div>
                    <button
                      onClick={toggleCombatLog}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                        showCombatLog
                          ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                          : 'bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border-amber-600'
                      }`}
                    >
                      {showCombatLog ? (
                        <>
                          <PanelRightClose className="w-3.5 h-3.5 text-amber-400" />
                          <span>Masquer le journal de combat</span>
                        </>
                      ) : (
                        <>
                          <PanelRightOpen className="w-3.5 h-3.5 text-amber-400" />
                          <span>Afficher le journal de combat</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Quitter le mode plein écran (Échap)' : 'Passer en mode plein écran (F11)'}
              className="px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-200 border border-stone-700/60 flex items-center gap-1 sm:gap-1.5 transition-colors touch-manipulation"
            >
              {isFullscreen ? (
                <>
                  <Minimize className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Fenêtré</span>
                </>
              ) : (
                <>
                  <Maximize className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Plein écran</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main
        ref={mainContainerRef}
        onPointerMove={handleSplitterPointerMove}
        onPointerUp={handleSplitterPointerUp}
        style={{ maxWidth: screenWidthVal === -1 ? '100%' : `${screenWidthVal}px` }}
        className={`flex-1 w-full mx-auto px-2.5 sm:px-4 py-1.5 sm:py-2 flex flex-col lg:flex-row lg:items-start transition-all duration-150 ${
          isDraggingSplitter ? 'select-none cursor-col-resize' : ''
        }`}
      >
        {/* Mobile/Tablet View Switcher (< lg) */}
        {!showCombatLog ? (
          <div className="lg:hidden flex items-center justify-between bg-stone-900 border border-stone-800 rounded-xl p-1.5 shrink-0 shadow mb-2 text-xs">
            <div className="flex items-center gap-1.5 text-stone-300 font-medium">
              <Swords className="w-3.5 h-3.5 text-amber-500" />
              <span>Arène de Combat (Plein écran · Journal masqué)</span>
            </div>
            <button
              onClick={() => {
                setShowCombatLog(true);
                setMobileTab('log');
              }}
              className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-amber-600 hover:bg-amber-500 text-stone-950 flex items-center gap-1 transition-colors"
            >
              <PanelRightOpen className="w-3 h-3" />
              <span>Afficher journal</span>
            </button>
          </div>
        ) : (
          <div className="lg:hidden flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-xl p-1 shrink-0 shadow mb-2">
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
            <button
              onClick={() => setShowCombatLog(false)}
              title="Masquer le journal de combat"
              aria-label="Masquer le journal"
              className="p-1.5 rounded-lg text-stone-400 hover:text-amber-400 hover:bg-stone-800 transition-colors"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Left Column: Combat Arena (Monsters, Turn banner, Actions, Party Grid, Controls) */}
        <div
          ref={leftColumnRef}
          style={
            isDesktop && showCombatLog
              ? {
                  flex: `0 0 ${splitRatio}%`,
                  width: `${splitRatio}%`,
                  maxWidth: `${splitRatio}%`,
                }
              : undefined
          }
          className={`flex flex-col space-y-1.5 sm:space-y-2 min-w-0 ${
            showCombatLog && mobileTab === 'log' ? 'hidden lg:flex' : 'flex'
          } ${!showCombatLog ? 'w-full flex-1 max-w-full' : ''}`}
        >
          {/* Monsters Panel */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-2 sm:p-2.5 shadow-md">
            <div className="flex items-center justify-between mb-1 pb-0.5 border-b border-stone-800/80">
              <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Skull className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Monstres ({monsters.filter((m) => !isDead(m)).length} vivants)</span>
              </h3>
              {monsters.length > 0 && (
                <span className="text-[9px] sm:text-[10px] text-stone-400">
                  Touchez pour cibler
                </span>
              )}
            </div>

            {monsters.length === 0 ? (
              <div className="p-2.5 text-center bg-stone-950/40 rounded-lg border border-stone-800/60 text-xs text-stone-500">
                Aucun monstre présent. Cliquez sur <strong>🐉 Rencontre</strong> ci-dessous pour lancer un combat !
              </div>
            ) : (
              <div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 mx-auto w-full py-0.5">
                {monsters.map((monster) => (
                  <CharacterCard
                    key={monster.id}
                    character={monster}
                    cardSize={cardSizeVal}
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
          <div className="bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1 sm:py-1.5 flex items-center justify-between shadow-xs">
            <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5 truncate pr-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
              {combatOver ? (
                party.every((h) => isDead(h)) ? (
                  <span className="text-rose-400 truncate">💀 Défaite. Reposez le groupe pour recommencer.</span>
                ) : (
                  <span className="text-emerald-400 truncate">🏆 Victoire ! Lancez une nouvelle rencontre.</span>
                )
              ) : currentHero ? (
                <span className="truncate">
                  🎯 Tour de : <strong className="text-amber-400">{currentHero.name}</strong> ({currentHero.class_type})
                  {order[turnIndex] && (
                    <span className="text-stone-400 font-normal ml-1">
                      • Init: <span className="text-amber-300 font-mono font-bold">{order[turnIndex].initiative}</span>
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-stone-400">
                  🐉 Tour des monstres en cours...
                  {order[turnIndex] && (
                    <span className="text-rose-300 font-mono font-bold ml-1">
                      ({order[turnIndex].combatant.name} • Init {order[turnIndex].initiative})
                    </span>
                  )}
                </span>
              )}
            </div>

            <div className="text-[9.5px] sm:text-[10px] text-stone-400 font-mono shrink-0">
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
            onDefendLine={handleDefendLine}
          />

          {/* Adventurers Party Panel (Tri-partite Avant / Milieu / Arrière if > 6 heroes, or 2 rows if <= 6) */}
          {(() => {
            const isTripartite = party.length > 6 || party.some((h) => h.position === 'middle');
            const frontHeroes = party.filter((h) => h.position === 'front');
            const middleHeroes = isTripartite ? party.filter((h) => h.position === 'middle') : [];
            const backHeroes = party.filter((h) => h.position === 'back');

            const formation = evaluateTacticalFormation(party);
            const livingFront = frontHeroes.filter((h) => !isDead(h));
            const livingMiddle = middleHeroes.filter((h) => !isDead(h));
            const livingBack = backHeroes.filter((h) => !isDead(h));
            const livingTotal = party.filter((h) => !isDead(h)).length;

            // When party > 6 (3 rows), adjust card size (between 96 and 108px) so all characters fit in view without vertical scroll
            const effectiveCardSize = isTripartite ? Math.min(108, cardSizeVal) : cardSizeVal;

            return (
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-2 sm:p-2.5 shadow-md">
                <div className="flex items-center justify-between mb-1 pb-1 border-b border-stone-800/80 flex-wrap gap-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>
                        Groupe d'aventuriers ({livingTotal}/{party.length})
                      </span>
                    </h3>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-300 border border-stone-700 font-medium hidden sm:inline">
                      {isTripartite ? 'Formation Tri-partite (3 rangs)' : 'Formation Standard (2 rangs)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Grand Écran view toggle for tripartite formation */}
                    {isTripartite && (
                      <button
                        type="button"
                        onClick={toggleFormationViewMode}
                        title={
                          formationViewMode === 'columns'
                            ? 'Passer en vue rangs horizontaux'
                            : 'Passer en vue colonnes tactiques (optimisé Grand Écran)'
                        }
                        className="text-[9.5px] sm:text-[10px] px-2 py-0.5 rounded-md bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-300 hover:text-amber-300 border border-stone-700/80 flex items-center gap-1 transition-colors"
                      >
                        {formationViewMode === 'columns' ? (
                          <>
                            <Rows className="w-3 h-3 text-amber-400" />
                            <span>Vue Rangs</span>
                          </>
                        ) : (
                          <>
                            <Columns className="w-3 h-3 text-amber-400" />
                            <span>Colonnes Grand Écran</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => setShowReorderModal(true)}
                      className="text-[9.5px] sm:text-[10px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-0.5 hover:underline"
                    >
                      <span>Formation</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Tactical Breach Global Notice Banner if breach is active */}
                {formation.isBreached && (
                  <div className="mb-1.5 p-1 px-2 rounded-lg bg-rose-950/80 border border-rose-600/70 text-[10px] sm:text-[10.5px] text-rose-200 flex items-center justify-between gap-1.5 animate-pulse">
                    <span className="font-semibold flex items-center gap-1 truncate">
                      <span>⚠️ BRÈCHE TACTIQUE ACTIVE :</span>
                      <span className="font-normal text-rose-300 truncate">
                        {isTripartite && livingMiddle.length > 0
                          ? 'La 1ère ligne est percée, les monstres peuvent frapper la ligne médiane en mêlée !'
                          : 'Les lignes avancées ont cédé, les monstres atteignent l\'arrière-garde !'}
                      </span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-900 font-bold shrink-0">
                      Utilisez 'Protéger la ligne' pour colmater
                    </span>
                  </div>
                )}

                {/* VIEW MODE 1: GRAND ÉCRAN 3 TACTICAL COLUMNS */}
                {formationViewMode === 'columns' && isTripartite ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5 pt-0.5 pb-0.5 items-stretch">
                    {/* Column 1: Première Ligne (Avant) */}
                    <div className="bg-stone-950/60 rounded-xl p-2 border border-rose-900/40 flex flex-col space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between pb-1 border-b border-rose-900/30">
                        <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1">
                          <span>⚔️ 1. Avant (Front)</span>
                          <span className="text-[9px] font-normal text-stone-400 font-mono">
                            ({livingFront.length}/{frontHeroes.length})
                          </span>
                        </span>
                        <div>
                          {!formation.frontLine.hasCasualties ? (
                            <span className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold">
                              🛡️ Intact
                            </span>
                          ) : formation.frontLine.isProtected ? (
                            <span
                              title={formation.frontLine.protectionReason}
                              className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-semibold"
                            >
                              🛡️ Protégée
                            </span>
                          ) : (
                            <span
                              title="Brèche ouverte : les monstres s'engouffrent vers le milieu !"
                              className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-600 font-bold animate-pulse"
                            >
                              ⚠️ Brèche !
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 py-0.5 flex-1 content-start">
                        {frontHeroes.map((hero) => (
                          <CharacterCard
                            key={hero.id}
                            character={hero}
                            cardSize={effectiveCardSize}
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

                    {/* Column 2: Ligne Médiane (Milieu) */}
                    <div className="bg-stone-950/60 rounded-xl p-2 border border-amber-900/40 flex flex-col space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between pb-1 border-b border-amber-900/30">
                        <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                          <span>🛡️ 2. Milieu (Mid)</span>
                          <span className="text-[9px] font-normal text-stone-400 font-mono">
                            ({livingMiddle.length}/{middleHeroes.length})
                          </span>
                        </span>
                        <div>
                          {!formation.frontLine.isBreached ? (
                            <span className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-stone-900 text-stone-400 border border-stone-800 font-semibold">
                              🔒 À couvert
                            </span>
                          ) : (
                            <span
                              title="La première ligne a cédé : la ligne médiane est exposée en mêlée !"
                              className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600 font-bold animate-pulse"
                            >
                              ⚠️ EXPOSÉE
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 py-0.5 flex-1 content-start">
                        {middleHeroes.map((hero) => (
                          <CharacterCard
                            key={hero.id}
                            character={hero}
                            cardSize={effectiveCardSize}
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

                    {/* Column 3: Arrière-Garde (Arrière) */}
                    <div className="bg-stone-950/60 rounded-xl p-2 border border-sky-900/40 flex flex-col space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between pb-1 border-b border-sky-900/30">
                        <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1">
                          <span>🏹 3. Arrière (Back)</span>
                          <span className="text-[9px] font-normal text-stone-400 font-mono">
                            ({livingBack.length}/{backHeroes.length})
                          </span>
                        </span>
                        <div>
                          {formation.frontLine.isBreached &&
                          (formation.middleLine?.isBreached || livingMiddle.length === 0) ? (
                            <span
                              title="Toutes les lignes avancées ont cédé : l'arrière-garde est exposée aux attaques de mêlée !"
                              className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-600 font-bold animate-pulse"
                            >
                              ⚠️ EXPOSÉE
                            </span>
                          ) : (
                            <span className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-stone-900 text-stone-400 border border-stone-800 font-semibold">
                              🏹 Protégée
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 py-0.5 flex-1 content-start">
                        {backHeroes.map((hero) => (
                          <CharacterCard
                            key={hero.id}
                            character={hero}
                            cardSize={effectiveCardSize}
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
                  </div>
                ) : (
                  /* VIEW MODE 2: RANGS HORIZONTAUX (Classique / Bi-partite) */
                  <div className="flex flex-col space-y-1 sm:space-y-1.5 pt-0.5 pb-0.5">
                    {/* Row 1: Première Ligne (Avant) */}
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between px-1.5 w-full">
                        <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1">
                          <span>⚔️ Première Ligne (Avant)</span>
                          <span className="text-[8.5px] font-normal text-stone-400 font-mono">
                            ({livingFront.length}/{frontHeroes.length} en vie)
                          </span>
                        </span>

                        <div>
                          {!formation.frontLine.hasCasualties ? (
                            <span className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold">
                              🛡️ Rempart Intact
                            </span>
                          ) : formation.frontLine.isProtected ? (
                            <span
                              title={formation.frontLine.protectionReason}
                              className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-semibold"
                            >
                              🛡️ Brèche Colmatée
                            </span>
                          ) : (
                            <span
                              title="Un héros est tombé sans protection : les monstres peuvent attaquer la ligne suivante !"
                              className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-600 font-bold animate-pulse"
                            >
                              ⚠️ BRÈCHE OUVERTE
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-center items-center gap-1.5 sm:gap-2 mx-auto w-full my-0.5 flex-wrap">
                        {frontHeroes.map((hero) => (
                          <CharacterCard
                            key={hero.id}
                            character={hero}
                            cardSize={effectiveCardSize}
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

                    {/* Row 2: Ligne Médiane (Milieu) - visible only in tripartite formation */}
                    {isTripartite && middleHeroes.length > 0 && (
                      <div className="pt-1 border-t border-stone-800/80 space-y-0.5 my-0.5">
                        <div className="flex items-center justify-between px-1.5 w-full">
                          <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                            <span>🛡️ Ligne Médiane (Milieu)</span>
                            <span className="text-[8.5px] font-normal text-stone-400 font-mono">
                              ({livingMiddle.length}/{middleHeroes.length} en vie)
                            </span>
                          </span>

                          <div>
                            {!formation.frontLine.isBreached ? (
                              <span className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-stone-900 text-stone-400 border border-stone-800 font-semibold">
                                🔒 À couvert (Inattaquable)
                              </span>
                            ) : (
                              <span
                                title="La première ligne est percée : cette ligne peut être ciblée en mêlée !"
                                className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600 font-bold animate-pulse"
                              >
                                ⚠️ EXPOSÉE EN MÊLÉE
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-center items-center gap-1.5 sm:gap-2 mx-auto w-full my-0.5 flex-wrap">
                          {middleHeroes.map((hero) => (
                            <CharacterCard
                              key={hero.id}
                              character={hero}
                              cardSize={effectiveCardSize}
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
                    )}

                    {/* Row 3 (or Row 2 in bipartite): Arrière-Garde (Back) */}
                    <div className="pt-1 border-t border-stone-800/80 space-y-0.5 my-0.5">
                      <div className="flex items-center justify-between px-1.5 w-full">
                        <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1">
                          <span>🏹 Arrière-Garde (Back)</span>
                          <span className="text-[8.5px] font-normal text-stone-400 font-mono">
                            ({livingBack.length}/{backHeroes.length} en vie)
                          </span>
                        </span>

                        <div>
                          {(!isTripartite && formation.frontLine.isBreached) ||
                          (isTripartite &&
                            formation.frontLine.isBreached &&
                            (formation.middleLine?.isBreached || livingMiddle.length === 0)) ? (
                            <span
                              title="Les lignes avancées ont cédé : l'arrière-garde est exposée aux attaques de mêlée !"
                              className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-600 font-bold animate-pulse"
                            >
                              ⚠️ EXPOSÉE EN MÊLÉE
                            </span>
                          ) : (
                            <span className="text-[8px] sm:text-[8.5px] px-1.5 py-0.2 rounded bg-stone-900 text-stone-400 border border-stone-800 font-semibold">
                              🏹 En retrait (Protégée)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-center items-center gap-1.5 sm:gap-2 mx-auto w-full my-0.5 flex-wrap">
                        {backHeroes.map((hero) => (
                          <CharacterCard
                            key={hero.id}
                            character={hero}
                            cardSize={effectiveCardSize}
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
                  </div>
                )}
              </div>
            );
          })()}

          {/* Quick Log Ticker when journal is collapsed or on mobile */}
          {(!showCombatLog || (mobileTab === 'arena' && !isDesktop)) && (
            <div className="p-1.5 sm:p-2 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between gap-2 shadow">
              <div className="min-w-0 flex items-center gap-1.5 text-[10.5px] sm:text-[11px]">
                <ScrollText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-stone-400 shrink-0 hidden sm:inline">Dernier événement :</span>
                <span className="truncate text-stone-200 font-mono">{lastLogLine || 'Combat en attente...'}</span>
              </div>
              <button
                onClick={() => {
                  setShowCombatLog(true);
                  setMobileTab('log');
                }}
                className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1 shrink-0 pl-1"
              >
                <span>Journal</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Bottom Action Controls (Sticky so buttons never disappear on any screen) */}
          <div className="sticky bottom-0 z-20 bg-stone-900/95 backdrop-blur-md p-1.5 rounded-xl border border-stone-800/90 shadow-xl grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 mt-0.5">
            <button
              onClick={newEncounter}
              className="col-span-1 sm:flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white shadow-md shadow-rose-900/20 flex items-center justify-center gap-1.5 transition-all touch-manipulation"
            >
              🐉 Rencontre
            </button>
            <button
              onClick={handleRest}
              className="col-span-1 sm:flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white shadow-md shadow-emerald-900/20 flex items-center justify-center gap-1.5 transition-all touch-manipulation"
            >
              <Tent className="w-3.5 h-3.5 shrink-0" />
              Repos complet
            </button>
            <button
              onClick={() => saveGame(undefined, undefined, undefined, true)}
              className="col-span-1 sm:flex-none py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-200 border border-stone-700/60 flex items-center justify-center gap-1.5 transition-colors touch-manipulation"
              title="Sauvegarder la partie"
            >
              <Save className="w-3.5 h-3.5 shrink-0" />
              Sauvegarder
            </button>
            <div className="col-span-1 sm:flex-none flex items-center gap-1">
              <button
                onClick={handleExportSave}
                className="flex-1 sm:flex-none py-1.5 px-2.5 rounded-lg text-xs bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-300 border border-stone-700/60 transition-colors flex items-center justify-center gap-1 touch-manipulation"
                title="Télécharger la sauvegarde JSON"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="sm:hidden text-[10px]">Export</span>
              </button>
              <label
                className="flex-1 sm:flex-none py-1.5 px-2.5 rounded-lg text-xs bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-300 border border-stone-700/60 cursor-pointer transition-colors flex items-center justify-center gap-1 touch-manipulation"
                title="Charger un fichier sauvegarde JSON"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span className="sm:hidden text-[10px]">Import</span>
                <input type="file" accept=".json" onChange={handleImportSave} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Resizable Splitter Bar (Desktop >= lg only, when showCombatLog is true) */}
        {showCombatLog && (
          <div
            onPointerDown={handleSplitterPointerDown}
            onDoubleClick={resetSplitRatio}
            title="Glissez pour ajuster la largeur des panneaux (Double-clic pour réinitialiser à 62%)"
            className={`hidden lg:flex items-center justify-center w-3.5 hover:w-3.5 cursor-col-resize select-none shrink-0 group mx-1.5 transition-colors relative z-10 self-stretch ${
              isDraggingSplitter ? 'bg-amber-500/10' : ''
            }`}
            style={isDesktop && leftColHeight ? { height: `${leftColHeight}px` } : undefined}
          >
            {/* Vertical divider line */}
            <div
              className={`w-1 h-full rounded-full transition-colors ${
                isDraggingSplitter
                  ? 'bg-amber-500'
                  : 'bg-stone-800 group-hover:bg-amber-500/80 group-active:bg-amber-500'
              }`}
            />
            {/* Central grab handle badge */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 p-0.5 rounded-md border text-stone-400 transition-all ${
                isDraggingSplitter
                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md scale-110'
                  : 'bg-stone-900 border-stone-700/80 group-hover:text-amber-400 group-hover:border-amber-500/60 shadow-sm'
              }`}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Right Column: Combat Log (when showCombatLog is true) */}
        {showCombatLog && (
          <div
            className={`flex-1 min-w-0 flex flex-col h-[520px] sm:h-[600px] lg:h-full ${mobileTab === 'arena' ? 'hidden lg:flex' : 'flex'}`}
            style={
              isDesktop && leftColHeight
                ? { height: `${leftColHeight}px`, maxHeight: `${leftColHeight}px` }
                : undefined
            }
          >
            <CombatLog logs={logs} onClear={() => setLogs([])} onClose={() => setShowCombatLog(false)} />
          </div>
        )}
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
            const withFormation = assignFormationPositions(newParty);
            setParty(withFormation);
            saveGame(withFormation);
            addLog(`🏆 Groupe de ${withFormation.length} héros importé depuis la simulation batch !`);
          }}
        />
      )}

      {levelUpResults && levelUpResults.length > 0 && (
        <LevelUpModal
          results={levelUpResults}
          onClose={() => setLevelUpResults(null)}
        />
      )}
    </div>
  );
};
export default App;
