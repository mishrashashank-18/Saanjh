const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const generatedQuestionItemSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    questionIndex: { type: Number, required: true },
    dimension: {
      type: String,
      enum: [
        'frequency',
        'intensity',
        'social_preference',
        'style_preference',
        'depth',
        'openness_to_new',
        'shared_activity',
      ],
      required: true,
    },
    text: { type: String, required: true },
    options: { type: [optionSchema], required: true },
    isSensitive: { type: Boolean, default: false },
    skippable: { type: Boolean, default: false },
  },
  { _id: false }
);

const generatedQuestionsSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    interests: {
      type: [String],
      default: [],
    },
    questions: {
      type: [generatedQuestionItemSchema],
      required: true,
      validate: [
        (val) => val.length === 5,
        'Each category must have exactly 5 questions (4 generated/seeded + Question 5)',
      ],
    },
    source: {
      type: String,
      enum: ['gemini', 'seed'],
      default: 'gemini',
    },
    model: {
      type: String,
      default: 'gemini-3.5-flash-lite',
    },
    promptVersion: {
      type: String,
      default: 'v1.0',
    },
  },
  {
    timestamps: true,
  }
);

generatedQuestionsSchema.index({ userId: 1, category: 1 });

const GeneratedQuestions = mongoose.model('GeneratedQuestions', generatedQuestionsSchema);

module.exports = GeneratedQuestions;
