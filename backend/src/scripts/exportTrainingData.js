/**
 * CLI-only Training Data Export Script for Saanjh
 * Usage: node backend/src/scripts/exportTrainingData.js [--include-text]
 * Outputs:
 *  - training_users.jsonl (Flat feature records, pseudonymized)
 *  - training_events.jsonl (Append-only response event stream)
 *  - schema.json (Documentation of fields, types, dimensions, and sensitive flags)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const User = require('../models/User');
const Profile = require('../models/Profile');
const UserInterests = require('../models/UserInterests');
const InterestAnswers = require('../models/InterestAnswers');
const ResponseEvents = require('../models/ResponseEvents');
const QuestionBank = require('../models/QuestionBank');
const { VALID_DIMENSIONS } = require('../services/geminiService');

function pseudonymize(id) {
  return 'u_' + crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 16);
}

function calculateAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

async function runExport() {
  const includeText = process.argv.includes('--include-text');
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('Error: MONGODB_URI is missing from environment.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB. Starting training data export...');
  console.log(`Mode: ${includeText ? 'INCLUDING user text fields (--include-text)' : 'PSEUDONYMIZED (no PII/text)'}`);

  const outputDir = path.resolve(__dirname, '../../exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Export schema.json
  const questionBankItems = await QuestionBank.find().sort({ category: 1, questionIndex: 1 });
  const schemaDoc = {
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    dimensions: VALID_DIMENSIONS,
    allowedValues: {
      genderIdentity: ['woman', 'man', 'non-binary', 'other', 'prefer-not-to-say'],
      genderPreference: ['woman', 'man', 'non-binary', 'everyone'],
      relationshipGoal: ['long-term', 'casual', 'friendship', 'unsure'],
      goingOutFrequency: ['rarely', 'sometimes', 'often', 'very-often'],
      culturalImportance: ['not-important', 'a-little', 'somewhat', 'very-important', 'prefer-not-to-say'],
      sharePreference: ['must-have', 'nice-to-have', 'doesnt-matter'],
      partnerPriorities: {
        range: [1, 10],
        attributes: ['attractiveness', 'sincerity', 'intelligence', 'humour', 'ambition', 'sharedInterests'],
      },
    },
    questionBank: questionBankItems.map((q) => ({
      questionId: q.questionId,
      category: q.category,
      questionIndex: q.questionIndex,
      dimension: q.dimension,
      version: q.version,
      isSensitive: q.isSensitive,
      skippable: q.skippable,
      options: q.options,
    })),
  };

  const schemaPath = path.join(outputDir, 'schema.json');
  fs.writeFileSync(schemaPath, JSON.stringify(schemaDoc, null, 2), 'utf-8');
  console.log(`Wrote: ${schemaPath}`);

  // 2. Export training_users.jsonl
  const users = await User.find({ emailVerified: true });
  const usersJsonlPath = path.join(outputDir, 'training_users.jsonl');
  const usersStream = fs.createWriteStream(usersJsonlPath, { flags: 'w', encoding: 'utf-8' });

  let exportedUsersCount = 0;

  for (const u of users) {
    const [profile, interests, answers] = await Promise.all([
      Profile.findOne({ userId: u._id }),
      UserInterests.findOne({ userId: u._id }),
      InterestAnswers.find({ userId: u._id, isArchived: false }),
    ]);

    const pseudonymId = pseudonymize(u._id);

    // Format answers map
    const answerFeatures = {};
    for (const ans of answers) {
      answerFeatures[`${ans.category}_q${ans.questionIndex + 1}_val`] = ans.selectedValue;
      answerFeatures[`${ans.category}_q${ans.questionIndex + 1}_dim`] = ans.dimension;
      if (ans.questionIndex === 4 && ans.sharePreference) {
        answerFeatures[`${ans.category}_share_pref`] = ans.sharePreference;
      }
    }

    const featureRecord = {
      pseudonymId,
      age: calculateAge(u.dateOfBirth),
      genderIdentity: u.genderIdentity || null,
      genderPreference: profile?.genderPreference || ['everyone'],
      relationshipGoal: profile?.relationshipGoal || null,
      city: profile?.city || u.city || null,
      partnerPriorities: profile?.partnerPriorities || {
        attractiveness: 5,
        sincerity: 5,
        intelligence: 5,
        humour: 5,
        ambition: 5,
        sharedInterests: 5,
      },
      goingOutFrequency: profile?.goingOutFrequency || null,
      culturalImportance: profile?.culturalImportance || null,
      categoriesCount: interests?.categories?.length || 0,
      categories: interests?.categories || [],
      interestsCount: interests?.interests?.length || 0,
      interests: interests?.interests || [],
      top3: interests?.top3 || [],
      answers: answerFeatures,
      consentVersion: u.consent?.version || 'v1.0',
      profileCompleted: Boolean(u.profileCompleted),
      onboardingStep: u.onboardingStep,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };

    if (includeText) {
      featureRecord.fullName = u.fullName;
      featureRecord.email = u.email;
      featureRecord.mobileNumber = u.mobileNumber;
      featureRecord.bio = u.bio;
      featureRecord.dealBreakers = profile?.dealBreakers;
      featureRecord.notes = profile?.notes;
    }

    usersStream.write(JSON.stringify(featureRecord) + '\n');
    exportedUsersCount++;
  }

  usersStream.end();
  console.log(`Wrote: ${usersJsonlPath} (${exportedUsersCount} records)`);

  // 3. Export training_events.jsonl
  const events = await ResponseEvents.find().sort({ createdAt: 1 });
  const eventsJsonlPath = path.join(outputDir, 'training_events.jsonl');
  const eventsStream = fs.createWriteStream(eventsJsonlPath, { flags: 'w', encoding: 'utf-8' });

  for (const ev of events) {
    const eventRecord = {
      pseudonymId: pseudonymize(ev.userId),
      stage: ev.stage,
      field: ev.field,
      value: ev.value,
      previousValue: ev.previousValue,
      source: ev.source,
      createdAt: ev.createdAt,
    };
    eventsStream.write(JSON.stringify(eventRecord) + '\n');
  }

  eventsStream.end();
  console.log(`Wrote: ${eventsJsonlPath} (${events.length} events)`);

  console.log('Export completed successfully.');
  await mongoose.disconnect();
}

if (require.main === module) {
  runExport().catch((err) => {
    console.error('Export failed:', err);
    process.exit(1);
  });
}

module.exports = runExport;
