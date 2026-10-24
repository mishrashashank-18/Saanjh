const mongoose = require('mongoose');

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
    },
    q1: {
      type: String,
      default: '',
    },
    q2: {
      type: String,
      default: '',
    },
    sharePreference: {
      type: String,
      enum: ['must-have', 'nice-to-have', 'doesnt-matter', ''],
      default: '',
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

interestAnswersSchema.index({ userId: 1, category: 1 }, { unique: true });

const InterestAnswers = mongoose.model('InterestAnswers', interestAnswersSchema);

module.exports = InterestAnswers;
