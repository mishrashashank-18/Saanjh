const mongoose = require('mongoose');

const userInterestsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    categories: {
      type: [String],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
    },
    top3: {
      type: [String],
      default: [],
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

const UserInterests = mongoose.model('UserInterests', userInterestsSchema);

module.exports = UserInterests;
