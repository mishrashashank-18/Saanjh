const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      index: true,
    },
    questionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    questionIndex: {
      type: Number,
      required: true,
    },
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
    text: {
      type: String,
      required: true,
    },
    options: [
      {
        label: { type: String, required: true },
        value: { type: String, required: true },
        _id: false,
      },
    ],
    isSensitive: {
      type: Boolean,
      default: false,
    },
    skippable: {
      type: Boolean,
      default: false,
    },
    version: {
      type: String,
      default: 'v1.0',
    },
  },
  {
    timestamps: true,
  }
);

questionBankSchema.index({ category: 1, questionIndex: 1 });

const QuestionBank = mongoose.model('QuestionBank', questionBankSchema);

module.exports = QuestionBank;
