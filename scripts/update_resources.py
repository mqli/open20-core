#!/usr/bin/env python3
"""
Update classes.json to add resource fields to all features with resourceId.
Also removes incorrect resourceId from Sneak Attack and Favored Enemy.
"""
import json

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

def update_feature(classes, class_id, feature_name, level, updates):
    """Update a feature with the given fields."""
    for cls in classes:
        if cls['id'] == class_id:
            for entry in cls['featuresByLevel']:
                if entry['level'] == level:
                    for feat in entry['features']:
                        if feat['name'] == feature_name:
                            feat.update(updates)
                            return True
    return False

def remove_resource_id(classes, class_id, feature_name, level):
    """Remove resourceId from a feature."""
    for cls in classes:
        if cls['id'] == class_id:
            for entry in cls['featuresByLevel']:
                if entry['level'] == level:
                    for feat in entry['features']:
                        if feat['name'] == feature_name:
                            if 'resourceId' in feat:
                                del feat['resourceId']
                            return True
    return False

def main():
    path = 'static/srd/classes.json'
    classes = load_json(path)
    
    # Build resourceMaxByLevel dicts
    monk_focus_max = {}
    for i in range(2, 21):
        monk_focus_max[str(i)] = i
    
    paladin_layonhands_max = {}
    for i in range(1, 21):
        paladin_layonhands_max[str(i)] = i * 5
    
    sorcerer_font_max = {}
    for i in range(2, 21):
        sorcerer_font_max[str(i)] = i
    
    # List of (class_id, feature_name, level, updates_dict)
    updates = [
        # Barbarian Rage
        ('Barbarian', 'Rage', 1, {
            'resourceMaxByLevel': {'1': 2, '3': 3, '6': 4, '12': 5, '17': 6},
            'resourceResetOn': 'Long Rest'
        }),
        
        # Bard Bardic Inspiration
        ('Bard', 'Bardic Inspiration', 1, {
            'resourceMax': 1,
            'resourceScaleWithPB': False,
            'resourceResetOn': 'Long Rest'
        }),
        
        # Cleric Channel Divinity
        ('Cleric', 'Channel Divinity', 2, {
            'resourceScaleWithPB': True,
            'resourceResetOn': 'Long Rest'
        }),
        
        # Druid Wild Shape - already has fields
        ('Druid', 'Wild Shape', 2, {
            'resourceScaleWithPB': True,
            'resourceResetOn': 'Short Rest'
        }),
        
        # Fighter Second Wind
        ('Fighter', 'Second Wind', 1, {
            'resourceScaleWithPB': True,
            'resourceResetOn': 'Short Rest'
        }),
        
        # Fighter Action Surge
        ('Fighter', 'Action Surge', 2, {
            'resourceScaleWithPB': True,
            'resourceResetOn': 'Short Rest'
        }),
        
        # Fighter Indomitable
        ('Fighter', 'Indomitable', 9, {
            'resourceScaleWithPB': True,
            'resourceResetOn': 'Long Rest'
        }),
        
        # Monk Monk's Focus (Focus Points)
        ('Monk', 'Monk\'s Focus', 2, {
            'resourceMaxByLevel': monk_focus_max,
            'resourceResetOn': 'Short Rest'
        }),
        
        # Paladin Lay On Hands (points pool = paladin level x 5)
        ('Paladin', 'Lay On Hands', 1, {
            'resourceMaxByLevel': paladin_layonhands_max,
            'resourceResetOn': 'Long Rest'
        }),
        
        # Paladin Channel Divinity
        ('Paladin', 'Channel Divinity', 3, {
            'resourceScaleWithPB': True,
            'resourceResetOn': 'Long Rest'
        }),
        
        # Sorcerer Innate Sorcery
        ('Sorcerer', 'Innate Sorcery', 1, {
            'resourceScaleWithPB': True,
            'resourceResetOn': 'Long Rest'
        }),
        
        # Sorcerer Font of Magic (Sorcery Points = Sorcerer level)
        ('Sorcerer', 'Font of Magic', 2, {
            'resourceMaxByLevel': sorcerer_font_max,
            'resourceResetOn': 'Long Rest'
        }),
        
        # Warlock Magical Cunning
        ('Warlock', 'Magical Cunning', 2, {
            'resourceScaleWithPB': True,
            'resourceResetOn': 'Long Rest'
        }),
        
        # Wizard Arcane Recovery
        ('Wizard', 'Arcane Recovery', 1, {
            'resourceResetOn': 'Long Rest'
        }),
    ]
    
    print('Applying updates...')
    for (class_id, feature_name, level, updates_dict) in updates:
        success = update_feature(classes, class_id, feature_name, level, updates_dict)
        if success:
            print('  OK: Updated ' + class_id + '/' + feature_name + ' (level ' + str(level) + ')')
        else:
            print('  FAIL: Could not find ' + class_id + '/' + feature_name + ' (level ' + str(level) + ')')
    
    # Remove incorrect resourceId
    print('\nRemoving incorrect resourceId...')
    remove_ops = [
        ('Rogue', 'Sneak Attack', 1),
        ('Ranger', 'Favored Enemy', 1),
    ]
    for (class_id, feature_name, level) in remove_ops:
        success = remove_resource_id(classes, class_id, feature_name, level)
        if success:
            print('  OK: Removed resourceId from ' + class_id + '/' + feature_name)
        else:
            print('  FAIL: Could not find ' + class_id + '/' + feature_name + ' for removal')
    
    # Remove resourceMaxFormula from Bardic Inspiration if present
    print('\nCleaning up Bard/Bardic Inspiration...')
    for cls in classes:
        if cls['id'] == 'Bard':
            for entry in cls['featuresByLevel']:
                if entry['level'] == 1:
                    for feat in entry['features']:
                        if feat['name'] == 'Bardic Inspiration':
                            if 'resourceMaxFormula' in feat:
                                del feat['resourceMaxFormula']
                                print('  OK: Removed resourceMaxFormula')
    
    save_json(path, classes)
    print('\nSaved to ' + path)

if __name__ == '__main__':
    main()
