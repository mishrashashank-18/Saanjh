require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const InterestCatalog = require('../models/InterestCatalog');
const InterestQuestions = require('../models/InterestQuestions');
const { catalogData, defaultQuestionsData, generateSlug } = require('../data/seedData');

async function seed() {
  console.log('[Seed] Starting Saanjh Interests & Questions database seed...');

  const conn = await connectDB();
  if (!conn) {
    console.error('[Seed] Database connection failed. Aborting seed.');
    process.exit(1);
  }

  try {
    // 1. Seed InterestCatalog
    let catalogInserted = 0;
    const catalogDocs = [];

    for (const [categoryKey, categoryInfo] of Object.entries(catalogData)) {
      for (const itemName of categoryInfo.items) {
        const slug = generateSlug(categoryKey, itemName);
        catalogDocs.push({
          slug,
          category: categoryKey,
          categoryLabel: categoryInfo.label,
          label: itemName,
        });
      }
    }

    // Upsert catalog items to avoid duplicating
    for (const doc of catalogDocs) {
      await InterestCatalog.findOneAndUpdate(
        { slug: doc.slug },
        { $set: doc },
        { upsert: true, new: true }
      );
      catalogInserted++;
    }

    console.log(`[Seed] Successfully seeded ${catalogInserted} interests across ${Object.keys(catalogData).length} categories.`);

    // 2. Seed Default InterestQuestions
    let questionsInserted = 0;
    for (const [categoryKey, questions] of Object.entries(defaultQuestionsData)) {
      await InterestQuestions.findOneAndUpdate(
        { category: categoryKey },
        {
          $set: {
            category: categoryKey,
            source: 'seed',
            questions,
            updatedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );
      questionsInserted++;
    }

    console.log(`[Seed] Successfully seeded default questions for ${questionsInserted} categories.`);
    console.log('[Seed] Completed successfully! 🎉');
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Disconnected from MongoDB.');
  }
}

seed();
