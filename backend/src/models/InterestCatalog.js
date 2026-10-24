const mongoose = require('mongoose');

const interestCatalogSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    categoryLabel: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
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

const InterestCatalog = mongoose.model('InterestCatalog', interestCatalogSchema);

module.exports = InterestCatalog;
