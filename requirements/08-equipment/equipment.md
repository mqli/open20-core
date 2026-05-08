# Requirement: Equipment Management

> Corresponds to PRD §4.8

---

## Description

Manage weapons, armor, shields, adventuring gear, and currency.

Equipment affects AC calculation, attack bonuses, skill checks (tool proficiencies).

---

## Acceptance Criteria

### Weapons
- [x] Weapon list: name, damage, ability, mastery property, equip/unequip
- [x] Weapon attacks calculated: `ability mod + proficiency (if proficient) + bonus`
- [x] Weapon mastery properties applied (Push, Sap, Cleave, etc.)
- [x] Equip/unequip weapon → update attack list

### Armor
- [x] Armor list: name, AC bonus, Dex bonus, strength requirement
- [x] Equip/unequip armor → trigger AC recalculation
- [x] Shield: separate management, equipping gives +2 AC
- [x] Heavy armor strength requirement enforced (speed reduced if insufficient)

### Gear & Currency
- [x] Gear list: name, quantity, weight (optional rule)
- [x] Currency management: CP/SP/EP/GP/PP, support +/- modification
- [x] Starting equipment applied from background

---

## Data Model

See `../../spec/data-model.md` → `Equipment`, `Weapon`, `Armor`, `GearItem`

```typescript
interface EquipmentItem {
  readonly id: string;
  readonly name: string;
  readonly type: 'weapon' | 'armor' | 'gear';
  readonly quantity: number;
  readonly equipped: boolean;
  readonly weight?: number;
  readonly cost?: string;
}

interface Weapon extends EquipmentItem {
  readonly type: 'weapon';
  readonly weaponType: 'Simple' | 'Martial';
  readonly category: 'Melee' | 'Ranged';
  readonly damage: Damage;
  readonly properties: readonly WeaponProperty[];
  readonly mastery?: WeaponMasteryProperty;
}

interface Armor extends EquipmentItem {
  readonly type: 'armor';
  readonly armorType: 'Light' | 'Medium' | 'Heavy';
  readonly baseAC: number;
  readonly dexBonus: boolean;
  readonly dexCap?: number;        // Medium armor: 2
  readonly strengthRequirement?: number;
  readonly stealthDisadvantage?: boolean;
}

interface GearItem extends EquipmentItem {
  readonly type: 'gear';
  readonly description?: string;
}

interface Currency {
  readonly cp: number;  // Copper pieces
  readonly sp: number;  // Silver pieces
  readonly ep: number;  // Electrum pieces
  readonly gp: number;  // Gold pieces
  readonly pp: number;  // Platinum pieces
}
```

---

## API Functions

```typescript
// Add equipment to character
function addEquipment(char: Character, item: EquipmentItem): Character;

// Remove equipment from character
function removeEquipment(char: Character, itemId: string): Character;

// Equip item (just the item, recomputeDerivedStats must be called separately)
function equipItem(char: Character, itemId: string): Character;

// Unequip item (just the item, recomputeDerivedStats must be called separately)
function unequipItem(char: Character, itemId: string): Character;

// Equip item AND recalculate derived stats (AC, attacks)
function equipItemAndRecompute(char: Character, itemId: string, data: DataLoader): Character;

// Unequip item AND recalculate derived stats
function unequipItemAndRecompute(char: Character, itemId: string, data: DataLoader): Character;

// Modify currency
function modifyCurrency(char: Character, changes: Partial<Currency>): Character;

// Calculate attack bonuses for equipped weapons
function calculateAttacks(char: Character, data?: DataLoader): readonly Attack[];
```

---

## Edge Cases

| Situation | Handling |
|---|---|
| Multiple weapons equipped | Attack list shows all equipped weapons |
| Armor + Shield equipped | AC = baseAC + armor bonus + shield bonus + Dex bonus (with cap) |
| Unarmored + Mage Armor | Mage Armor overrides (take higher) |
| Item weight = 0 or negative | Treat as 0 |
| Currency negative | Block operation, show error |
| Heavy armor, Str insufficient | Warning "Speed reduced", apply disadvantage on stealth |
| Weapon mastery property | Apply effect (Push/Sap/Cleave/etc.) to attack calculation |

---

## Weapon Mastery (2024 Rules)

2024 PHB introduced Weapon Mastery for Fighter (level 1+), Ranger (level 2+), Paladin (level 2+), Barbarian (level 3+).

**Mastery Properties**:
- **Cleave**: On kill, bonus action attack
- **Push**: Hit forces Str save or be pushed 10 ft
- **Sap**: Hit weakens, next attack has disadvantage
- **Slow**: Hit reduces target speed
- **Topple**: Hit forces Str save or be knocked prone
- **Vex**: Hit gives advantage on next attack

---

## References

- PRD §4.8 Equipment Management
- PRD §10 Appendix D AC Calculation Rules
- 2024 PHB p.163-175 Equipment Chapter
- 2024 PHB p.30 Weapon Mastery Rules
