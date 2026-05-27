const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  passwordHash: {
    type: String,
    default: null
  },
  course: {
    type: String,
    default: 'K18'
  },
  campus: {
    type: String,
    default: 'FPT University Da Nang'
  },
  orientation: {
    type: String,
    default: ''
  },
  interests: {
    type: [String],
    default: []
  },
  avatar: {
    type: String,
    default: ''
  },
  picture: {
    type: String,
    default: ''
  },
  googleId: {
    type: String,
    default: null
  },
  authProvider: {
    type: String,
    default: 'local'
  },
  courseChanged: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Helper: sanitize user object before sending to frontend
userSchema.statics.sanitizeUser = function (user) {
  if (!user) return null;
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.password;
  delete obj.otp;
  delete obj.resetOtp;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
