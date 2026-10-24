const mongoose = require('mongoose');

const optionSnapshotSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const interestAnswersSchema = new mongoose.Schema(
  {
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
    questionIndex: {
      type: Number,
      required: true,
    },
    questionId: {
      type: String,
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
    questionText: {
      type: String,
      required: true,
    },
    options: {
      type: [optionSnapshotSchema],
      required: true,
    },
    selectedValue: {
      type: String,
      required: true,
    },
    interestsContext: {
      type: [String],
      default: [],
    },
    generatedBy: {
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
    sharePreference: {
      type: String,
      enum: ['must-have', 'nice-to-have', 'doesnt-matter', ''],
      default: '',
    },
    skipped: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    answeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret.__v;
        return ret;
      },
    },
  }
);

interestAnswersSchema.index({ userId: 1, category: 1, questionIndex: 1 }, { unique: true });
interestAnswersSchema.index({ userId: 1, isArchived: 1 });

const InterestAnswers = mongoose.model('InterestAnswers', interestAnswersSchema);

module.exports = InterestAnswers;
