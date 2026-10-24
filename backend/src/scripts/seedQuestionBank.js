const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const QuestionBank = require('../models/QuestionBank');
const { fixedQuestion5, defaultBankQuestions } = require('../data/seedQuestionBank');

async function seedQuestionBank() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB. Seeding QuestionBank...');

  let count = 0;
  for (const [categoryKey, questions] of Object.entries(defaultBankQuestions)) {
    // 4 benchmark questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const questionId = `${categoryKey}_q${i + 1}`;
      await QuestionBank.findOneAndUpdate(
        { questionId },
        {
          $set: {
            category: categoryKey,
            questionId,
            questionIndex: i,
            dimension: q.dimension,
            text: q.text,
            options: q.options.map((o) => ({ label: o.label, value: String(o.value) })),
            isSensitive: Boolean(q.isSensitive),
            skippable: Boolean(q.skippable),
            version: 'v1.0',
          },
        },
        { upsert: true, new: true }
      );
      count++;
    }

    // Question 5 fixed
    const q5Id = `${categoryKey}_q5`;
    await QuestionBank.findOneAndUpdate(
      { questionId: q5Id },
      {
        $set: {
          category: categoryKey,
          questionId: q5Id,
          questionIndex: 4,
          dimension: fixedQuestion5.dimension,
          text: fixedQuestion5.text,
          options: fixedQuestion5.options.map((o) => ({ label: o.label, value: String(o.value) })),
          isSensitive: false,
          skippable: false,
          version: 'v1.0',
        },
      },
      { upsert: true, new: true }
    );
    count++;
  }

  console.log(`Successfully seeded ${count} questions across 13 categories into QuestionBank.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  seedQuestionBank().catch((err) => {
    console.error('Failed to seed QuestionBank:', err);
    process.exit(1);
  });
}

module.exports = seedQuestionBank;
