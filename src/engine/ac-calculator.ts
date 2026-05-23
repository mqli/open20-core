// engine/ac-calculator.ts
// AC(Armor Class)计算 — 纯函数
// 对应 HLD §6.1 + PRD v4.0 §10 附录D
// 这是所有计算中最容易出错的，必须100%准确

import type { AbilityScores } from '../types/ability';
import type { Armor, EquipmentItem } from '../types/equipment';
import type { Feature } from '../types/class';
import type { DataLoader } from '../data/loader';
import type { FeatACBonus } from '../types/feat';
import { getModifier, getTotalScore } from './ability-modifier';

/**
 * 计算AC(Armor Class)
 *
 * 规则（2024 PHB）：
 * - 无甲(无特性): 10 + Dex调整值
 * - Mage Armor: 13 + Dex调整值（通过法术或条件触发）
 * - Barbarian Unarmored Defense: 10 + Dex + Con
 * - Monk Unarmored Defense: 10 + Dex + Wis
 * - 轻甲: 护甲AC + Dex
 * - 中甲: 护甲AC + min(Dex, +2)
 * - 重甲: 护甲AC
 * - 盾牌: +2（与以上任何叠加）
 * - 多个AC来源时取最高值（不叠加）
 * - 战斗风格专长：Defense +1 AC（当穿着护甲时）
 *
 * @param scores - 属性值对象
 * @param equipment - 装备列表
 * @param features - 角色拥有的特性列表
 * @param data - DataLoader（查护甲数据）
 * @param conditions - 角色当前状态列表（用于检测Mage Armor等，可选，默认空）
 * @param featACBonuses - 专长给予的AC加值（可选，用于战斗风格）
 * @returns AC值
 */
export function calculateAC(
  scores: AbilityScores,
  equipment: readonly EquipmentItem[],
  features: readonly Feature[],
  data: DataLoader,
  conditions: readonly { source?: string; id?: string }[] = [],
  featACBonuses?: readonly FeatACBonus[]
): number {
  const dexMod = getModifier(getTotalScore(scores, 'Dexterity'));
  const conMod = getModifier(getTotalScore(scores, 'Constitution'));
  const wisMod = getModifier(getTotalScore(scores, 'Wisdom'));

  const featureNames = new Set(features.map(f => f.name));

  // 1. 收集所有装备的护甲和盾牌
  const equippedArmor = getEquippedArmor(equipment, data);
  const hasShield = hasEquippedShield(equipment, data);
  const hasArmor = equippedArmor.length > 0;

  // 2. 计算所有可能的AC来源
  const acOptions: number[] = [];

  // 无甲选项
  const unarmoredAC = 10 + dexMod;
  acOptions.push(unarmoredAC);

  // Mage Armor（13 + Dex，通过法术或状态触发）
  const hasMageArmor = conditions.some(
    c => c.source === 'Mage Armor' || c.id === 'mage-armor'
  );
  if (hasMageArmor) {
    acOptions.push(13 + dexMod);
  }

  // Barbarian Unarmored Defense: 10 + Dex + Con
  // 2024 PHB: requires no armor AND no shield (same as Monk)
  if (
    !hasShield &&
    (featureNames.has('Unarmored Defense') || featureNames.has('Unarmored Defense (Barbarian)'))
  ) {
    acOptions.push(10 + dexMod + conMod);
  }

  // Monk Unarmored Defense: 10 + Dex + Wis
  // 2024 PHB: requires no armor AND no shield
  if (
    !hasShield &&
    (featureNames.has('Unarmored Defense (Monk)') ||
      featureNames.has('Unarmored Defense [Monk]'))
  ) {
    acOptions.push(10 + dexMod + wisMod);
  }

  // 护甲选项
  for (const armor of equippedArmor) {
    acOptions.push(calculateArmorAC(armor, dexMod));
  }

  // 3. 取最高AC
  let ac = Math.max(...acOptions);

  // 4. 叠加盾牌
  if (hasShield) {
    ac += 2;
  }

  // 5. 应用专长AC加值（如 Defense 战斗风格 +1）
  // Defense: +1 AC when wearing Light, Medium, or Heavy armor
  if (featACBonuses && featACBonuses.length > 0 && hasArmor) {
    for (const bonus of featACBonuses) {
      // 检查是否穿着符合条件的护甲
      const armorTypes = bonus.whileWearing ?? [];
      const hasMatchingArmor = equippedArmor.some(a => {
        if (armorTypes.includes('Light') && a.category === 'Light') return true;
        if (armorTypes.includes('Medium') && a.category === 'Medium') return true;
        if (armorTypes.includes('Heavy') && a.category === 'Heavy') return true;
        return false;
      });

      if (hasMatchingArmor) {
        // 应用对应的加值
        if (bonus.lightArmor && equippedArmor.some(a => a.category === 'Light')) {
          ac += bonus.lightArmor;
        } else if (bonus.mediumArmor && equippedArmor.some(a => a.category === 'Medium')) {
          ac += bonus.mediumArmor;
        } else if (bonus.heavyArmor && equippedArmor.some(a => a.category === 'Heavy')) {
          ac += bonus.heavyArmor;
        } else if (bonus.lightArmor || bonus.mediumArmor || bonus.heavyArmor) {
          // 如果只指定了一个通用加值，应用它
          ac += (bonus.lightArmor ?? bonus.mediumArmor ?? bonus.heavyArmor ?? 0);
        }
      }
    }
  }

  return ac;
}

/**
 * 计算单件护甲提供的AC
 */
function calculateArmorAC(armor: Armor, dexMod: number): number {
  if (!armor.dexBonus) {
    // 重甲：不加Dex
    return armor.baseAC;
  }

  if (armor.dexCap != null) {
    // 中甲：护甲AC + min(Dex, cap)
    return armor.baseAC + Math.min(dexMod, armor.dexCap);
  }

  // 轻甲：护甲AC + Dex
  return armor.baseAC + dexMod;
}

/**
 * 获取所有已装备的护甲（非盾牌）
 */
function getEquippedArmor(equipment: readonly EquipmentItem[], data: DataLoader): Armor[] {
  return equipment
    .filter(e => e.equipped && e.type === 'armor')
    .map(e => data.getArmor(e.id))
    .filter((a): a is Armor => a != null && a.category !== 'Shield');
}

/**
 * 检查是否装备了盾牌
 */
function hasEquippedShield(equipment: readonly EquipmentItem[], data: DataLoader): boolean {
  return equipment.some(e => {
    if (!e.equipped || e.type !== 'armor') return false;
    const armor = data.getArmor(e.id);
    return armor != null && armor.category === 'Shield';
  });
}
