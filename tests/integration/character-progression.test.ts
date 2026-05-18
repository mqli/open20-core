import { describe, it, expect, beforeEach } from 'vitest';
import { createDataLoader } from '../../src/data/loader';
import { createCharacter } from '../../src/character/create';
import { modifyHP } from '../../src/character/mutate';
import { longRest } from '../../src/character/rest';
import { levelUp } from '../../src/character/level-up';
import { validateCharacter } from '../../src/character/validate';
import { recomputeDerivedStats } from '../../src/character/recompute';
import { serialize, deserialize } from '../../src/storage/serializer';

const dataLoader = createDataLoader();

describe('D&D Player Behavior - Character Progression', () => {
  describe('Session 3: Long Rest and Level Up', () => {
    let wizard: any;

    beforeEach(() => {
      wizard = createCharacter(
        {
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
            Charisma: 10,
          },
        },
        dataLoader
      );
    });

    it('should fully recover after Long Rest', () => {
      const damageAmount = wizard.hitPoints.current - 1;
      let char = modifyHP(wizard, -damageAmount);
      expect(char.hitPoints.current).toBe(1);

      const afterRest = longRest(char, dataLoader);

      expect(afterRest.hitPoints.current).toBe(afterRest.hitPoints.max);
    });

    it('should level up from 1 to 2', () => {
      const levelUpResult = levelUp(
        wizard,
        {
          classId: 'Wizard',
          hpChoice: 'fixed',
          asiOrFeat: {
            type: 'asi',
            asi: { Intelligence: 1 },
          },
        },
        dataLoader
      );

      expect(levelUpResult.classes[0]!.level).toBe(2);
      expect(levelUpResult.abilityScores.featBonuses?.['Intelligence'] ?? 0).toBe(1);
      const totalInt =
        levelUpResult.abilityScores.base['Intelligence'] +
        (levelUpResult.abilityScores.racialBonuses['Intelligence'] ?? 0) +
        (levelUpResult.abilityScores.featBonuses?.['Intelligence'] ?? 0);
      expect(totalInt).toBe(16);
    });
  });

  describe('Session 4: Character Validation', () => {
    it('should validate a correctly created character', () => {
      const char = createCharacter(
        {
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
            Charisma: 8,
          },
        },
        dataLoader
      );

      const result = validateCharacter(char, dataLoader);
      expect(result.valid).toBe(true);
    });
  });

  describe('Session 5: Serialization and Deserialization', () => {
    it('should serialize and deserialize a character without data loss', () => {
      const original = createCharacter(
        {
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
            Charisma: 8,
          },
        },
        dataLoader
      );

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
      const char = createCharacter(
        {
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
            Charisma: 8,
          },
        },
        dataLoader
      );

      const recomputed = recomputeDerivedStats(char, dataLoader);

      expect(recomputed.combatStats.AC).toBeGreaterThan(10);
      expect(recomputed.combatStats.proficiencyBonus).toBe(2);
    });
  });
});
