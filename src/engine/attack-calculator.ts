// engine/attack-calculator.ts
// 攻击加值计算 — 纯函数
// 对应 HLD §6.1

import type { AbilityScores } from '../types/ability';
import type { Weapon, EquipmentItem } from '../types/equipment';
import type { Feature } from '../types/class';
import type { CharacterAttack } from '../types/character';
import type { DataLoader } from '../data/loader';
import { getModifier, getTotalScore } from './ability-modifier';

/**
 * 计算角色的攻击列表（游戏模式中显示）
 *
 * 规则：
 * - 攻击加值 = 熟练加值 + 属性调整值（Str或Dex，取决于武器属性）
 * - Finesse武器：可选Str或Dex（取高者）
 * - 伤害 = 武器骰 + 属性调整值
 * - 武器精通属性从武器数据中获取
 *
 * @param scores - 属性值对象
 * @param equipment - 装备列表
 * @param proficiencyBonus - 熟练加值
 * @param features - 角色特性列表
 * @param data - DataLoader
 * @param weaponProficiencies - 角色武器熟练项列表（可选，默认空）
 * @returns 攻击列表
 */
export function calculateAttacks(
  scores: AbilityScores,
  equipment: readonly EquipmentItem[],
  proficiencyBonus: number,
  features: readonly Feature[],
  data: DataLoader,
  weaponProficiencies: readonly string[] = []
): CharacterAttack[] {
  const attacks: CharacterAttack[] = [];

  // 获取所有已装备的武器
  const equippedWeapons = equipment
    .filter(e => e.equipped && e.type === 'weapon')
    .map(e => ({ itemId: e.id, weapon: data.getWeapon(e.id) }))
    .filter((w): w is { itemId: string; weapon: Weapon } => w.weapon != null);

  for (const { weapon } of equippedWeapons) {
    const { attackBonus, damageMod } = calculateWeaponAttack(
      scores,
      weapon,
      proficiencyBonus,
      weaponProficiencies
    );

    // 伤害字符串（使用 entries[0] 为基础伤害）
    const baseEntry = weapon.damage.entries[0];
    const damageDice = weapon.versatileDamage
      ? `${baseEntry?.dice ?? '1d8'}(${weapon.versatileDamage})`
      : (baseEntry?.dice ?? '1d8');
    const damageStr = `${damageDice}+${damageMod}`;

    attacks.push({
      name: weapon.id,
      attackBonus,
      damage: damageStr,
      damageType: baseEntry?.type ?? 'Slashing', // 从武器数据获取伤害类型
      mastery: weapon.mastery ? [weapon.mastery] : [],
    });
  }

  return attacks;
}

/**
 * 计算单件武器的攻击加值和伤害调整值
 */
function calculateWeaponAttack(
  scores: AbilityScores,
  weapon: Weapon,
  proficiencyBonus: number,
  weaponProficiencies: readonly string[]
): { attackBonus: number; damageMod: number; abilityUsed: string } {
  const strMod = getModifier(getTotalScore(scores, 'Strength'));
  const dexMod = getModifier(getTotalScore(scores, 'Dexterity'));

  // 确定攻击属性
  let abilityMod: number;
  let abilityUsed: string;

  if (weapon.properties.includes('Finesse')) {
    // Finesse武器：取Str和Dex中较高的
    if (dexMod >= strMod) {
      abilityMod = dexMod;
      abilityUsed = 'Dexterity';
    } else {
      abilityMod = strMod;
      abilityUsed = 'Strength';
    }
  } else if (weapon.properties.includes('Range') || weapon.damage.ability === 'Dexterity') {
    // 远程武器：使用Dex
    abilityMod = dexMod;
    abilityUsed = 'Dexterity';
  } else {
    // 近战武器：使用Str
    abilityMod = strMod;
    abilityUsed = 'Strength';
  }

  // 检查武器熟练度
  // weaponProficiencies 可以包含：
  // - "Simple"：所有简易武器熟练
  // - "Martial"：所有军用武器熟练
  // - 具体武器ID（如 "Longsword"）：特定武器熟练
  const isProficient =
    weaponProficiencies.includes(weapon.id) ||
    weaponProficiencies.includes(weapon.category) ||
    weaponProficiencies.includes('Simple') && weapon.category === 'Simple' ||
    weaponProficiencies.includes('Martial') && weapon.category === 'Martial';

  const attackBonus = (isProficient ? proficiencyBonus : 0) + abilityMod;

  return {
    attackBonus,
    damageMod: Math.max(0, abilityMod), // 伤害调整值不低于0（2024规则）
    abilityUsed,
  };
}
