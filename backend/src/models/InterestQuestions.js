const mongoose = require('mongoose');

const questionItemSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      required: true,
    },
    skippable: {
      type: Boolean,
      default: false,
    },
    isSensitive: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const interestQuestionsSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['seed', 'gemini'],
      default: 'seed',
    },
    questions: {
      type: [questionItemSchema],
      required: true,
      validate: [
        (val) => val.length === 2,
        'Each category must have exactly 2 questions',
      ],
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

const InterestQuestions = mongoose.model('InterestQuestions', interestQuestionsSchema);

module.exports = InterestQuestions;
