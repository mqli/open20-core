#!/usr/bin/env node
/**
 * Update classes.json to add resource fields to all features with resourceId.
 * Also removes incorrect resourceId from Sneak Attack and Favored Enemy.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLASSES_PATH = path.join(PROJECT_ROOT, 'static/srd/classes.json');

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveJSON(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function updateFeature(classes, classId, featureName, level, updates) {
  for (const cls of classes) {
    if (cls.id === classId) {
      for (const entry of cls.featuresByLevel) {
        if (entry.level === level) {
          for (const feat of entry.features) {
            if (feat.name === featureName) {
              Object.assign(feat, updates);
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

function removeResourceId(classes, classId, featureName, level) {
  for (const cls of classes) {
    if (cls.id === classId) {
      for (const entry of cls.featuresByLevel) {
        if (entry.level === level) {
          for (const feat of entry.features) {
            if (feat.name === featureName) {
              delete feat.resourceId;
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

function main() {
  const classes = loadJSON(CLASSES_PATH);

  // Build resourceMaxByLevel dicts
  const monkFocusMax = {};
  for (let i = 2; i <= 20; i++) monkFocusMax[String(i)] = i;

  const paladinLayOnHandsMax = {};
  for (let i = 1; i <= 20; i++) paladinLayOnHandsMax[String(i)] = i * 5;

  const sorcererFontMax = {};
  for (let i = 2; i <= 20; i++) sorcererFontMax[String(i)] = i;

  const updates = [
    // [classId, featureName, level, updates]
    ['Barbarian', 'Rage', 1, {
      resourceMaxByLevel: {'1': 2, '3': 3, '6': 4, '12': 5, '17': 6},
      resourceResetOn: 'Long Rest'
    }],
    ['Bard', 'Bardic Inspiration', 1, {
      resourceMax: 1,
      resourceScaleWithPB: false,
      resourceResetOn: 'Long Rest'
    }],
    ['Cleric', 'Channel Divinity', 2, {
      resourceScaleWithPB: true,
      resourceResetOn: 'Long Rest'
    }],
    ['Druid', 'Wild Shape', 2, {
      resourceScaleWithPB: true,
      resourceResetOn: 'Short Rest'
    }],
    ['Fighter', 'Second Wind', 1, {
      resourceScaleWithPB: true,
      resourceResetOn: 'Short Rest'
    }],
    ['Fighter', 'Action Surge', 2, {
      resourceScaleWithPB: true,
      resourceResetOn: 'Short Rest'
    }],
    ['Fighter', 'Indomitable', 9, {
      resourceScaleWithPB: true,
      resourceResetOn: 'Long Rest'
    }],
    ['Monk', 'Monk\'s Focus', 2, {
      resourceMaxByLevel: monkFocusMax,
      resourceResetOn: 'Short Rest'
    }],
    ['Paladin', 'Lay On Hands', 1, {
      resourceMaxByLevel: paladinLayOnHandsMax,
      resourceResetOn: 'Long Rest'
    }],
    ['Paladin', 'Channel Divinity', 3, {
      resourceScaleWithPB: true,
      resourceResetOn: 'Long Rest'
    }],
    ['Sorcerer', 'Innate Sorcery', 1, {
      resourceScaleWithPB: true,
      resourceResetOn: 'Long Rest'
    }],
    ['Sorcerer', 'Font of Magic', 2, {
      resourceMaxByLevel: sorcererFontMax,
      resourceResetOn: 'Long Rest'
    }],
    ['Warlock', 'Magical Cunning', 2, {
      resourceScaleWithPB: true,
      resourceResetOn: 'Long Rest'
    }],
    ['Wizard', 'Arcane Recovery', 1, {
      resourceResetOn: 'Long Rest'
    }],
  ];

  console.log('Applying updates...');
  for (const [classId, featureName, level, updatesDict] of updates) {
    const success = updateFeature(classes, classId, featureName, level, updatesDict);
    if (success) {
      console.log(`  OK: Updated ${classId}/${featureName} (level ${level})`);
    } else {
      console.log(`  FAIL: Could not find ${classId}/${featureName} (level ${level})`);
    }
  }

  console.log('\nRemoving incorrect resourceId...');
  const removeOps = [
    ['Rogue', 'Sneak Attack', 1],
    ['Ranger', 'Favored Enemy', 1],
  ];
  for (const [classId, featureName, level] of removeOps) {
    const success = removeResourceId(classes, classId, featureName, level);
    if (success) {
      console.log(`  OK: Removed resourceId from ${classId}/${featureName}`);
    } else {
      console.log(`  FAIL: Could not find ${classId}/${featureName} for removal`);
    }
  }

  // Remove resourceMaxFormula from Bardic Inspiration if present
  console.log('\nCleaning up Bard/Bardic Inspiration...');
  for (const cls of classes) {
    if (cls.id === 'Bard') {
      for (const entry of cls.featuresByLevel) {
        if (entry.level === 1) {
          for (const feat of entry.features) {
            if (feat.name === 'Bardic Inspiration') {
              delete feat.resourceMaxFormula;
              console.log('  OK: Removed resourceMaxFormula');
            }
          }
        }
      }
    }
  }

  saveJSON(CLASSES_PATH, classes);
  console.log(`\nSaved to ${CLASSES_PATH}`);
}

main();
