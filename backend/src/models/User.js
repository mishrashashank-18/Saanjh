const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
      default: function () {
        return this.fullName;
      },
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    passwordHash: {
      type: String,
      default: null,
      select: false,
    },
    googleId: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    onboardingStep: {
      type: String,
      enum: ['signup', 'verify', 'google_complete', 'profile', 'interests', 'interest_questions', 'done'],
      default: 'verify',
    },
    mobileNumber: {
      type: String,
      trim: true,
      default: '',
    },
    dateOfBirth: {
      type: Date,
      default: null,
      validate: {
        validator: function (value) {
          if (!value) return true;
          const cutoff = new Date();
          cutoff.setFullYear(cutoff.getFullYear() - 18);
          return value <= cutoff;
        },
        message: 'You must be at least 18 years old to join Saanjh',
      },
    },
    genderIdentity: {
      type: String,
      enum: {
        values: ['woman', 'man', 'non-binary', 'other', 'prefer-not-to-say', ''],
        message: '{VALUE} is not a supported gender option',
      },
      default: '',
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    education: {
      type: String,
      trim: true,
      default: '',
    },
    occupation: {
      type: String,
      trim: true,
      default: '',
    },
    languages: {
      type: [String],
      default: [],
    },
    relationshipStatus: {
      type: String,
      default: 'single',
    },
    interests: {
      type: [String],
      default: [],
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deactivated'],
      default: 'active',
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
    consent: {
      dataProcessing: { type: Boolean, default: true },
      version: { type: String, default: 'v1.0' },
      acceptedAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        ret.id = ret._id ? ret._id.toString() : undefined;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        ret.id = ret._id ? ret._id.toString() : undefined;
        return ret;
      },
    },
  }
);

userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainPassword, salt);
};

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
