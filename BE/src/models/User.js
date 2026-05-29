const mongoose = require('mongoose');
require('./SchoolMember');
const {
  normalizeStudentId,
  deriveCourseFromStudentId,
} = require('../utils/studentId');
const { resolveUserRole, normalizeRole } = require('../utils/role');

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
    enum: ['student', 'staff', 'guest', 'ctsv', 'partner', 'admin', 'icpdp', 'club_manager'],
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
  googleCalendarRefreshToken: {
    type: String,
    default: null,
    select: false,
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
      const role = member.role ? member.role.toLowerCase() : 'guest';
      const studentId = normalizeStudentId(member.studentId || '');
      const course = role === 'student' ? deriveCourseFromStudentId(studentId) : null;
      return { role, studentId, course };
    }
  } catch (error) {
    console.error('Lß╗ùi khi tra cß╗⌐u SchoolMember:', error);
  }

  // Not in whitelist -> guest
  return { role: 'guest', studentId: '', course: null };
};

// Apply whitelist identity + derive course from MSSV (studentId)
userSchema.statics.applySchoolMemberData = function (user, { role, studentId, course }) {
  if (role) user.role = role;
  if (studentId) {
    user.studentId = normalizeStudentId(studentId);
    if (user.role === 'student') {
      const derivedCourse = deriveCourseFromStudentId(user.studentId);
      if (derivedCourse) user.course = derivedCourse;
    }
  } else if (course && user.role === 'student') {
    user.course = course;
  }
  return user;
};

userSchema.statics.syncCourseFromStudentId = function (user) {
  if (!user.studentId) return false;

  let changed = false;
  const normalized = normalizeStudentId(user.studentId);
  if (user.studentId !== normalized) {
    user.studentId = normalized;
    changed = true;
  }

  if (user.role !== 'student') return changed;

  const derived = deriveCourseFromStudentId(normalized);
  if (derived && user.course !== derived) {
    user.course = derived;
    changed = true;
  }
  return changed;
};

userSchema.statics.hasCustomAvatar = function (user) {
  const isCustom = (value) => typeof value === 'string' && value.startsWith('data:image/');
  return isCustom(user?.picture) || isCustom(user?.avatar);
};

// Ghi thß║│ng course/MSSV xuß╗æng MongoDB (kh├┤ng phß╗Ñ thuß╗Öc isModified/save hook)
userSchema.statics.syncAndPersistUserProfile = async function (user, extraSet = {}) {
  if (!user) return user;

  await this.ensureProfileSynced(user);

  const $set = { ...extraSet };
  const modifiedPaths = user.modifiedPaths();

  for (const path of modifiedPaths) {
    $set[path] = user.get(path);
  }

  if (user.studentId) {
    const normalized = normalizeStudentId(user.studentId);
    const derived = deriveCourseFromStudentId(normalized);
    user.studentId = normalized;
    $set.studentId = normalized;
    if (derived) {
      user.course = derived;
      $set.course = derived;
    }
  }

  if (Object.keys($set).length > 0) {
    await this.updateOne({ _id: user._id }, { $set });
    Object.assign(user, $set);
  }

  return user;
};

userSchema.statics.syncAllStudentCourses = async function () {
  const users = await this.find({
    studentId: { $exists: true, $nin: ['', null] },
  });

  let updated = 0;
  for (const user of users) {
    const normalized = normalizeStudentId(user.studentId);
    const derived = deriveCourseFromStudentId(normalized);
    if (!derived) continue;
    if (user.course === derived && user.studentId === normalized) continue;

    await this.updateOne(
      { _id: user._id },
      { $set: { course: derived, studentId: normalized } }
    );
    updated++;
  }

  if (updated > 0) {
    console.log(`─É├ú ─æß╗ông bß╗Ö kh├│a hß╗ìc cho ${updated} t├ái khoß║ún tß╗½ MSSV.`);
  }
};

const PROTECTED_ROLES = new Set([
  'admin',
  'ctsv',
  'partner',
  'icpdp',
  'club_manager',
  'staff',
]);

// Sync role/MSSV from whitelist + derive course from studentId
userSchema.statics.ensureProfileSynced = async function (user) {
  const detected = await this.detectRole(user.email);
  let changed = false;
  const currentRole = normalizeRole(user.role);

  if (PROTECTED_ROLES.has(currentRole)) {
    if (this.syncCourseFromStudentId(user)) {
      return true;
    }
    return false;
  }

  if ((!user.role || user.role === 'guest') && detected.role !== 'guest') {
    this.applySchoolMemberData(user, detected);
    return true;
  }

  if (detected.role === 'student' && detected.studentId) {
    const fromWhitelist = normalizeStudentId(detected.studentId);
    if (user.role !== 'student') {
      user.role = 'student';
      changed = true;
    }
    if (user.studentId !== fromWhitelist) {
      user.studentId = fromWhitelist;
      changed = true;
    }
  }

  if (this.syncCourseFromStudentId(user)) {
    changed = true;
  }

  return changed;
};

userSchema.pre('save', function () {
  this.role = normalizeRole(this.role || resolveUserRole(this));
  if (this.studentId) {
    this.studentId = normalizeStudentId(this.studentId);
  }
  if (this.role === 'student' && this.studentId) {
    const derived = deriveCourseFromStudentId(this.studentId);
    if (derived) {
      this.course = derived;
    }
  }
});

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
  delete obj.googleCalendarRefreshToken;
  delete obj.__v;
  obj.role = resolveUserRole(obj);
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
