// tests/character/level-up.test.ts
// 角色升级测试 — 对应 S16

import { describe, it, expect } from 'vitest';
import { levelUp } from '../../src/character/level-up';
import type { RandomProvider } from '../../src/character/level-up';
import type { Character } from '../../src/types/character';
import type { Class, Feature } from '../../src/types/class';
import type { DataLoader } from '../../src/data/loader';

// ── Helpers ──────────────────────────────────────────────

import type { ClassSpellData, CharacterSpells, SpellLevel, SpellSlotEntry } from '../../src/types/spell';

/** Create CharacterSpells with per-class tracking (new structure) */
function makeCharSpells(
  classId: string,
  overrides?: Partial<ClassSpellData>
): CharacterSpells {
  return {
    classSpellcasting: {
      [classId]: {
        classId,
        spellcastingAbility: 'Intelligence' as const,
        spellSaveDC: 0,
        spellAttackBonus: 0,
        knownCantrips: [],
        maxCantripsKnown: 0,
        knownSpells: [],
        preparedSpells: [],
        alwaysPreparedSpells: [],
        maxPrepared: 0,
        ...overrides,
      },
    },
    spellSlots: {} as Record<SpellLevel, SpellSlotEntry>,
    pactMagicSlots: null,
  };
}

// ── Mock Helpers ────────────────────────────────────────────────

function makeFighterClass(): Class {
  return {
    id: 'Fighter',
    name: 'Fighter',
    source: '2024 PHB',
    hitDie: 'd10',
    savingThrowProficiencies: ['Strength', 'Constitution'],
    armorTraining: ['Light', 'Medium', 'Heavy', 'Shield'],
    weaponMastery: true,
    featuresByLevel: [
      { level: 1, features: [{ name: 'Fighting Style', description: 'Choose a Fighting Style', resourceId: 'Second Wind' }] },
      { level: 2, features: [{ name: 'Action Surge', description: 'Push beyond normal limits', resourceId: 'Action Surge' }] },
      { level: 3, features: [{ name: 'Martial Archetype', description: 'Choose a Martial Archetype' }] },
      { level: 4, features: [{ name: 'Ability Score Improvement', description: 'Increase ability scores or take a feat' }] },
    ],
    spellcasting: null,
  };
}

function makeWizardClass(): Class {
  return {
    id: 'Wizard',
    name: 'Wizard',
    source: '2024 PHB',
    hitDie: 'd6',
    savingThrowProficiencies: ['Intelligence', 'Wisdom'],
    armorTraining: [],
    weaponMastery: false,
    featuresByLevel: [
      { level: 1, features: [{ name: 'Spellcasting', description: 'Cast wizard spells', resourceId: 'Arcane Recovery' }] },
      { level: 2, features: [{ name: 'Scholar', description: 'Gain expertise in a skill' }] },
    ],
    spellcasting: {ability: 'Intelligence', knownSource: 'spellbook', preparationTiming: 'long_rest', changesPerPreparation: 'all' },
  };
}

function makeMockDataLoader(fighterClass?: Class, wizardClass?: Class): DataLoader {
  const fc = fighterClass ?? makeFighterClass();
  const wc = wizardClass ?? makeWizardClass();
  return {
    getSpecies: () => undefined,
    getSpeciesSubtype: () => undefined,
    getAllSpecies: () => [],
    getBackground: () => undefined,
    getAllBackgrounds: () => [],
    getClass: (id: string) => {
      if (id === 'Fighter') return fc;
      if (id === 'Wizard') return wc;
      return undefined;
    },
    getAllClasses: () => [fc, wc],
    getSubclass: () => undefined,
    getSubclassesForClass: () => [],
    getAllSubclasses: () => [],
    getFeat: () => undefined,
    getFeatsByCategory: () => [],
    getAllFeats: () => [],
    getWeapon: () => undefined,
    getAllWeapons: () => [],
    getArmor: () => undefined,
    getAllArmor: () => [],
    getGearItem: () => undefined,
    getAllGear: () => [],
    getSpell: () => undefined,
    getSpellsByLevel: () => [],
    getAllSpells: () => [],
    getProficiencyBonus: (level: number) => {
      if (level <= 4) return 2;
      if (level <= 8) return 3;
      if (level <= 12) return 4;
      if (level <= 16) return 5;
      return 6;
    },
    getHitDieFixedValue: (die: string) => {
      const map: Record<string, number> = { d4: 3, d6: 4, d8: 5, d10: 6, d12: 7, d20: 11 };
      return map[die] ?? 0;
    },
    getSpellSlots: () => ({}),
    getMulticlassSpellSlots: () => ({}),
    getPactMagicSlots: () => ({ slots: 0, slotLevel: 1 }),
    getWeaponMasteryProperties: () => [],
    getConditionNames: () => [],
  } as any as DataLoader;
}

function makeLevel1Fighter(_overrides?: Partial<Character>): Character {
  return {
    schemaVersion: '2024.1',
    name: 'Test Fighter',
    species: 'Human',
    speciesSubtype: null,
    background: 'Soldier',
    classes: [
      {
        classId: 'Fighter',
        level: 1,
        subclassId: null,
        subclassLevel: null,
        hitDice: { die: 'd10', used: 0 },
      },
    ],
    abilityScores: {
      base: {
        Strength: 16,
        Dexterity: 14,
        Constitution: 15,
        Intelligence: 10,
        Wisdom: 12,
        Charisma: 8,
      },
      racialBonuses: { Strength: 1, Constitution: 1 },
      featBonuses: {},
      temporaryBonuses: {},
    },
    skills: {},
    feats: [],
    equipment: [],
    spells: {
      spellcastingAbility: 'Intelligence',
      spellSaveDC: 0,
      spellAttackBonus: 0,
      knownSpells: [],
      preparedSpells: [],
      spellSlots: {},
      pactMagicSlots: null,
    },
    resources: {
      'Fighter': {
        classId: 'fighter',
        resources: [
          {
            id: 'Second Wind',
            name: 'Second Wind',
            max: 1,
            used: 0,
            resetOn: 'Short Rest' as const,
          },
        ],
      },
    },
    hitPoints: {
      max: 12, // 10 (d10 max) + 3 (Con mod from 16+1=17 → +3)
      current: 12,
      temporary: 0,
      deathSaves: { successes: 0, failures: 0, isStable: false },
    },
    combatStats: {
      AC: 14,
      initiative: 2,
      speed: 30,
      passivePerception: 12,
      proficiencyBonus: 2,
      attacks: [],
    },
    currency: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 },
    conditions: [],
    damageDefenses: { resistances: [], immunities: [], vulnerabilities: [] },
    notes: '',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  } as unknown as Character;
}

function makeLevel1Wizard(): Character {
  return {
    schemaVersion: '2024.1',
    name: 'Test Wizard',
    species: 'Elf',
    speciesSubtype: null,
    background: 'Sage',
    classes: [
      {
        classId: 'Wizard',
        level: 1,
        subclassId: null,
        subclassLevel: null,
        hitDice: { die: 'd6', used: 0 },
      },
    ],
    abilityScores: {
      base: {
        Strength: 8,
        Dexterity: 14,
        Constitution: 12,
        Intelligence: 15,
        Wisdom: 13,
        Charisma: 10,
      },
      racialBonuses: { Intelligence: 2 },
      featBonuses: {},
      temporaryBonuses: {},
    },
    skills: {},
    feats: [],
    equipment: [],
    spells: {
      classSpellcasting: {
        Wizard: {
          classId: 'Wizard',
          spellcastingAbility: 'Intelligence',
          spellSaveDC: 13,
          spellAttackBonus: 5,
          knownSpells: ['Fire Bolt', 'Magic Missile'],
          preparedSpells: ['Magic Missile'],
          alwaysPreparedSpells: [],
          maxPrepared: 0,
        },
      },
      spellSlots: {},
      pactMagicSlots: null,
    },
    resources: {},
    hitPoints: {
      max: 8, // 6 (d6 max) + 1 (Con mod from 12 → +1)
      current: 8,
      temporary: 0,
      deathSaves: { successes: 0, failures: 0, isStable: false },
    },
    combatStats: {
      AC: 12,
      initiative: 2,
      speed: 30,
      passivePerception: 13,
      proficiencyBonus: 2,
      attacks: [],
    },
    currency: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 },
    conditions: [],
    damageDefenses: { resistances: [], immunities: [], vulnerabilities: [] },
    notes: '',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  } as unknown as Character;
}

// ── Tests ────────────────────────────────────────────────────────

describe('levelUp', () => {
  const data = makeMockDataLoader();

  it('1. basic level up: Fighter 1 → 2', () => {
    const char = makeLevel1Fighter();
    const result = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed' }, data);

    // Level becomes 2
    expect(result.classes[0]!.level).toBe(2);

    // HP increases by fixed value (d10 → 6) + Con mod (+3)
    // 12 + 6 + 3 = 21
    expect(result.hitPoints.max).toBe(21);
    expect(result.hitPoints.current).toBe(21);

    // Feats unchanged (no ASI at level 2)
    expect(result.feats).toEqual([]);
  });

  it('2. level up with roll: Fighter 1 → 2', () => {
    const char = makeLevel1Fighter();
    const mockRng: RandomProvider = { d: () => 8 };
    const result = levelUp(char, { classId: 'Fighter', hpChoice: 'roll' }, data, mockRng);

    // HP increases by 8 (rolled) + 3 (Con mod) = 11
    // 12 + 11 = 23
    expect(result.hitPoints.max).toBe(23);
    expect(result.hitPoints.current).toBe(23);
  });

  it('3. level up with ASI: Fighter 3 → 4', () => {
    let char = makeLevel1Fighter();
    // Level up to 3 first
    char = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed' }, data);
    char = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed' }, data);

    expect(char.classes[0]!.level).toBe(3);

    // Now level up to 4 with ASI
    const result = levelUp(
      char,
      {
        classId: 'Fighter',
        hpChoice: 'fixed',
        asiOrFeat: {
          type: 'asi',
          asi: { Strength: 2 },
        },
      },
      data
    );

    expect(result.classes[0]!.level).toBe(4);
    // featBonuses.Strength should increase by 2
    expect(result.abilityScores.featBonuses?.Strength ?? 0).toBe(2);
  });

  it('4. level up with feat: Fighter 7 → 8', () => {
    let char = makeLevel1Fighter();
    // Level up to 7
    for (let i = 0; i < 6; i++) {
      char = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed' }, data);
    }
    expect(char.classes[0]!.level).toBe(7);

    // Level up to 8 with a feat
    const result = levelUp(
      char,
      {
        classId: 'Fighter',
        hpChoice: 'fixed',
        asiOrFeat: {
          type: 'feat',
          featId: 'Tough',
        },
      },
      data
    );

    expect(result.classes[0]!.level).toBe(8);
    expect(result.feats.some(f => f.featId === 'Tough')).toBe(true);
  });

  it('5. level up to subclass level: Fighter 2 → 3', () => {
    let char = makeLevel1Fighter();
    char = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed' }, data);
    expect(char.classes[0]!.level).toBe(2);

    const result = levelUp(
      char,
      {
        classId: 'Fighter',
        hpChoice: 'fixed',
        subclassId: 'Champion',
      },
      data
    );

    expect(result.classes[0]!.level).toBe(3);
    expect(result.classes[0]!.subclassId).toBe('Champion');
    expect(result.classes[0]!.subclassLevel).toBe(3);
  });

  it('6. new spells: Wizard 1 → 2', () => {
    const char = makeLevel1Wizard();
    const result = levelUp(
      char,
      {
        classId: 'Wizard',
        hpChoice: 'fixed',
        newSpells: ['Shield', 'Misty Step'],
      },
      data
    );

    expect(result.classes[0]!.level).toBe(2);
    expect(result.spells.classSpellcasting['Wizard']!.knownSpells).toContain('Shield');
    expect(result.spells.classSpellcasting['Wizard']!.knownSpells).toContain('Misty Step');
    // Original spells still present
    expect(result.spells.classSpellcasting['Wizard']!.knownSpells).toContain('Fire Bolt');
    expect(result.spells.classSpellcasting['Wizard']!.knownSpells).toContain('Magic Missile');
  });

  it('7. new resources: Fighter 1 → 2 (Action Surge)', () => {
    const char = makeLevel1Fighter();
    // Has Second Wind at level 1
    expect(char.resources['Fighter']!.resources.some(r => r.id === 'Second Wind')).toBe(true);
    expect(char.resources['Fighter']!.resources.some(r => r.id === 'Action Surge')).toBe(false);

    const result = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed' }, data);

    // Should still have Second Wind
    expect(result.resources['Fighter']!.resources.some(r => r.id === 'Second Wind')).toBe(true);
    // Should now have Action Surge
    expect(result.resources['Fighter']!.resources.some(r => r.id === 'Action Surge')).toBe(true);
  });

  it('8. HP minimum: level up never gives less than 1 HP', () => {
    // Create a character with very low Constitution (Con modifier = -5)
    const char: Character = {
      ...makeLevel1Fighter(),
      abilityScores: {
        base: {
          Strength: 16,
          Dexterity: 14,
          Constitution: 1,
          Intelligence: 10,
          Wisdom: 12,
          Charisma: 8,
        },
        racialBonuses: {},
        featBonuses: {},
        temporaryBonuses: {},
      },
      hitPoints: {
        max: 5,
        current: 5,
        temporary: 0,
        deathSaves: { successes: 0, failures: 0, isStable: false },
      },
    };

    // Fixed HP: d10 fixed = 6, Con mod = -5 (Con 1 → -5), 6 + (-5) = 1 → minimum is 1
    const result = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed' }, data);
    expect(result.hitPoints.max).toBe(6); // 5 + 1
    expect(result.hitPoints.current).toBe(6);
  });

  it('9. current HP also increases when leveling up', () => {
    const char = makeLevel1Fighter();
    // Simulate character that has taken some damage
    const damagedChar: Character = {
      ...char,
      hitPoints: { ...char.hitPoints, current: 8 },
    };

    const result = levelUp(damagedChar, { classId: 'Fighter', hpChoice: 'fixed' }, data);

    // Current HP should increase by the same amount as max HP
    // Fixed d10 = 6, Con mod = +3, increase = 9
    expect(result.hitPoints.max).toBe(21); // 12 + 9
    expect(result.hitPoints.current).toBe(17); // 8 + 9
  });

  it('10. error case: invalid classId throws error', () => {
    const char = makeLevel1Fighter();
    expect(() => levelUp(char, { classId: 'Barbarian', hpChoice: 'fixed' }, data)).toThrow(
      'Class Barbarian not found on character'
    );
  });

  it('updates proficiency bonus when crossing threshold', () => {
    let char = makeLevel1Fighter();
    // Level up to level 4 (proficiency bonus still 2)
    for (let i = 0; i < 3; i++) {
      char = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed' }, data);
    }
    expect(char.classes[0]!.level).toBe(4);
    expect(char.combatStats.proficiencyBonus).toBe(2);

    // Level up to 5 → proficiency bonus becomes 3
    const result = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed' }, data);
    expect(result.classes[0]!.level).toBe(5);
    expect(result.combatStats.proficiencyBonus).toBe(3);
  });

  it('subclassId is not overwritten when not provided', () => {
    let char = makeLevel1Fighter();
    // Level up to 3 with subclass
    char = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed' }, data);
    char = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed', subclassId: 'Champion' }, data);
    expect(char.classes[0]!.subclassId).toBe('Champion');

    // Level up to 4 without subclassId — subclass should remain
    const result = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed' }, data);
    expect(result.classes[0]!.subclassId).toBe('Champion');
    expect(result.classes[0]!.subclassLevel).toBe(3); // stays at level 3
  });

  it('does not duplicate existing resources', () => {
    let char = makeLevel1Fighter();
    // Level 1 has Second Wind
    expect(char.resources['Fighter']!.resources.filter(r => r.id === 'Second Wind')).toHaveLength(1);

    // Level up to 2 and back down conceptually — let's just verify
    // that if the same resource appeared again it wouldn't duplicate
    char = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed' }, data);
    expect(char.resources['Fighter']!.resources.filter(r => r.id === 'Second Wind')).toHaveLength(1);
  });
});
