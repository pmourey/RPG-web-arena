import { ActiveEffect, Combatant, HeroData, SpellData } from '../types/game';
import {
  addEffect,
  cleanseNegative,
  getDCValue,
  receiveDamage,
  savingThrow,
} from './character';
import { rollDamageDice, rollDice, rollDie } from './dice';

export const BENEFICIAL_EFFECTS = new Set([
  'heal',
  'buff',
  'shield',
  'cleanse',
  'revive',
]);

export function isBeneficial(spell: SpellData): boolean {
  return BENEFICIAL_EFFECTS.has(spell.effect);
}

export function scaledDuration(level: number): number {
  return Math.max(1, Math.floor((level + 1) / 2));
}

export function resolveSpellEffect(
  caster: HeroData,
  spell: SpellData,
  targets: Combatant[]
): string[] {
  const messages: string[] = [];
  const sName = spell.name;
  const sEffect = spell.effect;

  for (const target of targets) {
    // 1. Specials by name
    if (sName === 'Shield' || sName === 'Shield Wild') {
      addEffect(target, {
        kind: 'shield',
        turns: 1,
        magnitude: 5,
        spell_name: sName,
        just_applied: true,
      });
      messages.push(`[Sort] ${sName} augmente la CA de ${target.name} de +5 pour 1 round !`);
      continue;
    }

    if (sName === 'Death Ward' || sName === 'Death Ward Faith') {
      addEffect(target, {
        kind: 'death_ward',
        turns: null,
        magnitude: 0,
        spell_name: sName,
        just_applied: true,
      });
      messages.push(`[Sort] ${sName} protège ${target.name} contre le prochain coup mortel !`);
      continue;
    }

    if (sName === 'Time Stop') {
      addEffect(target, {
        kind: 'time_stop',
        turns: 1,
        magnitude: 0,
        spell_name: sName,
        just_applied: true,
      });
      messages.push(`[Sort] ${caster.name} arrête le temps avec ${sName} !`);
      continue;
    }

    if (sName === 'Mind Blank') {
      const turns = Math.max(2, Math.floor(spell.level / 2));
      addEffect(target, {
        kind: 'mind_blank',
        turns,
        magnitude: 0,
        spell_name: sName,
        just_applied: true,
      });
      messages.push(`[Sort] ${sName} protège l'esprit de ${target.name} pour ${turns} rounds !`);
      continue;
    }

    if (sName === 'Foresight' || sName === 'Foresight Nature') {
      const turns = scaledDuration(spell.level);
      addEffect(target, {
        kind: 'foresight',
        turns,
        magnitude: 2,
        spell_name: sName,
        just_applied: true,
      });
      messages.push(`[Sort] ${sName} confère à ${target.name} +2 CA et +2 pour toucher (${turns} rounds) !`);
      continue;
    }

    if (sName === 'Resurrection' || sName === 'Revivify') {
      const removed = cleanseNegative(target);
      const cleansed = removed.length > 0 ? ` Dissipé: ${removed.join(', ')}.` : '';
      if (target.hp <= 0) {
        target.hp = 1;
        messages.push(`[Sort] ${sName} ressuscite ${target.name} à 1 PV !${cleansed}`);
      } else if (removed.length > 0) {
        messages.push(`[Sort] ${caster.name} lance ${sName} et purifie ${target.name} (${removed.join(', ')}) !`);
      } else {
        messages.push(`[Sort] ${caster.name} lance ${sName} sur ${target.name}, mais rien à restaurer.`);
      }
      continue;
    }

    if (sName === 'Wish Spell' || sName === 'Absolute Salvation') {
      const removed = cleanseNegative(target);
      target.hp = target.max_hp;
      const cleansed = removed.length > 0 ? ` Dissipé: ${removed.join(', ')}.` : '';
      messages.push(`[Sort] ${sName} restaure entièrement ${target.name} (${target.max_hp} PV) !${cleansed}`);
      continue;
    }

    // 2. Smite
    if (sEffect === 'smite' || sName.toLowerCase().includes('smite')) {
      let bonus = spell.damage_dice ? rollDamageDice(spell.damage_dice) : 0;
      if (!bonus) {
        for (let i = 0; i < Math.max(1, spell.level); i++) bonus += rollDie(8);
      }
      const extra = sName.toLowerCase().includes('blinding') ? 'blind' : '';
      addEffect(caster, {
        kind: 'smite',
        turns: 2,
        magnitude: bonus,
        spell_name: sName,
        extra,
        just_applied: true,
      });
      const detail = `+${bonus} sur la prochaine attaque d'arme${extra ? ' et aveugle' : ''}`;
      messages.push(`[Sort] ${caster.name} invoque ${sName} (${detail}) !`);
      continue;
    }

    // 3. Heal
    if (sEffect === 'heal') {
      const healAmount = spell.damage_dice ? rollDamageDice(spell.damage_dice) : rollDice(spell.level, 8, 4);
      const old = target.hp;
      target.hp = Math.min(target.max_hp, target.hp + healAmount);
      messages.push(`[Sort] ${caster.name} soigne ${target.name} pour ${target.hp - old} PV !`);
      continue;
    }

    // 4. Buff (Bless)
    if (sEffect === 'buff') {
      const turns = scaledDuration(spell.level);
      addEffect(target, {
        kind: 'bless',
        turns,
        magnitude: 0,
        spell_name: sName,
        just_applied: true,
      });
      messages.push(`[Sort] ${caster.name} bénit ${target.name} pour ${turns} round(s) !`);
      continue;
    }

    // 5. Shield
    if (sEffect === 'shield') {
      const magnitude = 2 + Math.floor(spell.level / 2);
      const turns = scaledDuration(spell.level);
      addEffect(target, {
        kind: 'shield',
        turns,
        magnitude,
        spell_name: sName,
        just_applied: true,
      });
      messages.push(`[Sort] ${caster.name} protège ${target.name} (+${magnitude} CA pour ${turns} rounds) !`);
      continue;
    }

    // 6. Cleanse
    if (sEffect === 'cleanse') {
      const removed = cleanseNegative(target);
      if (removed.length > 0) {
        messages.push(`[Sort] ${caster.name} purifie ${target.name} (${removed.join(', ')}) !`);
      } else {
        messages.push(`[Sort] ${caster.name} lance ${sName} sur ${target.name}, mais rien à purifier.`);
      }
      continue;
    }

    // 7. Conditions (Control)
    const conditionKeys = ['sleep', 'blind', 'paralyze', 'frighten', 'restrained', 'disadvantage'];
    const matchedCond = conditionKeys.find((k) => sEffect.includes(k) || sName.toLowerCase().includes(k));
    if (matchedCond) {
      const isMental = ['sleep', 'blind', 'paralyze', 'frighten'].includes(matchedCond);
      if (isMental && target.effects.some((e) => e.kind === 'mind_blank')) {
        messages.push(`[Sort] ${target.name} résiste à ${sName} grâce à Mind Blank !`);
        continue;
      }
      if (spell.dc_type && savingThrow(target, spell.dc_type, getDCValue(caster))) {
        messages.push(`[Sort] ${target.name} réussit son jet de sauvegarde contre ${sName} !`);
        continue;
      }
      const turns = scaledDuration(spell.level);
      addEffect(target, {
        kind: matchedCond,
        turns,
        magnitude: 0,
        spell_name: sName,
        just_applied: true,
      });
      const verbMap: Record<string, string> = {
        sleep: "s'endort",
        blind: 'est aveuglé',
        paralyze: 'est paralysé et ne peut plus agir',
        frighten: 'est effrayé',
        restrained: 'est entravé',
        disadvantage: 'est affaibli',
      };
      messages.push(`[Sort] ${sName} : ${target.name} ${verbMap[matchedCond] || 'est affecté'} pour ${turns} round(s) !`);
      continue;
    }

    // 8. Damage (default for attack spells)
    if (sEffect.includes('damage') || spell.damage_dice) {
      if (sEffect.includes('psychic') && target.effects.some((e) => e.kind === 'mind_blank')) {
        messages.push(`[Sort] L'esprit de ${target.name} est impénétrable (Mind Blank) ; ${sName} est sans effet !`);
        continue;
      }
      let dmg = spell.damage_dice ? rollDamageDice(spell.damage_dice) : rollDice(spell.level, 6, 0);
      if (spell.dc_type && savingThrow(target, spell.dc_type, getDCValue(caster))) {
        if (spell.dc_success === 'half') {
          dmg = Math.max(1, Math.floor(dmg / 2));
          const note = receiveDamage(target, dmg);
          messages.push(`[Sort] ${target.name} réussit son jet contre ${sName} et subit des dégâts réduits (${dmg} PV) ! ${note}`.trim());
          continue;
        } else {
          messages.push(`[Sort] ${target.name} réussit son jet contre ${sName} et ne subit aucun dégât !`);
          continue;
        }
      }
      const note = receiveDamage(target, dmg);
      messages.push(`[Sort] ${caster.name} lance ${sName} et inflige ${dmg} dégâts à ${target.name} ! ${note}`.trim());
      continue;
    }

    // 9. Generic Fallback
    messages.push(`[Sort] ${caster.name} lance ${sName} sur ${target.name} !`);
  }

  return messages;
}
