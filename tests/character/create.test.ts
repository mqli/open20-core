// tests/character/create.test.ts
// 角色创建综合测试

import { describe, it, expect } from 'vitest';
import {
  createCharacter,
  getFeaturesAtLevel,
  isProficient,
  emptyCharacterSpells,
  extractAllClassResources,
  getAlwaysPreparedSpellsFromSubclass,
} from '../../src/character/create';
import type { CreateCharacterParams } from '../../src/character/create';
import type { DataLoader } from '../../src/data/loader';
import type { AbilityName } from '../../src/types/ability';

// ── Shared Fixtures ──────────────────────────────────────────────

import { createMockDataLoader } from '../fixtures/data-loader';
import {
  HUMAN_SPECIES,
  DWARF_SPECIES,
  ELF_SPECIES,
  SOLDIER_BACKGROUND,
  SAGE_BACKGROUND,
  FIGHTER_CLASS,
  BARBARIAN_CLASS,
  WIZARD_CLASS,
  ROGUE_CLASS,
  CHAMPION_SUBCLASS,
  CLERIC_CLASS,
  LIFE_DOMAIN_SUBCLASS,
} from '../fixtures/characters';

// ── Mock DataLoader ────────────────────────────────────────────

function createMockDataLoaderExtended(): DataLoader {
  // Full caster spell slot table
  const fullCasterSlots: Record<number, Record<number, number>> = {
    1: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    2: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  };

  // Pact magic table
  const pactMagicSlots: Record<number, { slots: number; slotLevel: number }> = {
    1: { slots: 1, slotLevel: 1 },
    2: { slots: 2, slotLevel: 1 },
  };

  return createMockDataLoader({
    getSpecies: (id: string) => {
      if (id === 'Human') return HUMAN_SPECIES;
      if (id === 'Dwarf') return DWARF_SPECIES;
      if (id === 'Elf') return ELF_SPECIES;
      return undefined;
    },
    getAllSpecies: () => [HUMAN_SPECIES, DWARF_SPECIES, ELF_SPECIES],
    getBackground: (id: string) => {
      if (id === 'Soldier') return SOLDIER_BACKGROUND;
      if (id === 'Sage') return SAGE_BACKGROUND;
      return undefined;
    },
    getAllBackgrounds: () => [SOLDIER_BACKGROUND, SAGE_BACKGROUND],
    getClass: (id: string) => {
      if (id === 'Fighter') return FIGHTER_CLASS;
      if (id === 'Barbarian') return BARBARIAN_CLASS;
      if (id === 'Wizard') return WIZARD_CLASS;
      if (id === 'Rogue') return ROGUE_CLASS;
      if (id === 'Cleric') return CLERIC_CLASS;
      return undefined;
    },
    getSubclass: (id: string) => {
      if (id === 'Champion') return CHAMPION_SUBCLASS;
      if (id === 'Life Domain') return LIFE_DOMAIN_SUBCLASS;
      return undefined;
    },
    getAllClasses: () => [FIGHTER_CLASS, BARBARIAN_CLASS, WIZARD_CLASS, ROGUE_CLASS, CLERIC_CLASS],
    getProficiencyBonus: (level: number) => {
      if (level <= 4) return 2;
      if (level <= 8) return 3;
      if (level <= 12) return 4;
      if (level <= 16) return 5;
      return 6;
    },
    getSpellSlots: (classId: string, classLevel: number) => {
      const nonCasters = ['Fighter', 'Rogue', 'Barbarian', 'Monk'];
      if (nonCasters.includes(classId)) {
        return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
      }
      return (
        fullCasterSlots[classLevel] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
      );
    },
    getPactMagicSlots: (warlockLevel: number) => {
      return pactMagicSlots[warlockLevel] || { slots: 0, slotLevel: 0 };
    },
  });
}

// ── Standard ability score set ─────────────────────────────────

const STANDARD_SCORES: Record<AbilityName, number> = {
  Strength: 16,
  Dexterity: 14,
  Constitution: 15,
  Intelligence: 8,
  Wisdom: 12,
  Charisma: 10,
};

// ── Tests ──────────────────────────────────────────────────────

describe('createCharacter', () => {
  const data = createMockDataLoaderExtended();

  describe('1st-level Fighter (Human, Soldier)', () => {
    it('creates a Fighter with all Character fields populated', () => {
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
        skillChoices: ['Perception', 'Survival'],
      };

      const char = createCharacter(params, data);

      // Basic fields
      expect(char.schemaVersion).toBe('2024.1');
      expect(char.name).toBe('Aragorn');
      expect(char.species).toBe('Human');
      expect(char.speciesSubtype).toBeNull();
      expect(char.background).toBe('Soldier');
      expect(char.notes).toBe('');
      expect(char.createdAt).toBeTruthy();
      expect(char.updatedAt).toBeTruthy();
    });

    it('calculates correct HP (d10 + Con mod)', () => {
      // Human: no Con bonus, base Con 15 → total 15 → mod +2
      // HP = 10 (d10 max) + 2 = 12
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
        skillChoices: ['Perception', 'Survival'],
      };

      const char = createCharacter(params, data);
      expect(char.hitPoints.max).toBe(12);
      expect(char.hitPoints.current).toBe(12);
      expect(char.hitPoints.temporary).toBe(0);
      expect(char.hitPoints.deathSaves.successes).toBe(0);
      expect(char.hitPoints.deathSaves.failures).toBe(0);
      expect(char.hitPoints.deathSaves.isStable).toBe(false);
    });

    it('calculates correct AC (10 + Dex mod for unarmored)', () => {
      // Human: no Dex bonus, base Dex 14 → total 14 → mod +2
      // AC = 10 + 2 = 12
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
        skillChoices: ['Perception', 'Survival'],
      };

      const char = createCharacter(params, data);
      expect(char.combatStats.AC).toBe(12);
    });

    it('includes skills from Soldier background (Athletics, Intimidation)', () => {
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
        skillChoices: ['Perception', 'Survival'],
      };

      const char = createCharacter(params, data);

      // Background skills
      expect(char.skills['Athletics']!.proficient).toBe(true);
      expect(char.skills['Intimidation']!.proficient).toBe(true);
      // Chosen class skills
      expect(char.skills['Perception']!.proficient).toBe(true);
      expect(char.skills['Survival']!.proficient).toBe(true);
      // Non-proficient skills
      expect(char.skills['Arcana']!.proficient).toBe(false);
      expect(char.skills['Stealth']!.proficient).toBe(false);
      // No expertise at level 1
      expect(char.skills['Athletics']!.expertise).toBe(false);
    });

    it('has proficiency bonus of 2', () => {
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      const char = createCharacter(params, data);
      expect(char.combatStats.proficiencyBonus).toBe(2);
    });

    it('includes Second Wind resource', () => {
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      const char = createCharacter(params, data);
      const fighterResources = char.resources['Fighter'];
      expect(fighterResources).toBeDefined();
      const secondWind = fighterResources!.resources.find(r => r.id === 'Second Wind');
      expect(secondWind).toBeDefined();
      // 2024 PHB: Second Wind scales with Proficiency Bonus (PB at level 1 = 2)
      expect(secondWind!.max).toBe(2);
      expect(secondWind!.used).toBe(0);
    });

    it('sets correct class data', () => {
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      const char = createCharacter(params, data);
      expect(char.classes).toHaveLength(1);
      expect(char.classes[0]!.classId).toBe('Fighter');
      expect(char.classes[0]!.level).toBe(1);
      expect(char.classes[0]!.subclassId).toBeNull();
      expect(char.classes[0]!.subclassLevel).toBeNull();
      expect(char.classes[0]!.hitDice.die).toBe('d10');
      expect(char.classes[0]!.hitDice.used).toBe(0);
    });

    it('has no spellcasting', () => {
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      const char = createCharacter(params, data);
      // Non-caster should have empty classSpellcasting
      expect(Object.keys(char.spells.classSpellcasting)).toHaveLength(0);
      expect(char.spells.pactMagicSlots).toBeNull();
      // spellSlots should all be 0
      for (let level = 1; level <= 9; level++) {
        expect(char.spells.spellSlots[level as keyof typeof char.spells.spellSlots].total).toBe(0);
      }
    });

    it('sets currency from background startingGold', () => {
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      const char = createCharacter(params, data);
      expect(char.currency.gp).toBe(10);
      expect(char.currency.cp).toBe(0);
      expect(char.currency.sp).toBe(0);
      expect(char.currency.ep).toBe(0);
      expect(char.currency.pp).toBe(0);
    });

    it('calculates correct initiative (Dex mod)', () => {
      // Dex 14 → +2
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      const char = createCharacter(params, data);
      expect(char.combatStats.initiative).toBe(2);
    });

    it('calculates correct passive perception', () => {
      // Wis 12 → +1, not proficient in Perception (no skillChoices)
      // Passive = 10 + 1 = 11
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      const char = createCharacter(params, data);
      expect(char.combatStats.passivePerception).toBe(11);
    });

    it('sets speed from species', () => {
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      const char = createCharacter(params, data);
      expect(char.combatStats.speed).toBe(30);
    });

    it('has empty equipment, conditions, and feats', () => {
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      const char = createCharacter(params, data);
      expect(char.equipment).toHaveLength(0);
      expect(char.conditions).toHaveLength(0);
      expect(char.feats).toHaveLength(0);
    });

    it('includes feat IDs when provided', () => {
      const params: CreateCharacterParams = {
        name: 'Aragorn',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
        featIds: ['Great Weapon Fighting', 'Alert'],
      };

      const char = createCharacter(params, data);
      expect(char.feats).toEqual([{ featId: 'Great Weapon Fighting' }, { featId: 'Alert' }]);
    });
  });

  describe('1st-level Wizard (Human, Sage)', () => {
    const wizardScores: Record<AbilityName, number> = {
      Strength: 8,
      Dexterity: 14,
      Constitution: 12,
      Intelligence: 16,
      Wisdom: 13,
      Charisma: 10,
    };

    it('has spellcasting populated', () => {
      const params: CreateCharacterParams = {
        name: 'Gandalf',
        speciesId: 'Human',
        backgroundId: 'Sage',
        classId: 'Wizard',
        abilityScores: wizardScores,
      };

      const char = createCharacter(params, data);
      // Check per-class spell data
      expect(char.spells.classSpellcasting['Wizard']).toBeDefined();
      expect(char.spells.classSpellcasting['Wizard']!.spellcastingAbility).toBe('Intelligence');
      expect(char.spells.classSpellcasting['Wizard']!.spellSaveDC).toBeGreaterThan(0);
      expect(char.spells.classSpellcasting['Wizard']!.spellAttackBonus).toBeGreaterThan(0);
    });

    it('has 2 level-1 spell slots', () => {
      const params: CreateCharacterParams = {
        name: 'Gandalf',
        speciesId: 'Human',
        backgroundId: 'Sage',
        classId: 'Wizard',
        abilityScores: wizardScores,
      };

      const char = createCharacter(params, data);
      expect(char.spells.spellSlots[1]!.total).toBe(2);
      expect(char.spells.spellSlots[1]!.used).toBe(0);
    });

    it('calculates correct spellSaveDC = 8 + PB + Int mod', () => {
      // Int 16 → +3, PB = 2
      // DC = 8 + 2 + 3 = 13
      const params: CreateCharacterParams = {
        name: 'Gandalf',
        speciesId: 'Human',
        backgroundId: 'Sage',
        classId: 'Wizard',
        abilityScores: wizardScores,
      };

      const char = createCharacter(params, data);
      expect(char.spells.classSpellcasting['Wizard']!.spellSaveDC).toBe(13);
    });

    it('calculates correct spellAttackBonus = PB + Int mod', () => {
      // Int 16 → +3, PB = 2
      // Attack = 2 + 3 = 5
      const params: CreateCharacterParams = {
        name: 'Gandalf',
        speciesId: 'Human',
        backgroundId: 'Sage',
        classId: 'Wizard',
        abilityScores: wizardScores,
      };

      const char = createCharacter(params, data);
      expect(char.spells.classSpellcasting['Wizard']!.spellAttackBonus).toBe(5);
    });

    it('includes Sage background skills (Arcana, History)', () => {
      const params: CreateCharacterParams = {
        name: 'Gandalf',
        speciesId: 'Human',
        backgroundId: 'Sage',
        classId: 'Wizard',
        abilityScores: wizardScores,
      };

      const char = createCharacter(params, data);
      expect(char.skills['Arcana']!.proficient).toBe(true);
      expect(char.skills['History']!.proficient).toBe(true);
      expect(char.skills['Athletics']!.proficient).toBe(false);
    });

    it('calculates correct HP for d6 hit die', () => {
      // Con 12 → +1
      // HP = 6 + 1 = 7
      const params: CreateCharacterParams = {
        name: 'Gandalf',
        speciesId: 'Human',
        backgroundId: 'Sage',
        classId: 'Wizard',
        abilityScores: wizardScores,
      };

      const char = createCharacter(params, data);
      expect(char.hitPoints.max).toBe(7);
    });

    it('has no pact magic slots', () => {
      const params: CreateCharacterParams = {
        name: 'Gandalf',
        speciesId: 'Human',
        backgroundId: 'Sage',
        classId: 'Wizard',
        abilityScores: wizardScores,
      };

      const char = createCharacter(params, data);
      expect(char.spells.pactMagicSlots).toBeNull();
    });
  });

  describe('1st-level Barbarian (Dwarf)', () => {
    it('applies racial bonuses to ability scores', () => {
      const params: CreateCharacterParams = {
        name: 'Thorin',
        speciesId: 'Dwarf',
        backgroundId: 'Soldier',
        classId: 'Barbarian',
        abilityScores: STANDARD_SCORES,
        skillChoices: ['Perception'],
      };

      const char = createCharacter(params, data);
      // Dwarf gives Con +2, so base Con 15 + 2 = 17 → mod +3
      expect(char.abilityScores.racialBonuses.Constitution).toBe(2);
    });

    it('calculates HP including Con bonus from species', () => {
      const params: CreateCharacterParams = {
        name: 'Thorin',
        speciesId: 'Dwarf',
        backgroundId: 'Soldier',
        classId: 'Barbarian',
        abilityScores: STANDARD_SCORES,
        skillChoices: ['Perception'],
      };

      const char = createCharacter(params, data);
      // Dwarf: Con +2 → total Con = 15+2 = 17 → mod +3
      // Barbarian d12: HP = 12 + 3 = 15
      expect(char.hitPoints.max).toBe(15);
    });

    it('calculates Unarmored Defense AC = 10 + Dex + Con', () => {
      const params: CreateCharacterParams = {
        name: 'Thorin',
        speciesId: 'Dwarf',
        backgroundId: 'Soldier',
        classId: 'Barbarian',
        abilityScores: STANDARD_SCORES,
        skillChoices: ['Perception'],
      };

      const char = createCharacter(params, data);
      // Dex 14 → +2, Con 15+2=17 → +3
      // Unarmored Defense: 10 + 2 + 3 = 15
      expect(char.combatStats.AC).toBe(15);
    });

    it('includes Rage resource', () => {
      const params: CreateCharacterParams = {
        name: 'Thorin',
        speciesId: 'Dwarf',
        backgroundId: 'Soldier',
        classId: 'Barbarian',
        abilityScores: STANDARD_SCORES,
        skillChoices: ['Perception'],
      };

      const char = createCharacter(params, data);
      const barbarianResources = char.resources['Barbarian'];
      expect(barbarianResources).toBeDefined();
      const rage = barbarianResources!.resources.find(r => r.id === 'Rage');
      expect(rage).toBeDefined();
      expect(rage!.max).toBe(2);
      expect(rage!.used).toBe(0);
    });

    it('sets speed from Dwarf species', () => {
      const params: CreateCharacterParams = {
        name: 'Thorin',
        speciesId: 'Dwarf',
        backgroundId: 'Soldier',
        classId: 'Barbarian',
        abilityScores: STANDARD_SCORES,
        skillChoices: ['Perception'],
      };

      const char = createCharacter(params, data);
      expect(char.combatStats.speed).toBe(30);
    });
  });

  describe('Error cases', () => {
    it('throws error for invalid speciesId', () => {
      const params: CreateCharacterParams = {
        name: 'Test',
        speciesId: 'Dragonborn',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      expect(() => createCharacter(params, data)).toThrow(
        'Invalid speciesId: "Dragonborn" not found in data'
      );
    });

    it('throws error for invalid classId', () => {
      const params: CreateCharacterParams = {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Artificer',
        abilityScores: STANDARD_SCORES,
      };

      expect(() => createCharacter(params, data)).toThrow(
        'Invalid classId: "Artificer" not found in data'
      );
    });

    it('throws error for invalid backgroundId', () => {
      const params: CreateCharacterParams = {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Pirate',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      expect(() => createCharacter(params, data)).toThrow(
        'Invalid backgroundId: "Pirate" not found in data'
      );
    });
  });

  describe('Edge cases', () => {
    it('handles empty featIds', () => {
      const params: CreateCharacterParams = {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
        featIds: [],
      };

      const char = createCharacter(params, data);
      expect(char.feats).toEqual([]);
    });

    it('handles no skillChoices', () => {
      const params: CreateCharacterParams = {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      const char = createCharacter(params, data);
      // Only background skills are proficient
      expect(char.skills['Athletics']!.proficient).toBe(true);
      expect(char.skills['Intimidation']!.proficient).toBe(true);
      // Other skills not proficient
      expect(char.skills['Perception']!.proficient).toBe(false);
    });

    it('handles species with subtypes', () => {
      const params: CreateCharacterParams = {
        name: 'Legolas',
        speciesId: 'Elf',
        speciesSubtypeId: 'High Elf',
        backgroundId: 'Sage',
        classId: 'Wizard',
        abilityScores: {
          Strength: 8,
          Dexterity: 16,
          Constitution: 12,
          Intelligence: 14,
          Wisdom: 13,
          Charisma: 10,
        },
      };

      const char = createCharacter(params, data);
      expect(char.species).toBe('Elf');
      expect(char.speciesSubtype).toBe('High Elf');
    });

    it('initializes all 18 skills', () => {
      const params: CreateCharacterParams = {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      const char = createCharacter(params, data);
      const skillNames = Object.keys(char.skills);
      expect(skillNames).toHaveLength(18);
    });

    it('creates character with no equipment', () => {
      const params: CreateCharacterParams = {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: STANDARD_SCORES,
      };

      const char = createCharacter(params, data);
      expect(char.equipment).toEqual([]);
      expect(char.combatStats.attacks).toEqual([]);
    });
  });
});

describe('getFeaturesAtLevel', () => {
  it('returns features at level 1', () => {
    const features = getFeaturesAtLevel(FIGHTER_CLASS, 1);
    expect(features).toHaveLength(3);
    expect(features.map(f => f.name)).toContain('Second Wind');
  });

  it('returns features at level 2', () => {
    const features = getFeaturesAtLevel(FIGHTER_CLASS, 2);
    expect(features).toHaveLength(2);
    expect(features.map(f => f.name)).toContain('Action Surge');
  });

  it('returns empty array for level with no features', () => {
    const features = getFeaturesAtLevel(FIGHTER_CLASS, 3);
    expect(features).toEqual([]);
  });
});

describe('isProficient', () => {
  it('returns true for background skill proficiency', () => {
    expect(isProficient('Athletics', ['Athletics', 'Intimidation'], FIGHTER_CLASS, [])).toBe(true);
  });

  it('returns true for skill choice', () => {
    expect(isProficient('Perception', [], FIGHTER_CLASS, ['Perception'])).toBe(true);
  });

  it('returns false for non-proficient skill', () => {
    expect(isProficient('Arcana', ['Athletics'], FIGHTER_CLASS, ['Perception'])).toBe(false);
  });

  it('returns true when both background and skill choice match', () => {
    expect(isProficient('Athletics', ['Athletics'], FIGHTER_CLASS, ['Athletics'])).toBe(true);
  });
});

describe('wizard spell data (via createCharacter)', () => {
  it('calculates spell save DC and attack bonus correctly', () => {
    const data = createMockDataLoaderExtended();
    const params: CreateCharacterParams = {
      name: 'Gandalf',
      speciesId: 'Human',
      backgroundId: 'Sage',
      classId: 'Wizard',
      abilityScores: {
        Strength: 10,
        Dexterity: 10,
        Constitution: 10,
        Intelligence: 16,
        Wisdom: 10,
        Charisma: 10,
      },
    };

    const char = createCharacter(params, data);
    const wizard = char.spells.classSpellcasting['Wizard'];

    // Int 16 → +3, PB = 2
    expect(wizard).toBeDefined();
    expect(wizard!.spellSaveDC).toBe(13); // 8 + 2 + 3
    expect(wizard!.spellAttackBonus).toBe(5); // 2 + 3
    expect(wizard!.spellcastingAbility).toBe('Intelligence');
  });
});

describe('emptyCharacterSpells', () => {
  it('returns spell data with all zeros', () => {
    const result = emptyCharacterSpells();
    // Non-caster has empty classSpellcasting
    expect(Object.keys(result.classSpellcasting)).toHaveLength(0);
    expect(result.pactMagicSlots).toBeNull();
    for (let level = 0; level <= 9; level++) {
      expect(result.spellSlots[level as keyof typeof result.spellSlots].total).toBe(0);
      expect(result.spellSlots[level as keyof typeof result.spellSlots].used).toBe(0);
    }
  });
});

describe('extractAllClassResources', () => {
  it('extracts Second Wind from Fighter level 1', () => {
    const result = extractAllClassResources(
      [{ classId: 'Fighter', level: 1, subclassId: null }],
      { base: { Strength: 15, Dexterity: 13, Constitution: 14, Intelligence: 10, Wisdom: 12, Charisma: 8 }, racialBonuses: {}, backgroundBonuses: {}, featBonuses: {}, featGrants: {}, temporaryBonuses: {} } as any,
      createMockDataLoaderForResources(),
    );
    const fighter = result['Fighter'];
    expect(fighter).toBeDefined();
    const secondWind = fighter!.resources.find(r => r.id === 'Second Wind');
    expect(secondWind).toBeDefined();
    // 2024 PHB: Second Wind scales with Proficiency Bonus (PB at level 1 = 2)
    expect(secondWind!.max).toBe(2);
    expect(secondWind!.used).toBe(0);
  });

  it('extracts Rage from Barbarian level 1', () => {
    const result = extractAllClassResources(
      [{ classId: 'Barbarian', level: 1, subclassId: null }],
      { base: { Strength: 15, Dexterity: 13, Constitution: 14, Intelligence: 10, Wisdom: 12, Charisma: 8 }, racialBonuses: {}, backgroundBonuses: {}, featBonuses: {}, featGrants: {}, temporaryBonuses: {} } as any,
      createMockDataLoaderForResources(),
    );
    const barbarian = result['Barbarian'];
    expect(barbarian).toBeDefined();
    const rage = barbarian!.resources.find(r => r.id === 'Rage');
    expect(rage).toBeDefined();
    expect(rage!.max).toBe(2);
  });
});

// Helper to create a minimal DataLoader for resource tests
function createMockDataLoaderForResources() {
  return createMockDataLoader({
    getClass: (id: string) => {
      if (id === 'Fighter') return FIGHTER_CLASS;
      if (id === 'Barbarian') return BARBARIAN_CLASS;
      return undefined;
    },
    getSubclass: () => undefined,
  });
}

describe('getAlwaysPreparedSpellsFromSubclass', () => {
  it('returns spells for levels up to class level', () => {
    const result = getAlwaysPreparedSpellsFromSubclass(LIFE_DOMAIN_SUBCLASS, 1);
    expect(result).toContain('bless');
    expect(result).toContain('cure-wounds');
    // Level 3 spells should NOT be included at class level 1
    expect(result).not.toContain('lesser-restoration');
  });

  it('returns all spells for higher class levels', () => {
    const result = getAlwaysPreparedSpellsFromSubclass(LIFE_DOMAIN_SUBCLASS, 5);
    expect(result).toContain('bless');
    expect(result).toContain('cure-wounds');
    expect(result).toContain('lesser-restoration');
    expect(result).toContain('spiritual-weapon');
    expect(result).toContain('beacon-of-hope');
    expect(result).toContain('revivify');
  });

  it('returns empty array for subclass without alwaysPreparedSpells', () => {
    const result = getAlwaysPreparedSpellsFromSubclass(CHAMPION_SUBCLASS, 3);
    expect(result).toHaveLength(0);
  });
});

describe('createCharacter with alwaysPreparedSpells', () => {
  const data = createMockDataLoaderExtended();

  it('populates alwaysPreparedSpells for Cleric with Life Domain', () => {
    const params: CreateCharacterParams = {
      name: 'Cleric Test',
      speciesId: 'Human',
      backgroundId: 'Soldier',
      classId: 'Cleric',
      subclassId: 'Life Domain',
      abilityScores: STANDARD_SCORES,
    };

    const char = createCharacter(params, data);
    const clericSpells = char.spells.classSpellcasting['Cleric'];
    expect(clericSpells).toBeDefined();
    expect(clericSpells!.alwaysPreparedSpells).toContain('bless');
    expect(clericSpells!.alwaysPreparedSpells).toContain('cure-wounds');
  });

  it('does not count alwaysPreparedSpells against maxPrepared', () => {
    // SRD 5.2: Cleric level 1 has preparedSpells = 4 in the table
    const params: CreateCharacterParams = {
      name: 'Cleric Test',
      speciesId: 'Human',
      backgroundId: 'Soldier',
      classId: 'Cleric',
      subclassId: 'Life Domain',
      abilityScores: STANDARD_SCORES,
    };

    const char = createCharacter(params, data);
    const clericSpells = char.spells.classSpellcasting['Cleric'];
    // maxPrepared = 4 (from SRD 5.2 table for Cleric level 1)
    expect(clericSpells!.maxPrepared).toBe(4);
    // alwaysPreparedSpells don't count against this limit
    expect(clericSpells!.alwaysPreparedSpells).toHaveLength(2);
  });
});
