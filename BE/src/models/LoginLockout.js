const mongoose = require('mongoose');

const loginLockoutSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  /** 0 = cửa sổ đầu (khóa 30s), 1 = cửa sổ thứ hai (khóa 3 phút), 2 = cửa sổ thứ ba (khóa email) */
  penaltyStage: {
    type: Number,
    default: 0,
    min: 0,
    max: 2,
  },
  failedAttempts: {
    type: Number,
    default: 0,
    min: 0,
  },
  lockedUntil: {
    type: Date,
    default: null,
  },
  emailLocked: {
    type: Boolean,
    default: false,
  },
  unlockTokenHash: {
    type: String,
    default: null,
    select: false,
  },
  unlockTokenExpires: {
    type: Date,
    default: null,
    select: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('LoginLockout', loginLockoutSchema);
