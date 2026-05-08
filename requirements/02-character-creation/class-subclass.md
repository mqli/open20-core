# Character Creation — Class + Subclass

> Corresponds to PRD §4.1 & §6 Terminology Update
> **Class features determine rule engine input parameters — core foundational data.**

---

## Description

Player selects one of 12 classes from 2024 PHB (MVP single-class only).

Subclass selected when reaching subclass level (level 1 for non-casters / level 3 for casters).

---

## Acceptance Criteria

### Class Selection
- [x] Display 12 class cards (icon + name + brief description)
- [x] After selection, display class feature list (by level)
- [x] Correctly set `armorTraining` (affects AC calculation)
- [x] Correctly set `weaponMastery` (affects weapon mastery)
- [x] Correctly set `spellcasting` (affects spell management)
- [x] Multiclass interface reserved (`classes[]` array)

### Subclass Selection
- [x] Pop up selection at subclass level (level 1 non-casters / level 3 casters)
- [x] Display all subclass cards for that class
- [x] After selection, activate corresponding features

### 2024 Terminology Updates (Required)
- [x] Barbarian: Primal Path → Barbarian Subclass
- [x] Fighter: Martial Archetype → Fighter Subclass
- [x] Monk: Monastic Tradition → Monk Subclass
- [x] Paladin: Sacred Oath → Paladin Subclass
- [x] Warlock: Otherworldly Patron → Warlock Subclass
- [x] All subclass names updated (see table below)

---

## 2024 Subclass Name Mapping

| Class | 2014 Name | 2024 Name |
|---|---|---|
| Barbarian | Path of the Totem Warrior | Path of the Wild Heart |
| Barbarian | (new) | Path of the World Tree |
| Barbarian | (from Xanathar's) | Path of the Zealot |
| Bard | (new) | College of Dance |
| Bard | (from Xanathar's) | College of Glamour |
| Druid | (new) | Circle of the Sea |
| Druid | (from Tasha's) | Circle of the Stars |
| Monk | Way of Mercy | Warrior of Mercy |
| Monk | Way of Shadow | Warrior of Shadow |
| Monk | Way of the Four Elements | Warrior of the Elements |
| Monk | Way of the Open Hand | Warrior of the Open Hand |
| Sorcerer | Aberrant Mind | Aberrant Sorcery |
| Sorcerer | Clockwork Soul | Clockwork Sorcery |
| Sorcerer | Draconic Bloodline | Draconic Sorcery |
| Sorcerer | Wild Magic | Wild Magic Sorcery |
| Warlock | The Archfey | Archfey Patron |
| Warlock | The Celestial | Celestial Patron |
| Warlock | The Fiend | Fiend Patron |
| Warlock | The Great Old One | Great Old One Patron |
| Wizard | School of Abjuration | Abjurer |
| Wizard | School of Divination | Diviner |
| Wizard | School of Evocation | Evoker |
| Wizard | School of Illusion | Illusionist |

---

## Data Model

See `../../spec/data-model.md` → `Class & Subclass`

**Class static JSON structure**:
```jsonc
{
  "id": "fighter",
  "source": "2024 PHB",
  "hitDie": "d10",
  "savingThrowProficiencies": ["Strength", "Constitution"],
  "armorTraining": ["Light", "Medium", "Heavy", "Shields"],
  "weaponMastery": true,
  "spellcasting": null,
  "featuresByLevel": [
    {
      "level": 1,
      "features": [
        { "name": "Fighting Style", "description": "...", "resourceId": null },
        { "name": "Second Wind", "description": "...", "resourceId": "second-wind" }
      ]
    },
    // ... each level
  ]
}
```

**Character JSON storage**:
```jsonc
{
  "classes": [
    {
      "classId": "fighter",
      "level": 5,
      "subclassId": "champion",
      "subclassLevel": 3,
      "hitDice": { "die": "d10", "used": 0 }
    }
  ]
}
```

---

## Class Key Points

| Class | Spellcasting? | Resource Tracking | Special |
|---|---|---|---|
| Barbarian | No | Rage (Long Rest) | Unarmored Defense |
| Bard | Yes (full caster) | Bardic Inspiration (Long Rest) | — |
| Cleric | Yes (prepares) | Channel Divinity (Short Rest) | — |
| Druid | Yes (prepares) | Wild Shape (Short Rest) | — |
| Fighter | No (Eldritch Knight excepted) | Second Wind/Action Surge/Indomitable | Weapon Mastery |
| Monk | No | Focus Points (Short Rest) | Unarmored Defense |
| Paladin | Yes (prepares, half caster) | Channel Divinity/Lay on Hands | — |
| Ranger | Yes (prepares, half caster) | Favored Enemy (Long Rest) | Weapon Mastery |
| Rogue | No | Sneak Attack (Per Turn) | Weapon Mastery |
| Sorcerer | Yes (full caster) | Sorcery Points (Long Rest) | Font of Magic |
| Warlock | Yes (full caster) | Pact Magic (Short Rest) | Short rest recovery |
| Wizard | Yes (prepares) | Arcane Recovery (Long Rest) | Ritual Adept |

---

## Edge Cases

| Situation | Handling |
|---|---|
| Cancel subclass selection | Keep class, subclass empty, prompt again at next level up |
| Class feature grants resource | Auto-create entry in `Resources[]` |
| Multiclass (P1) | `classes[]` array supports multiple, spell slots per multiclass rules |
| 2014 legacy subclasses (P1) | Cleric's Knowledge/Nature/Tempest; Wizard's Conjuration etc. |

---

## References

- PRD §4.1 Character Creation
- PRD §10 Appendix A Terminology Complete Update Table
- PRD §10 Appendix B Class Resource Tracking List
- 2024 PHB p.70-160 Class Chapter
