const mongoose = require('mongoose');
const SchoolMember = require('./SchoolMember');

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
  // ======= NEW: Role & Student ID for FPT recognition =======
  role: {
    type: String,
    enum: ['student', 'staff', 'guest', 'ctsv'],
    default: 'guest'
  },
  studentId: {
    type: String,
    default: '',
    trim: true
  },
  // ===========================================================
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

// ============================================================
// Static: Detect role & studentId from SchoolMember Whitelist
// ============================================================
userSchema.statics.detectRole = async function (email) {
  if (!email) return { role: 'guest', studentId: '' };

  const normalizedEmail = email.trim().toLowerCase();
  
  try {
    const SchoolMember = mongoose.model('SchoolMember');
    // Use regex for case-insensitive search in case Admin typed capital letters in Compass
    const member = await SchoolMember.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } 
    });
    
    if (member) {
      return { 
        role: member.role ? member.role.toLowerCase() : 'guest', 
        studentId: member.studentId || '' 
      };
    }
  } catch (error) {
    console.error('Lỗi khi tra cứu SchoolMember:', error);
  }

  // Not in whitelist -> guest
  return { role: 'guest', studentId: '' };
};

// ============================================================
// Static: Sanitize user object before sending to frontend
// ============================================================
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
