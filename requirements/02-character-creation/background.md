# Character Creation — Background

> Corresponds to PRD §4.1
> **2024 rules grant Origin Feat via background — core change from 2014 rules.**

---

## Description

Player selects one of 16 backgrounds from 2024 PHB, gaining skill proficiencies, tool proficiencies, languages, and Origin Feat.

---

## Acceptance Criteria

- [x] Display 16 background cards (icon + name + brief description)
- [x] After selection, display granted skills/tools/languages/Origin Feat
- [x] Granted skills auto-checked in `Skills`
- [x] Granted tools auto-added to `Equipment` or `toolProficiencies`
- [x] Granted languages auto-added to character language list
- [x] Origin Feat auto-added to `feats[]`
- [x] Support custom backgrounds (encouraged by 2024 rules)
- [x] Support 6 new backgrounds: Farmer, Guard, Guide, Merchant, Scribe, Wayfarer

---

## 2024 Background Complete List

| Background | Skills | Tools | Languages | Origin Feat |
|---|---|---|---|---|
| Acolyte | Insight, Religion | — | 2自选 | Blessed Warrior |
| Charlatan | Deception, Sleight of Hand | Forgery Kit | — | Skilled |
| Criminal | Deception, Stealth | Gaming Set | Thieves' Cant | Criminal Contact |
| Entertainer | Acrobatics, Performance | Disguise Kit | — | Menacing |
| Farmer 🆕 | Animal Handling, Survival | Artisan's Tools | — | Tough |
| Gladiator | Acrobatics, Performance | Disguise Kit | — | Tavern Brawler |
| Guard 🆕 | Athletics, Perception | Gaming Set | — | Alert |
| Guide 🆕 | Survival, Perception | Vehicles(land) | — | Skilled |
| Hermit | Medicine, Religion | Herbalism Kit | 1自选 | Wakeful |
| Merchant 🆕 | Persuasion, Insight | Navigator's Tools | 1自选 | Lucky |
| Noble | History, Persuasion | Gaming Set | 1自选 | Blessed Warrior |
| Sage | Arcana, History | — | 2自选 | Studious |
| Sailor | Athletics, Perception | Navigator's Tools | — | Tavern Brawler |
| Scribe 🆕 | Investigation, Perception | Calligrapher's Supplies | 2自选 | Skilled |
| Soldier | Athletics, Intimidation | Gaming Set | — | Savage Attacker |
| Wayfarer 🆕 | Insight, Survival | Artisan's Tools | 1自选 | Alert |

---

## Data Model

See `../../spec/data-model.md` → `Background`

**Background static JSON structure**:
```jsonc
{
  "id": "soldier",
  "source": "2024 PHB",
  "name": "Soldier",
  "skillProficiencies": ["Athletics", "Intimidation"],
  "toolProficiencies": ["Gaming Set"],
  "languages": ["Common"],
  "originFeatId": "savage-attacker",
  "startingEquipment": [...],
  "startingGold": 15
}
```

**Character JSON storage**:
```jsonc
{
  "background": "soldier",
  "originFeat": "savage-attacker",
  "backgroundGranted": {
    "skills": ["Athletics", "Intimidation"],
    "tools": ["Gaming Set"],
    "languages": ["Common"]
  }
}
```

---

## Origin Feat Explanation

In 2024 rules, **each background grants one Origin Feat**, gained at level 1.

Origin Feat is a type of feat, counted in total feat count (doesn't affect other level-up feat selections).

**Common Origin Feats**:
- Alert, Blessed Warrior, Crafter, Lucky, Menacing
- Savage Attacker, Skilled, Studious, Tavern Brawler, Tough, Wakeful

---

## Edge Cases

| Situation | Handling |
|---|---|
| Custom background | Show picker: 2 skills + 1 tool/language + 1 Origin Feat |
| Origin Feat has prerequisites (e.g., Str 13+) | Check ability scores, warn if not met |
| Multiple backgrounds grant same skill | Don't stack, but can trigger Expertise |
| Background grants tool already owned | Ignore duplicate, don't error |

---

## References

- PRD §4.1 Character Creation
- 2024 PHB p. 39-62 Background Chapter
- 2024 PHB p. 40 Origin Feats Explanation
