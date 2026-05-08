# Character Creation — Species

> Corresponds to PRD §4.1 & §6 Terminology Update
> **First step in character creation, foundation for all subsequent calculations.**

---

## Description

Player selects one of 12 species from 2024 PHB, gaining species traits, ability bonuses, speed, languages, etc.

MVP supports 2024 PHB species only. 2014 legacy species (Half-Elf/Half-Orc) moved to P1.

---

## Acceptance Criteria

- [x] Display 12 species cards (icon + name + brief description)
- [x] After selection, display full trait list
- [x] Species ability bonuses correctly applied to `AbilityScores.racialBonuses`
- [x] Species speed correctly applied to `CombatStats.speed`
- [x] Species languages added to character language list
- [x] Species traits visible in character "Traits" section
- [x] Support Aasimar's Celestial Revelation (with variant selection)
- [x] Support Dwarf's Dwarven Resilience (resistance or proficiency selection)
- [x] Support Tiefling's Infernal Legacy (spells by level)

---

## Data Model

See `../../spec/data-model.md` → `Species`

**Species static JSON structure**:
```jsonc
{
  "id": "Dwarf",
  "source": "2024 PHB",
  "description": "...",
  "size": "Medium",
  "speed": 30,
  "languages": ["Common", "Dwarvish"],
  "darkvision": 60,
  "abilityBonuses": { "Constitution": 2 },
  "baseTraits": [
    { "name": "Darkvision", "description": "..." },
    { "name": "Dwarven Resilience", "description": "..." }
  ],
  "subtypes": [
    {
      "id": "hill-dwarf",
      "name": "Hill Dwarf",
      "traits": [...]
    }
  ]
}
```

**Character JSON storage**:
```jsonc
{
  "species": "Dwarf",
  "speciesSubtype": "mountain-dwarf",
  "speciesTraits": ["Darkvision", "Dwarven Resilience", "Mountain Born"]
}
```

---

## 2024 Species Complete List

| Species | Ability Bonus | Size | Speed | Special |
|---|---|---|---|---|
| Aasimar | Cha+2 | Medium | 30 | Celestial Revelation (level 3) |
| Dragonborn | Str+2 | Medium | 30 | Draconic Breath |
| Dwarf | Con+2 | Medium | 30 | Darkvision, Dwarven Resilience |
| Elf | Dex+2 | Medium | 30 | Trance, Keen Senses |
| Gnome | Int+2 | Small | 30 | Gnome Cunning |
| Goliath | Str+2 | Medium | 30 | Large Form, Hill's Tumble |
| Halfling | Dex+2 | Small | 25 | Lucky, Brave |
| Human | +1 to two | Medium | 30 | Versatile (extra background feature) |
| Orc | Str+2 | Medium | 30 | Adrenaline Rush, Relentless Endurance |
| Tiefling | Cha+2 | Medium | 30 | Infernal Legacy (spells) |

**2014 Legacy (P1)**: Half-Elf, Half-Orc

---

## Edge Cases

| Situation | Handling |
|---|---|
| Human ability bonus selection | Show picker, select two +1 (can't select same) |
| Aasimar level 3 Revelation selection | Show selection at level up (Radiant Soul/Transforming Soul/Vengeful Spirit) |
| Orc's Adrenaline Rush uses | Reset on long rest, track in Resources |
| Multiple species traits stack | Don't stack same-name traits; different traits coexist |
| Species grants armor training | Update CombatStats.armorTraining list |

---

## References

- PRD §4.1 Character Creation
- PRD §6 Rule Data Range
- 2024 PHB p. 16-38 Species Chapter
- 2024 PHB p. 18 Terminology Update: Race → Species
