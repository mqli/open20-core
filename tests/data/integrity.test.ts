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

// ─── Helper Functions ─────────────────────────────────────────────────────────

function assertRequiredFields(collection: any[], requiredFields: string[]) {
  for (const item of collection) {
    for (const field of requiredFields) {
      expect(item[field]).toBeDefined();
    }
  }
}

// ─── Shared Validation Lists ──────────────────────────────────────────────────

const VALID_ABILITIES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
const VALID_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception',
  'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine',
  'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion',
  'Sleight of Hand', 'Stealth', 'Survival',
];
const VALID_FEAT_CATEGORIES = ['Origin', 'General', 'Fighting Style', 'Epic Boon'];
const VALID_HIT_DICE = ['d6', 'd8', 'd10', 'd12'];
const VALID_DAMAGE_TYPES = ['bludgeoning', 'piercing', 'slashing'];

const EXPECTED_WEAPON_MASTERY_PROPERTIES = ['Push', 'Slow', 'Topple', 'Vex', 'Sap', 'Graze', 'Nick', 'Cleave'];
const EXPECTED_CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone',
  'Restrained', 'Stunned', 'Unconscious', 'Concentrating',
];

// ─── Expected Counts ──────────────────────────────────────────────────────────

const EXPECTED_COUNTS = {
  species: 12,
  backgrounds: 4,  // SRD 5.2 only: Acolyte, Criminal, Sage, Soldier
  classes: 12,
  feats: 14,  // SRD 5.2 only
  weapons: 30,
  armors: 15,
  spells: 50,
} as const;

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
      for (const prop of EXPECTED_WEAPON_MASTERY_PROPERTIES) {
        expect(lookupTables.weaponMasteryProperties).toContain(prop);
      }
    });

    it('should have all condition names', () => {
      for (const condition of EXPECTED_CONDITIONS) {
        expect(lookupTables.conditionNames).toContain(condition);
      }
    });
  });

  describe('species.json', () => {
    it(`should have ${EXPECTED_COUNTS.species} species`, () => {
      expect(species.length).toBe(EXPECTED_COUNTS.species);
    });

    it('should have all required fields', () => {
      assertRequiredFields(species, ['id', 'source', 'size', 'speed', 'abilityBonuses', 'baseTraits', 'subtypes']);
    });

    it('should use full ability names in abilityBonuses', () => {
      for (const spec of species) {
        for (const [ability, bonus] of Object.entries(spec.abilityBonuses || {})) {
          expect(VALID_ABILITIES).toContain(ability);
          expect(bonus).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('backgrounds.json', () => {
    it(`should have ${EXPECTED_COUNTS.backgrounds} backgrounds`, () => {
      expect(backgrounds.length).toBe(EXPECTED_COUNTS.backgrounds);
    });

    it('should have originFeatId (not originFeat object)', () => {
      for (const bg of backgrounds) {
        expect(bg.originFeatId).toBeDefined();
        expect(typeof bg.originFeatId).toBe('string');
      }
    });

    it('should have skillProficiencies', () => {
      for (const bg of backgrounds) {
        expect(bg.skillProficiencies.length).toBeGreaterThan(0);
        for (const skill of bg.skillProficiencies) {
          expect(VALID_SKILLS).toContain(skill);
        }
      }
    });
  });

  describe('classes.json', () => {
    it(`should have ${EXPECTED_COUNTS.classes} classes`, () => {
      expect(classes.length).toBe(EXPECTED_COUNTS.classes);
    });

    it('should have all required fields', () => {
      assertRequiredFields(classes, ['id', 'source', 'hitDie', 'savingThrowProficiencies', 'featuresByLevel']);
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
      for (const cls of classes) {
        expect(VALID_HIT_DICE).toContain(cls.hitDie);
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
    it(`should have ${EXPECTED_COUNTS.feats}+ feats`, () => {
      expect(feats.length).toBeGreaterThanOrEqual(EXPECTED_COUNTS.feats);
    });

    it('should have all required fields', () => {
      assertRequiredFields(feats, ['id', 'source', 'name', 'description', 'category']);
    });

    it('should have valid categories', () => {
      for (const feat of feats) {
        expect(VALID_FEAT_CATEGORIES).toContain(feat.category);
      }
    });
  });

  describe('weapons.json', () => {
    it(`should have ${EXPECTED_COUNTS.weapons}+ weapons`, () => {
      expect(weapons.length).toBeGreaterThanOrEqual(EXPECTED_COUNTS.weapons);
    });

    it('should have all required fields', () => {
      assertRequiredFields(weapons, ['id', 'name', 'category', 'damage', 'properties']);
    });

    it('should have valid damage structure', () => {
      for (const weapon of weapons) {
        expect(weapon.damage.entries.length).toBeGreaterThan(0);
        const firstEntry = weapon.damage.entries[0];
        expect(firstEntry?.dice).toMatch(/^\d+d\d+$/);
        expect(VALID_DAMAGE_TYPES).toContain(firstEntry?.type?.toLowerCase());
      }
    });
  });

  describe('armor.json', () => {
    it(`should have ${EXPECTED_COUNTS.armors}+ armors`, () => {
      expect(armors.length).toBeGreaterThanOrEqual(EXPECTED_COUNTS.armors);
    });

    it('should have all required fields', () => {
      assertRequiredFields(armors, ['id', 'name', 'category', 'ac']);
    });
  });

  describe('spells.json', () => {
    it(`should have ${EXPECTED_COUNTS.spells}+ spells (currently partial)`, () => {
      expect(spells.length).toBeGreaterThanOrEqual(EXPECTED_COUNTS.spells);
    });

    it('should have all required fields', () => {
      assertRequiredFields(spells, ['id', 'name', 'level', 'school', 'castingTime', 'range', 'components', 'duration']);
    });

    it('should have valid level (0-9)', () => {
      for (const spell of spells) {
        expect(spell.level).toBeGreaterThanOrEqual(0);
        expect(spell.level).toBeLessThanOrEqual(9);
      }
    });
  });
});
