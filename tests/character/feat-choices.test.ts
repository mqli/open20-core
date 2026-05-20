import { describe, it, expect } from 'vitest';
import { createCharacter } from '../../src/character/create';
import { recomputeDerivedStats } from '../../src/character/recompute';
import { addFeat, updateFeatChoices } from '../../src/character/feat-mutate';
import type { DataLoader } from '../../src/data/loader';

// Mock DataLoader for testing
function createMockDataLoader(): DataLoader {
  const feats = new Map();

  // Register feats
  const featData = [
    {
      id: 'ability-score-improvement',
      source: 'SRD 5.2',
      name: 'Ability Score Improvement',
      description: 'Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1.',
      category: 'General',
      prerequisites: null, // Simplified for testing
      grants: {
        abilityBonusChoice: {
          options: [],
          valuePerChoice: 2,
          count: 1,
        },
      },
      repeatable: true,
    },
    {
      id: 'grappler',
      source: 'SRD 5.2',
      name: 'Grappler',
      description: 'Increase your Strength or Dexterity score by 1.',
      category: 'General',
      prerequisites: null, // Simplified for testing
      grants: {
        abilityBonusChoice: {
          options: ['Strength', 'Dexterity'],
          valuePerChoice: 1,
          count: 1,
        },
      },
    },
    {
      id: 'skilled',
      source: 'SRD 5.2',
      name: 'Skilled',
      description: 'Gain proficiency in any combination of three skills or tools of your choice.',
      category: 'Origin',
      prerequisites: null,
      grants: {},
      repeatable: true,
    },
    {
      id: 'alert',
      source: 'SRD 5.2',
      name: 'Alert',
      description: 'You gain Initiative Proficiency.',
      category: 'Origin',
      prerequisites: null,
      grants: {
        specialAbilities: ['Initiative Proficiency'],
      },
    },
  ];

  for (const feat of featData) {
    feats.set(feat.id, feat);
  }

  // Mock species
  const species = {
    id: 'Human',
    name: 'Human',
    abilityBonuses: {},
    skillProficiencies: [],
    languages: ['Common'],
  };

  // Mock background
  const background = {
    id: 'Soldier',
    name: 'Soldier',
    skillProficiencies: ['Athletics', 'Intimidation'],
    toolProficiencies: [],
    languages: [],
  };

  // Mock skills
  const skills = new Map();
  const skillList = ['Athletics', 'Stealth', 'Perception', 'Intimidation', "Thieves' Tools", "Cook's Utensils"];
  for (const skillName of skillList) {
    skills.set(skillName, {
      id: skillName,
      name: skillName,
      ability: 'Strength',
    });
  }

  // Mock class
  const fighterClass = {
    id: 'Fighter',
    name: 'Fighter',
    hitDie: 10,
    primaryAbility: ['Strength', 'Dexterity'],
    savingThrows: ['Strength', 'Constitution'],
    weaponProficiencies: ['Simple', 'Martial'],
    armorProficiencies: ['Light', 'Medium', 'Heavy', 'Shields'],
    featuresByLevel: [
      {
        level: 1,
        features: [
          { name: 'Fighting Style', source: 'PHB', description: '' },
        ],
      },
    ],
    spellcasting: null,
  };

  return {
    getFeat: (id: string) => feats.get(id) || null,
    getClass: (id: string) => (id === 'Fighter' ? fighterClass : null),
    getSubclass: () => null,
    getBackground: (id: string) => (id === 'Soldier' ? background : null),
    getSpecies: (id: string) => (id === 'Human' ? species : null),
    getSkill: (id: string) => skills.get(id) || null,
    getAllSpells: () => [],
    getClassFeaturesForLevel: () => [],
    getSubclassFeaturesForLevel: () => [],
  } as unknown as DataLoader;
}

describe('feat choices', () => {
  const data = createMockDataLoader();

  describe('Ability Score Improvement feat', () => {
    it('should apply +2 to chosen ability (Strength)', () => {
      const char = createCharacter({
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 13,
          Intelligence: 12,
          Wisdom: 10,
          Charisma: 8,
        },
      }, data);

      // Add ASI feat with ability bonus choice: +2 to Strength
      const updated = addFeat(char, 'ability-score-improvement', data, {
        abilityChoices: { Strength: 2 },
      });

      // Check that featGrants has the bonus
      expect(updated.abilityScores.featGrants).toEqual({ Strength: 2 });
      // Total Strength should be base (15) + feat grant (2) = 17
      expect(updated.abilityScores.base?.Strength).toBe(15);
      expect(updated.abilityScores.featGrants?.Strength).toBe(2);
    });

    it('should apply +1 to two abilities (Strength and Dexterity)', () => {
      const char = createCharacter({
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 13,
          Intelligence: 12,
          Wisdom: 10,
          Charisma: 8,
        },
      }, data);

      // Add ASI feat with ability bonus choices: +1 to Strength, +1 to Dexterity
      const updated = addFeat(char, 'ability-score-improvement', data, {
        abilityChoices: { Strength: 1, Dexterity: 1 },
      });

      // Check featGrants
      expect(updated.abilityScores.featGrants).toEqual({ Strength: 1, Dexterity: 1 });
    });
  });

  describe('Grappler feat', () => {
    it('should apply +1 to chosen ability (Strength)', () => {
      const char = createCharacter({
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 16,
          Dexterity: 14,
          Constitution: 13,
          Intelligence: 12,
          Wisdom: 10,
          Charisma: 8,
        },
      }, data);

      // Add Grappler feat with ability bonus choice: +1 to Strength
      const updated = addFeat(char, 'grappler', data, {
        abilityChoices: { Strength: 1 },
      });

      // Check that featGrants has the bonus
      expect(updated.abilityScores.featGrants).toEqual({ Strength: 1 });
    });

    it('should apply +1 to Dexterity when chosen', () => {
      const char = createCharacter({
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 16,
          Dexterity: 14,
          Constitution: 13,
          Intelligence: 12,
          Wisdom: 10,
          Charisma: 8,
        },
      }, data);

      // Add Grappler feat with ability bonus choice: +1 to Dexterity
      const updated = addFeat(char, 'grappler', data, {
        abilityChoices: { Dexterity: 1 },
      });

      // Check that featGrants has the bonus
      expect(updated.abilityScores.featGrants).toEqual({ Dexterity: 1 });
    });
  });

  describe('Skilled feat', () => {
    it('should apply skill proficiencies from choices', () => {
      const char = createCharacter({
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 13,
          Intelligence: 12,
          Wisdom: 10,
          Charisma: 8,
        },
      }, data);

      // Add Skilled feat with choices: Athletics, Stealth, Perception
      const updated = addFeat(char, 'skilled', data, {
        skillChoices: ['Athletics', 'Stealth', 'Perception'],
      });

      const result = recomputeDerivedStats(updated, data);

      // Check that skills are proficient
      expect(result.skills['Athletics']?.proficient).toBe(true);
      expect(result.skills['Stealth']?.proficient).toBe(true);
      expect(result.skills['Perception']?.proficient).toBe(true);
    });

    it('should apply skill proficiencies from choices (multiple skills)', () => {
      const char = createCharacter({
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 13,
          Intelligence: 12,
          Wisdom: 10,
          Charisma: 8,
        },
      }, data);

      // Add Skilled feat with skill choices (different from background)
      const updated = addFeat(char, 'skilled', data, {
        skillChoices: ['Perception', 'Investigation', 'Nature'],
      });

      const result = recomputeDerivedStats(updated, data);

      // Check that skills are proficient
      expect(result.skills['Perception']?.proficient).toBe(true);
      expect(result.skills['Investigation']?.proficient).toBe(true);
      expect(result.skills['Nature']?.proficient).toBe(true);
    });
  });

  describe('updateFeatChoices', () => {
    it('should update ability bonus choices (Record<string, number>)', () => {
      const char = createCharacter({
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 13,
          Intelligence: 12,
          Wisdom: 10,
          Charisma: 8,
        },
      }, data);

      // Add ASI feat (no choices yet)
      let updated = addFeat(char, 'ability-score-improvement', data);

      // Update choices: +2 to Strength (using Record<string, number> format)
      updated = updateFeatChoices(
        updated,
        'ability-score-improvement',
        { abilityChoices: { Strength: 2 } },
        data
      );

      // Verify the choice was stored correctly
      expect(updated.feats.find(f => f.featId === 'ability-score-improvement')?.abilityChoices).toEqual({ Strength: 2 });

      // Verify recompute applies the bonus
      const result = recomputeDerivedStats(updated, data);
      expect(result.abilityScores.featGrants).toEqual({ Strength: 2 });
    });

    it('should update skill choices (readonly string[])', () => {
      const char = createCharacter({
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 13,
          Intelligence: 12,
          Wisdom: 10,
          Charisma: 8,
        },
      }, data);

      // Add Skilled feat with initial choices
      let updated = addFeat(char, 'skilled', data, {
        skillChoices: ['Athletics', 'Stealth'],
      });

      // Update choices
      updated = updateFeatChoices(
        updated,
        'skilled',
        { skillChoices: ['Perception', 'Investigation', 'Nature'] },
        data
      );

      // Verify the choices were updated
      expect(updated.feats.find(f => f.featId === 'skilled')?.skillChoices).toEqual(['Perception', 'Investigation', 'Nature']);
    });
  });

  describe('multiple feats with choices', () => {
    it('should apply bonuses from multiple feats', () => {
      const char = createCharacter({
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 13,
          Intelligence: 12,
          Wisdom: 10,
          Charisma: 8,
        },
      }, data);

      // Add ASI feat: +2 to Strength (using abilityChoices in addFeat)
      let updated = addFeat(char, 'ability-score-improvement', data, {
        abilityChoices: { Strength: 2 },
      });

      // Add Grappler feat: +1 to Dexterity (using abilityChoices in addFeat)
      updated = addFeat(updated, 'grappler', data, {
        abilityChoices: { Dexterity: 1 },
      });

      const result = recomputeDerivedStats(updated, data);

      // Should have both bonuses
      expect(result.abilityScores.featGrants).toEqual({ Strength: 2, Dexterity: 1 });
    });
  });
});
