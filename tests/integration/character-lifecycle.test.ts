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

    it('should level up multiclass character correctly', () => {
      // Start with Wizard 1 / Fighter 1
      let char = createCharacter({
        name: 'Kira',
        speciesId: 'Human',
        backgroundId: 'sage',
        classId: 'Wizard',
        abilityScores: {
          Strength: 14,
          Dexterity: 13,
          Constitution: 14,
          Intelligence: 15,
          Wisdom: 12,
          Charisma: 8
        },
        additionalClasses: [
          { classId: 'Fighter', level: 1 }
        ]
      }, dataLoader);

      expect(char.classes).toHaveLength(2);
      expect(char.classes[0]!.level).toBe(1);
      expect(char.classes[1]!.level).toBe(1);
      // Level up Fighter class
      char = levelUp(char, { classId: 'Fighter', hpChoice: 'fixed' }, dataLoader);

      // Fighter should now be level 2
      expect(char.classes[1]!.classId).toBe('Fighter');
      expect(char.classes[1]!.level).toBe(2);
      // Wizard should still be level 1
      expect(char.classes[0]!.level).toBe(1);
      // Total level = 3, proficiency bonus = 2
      expect(char.combatStats.proficiencyBonus).toBe(2);
    });
  });

  describe('Session 8: Half-Caster Multiclass', () => {
    it('should calculate correct spell slots for Paladin 5 / Wizard 5', () => {
      // Paladin is half caster: 5/2 = 2 effective levels
      // Wizard is full caster: 5 levels
      // Total: 2 + 5 = 7 effective spellcasting levels
      const char = createCharacter({
        name: 'Theron',
        speciesId: 'Human',
        backgroundId: 'soldier',
        classId: 'Paladin',
        classLevel: 5,
        abilityScores: {
          Strength: 15,
          Dexterity: 13,
          Constitution: 14,
          Intelligence: 10,
          Wisdom: 12,
          Charisma: 15
        },
        additionalClasses: [
          { classId: 'Wizard', level: 5 }
        ]
      }, dataLoader);

      // Total effective spellcasting level = 2 (Paladin) + 5 (Wizard) = 7
      // Level 7 multiclass: 4/3/3/1 spell slots
      expect(char.spells.spellSlots[1]!.total).toBe(4);
      expect(char.spells.spellSlots[2]!.total).toBe(3);
      expect(char.spells.spellSlots[3]!.total).toBe(3);
      expect(char.spells.spellSlots[4]!.total).toBe(1);
    });
  });

  describe('Session 9: Death and Death Saves', () => {
    it('should track death saves when dropped to 0 HP', () => {
      const fighter = createCharacter({
        name: 'Bron',
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

      // Drop to 0 HP
      const dying = modifyHP(fighter, -fighter.hitPoints.max);
      expect(dying.hitPoints.current).toBe(0);
      expect(dying.hitPoints.deathSaves).toBeDefined();
      expect(dying.hitPoints.deathSaves!.successes).toBe(0);
      expect(dying.hitPoints.deathSaves!.failures).toBe(0);
    });

    it('should reset death saves and restore HP on long rest', () => {
      let fighter = createCharacter({
        name: 'Bron',
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

      // Drop to 0 HP
      fighter = modifyHP(fighter, -fighter.hitPoints.max);
      expect(fighter.hitPoints.current).toBe(0);
      
      // Long rest should restore HP and reset death saves
      const restored = longRest(fighter, dataLoader);
      expect(restored.hitPoints.current).toBe(restored.hitPoints.max);
      expect(restored.hitPoints.deathSaves!.successes).toBe(0);
      expect(restored.hitPoints.deathSaves!.failures).toBe(0);
    });
  });

  describe('Session 10: Full Character Lifecycle', () => {
    it('should handle complete character journey', () => {
      // 1. Create character
      let char = createCharacter({
        name: 'Aria',
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

      expect(char.classes[0]!.level).toBe(1);

      // 2. Level up to 2
      char = levelUp(char, { classId: 'Wizard', hpChoice: 'fixed' }, dataLoader);
      expect(char.classes[0]!.level).toBe(2);

      // 3. Take some damage
      char = modifyHP(char, -10);
      expect(char.hitPoints.current).toBeLessThan(char.hitPoints.max);

      // 4. Short rest (should recover some HP)
      const afterShortRest = shortRest(char, 1, dataLoader);
      expect(afterShortRest.hitPoints.current).toBeGreaterThan(char.hitPoints.current);

      // 5. Short rest again
      char = shortRest(afterShortRest, 1, dataLoader);

      // 6. Long rest (full recovery)
      char = longRest(char, dataLoader);
      expect(char.hitPoints.current).toBe(char.hitPoints.max);

      // 7. Serialize and restore
      const json = serialize(char);
      const restored = deserialize(json);
      expect(restored.name).toBe(char.name);
      expect(restored.hitPoints.current).toBe(char.hitPoints.current);
      expect(restored.classes[0]!.level).toBe(char.classes[0]!.level);

      // 8. Validate restored character
      const validation = validateCharacter(restored, dataLoader);
      expect(validation.valid).toBe(true);
    });
  });
});
