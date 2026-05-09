import { describe, it, expect } from 'vitest';
import _lookupTables from '../../static/srd/lookup-tables.json';
import _species from '../../static/srd/species.json';
import _backgrounds from '../../static/srd/backgrounds.json';
import _classes from '../../static/srd/classes.json';
import _subclasses from '../../static/srd/subclasses.json';
import _feats from '../../static/srd/feats.json';
import _weapons from '../../static/srd/weapons.json';
import _armors from '../../static/srd/armor.json';
import _spells from '../../static/srd/spells.json';

// Cast JSON imports to any to allow dynamic property access in integrity tests
const lookupTables: any = _lookupTables;
const species: any = _species;
const backgrounds: any = _backgrounds;
const classes: any = _classes;
const subclasses: any = _subclasses;
const feats: any = _feats;
const weapons: any = _weapons;
const armors: any = _armors;
const spells: any = _spells;

describe('Data Integrity Tests', () => {
  describe('lookup-tables.json', () => {
    it('should have proficiency bonus for all levels 1-20', () => {
      for (let level = 1; level <= 20; level++) {
        expect(lookupTables.proficiencyBonus[level]).toBeDefined();
        expect(lookupTables.proficiencyBonus[level]).toBeGreaterThan(0);
      }
    });

    it('should have hit die fixed values for all die types', () => {
      const expected = { d4: 3, d6: 4, d8: 5, d10: 6, d12: 7, d20: 11 };
      for (const [die, value] of Object.entries(expected)) {
        expect(lookupTables.hitDieFixedValue[die]).toBe(value);
      }
    });

    it('should have spell slots for all caster types', () => {
      const casters = ['Wizard', 'Cleric', 'Druid', 'Sorcerer', 'Bard', 'Paladin', 'Ranger'];
      for (const caster of casters) {
        expect(lookupTables.spellSlots[caster]).toBeDefined();
        expect(lookupTables.spellSlots[caster][1]).toBeDefined();
      }
    });

    it('should have multiclass spell slots for levels 1-20', () => {
      for (let level = 1; level <= 20; level++) {
        expect(lookupTables.multiclassSpellSlots[level]).toBeDefined();
        // multiclassSpellSlots[level] is an object with keys '1'-'9'
        expect(typeof lookupTables.multiclassSpellSlots[level]).toBe('object');
      }
    });

    it('should have pact magic slots for levels 1-20', () => {
      for (let level = 1; level <= 20; level++) {
        expect(lookupTables.pactMagicSlots[level]).toBeDefined();
      }
    });

    it('should have all 8 weapon mastery properties', () => {
      const expectedProperties = [
        'Push',
        'Slow',
        'Topple',
        'Vex',
        'Sap',
        'Graze',
        'Nick',
        'Cleave',
      ];
      for (const prop of expectedProperties) {
        expect(lookupTables.weaponMasteryProperties).toContain(prop);
      }
    });

    it('should have all condition names', () => {
      const expectedConditions = [
        'Blinded',
        'Charmed',
        'Deafened',
        'Exhaustion',
        'Frightened',
        'Grappled',
        'Incapacitated',
        'Invisible',
        'Paralyzed',
        'Petrified',
        'Poisoned',
        'Prone',
        'Restrained',
        'Stunned',
        'Unconscious',
        'Concentrating',
      ];
      for (const condition of expectedConditions) {
        expect(lookupTables.conditionNames).toContain(condition);
      }
    });
  });

  describe('species.json', () => {
    it('should have 12 species', () => {
      expect(species.length).toBe(12);
    });

    it('should have all required fields', () => {
      const requiredFields = [
        'id',
        'source',
        'size',
        'speed',
        'abilityBonuses',
        'baseTraits',
        'subtypes',
      ];
      for (const spec of species) {
        for (const field of requiredFields) {
          expect(spec[field]).toBeDefined();
        }
      }
    });

    it('should use full ability names in abilityBonuses', () => {
      const validAbilities = [
        'Strength',
        'Dexterity',
        'Constitution',
        'Intelligence',
        'Wisdom',
        'Charisma',
      ];
      for (const spec of species) {
        for (const [ability, bonus] of Object.entries(spec.abilityBonuses || {})) {
          expect(validAbilities).toContain(ability);
          expect(bonus).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('backgrounds.json', () => {
    it('should have 16 backgrounds', () => {
      expect(backgrounds.length).toBe(16);
    });

    it('should have originFeatId (not originFeat object)', () => {
      for (const bg of backgrounds) {
        expect(bg.originFeatId).toBeDefined();
        expect(typeof bg.originFeatId).toBe('string');
      }
    });

    it('should have skillProficiencies', () => {
      const validSkills = [
        'Acrobatics',
        'Animal Handling',
        'Arcana',
        'Athletics',
        'Deception',
        'History',
        'Insight',
        'Intimidation',
        'Investigation',
        'Medicine',
        'Nature',
        'Perception',
        'Performance',
        'Persuasion',
        'Religion',
        'Sleight of Hand',
        'Stealth',
        'Survival',
      ];
      for (const bg of backgrounds) {
        expect(bg.skillProficiencies.length).toBeGreaterThan(0);
        for (const skill of bg.skillProficiencies) {
          expect(validSkills).toContain(skill);
        }
      }
    });
  });

  describe('classes.json', () => {
    it('should have 12 classes', () => {
      expect(classes.length).toBe(12);
    });

    it('should have all required fields', () => {
      const requiredFields = [
        'id',
        'source',
        'hitDie',
        'savingThrowProficiencies',
        'featuresByLevel',
      ];
      for (const cls of classes) {
        for (const field of requiredFields) {
          expect(cls[field]).toBeDefined();
        }
      }
    });

    it('should have featuresByLevel as array format', () => {
      for (const cls of classes) {
        expect(Array.isArray(cls.featuresByLevel)).toBe(true);
        if (cls.featuresByLevel.length > 0) {
          expect(cls.featuresByLevel[0]).toHaveProperty('level');
          expect(cls.featuresByLevel[0]).toHaveProperty('features');
          expect(Array.isArray(cls.featuresByLevel[0].features)).toBe(true);
        }
      }
    });

    it('should have valid hit die values', () => {
      const validDice = ['d6', 'd8', 'd10', 'd12'];
      for (const cls of classes) {
        expect(validDice).toContain(cls.hitDie);
      }
    });
  });

  describe('subclasses.json', () => {
    it('should have subclasses for all 12 classes', () => {
      const classIds = (classes as { id: string }[]).map(c => c.id);
      for (const classId of classIds) {
        const subclassList = (subclasses as { parentClass: string }[]).filter(s => s.parentClass === classId);
        expect(subclassList.length).toBeGreaterThan(0);
      }
    });

    it('should have parentClass matching a valid class', () => {
      const classIds = (classes as { id: string }[]).map(c => c.id);
      for (const sub of subclasses as { parentClass: string }[]) {
        expect(classIds).toContain(sub.parentClass);
      }
    });
  });

  describe('feats.json', () => {
    it('should have 75+ feats', () => {
      expect(feats.length).toBeGreaterThanOrEqual(75);
    });

    it('should have all required fields', () => {
      const requiredFields = ['id', 'source', 'name', 'description', 'category'];
      for (const feat of feats) {
        for (const field of requiredFields) {
          expect(feat[field]).toBeDefined();
        }
      }
    });

    it('should have valid categories', () => {
      const validCategories = ['Origin', 'General', 'Fighting Style', 'Epic Boon'];
      for (const feat of feats) {
        expect(validCategories).toContain(feat.category);
      }
    });
  });

  describe('weapons.json', () => {
    it('should have 30+ weapons', () => {
      expect(weapons.length).toBeGreaterThanOrEqual(30);
    });

    it('should have all required fields', () => {
      const requiredFields = ['id', 'name', 'category', 'damage', 'properties'];
      for (const weapon of weapons) {
        for (const field of requiredFields) {
          expect(weapon[field]).toBeDefined();
        }
      }
    });

    it('should have valid damage structure', () => {
      for (const weapon of weapons) {
        expect(weapon.damage.entries.length).toBeGreaterThan(0);
        const firstEntry = weapon.damage.entries[0];
        expect(firstEntry?.dice).toMatch(/^\d+d\d+$/);
        expect(['bludgeoning', 'piercing', 'slashing']).toContain(firstEntry?.type?.toLowerCase());
      }
    });
  });

  describe('armor.json', () => {
    it('should have 15+ armors', () => {
      expect(armors.length).toBeGreaterThanOrEqual(15);
    });

    it('should have all required fields', () => {
      const requiredFields = ['id', 'name', 'category', 'ac'];
      for (const armor of armors) {
        for (const field of requiredFields) {
          expect(armor[field]).toBeDefined();
        }
      }
    });
  });

  describe('spells.json', () => {
    it('should have 50+ spells (currently partial)', () => {
      expect(spells.length).toBeGreaterThanOrEqual(50);
    });

    it('should have all required fields', () => {
      const requiredFields = [
        'id',
        'name',
        'level',
        'school',
        'castingTime',
        'range',
        'components',
        'duration',
      ];
      for (const spell of spells) {
        for (const field of requiredFields) {
          expect(spell[field]).toBeDefined();
        }
      }
    });

    it('should have valid level (0-9)', () => {
      for (const spell of spells) {
        expect(spell.level).toBeGreaterThanOrEqual(0);
        expect(spell.level).toBeLessThanOrEqual(9);
      }
    });
  });
});
