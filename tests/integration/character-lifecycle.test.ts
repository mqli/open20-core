import { describe, it, expect, beforeEach } from 'vitest';
import { createDataLoader } from '../../src/data/loader';
import { createCharacter } from '../../src/character/create';
import { modifyHP } from '../../src/character/mutate';
import { shortRest, longRest } from '../../src/character/rest';
import { levelUp } from '../../src/character/level-up';
import { validateCharacter } from '../../src/character/validate';
import { recomputeDerivedStats } from '../../src/character/recompute';
import { serialize, deserialize } from '../../src/storage/serializer';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lookupTables = require('../../static/lookup-tables.json');

const dataLoader = createDataLoader(lookupTables);

describe('D&D Player Behavior - Character Lifecycle', () => {
  describe('Session 0: Character Creation', () => {
    it('should create a Human Fighter at level 1', () => {
      const char = createCharacter({
        name: 'Tordek',
        speciesId: 'Human',
        backgroundId: 'soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 13,
          Constitution: 14,
          Intelligence: 10,
          Wisdom: 12,
          Charisma: 8
        }
      }, dataLoader);

      expect(char.name).toBe('Tordek');
      expect(char.species).toBe('Human');
      expect(char.classes[0].classId).toBe('Fighter');
      expect(char.classes[0].level).toBe(1);
      expect(char.hitPoints.current).toBeGreaterThan(0);
    });

    it('should create an Elf Wizard at level 1', () => {
      const char = createCharacter({
        name: 'Elara',
        speciesId: 'Elf',
        backgroundId: 'sage',
        classId: 'Wizard',
        abilityScores: {
          Strength: 8,
          Dexterity: 14,
          Constitution: 13,
          Intelligence: 15,
          Wisdom: 12,
          Charisma: 10
        }
      }, dataLoader);

      expect(char.name).toBe('Elara');
      expect(Array.isArray(char.spells.knownSpells)).toBe(true);
    });
  });

  describe('Session 1: Combat and Damage', () => {
    let fighter: any;

    beforeEach(() => {
      fighter = createCharacter({
        name: 'Tordek',
        speciesId: 'Human',
        backgroundId: 'soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 13,
          Constitution: 14,
          Intelligence: 10,
          Wisdom: 12,
          Charisma: 8
        }
      }, dataLoader);
    });

    it('should take damage and survive', () => {
      const initialHP = fighter.hitPoints.current;
      const damage = 8;

      const afterDamage = modifyHP(fighter, -damage);
      expect(afterDamage.hitPoints.current).toBe(initialHP - damage);
      expect(afterDamage.hitPoints.current).toBeGreaterThan(0);
    });

    it('should become unconscious at 0 HP', () => {
      const char = modifyHP(fighter, -100);
      expect(char.hitPoints.current).toBe(0);
    });
  });

  describe('Session 2: Short Rest', () => {
    let fighter: any;

    beforeEach(() => {
      fighter = createCharacter({
        name: 'Tordek',
        speciesId: 'Human',
        backgroundId: 'soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 13,
          Constitution: 14,
          Intelligence: 10,
          Wisdom: 12,
          Charisma: 8
        }
      }, dataLoader);

      fighter = modifyHP(fighter, -15);
    });

    it('should recover HP after Short Rest', () => {
      const hpBeforeRest = fighter.hitPoints.current;
      
      const afterRest = shortRest(fighter, 1, dataLoader);
      
      expect(afterRest.hitPoints.current).toBeGreaterThan(hpBeforeRest);
    });
  });

  describe('Session 3: Long Rest and Level Up', () => {
    let wizard: any;

    beforeEach(() => {
      wizard = createCharacter({
        name: 'Elara',
        speciesId: 'Elf',
        backgroundId: 'sage',
        classId: 'Wizard',
        abilityScores: {
          Strength: 8,
          Dexterity: 14,
          Constitution: 13,
          Intelligence: 15,
          Wisdom: 12,
          Charisma: 10
        }
      }, dataLoader);
    });

    it('should fully recover after Long Rest', () => {
      let char = modifyHP(wizard, -10);
      
      const afterRest = longRest(char, dataLoader);

      expect(afterRest.hitPoints.current).toBe(afterRest.hitPoints.max);
    });

    it('should level up from 1 to 2', () => {
      const levelUpResult = levelUp(wizard, {
        classId: 'Wizard',
        hpChoice: 'fixed',
        asiOrFeat: {
          type: 'asi',
          asi: { 'Intelligence': 1 }
        }
      }, dataLoader);

      expect(levelUpResult.classes[0].level).toBe(2);
      // ASI increases featBonuses, not base
      // Total INT = base(15) + racial(0) + feat(1) = 16
      expect(levelUpResult.abilityScores.featBonuses['Intelligence']).toBe(1);
      const totalInt = levelUpResult.abilityScores.base['Intelligence'] +
                      (levelUpResult.abilityScores.racialBonuses['Intelligence'] ?? 0) +
                      (levelUpResult.abilityScores.featBonuses['Intelligence'] ?? 0);
      expect(totalInt).toBe(16);
    });
  });

  describe('Session 4: Character Validation', () => {
    it('should validate a correctly created character', () => {
      const char = createCharacter({
        name: 'Tordek',
        speciesId: 'Human',
        backgroundId: 'soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 13,
          Constitution: 14,
          Intelligence: 10,
          Wisdom: 12,
          Charisma: 8
        }
      }, dataLoader);

      const result = validateCharacter(char, dataLoader);
      expect(result.valid).toBe(true);
    });
  });

  describe('Session 5: Serialization and Deserialization', () => {
    it('should serialize and deserialize a character without data loss', () => {
      const original = createCharacter({
        name: 'Tordek',
        speciesId: 'Human',
        backgroundId: 'soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 13,
          Constitution: 14,
          Intelligence: 10,
          Wisdom: 12,
          Charisma: 8
        }
      }, dataLoader);

      const damaged = modifyHP(original, -10);

      const json = serialize(damaged);
      const restored = deserialize(json);

      expect(restored.name).toBe(original.name);
      expect(restored.species).toBe(original.species);
      expect(restored.hitPoints.current).toBe(damaged.hitPoints.current);
    });
  });

  describe('Session 6: Derived Stats Recomputation', () => {
    it('should recompute AC correctly', () => {
      const char = createCharacter({
        name: 'Tordek',
        speciesId: 'Human',
        backgroundId: 'soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 13,
          Constitution: 14,
          Intelligence: 10,
          Wisdom: 12,
          Charisma: 8
        }
      }, dataLoader);

      const recomputed = recomputeDerivedStats(char, dataLoader);
      
      // AC should be calculated (10 + Dex mod)
      expect(recomputed.combatStats.AC).toBeGreaterThan(10);
      expect(recomputed.combatStats.proficiencyBonus).toBe(2);
    });
  });

  describe('Session 7: Multiclass Characters', () => {
    it('should create a Fighter 1 / Wizard 1 multiclass character', () => {
      const char = createCharacter({
        name: 'Gand',
        speciesId: 'Human',
        backgroundId: 'sage',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 13,
          Constitution: 14,
          Intelligence: 15,
          Wisdom: 12,
          Charisma: 8
        },
        additionalClasses: [
          { classId: 'Wizard', level: 1 }
        ]
      }, dataLoader);

      expect(char.classes).toHaveLength(2);
      expect(char.classes[0]!.classId).toBe('Fighter');
      expect(char.classes[0]!.level).toBe(1);
      expect(char.classes[1]!.classId).toBe('Wizard');
      expect(char.classes[1]!.level).toBe(1);
      // Total level = 2
      expect(char.combatStats.proficiencyBonus).toBe(2);
    });

    it('should create a Wizard 3 / Fighter 2 with correct spell slots', () => {
      const char = createCharacter({
        name: 'Mika',
        speciesId: 'Elf',
        backgroundId: 'sage',
        classId: 'Wizard',
        classLevel: 3,
        abilityScores: {
          Strength: 8,
          Dexterity: 14,
          Constitution: 13,
          Intelligence: 15,
          Wisdom: 12,
          Charisma: 10
        },
        additionalClasses: [
          { classId: 'Fighter', level: 2 }
        ]
      }, dataLoader);

      expect(char.classes).toHaveLength(2);
      expect(char.classes[0]!.classId).toBe('Wizard');
      expect(char.classes[0]!.level).toBe(3);
      expect(char.classes[1]!.classId).toBe('Fighter');
      expect(char.classes[1]!.level).toBe(2);
      // Total level = 5, proficiency bonus = 3
      expect(char.combatStats.proficiencyBonus).toBe(3);
      // Multiclass: Wizard 3 + Fighter 2 = 3 effective spellcasting levels
      // Should have 2nd level spell slots
      expect(char.spells.spellSlots[2]!.total).toBeGreaterThan(0);
    });

    it('should validate a multiclass character', () => {
      const char = createCharacter({
        name: 'Gand',
        speciesId: 'Human',
        backgroundId: 'sage',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 13,
          Constitution: 14,
          Intelligence: 15,
          Wisdom: 12,
          Charisma: 8
        },
        additionalClasses: [
          { classId: 'Wizard', level: 1 }
        ]
      }, dataLoader);

      const result = validateCharacter(char, dataLoader);
      expect(result.valid).toBe(true);
    });
  });
});
