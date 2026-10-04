import React, { useState } from 'react';
import { Combatant, HeroData, InventoryItem, MonsterData } from '../types/game';
import {
  equipItem,
  getArmorClass,
  getAttackBonus,
  getDCValue,
  isItemEquipped,
  removeFromInventory,
  unequipArmor,
  unequipShield,
  unequipWeapon,
  unequipWorn,
  useItem,
} from '../engine/character';
import { getModifiers, getProficiencyBonus } from '../engine/dice';
import { X, Shield, Sword, Sparkles, Package, ArrowRightLeft, Trash2, CheckCircle2 } from 'lucide-react';

interface CharacterSheetModalProps {
  character: Combatant | null;
  party: HeroData[];
  onClose: () => void;
  onUpdateParty: (updatedParty: HeroData[]) => void;
  onLog: (msg: string) => void;
}

export const CharacterSheetModal: React.FC<CharacterSheetModalProps> = ({
  character,
  party,
  onClose,
  onUpdateParty,
  onLog,
}) => {
  if (!character) return null;

  const isHero = character.is_hero;
  const hero = isHero ? (character as HeroData) : null;
  const monster = !isHero ? (character as MonsterData) : null;

  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'spells'>('overview');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<number>(
    party.find((h) => h.id !== hero?.id)?.id || 0
  );
  const [statusMsg, setStatusMsg] = useState<string>('');

  const abilities = hero ? hero.abilities : monster!.abilities;
  const mods = getModifiers(abilities);
  const ac = getArmorClass(character);
  const atkBonus = getAttackBonus(character);
  const prof = getProficiencyBonus(character.level);

  const selectedItem = hero && selectedItemIndex !== null ? hero.inventory[selectedItemIndex] : null;

  const handleEquip = (item: InventoryItem) => {
    if (!hero) return;
    const msg = equipItem(hero, item);
    setStatusMsg(msg);
    onLog(msg);
    onUpdateParty([...party]);
  };

  const handleUnequip = (item: InventoryItem) => {
    if (!hero) return;
    let msg = '';
    if (item.type === 'weapon') msg = unequipWeapon(hero);
    else if (item.type === 'armor') msg = unequipArmor(hero);
    else if (item.type === 'shield') msg = unequipShield(hero);
    else if (item.type === 'ring' || item.type === 'wondrous') msg = unequipWorn(hero, item.name);
    setStatusMsg(msg);
    onLog(msg);
    onUpdateParty([...party]);
  };

  const handleUseItem = (item: InventoryItem) => {
    if (!hero) return;
    const msg = useItem(hero, item);
    // If potion/consumable, remove after use
    if (item.type === 'potion' || item.type === 'consumable') {
      removeFromInventory(hero, item);
      setSelectedItemIndex(null);
    }
    setStatusMsg(msg);
    onLog(msg);
    onUpdateParty([...party]);
  };

  const handleTransfer = (item: InventoryItem) => {
    if (!hero) return;
    if (isItemEquipped(hero, item)) {
      setStatusMsg("Impossible de transférer un objet équipé. Déséquipez-le d'abord.");
      return;
    }
    const recipient = party.find((h) => h.id === transferTargetId);
    if (!recipient) {
      setStatusMsg('Sélectionnez un destinataire valide.');
      return;
    }
    const idx = hero.inventory.indexOf(item);
    if (idx !== -1) {
      const [transferred] = hero.inventory.splice(idx, 1);
      recipient.inventory.push(transferred);
      const msg = `${transferred.name} transféré à ${recipient.name}.`;
      setStatusMsg(msg);
      onLog(msg);
      setSelectedItemIndex(null);
      onUpdateParty([...party]);
    }
  };

  const handleRemove = (item: InventoryItem) => {
    if (!hero) return;
    const msg = removeFromInventory(hero, item);
    setStatusMsg(msg);
    onLog(msg);
    setSelectedItemIndex(null);
    onUpdateParty([...party]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="min-w-0 pr-2">
            <h2 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2 truncate">
              <span className="truncate">{character.name}</span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium bg-stone-800 text-stone-300 border border-stone-700 shrink-0">
                {isHero ? `${hero!.class_type} (${hero!.race})` : 'Monstre'} • Niv. {character.level}
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5 truncate">
              PV: {character.hp}/{character.max_hp} • CA: {ac} • Bonus Atk: +{atkBonus} • {character.condition.toUpperCase()}
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

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 bg-stone-950/30 px-2 sm:px-4 overflow-x-auto whitespace-nowrap scrollbar-none touch-pan-x">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 sm:py-2.5 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'overview'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Aperçu & Stats
          </button>
          {isHero && (
            <>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`py-2 sm:py-2.5 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-colors shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'inventory'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Inventaire ({hero!.inventory.length})
              </button>
              <button
                onClick={() => setActiveTab('spells')}
                className={`py-2 sm:py-2.5 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-colors shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'spells'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sorts ({hero!.spells.length})
              </button>
            </>
          )}
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 text-sm space-y-4">
          {statusMsg && (
            <div className="p-2 sm:p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-center justify-between">
              <span>{statusMsg}</span>
              <button onClick={() => setStatusMsg('')} className="text-amber-400 hover:text-amber-200 p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* 6 Attributes Grid */}
              <div>
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Caractéristiques</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 text-center">
                  {[
                    { label: 'FORCE', val: abilities.strength, mod: mods.str },
                    { label: 'DEXTÉRITÉ', val: abilities.dexterity, mod: mods.dex },
                    { label: 'CONSTITUTION', val: abilities.constitution, mod: mods.con },
                    { label: 'INTELLIGENCE', val: abilities.intelligence, mod: mods.int },
                    { label: 'SAGESSE', val: abilities.wisdom, mod: mods.wis },
                    { label: 'CHARISME', val: abilities.charisma, mod: mods.cha },
                  ].map((attr) => (
                    <div key={attr.label} className="p-2 sm:p-2.5 rounded-xl bg-stone-800/50 border border-stone-700/60">
                      <div className="text-[9px] sm:text-[10px] text-stone-400 font-bold truncate">{attr.label}</div>
                      <div className="text-base sm:text-lg font-bold text-stone-100">{attr.val}</div>
                      <div className="text-xs font-semibold text-amber-400">
                        {attr.mod >= 0 ? `+${attr.mod}` : attr.mod}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Combat Stats */}
              <div>
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Statistiques de Combat</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-stone-800/40 border border-stone-700/50">
                    <span className="text-[10px] sm:text-[11px] text-stone-400">Classe d'Armure (CA)</span>
                    <div className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-1.5 mt-0.5">
                      <Shield className="w-4 h-4 text-blue-400" /> {ac}
                    </div>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-stone-800/40 border border-stone-700/50">
                    <span className="text-[10px] sm:text-[11px] text-stone-400">Bonus d'attaque</span>
                    <div className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-1.5 mt-0.5">
                      <Sword className="w-4 h-4 text-rose-400" /> +{atkBonus}
                    </div>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-stone-800/40 border border-stone-700/50">
                    <span className="text-[10px] sm:text-[11px] text-stone-400">Bonus Maîtrise</span>
                    <div className="text-sm sm:text-base font-bold text-stone-100 mt-0.5">+{prof}</div>
                  </div>
                  {isHero && hero && (
                    <div className="p-2 sm:p-2.5 rounded-xl bg-stone-800/40 border border-stone-700/50">
                      <span className="text-[10px] sm:text-[11px] text-stone-400">Attaques / tour</span>
                      <div className="text-sm sm:text-base font-bold text-stone-100 mt-0.5">{hero.multi_attack}x</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Equipment Equipped Summary (Hero) */}
              {isHero && hero && (
                <div>
                  <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Équipement Équipé</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-stone-800/40 border border-stone-700/50">
                      <div className="text-[10px] text-stone-400">Arme</div>
                      <div className="font-semibold text-xs sm:text-sm text-stone-200">{hero.weapon.name}</div>
                      <div className="text-xs text-amber-400/90 font-mono">
                        {hero.weapon.damage_dice.num_dice}d{hero.weapon.damage_dice.roll_dice} dégâts
                      </div>
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-stone-800/40 border border-stone-700/50">
                      <div className="text-[10px] text-stone-400">Armure</div>
                      <div className="font-semibold text-xs sm:text-sm text-stone-200">{hero.armor.name}</div>
                      <div className="text-xs text-blue-400 font-mono">+{hero.armor.bonus} CA</div>
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-stone-800/40 border border-stone-700/50">
                      <div className="text-[10px] text-stone-400">Bouclier</div>
                      <div className="font-semibold text-xs sm:text-sm text-stone-200">{hero.shield.name}</div>
                      <div className="text-xs text-blue-400 font-mono">+{hero.shield.bonus} CA</div>
                    </div>
                  </div>

                  {hero.worn.length > 0 && (
                    <div className="mt-2 p-2 sm:p-2.5 rounded-xl bg-stone-800/30 border border-stone-700/40">
                      <div className="text-[10px] text-stone-400 mb-1">Objets magiques portés :</div>
                      <div className="flex flex-wrap gap-1.5">
                        {hero.worn.map((w, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs rounded bg-purple-950/60 text-purple-300 border border-purple-800/60"
                          >
                            {w.name} ({w.desc || 'Magique'})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Active Effects */}
              {character.effects.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Effets actifs</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {character.effects.map((e, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-lg text-xs bg-stone-800 border border-stone-700 text-stone-200"
                      >
                        <span className="font-bold text-amber-400">{e.spell_name || e.kind}</span>
                        {e.turns !== null ? ` (${e.turns} tour(s))` : ' (Permanent)'}
                        {e.magnitude ? ` [Mag: +${e.magnitude}]` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* XP and Gold */}
              {isHero && hero && (
                <div className="flex flex-wrap gap-2 sm:gap-4 pt-2 border-t border-stone-800/80 text-[11px] sm:text-xs text-stone-400">
                  <span>💰 Or: <strong className="text-amber-400">{hero.gold} gp</strong></span>
                  <span>⭐ XP: <strong className="text-stone-200">{hero.xp}</strong> (Suivant: {hero.level * 500} XP)</span>
                  <span>📍 Position: <strong className="text-stone-200">{hero.position === 'front' ? 'Front-line' : 'Back-line'}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INVENTORY */}
          {activeTab === 'inventory' && isHero && hero && (
            <div className="space-y-3 sm:space-y-4">
              <div className="text-xs text-stone-400">
                Sélectionnez un objet dans la liste pour l'équiper, l'utiliser ou le transférer.
              </div>

              {/* Items List */}
              <div className="border border-stone-800 rounded-xl overflow-hidden divide-y divide-stone-800/60 max-h-56 sm:max-h-64 overflow-y-auto">
                {hero.inventory.length === 0 ? (
                  <div className="p-4 text-center text-stone-500 text-xs">Inventaire vide.</div>
                ) : (
                  hero.inventory.map((item, idx) => {
                    const equipped = isItemEquipped(hero, item);
                    const isSelected = selectedItemIndex === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedItemIndex(idx)}
                        className={`p-2 sm:p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-950/40 text-stone-100'
                            : 'hover:bg-stone-800/40 text-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 pr-1">
                          <span className="text-xs font-semibold truncate">{item.name}</span>
                          <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700/50 uppercase shrink-0">
                            {item.type || 'Objet'}
                          </span>
                          {item.rarity && (
                            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700/40 shrink-0">
                              {item.rarity}
                            </span>
                          )}
                        </div>
                        {equipped && (
                          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Équipé
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Item Action Bar */}
              {selectedItem && (
                <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800 space-y-2.5">
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-stone-100">{selectedItem.name}</h4>
                    <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
                      {selectedItem.desc || `${selectedItem.type} ${selectedItem.damage ? `(1d${selectedItem.damage})` : ''} ${selectedItem.bonus ? `(+${selectedItem.bonus})` : ''}`}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-stone-800/80">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {/* Equip / Unequip */}
                      {['weapon', 'armor', 'shield', 'ring', 'wondrous'].includes(selectedItem.type || '') && (
                        isItemEquipped(hero, selectedItem) ? (
                          <button
                            onClick={() => handleUnequip(selectedItem)}
                            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
                          >
                            Déséquiper
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEquip(selectedItem)}
                            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                          >
                            Équiper
                          </button>
                        )
                      )}

                      {/* Consumable / Potion */}
                      {['potion', 'consumable'].includes(selectedItem.type || '') && (
                        <button
                          onClick={() => handleUseItem(selectedItem)}
                          className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                        >
                          Boire / Utiliser
                        </button>
                      )}

                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(selectedItem)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-200 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Supprimer
                      </button>
                    </div>

                    {/* Transfer to teammate */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <select
                        value={transferTargetId}
                        onChange={(e) => setTransferTargetId(Number(e.target.value))}
                        className="flex-1 sm:flex-none px-2 py-1.5 rounded-lg text-xs bg-stone-800 border border-stone-700 text-stone-200"
                      >
                        {party
                          .filter((h) => h.id !== hero.id)
                          .map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name} ({h.class_type})
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleTransfer(selectedItem)}
                        disabled={isItemEquipped(hero, selectedItem)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 flex items-center gap-1 shrink-0"
                        title={isItemEquipped(hero, selectedItem) ? "Déséquipez d'abord pour transférer" : "Transférer l'objet"}
                      >
                        <ArrowRightLeft className="w-3 h-3" /> Transférer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SPELLS */}
          {activeTab === 'spells' && isHero && hero && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-stone-400">
                <span>Magie: <strong className="text-stone-200 uppercase">{hero.spellcasting_ability || 'Aucune'}</strong></span>
                <span>DD Sauvegarde: <strong className="text-amber-400">{getDCValue(hero)}</strong></span>
              </div>

              {/* Spell Slots display */}
              <div className="p-2.5 sm:p-3 bg-stone-950/60 rounded-xl border border-stone-800">
                <div className="text-[10px] sm:text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Emplacements de sorts</div>
                <div className="grid grid-cols-5 sm:grid-cols-9 gap-1 sm:gap-1.5 text-center">
                  {hero.max_spell_slots.slice(0, 9).map((max, idx) => (
                    <div
                      key={idx}
                      className={`p-1 sm:p-1.5 rounded-lg border text-xs ${
                        max > 0
                          ? 'bg-stone-800/80 border-stone-700 text-stone-200'
                          : 'bg-stone-900/30 border-stone-800/40 text-stone-600'
                      }`}
                    >
                      <div className="text-[9px] sm:text-[10px] text-stone-400 font-bold">L{idx + 1}</div>
                      <div className="font-semibold text-[11px] sm:text-xs text-amber-400">
                        {hero.current_spell_slots[idx]}/{max}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Known Spells List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Sorts Connus</div>
                {hero.spells.length === 0 ? (
                  <div className="p-4 text-center text-stone-500 text-xs">Aucun sort connu.</div>
                ) : (
                  hero.spells.map((s, idx) => (
                    <div key={idx} className="p-2.5 sm:p-3 bg-stone-800/40 border border-stone-700/60 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs sm:text-sm text-stone-100 flex items-center gap-1.5">
                          <span>{s.name}</span>
                          <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-700/40 font-mono">
                            Niveau {s.level}
                          </span>
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-stone-400 uppercase tracking-wider">{s.effect}</span>
                      </div>
                      <p className="text-xs text-stone-300">{s.description || 'Sortilège magique.'}</p>
                      {s.damage_dice && (
                        <div className="text-[10px] sm:text-[11px] text-rose-400/90 font-mono">
                          Dégâts: {s.damage_dice.num_dice}d{s.damage_dice.roll_dice}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 sm:p-3 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
