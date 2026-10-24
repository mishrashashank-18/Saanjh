const mongoose = require('mongoose');

const responseEventsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stage: {
      type: String,
      required: true,
      index: true,
    },
    field: {
      type: String,
      required: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    source: {
      type: String,
      default: 'user_input',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

responseEventsSchema.index({ userId: 1, stage: 1, createdAt: -1 });

const ResponseEvents = mongoose.model('ResponseEvents', responseEventsSchema);

module.exports = ResponseEvents;
