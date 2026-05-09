#!/usr/bin/env python3
"""
Transform SRD spells from dnd-data repository to local spells.json format.
"""

import urllib.request
import json
import re
import os

def slugify(name):
    """Convert spell name to kebab-case id."""
    # Handle specific spell name patterns
    name = name.lower()
    # Remove special characters except hyphens
    name = re.sub(r'[^a-z0-9\s-]', '', name)
    # Replace spaces with hyphens
    name = re.sub(r'\s+', '-', name)
    # Remove consecutive hyphens
    name = re.sub(r'-+', '-', name)
    return name

def parse_components(comp_str):
    """Parse component string like 'V, S, M' into structured format."""
    if not comp_str:
        return {"V": False, "S": False, "M": None}
    
    comp_str = comp_str.upper()
    result = {
        "V": "V" in comp_str or "VERBAL" in comp_str,
        "S": "S" in comp_str or "SOMATIC" in comp_str,
        "M": None
    }
    
    # Extract material component if present
    if "M" in comp_str:
        # Try to extract text after M in parentheses
        m_match = re.search(r'M\s*(?:\(([^)]+)\))?', comp_str)
        if m_match and m_match.group(1):
            result["M"] = m_match.group(1).lower()
        else:
            result["M"] = True  # Material required but no specific description
    
    return result

def extract_damage(description, level):
    """Extract damage dice and type from description."""
    damage = None

    # Pattern for damage dice: 1d4, 2d6, 10d8, etc.
    dmg_pattern = r'(\d+d\d+(?:\s*\+\s*\d+)?)\s+(acid|cold|fire|force|lightning|necrotic|poison|radiant|thunder|psychic|slashing|piercing|bludgeoning)'
    match = re.search(dmg_pattern, description, re.IGNORECASE)
    if match:
        damage = {
            "entries": [{
                "dice": match.group(1),
                "type": match.group(2).capitalize()
            }]
        }

    return damage

def extract_save(description):
    """Extract saving throw from description."""
    saves = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]
    for save in saves:
        if re.search(rf'\b{save}\b', description, re.IGNORECASE):
            return save
    return None

def check_attack(description):
    """Check if spell involves an attack roll."""
    return "attack" in description.lower() or "ranged spell attack" in description.lower()

def parse_duration(duration_str):
    """Parse duration string and check for concentration."""
    if not duration_str:
        return "Instantaneous", False
    
    concentration = "concentration" in duration_str.lower()
    return duration_str, concentration

def check_ritual(casting_time, description):
    """Check if spell can be cast as ritual."""
    ritual_keywords = ["ritual", "(ritual)"]
    for kw in ritual_keywords:
        if kw.lower() in casting_time.lower() or kw.lower() in description.lower():
            return True
    return False

def transform_spell(spell):
    """Transform a dnd-data spell to local format."""
    props = spell.get("properties", {})
    desc = spell.get("description", "")
    
    # Parse basic fields
    casting_time = props.get("Casting Time", "Action")
    range_str = props.get("Range", props.get("data-RangeAoe", "Self"))
    duration_str = props.get("Duration", "Instantaneous")
    components_str = props.get("Components", "")
    level = props.get("Level", 0)
    school = props.get("School", "")
    save = props.get("Save", extract_save(desc))
    
    # Clean up casting time
    if "Action" in casting_time and "bonus" not in casting_time.lower():
        casting_time = "Action"
    elif "bonus action" in casting_time.lower():
        casting_time = "Bonus Action"
    elif "reaction" in casting_time.lower():
        casting_time = "Reaction"
    elif "minute" in casting_time.lower() or "hour" in casting_time.lower():
        # Keep original format
        pass
    
    duration, concentration = parse_duration(duration_str)
    components = parse_components(components_str)
    damage = extract_damage(desc, level)
    ritual = check_ritual(casting_time, desc)
    attack = check_attack(desc)
    
    # Determine if it's a healing spell
    heal = None
    if "regains" in desc.lower() or "heal" in desc.lower():
        # Try to extract healing dice
        heal_match = re.search(r'(\d+d\d+)', desc)
        if heal_match:
            heal = {"dice": heal_match.group(1)}
    
    return {
        "id": slugify(spell.get("name", "")),
        "name": spell.get("name", ""),
        "level": level,
        "school": school.capitalize() if school else "Unknown",
        "castingTime": casting_time,
        "range": range_str,
        "components": components,
        "duration": duration,
        "concentration": concentration,
        "ritual": ritual,
        "description": desc,
        "damage": damage,
        "heal": heal,
        "save": save,
        "attack": attack,
        "source": spell.get("book", spell.get("publisher", "Unknown"))
    }

def is_srd_spell(spell):
    """Check if spell is from SRD (Wizards of the Coast)."""
    publisher = spell.get("publisher", "")
    book = spell.get("book", "")
    
    srd_sources = [
        "Wizards of the Coast",
        "Player's Handbook",
        "Free Basic Rules",
        "Essentials Kit",
        "Monster Manual",
        "Dungeon Master's Guide",
        "Player's Handbook (2024)",
        "Free Basic Rules (2024)"
    ]
    
    # Check publisher
    if "Wizards of the Coast" in publisher:
        return True
    
    # Check book for SRD indicators
    for source in srd_sources:
        if source in book:
            return True
    
    return False

def main():
    print("Fetching dnd-data spells...")
    
    # Fetch dnd-data spells
    url = 'https://raw.githubusercontent.com/nick-aschenbach/dnd-data/main/data/spells.json'
    with urllib.request.urlopen(url) as response:
        dnd_spells = json.loads(response.read().decode())
    
    print(f"Total spells in dnd-data: {len(dnd_spells)}")
    
    # Filter SRD spells
    srd_spells = [s for s in dnd_spells if is_srd_spell(s)]
    print(f"SRD spells: {len(srd_spells)}")
    
    # Transform spells
    transformed = []
    for spell in srd_spells:
        try:
            transformed_spell = transform_spell(spell)
            transformed.append(transformed_spell)
        except Exception as e:
            print(f"Error transforming {spell.get('name', 'Unknown')}: {e}")
    
    print(f"Successfully transformed: {len(transformed)} spells")
    
    # Load existing local data
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    local_file = os.path.join(project_root, 'static', 'spells.json')
    existing_ids = set()
    existing_spells = []
    
    if os.path.exists(local_file):
        with open(local_file, 'r') as f:
            existing_spells = json.load(f)
        existing_ids = {s['id'] for s in existing_spells}
        print(f"Existing local spells: {len(existing_spells)}")
    
    # Merge: keep existing, add new
    existing_dict = {s['id']: s for s in existing_spells}
    merged = list(existing_spells)
    
    added_count = 0
    for spell in transformed:
        if spell['id'] not in existing_ids:
            existing_dict[spell['id']] = spell
            added_count += 1
    
    print(f"New spells to add: {added_count}")
    
    # Sort by level then name
    all_spells = list(existing_dict.values())
    all_spells.sort(key=lambda x: (x['level'], x['name']))
    
    # Save
    with open(local_file, 'w') as f:
        json.dump(all_spells, f, indent=2, ensure_ascii=False)
    
    print(f"Total spells after merge: {len(all_spells)}")
    print(f"Saved to: {local_file}")
    
    # Show breakdown by level
    level_counts = {}
    for spell in all_spells:
        lvl = spell['level']
        level_counts[lvl] = level_counts.get(lvl, 0) + 1
    
    print("\nSpells by level:")
    for lvl in sorted(level_counts.keys()):
        print(f"  Level {lvl}: {level_counts[lvl]}")

if __name__ == "__main__":
    main()
