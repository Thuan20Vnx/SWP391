const bcrypt = require('bcrypt');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendActivationEmail } = require('./email.service');
const queueActivationEmail = (email, fullname, password) => {
  sendActivationEmail(email, fullname, password).catch((err) => {
    console.error(`[Email] Gửi thông báo mật khẩu thất bại (${email}):`, err.message);
  });
};
const { deriveCourseFromStudentId, normalizeStudentId } = require('../utils/studentId');

const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_USER_PASSWORD || 'Fpt@2026';

const FE_ROLE_TO_DB = {
  ctsv: 'ctsv',
  icpdp: 'icpdp',
  partner: 'partner',
  club_organizer: 'club_manager',
  student: 'student',
  attendee: 'guest',
};

const DB_ROLE_TO_FE = {
  ...Object.fromEntries(Object.entries(FE_ROLE_TO_DB).map(([fe, db]) => [db, fe])),
  admin: 'admin',
  staff: 'ctsv',
  guest: 'attendee',
};

/** Chỉ guest (khách tham dự) và partner — không xóa SV, CTSV, ICPDP, CLB, admin... */
const ADMIN_DELETABLE_DB_ROLES = ['guest', 'partner'];

const isGoogleAccount = (user) =>
  Boolean(user.googleId) || String(user.authProvider || '').toLowerCase() === 'google';

const mapUserToAccount = (user) => ({
  id: String(user._id),
  name: user.fullname,
  email: user.email,
  role: DB_ROLE_TO_FE[user.role] || user.role,
  createdAt: user.createdAt ? user.createdAt.toISOString().slice(0, 10) : '',
  active: user.isActive !== false,
  mssv: user.studentId || '',
  phone: user.phone || '',
  unitInfo: user.orientation || '',
  course: user.course || '',
  campus: user.campus || 'FPT University Da Nang',
  isGoogle: isGoogleAccount(user),
  lockUntil:
    user.lockUntil && user.lockUntil.getTime() > Date.now()
      ? user.lockUntil.toISOString()
      : null,
});

const parseIdentifier = (identifier, role) => {
  const raw = String(identifier || '').trim();
  if (!raw) return { studentId: '', phone: '' };

  const digitsOnly = raw.replace(/\D/g, '');
  const looksLikePhone =
    /^(\+84|84|0)?[0-9]{9,10}$/.test(raw.replace(/\s/g, '')) ||
    (digitsOnly.length >= 9 && digitsOnly.length <= 11 && !/^[A-Za-z]/.test(raw));

  if (looksLikePhone) {
    const phone = raw.startsWith('0') ? raw : raw;
    return { studentId: role === 'student' ? '' : '', phone };
  }

  return { studentId: normalizeStudentId(raw), phone: '' };
};

const listAccounts = async ({ page = 1, limit = 10, role = 'all', search = '' }) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;

  const query = {};

  if (role && role !== 'all') {
    const dbRole = FE_ROLE_TO_DB[role];
    if (!dbRole) throw new AppError('Vai trò lọc không hợp lệ!', 400);
    query.role = dbRole;
  }

  const q = String(search || '').trim();
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { fullname: regex },
      { email: regex },
      { studentId: regex },
      { phone: regex },
    ];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
  ]);

  return {
    accounts: users.map(mapUserToAccount),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
};

const createAccount = async (payload) => {
  const {
    role: feRole,
    fullname,
    email,
    identifier,
    unitInfo,
    activateNow = true,
  } = payload;

  if (!feRole) throw new AppError('Vui lòng chọn vai trò hệ thống!', 400);
  if (!fullname?.trim()) throw new AppError('Họ tên / tên đơn vị không được để trống!', 400);
  if (!email?.trim()) throw new AppError('Email liên hệ không được để trống!', 400);

  const dbRole = FE_ROLE_TO_DB[feRole];
  if (!dbRole) throw new AppError('Vai trò hệ thống không hợp lệ!', 400);

  const emailKey = email.trim().toLowerCase();

  if (await User.findOne({ email: emailKey })) {
    throw new AppError('Email đã tồn tại trên hệ thống!', 400);
  }

  const { studentId, phone } = parseIdentifier(identifier, feRole);

  if (phone && (await User.findOne({ phone }))) {
    throw new AppError('Số điện thoại đã được sử dụng!', 400);
  }

  const userData = {
    fullname: fullname.trim(),
    email: emailKey,
    role: dbRole,
    studentId: studentId || '',
    phone: phone || '',
    orientation: unitInfo?.trim() || '',
    campus: 'FPT University Da Nang',
    course: 'K18',
    isActive: Boolean(activateNow),
    authProvider: 'local',
  };

  if (dbRole === 'student' && userData.studentId) {
    const derived = deriveCourseFromStudentId(userData.studentId);
    if (derived) userData.course = derived;
  }

  if (activateNow) {
    userData.passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  }

  const user = await User.create(userData);

  if (activateNow) {
    queueActivationEmail(user.email, user.fullname, DEFAULT_ADMIN_PASSWORD);
  }

  return {
    message: 'Tạo tài khoản thành công!',
    account: mapUserToAccount(user),
    defaultPassword: activateNow ? DEFAULT_ADMIN_PASSWORD : null,
  };
};

const updateAccountStatus = async (userId, isActive) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Không tìm thấy tài khoản!', 404);

  user.isActive = Boolean(isActive);

  if (isActive && !user.passwordHash) {
    user.passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    queueActivationEmail(user.email, user.fullname, DEFAULT_ADMIN_PASSWORD);
  }

  if (!isActive) {
    user.passwordHash = null;
  }

  await user.save();

  return {
    message: 'Đã cập nhật trạng thái tài khoản!',
    account: mapUserToAccount(user),
  };
};

const lockAccountTemporarily = async (userId, days) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Không tìm thấy tài khoản!', 404);

  if (user.role === 'admin') {
    throw new AppError('Không thể khóa tài khoản quản trị hệ thống!', 403);
  }

  const numDays = Number(days);
  if (!Number.isFinite(numDays) || numDays <= 0) {
    throw new AppError('Số ngày khóa phải là số nguyên dương!', 400);
  }
  if (numDays > 365) {
    throw new AppError('Chỉ được khóa tạm thời tối đa 365 ngày!', 400);
  }

  const wholeDays = Math.ceil(numDays);
  user.lockUntil = new Date(Date.now() + wholeDays * 24 * 60 * 60 * 1000);
  await user.save();

  return {
    message: `Đã khóa tài khoản tạm thời ${wholeDays} ngày.`,
    account: mapUserToAccount(user),
  };
};

const unlockAccount = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Không tìm thấy tài khoản!', 404);

  user.lockUntil = null;
  await user.save();

  return {
    message: 'Đã mở khóa tài khoản.',
    account: mapUserToAccount(user),
  };
};

// Khi một tài khoản club_manager không còn quản lý CLB nào nữa thì đưa về sinh viên
// (không đưa về khách/guest).
const demoteFormerManagerToStudent = async (managerId) => {
  const Club = require('../models/Club');
  const former = await User.findById(managerId);
  if (!former || former.role !== 'club_manager') return;
  const remaining = await Club.countDocuments({ managedBy: former._id });
  if (remaining > 0) return;
  former.role = 'student';
  await former.save();
  const SchoolMember = require('../models/SchoolMember');
  await SchoolMember.updateOne({ email: former.email }, { $set: { role: 'student' } });
};

const enrichWithManagedClub = async (account, user) => {
  if (user.role !== 'club_manager') return account;
  const Club = require('../models/Club');
  const club = await Club.findOne({ managedBy: user._id }).select('name slug').lean();
  return {
    ...account,
    managedClubId: club ? String(club._id) : '',
    managedClubName: club ? club.name : '',
  };
};

const getAccount = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Không tìm thấy tài khoản!', 404);
  const account = await enrichWithManagedClub(mapUserToAccount(user), user);
  return { account };
};

const listAssignableClubs = async () => {
  const Club = require('../models/Club');
  const clubs = await Club.find({}).select('name slug managedBy').sort({ name: 1 }).lean();
  return {
    clubs: clubs.map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug || '',
      hasManager: Boolean(c.managedBy),
    })),
  };
};

// Chấm đỏ cho Admin: chỉ tính các đơn ĐÃ qua duyệt cấp 1 và đang chờ Admin
// (club event: pending_admin sau khi IC-PDP duyệt; partner: pending_admin sau khi CTSV duyệt;
// timeline CLB: pending_admin). Không tính lúc mới nộp (pending_icpdp / pending_ctsv).
const getPendingAdminSummary = async () => {
  const Event = require('../models/Event');
  const Partner = require('../models/Partner');
  const ClubSemesterTimeline = require('../models/ClubSemesterTimeline');
  const ClubRegistration = require('../models/ClubRegistration');
  const [eventPending, partnerPending, timelinePending, clubRegPending, settlementRequested] =
    await Promise.all([
      Event.countDocuments({ status: 'pending_admin', isHidden: { $ne: true } }),
      Partner.countDocuments({ status: 'pending_admin' }),
      ClubSemesterTimeline.countDocuments({
        $or: [{ status: 'pending_admin' }, { 'changeRequest.status': 'pending_admin' }],
      }),
      ClubRegistration.countDocuments({ status: 'pending_admin' }),
      Event.countDocuments({
        source: 'partner',
        'settlement.status': 'requested',
        isDeleted: { $ne: true },
      }),
    ]);
  return {
    byCategory: {
      events: eventPending + partnerPending,
      timeline: timelinePending,
      clubRegistrations: clubRegPending,
      partnerSettlements: settlementRequested,
    },
  };
};

const resetAccountPassword = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Không tìm thấy tài khoản!', 404);
  if (user.role === 'admin') {
    throw new AppError('Không thể đặt lại mật khẩu tài khoản quản trị hệ thống!', 403);
  }
  user.passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  user.isActive = true;
  await user.save();
  queueActivationEmail(user.email, user.fullname, DEFAULT_ADMIN_PASSWORD);
  return {
    message: `Đã đặt lại mật khẩu về mặc định và gửi email cho ${user.email}.`,
    account: mapUserToAccount(user),
  };
};

const updateAccount = async (userId, payload) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Không tìm thấy tài khoản!', 404);

  const {
    fullname,
    email,
    studentId: rawStudentId,
    phone: rawPhone,
    identifier,
    unitInfo,
    course,
    campus,
    role: feRole,
    isActive,
    managedClubId,
  } = payload;

  if (!fullname?.trim()) throw new AppError('Họ tên / tên đơn vị không được để trống!', 400);

  const isTargetAdmin = user.role === 'admin';

  if (feRole !== undefined && feRole !== null && String(feRole).trim() !== '') {
    if (isTargetAdmin) {
      throw new AppError('Không thể thay đổi vai trò tài khoản quản trị!', 403);
    }
    const dbRole = FE_ROLE_TO_DB[String(feRole).trim()];
    if (!dbRole) throw new AppError('Vai trò hệ thống không hợp lệ!', 400);
    if (dbRole === 'admin') throw new AppError('Không thể gán vai trò quản trị qua giao diện này!', 403);
    user.role = dbRole;
    user.markModified('role');
  }

  if (email !== undefined) {
    if (isTargetAdmin) {
      throw new AppError('Không thể thay đổi email tài khoản quản trị!', 403);
    }
    const emailKey = String(email || '').trim().toLowerCase();
    if (!emailKey) throw new AppError('Email liên hệ không được để trống!', 400);
    const emailOwner = await User.findOne({ email: emailKey, _id: { $ne: user._id } });
    if (emailOwner) throw new AppError('Email đã tồn tại trên hệ thống!', 400);
    user.email = emailKey;
  }

  const feRoleKey = DB_ROLE_TO_FE[user.role] || user.role;
  let studentId = rawStudentId !== undefined
    ? normalizeStudentId(String(rawStudentId || '').trim())
    : undefined;
  let phone = rawPhone !== undefined ? String(rawPhone || '').trim() : undefined;

  if (identifier !== undefined && studentId === undefined && phone === undefined) {
    const parsed = parseIdentifier(identifier, feRoleKey);
    studentId = parsed.studentId;
    phone = parsed.phone;
  }

  if (phone !== undefined) {
    if (phone) {
      const phoneOwner = await User.findOne({ phone, _id: { $ne: user._id } });
      if (phoneOwner) throw new AppError('Số điện thoại đã được sử dụng!', 400);
      user.phone = phone;
    } else {
      user.set('phone', undefined);
    }
  }

  if (studentId !== undefined) {
    if (studentId) {
      const idOwner = await User.findOne({ studentId, _id: { $ne: user._id } });
      if (idOwner) throw new AppError('Mã số sinh viên đã được sử dụng!', 400);
      user.studentId = studentId;
    } else {
      user.studentId = '';
    }
  }

  if (user.role === 'student' && user.studentId) {
    const derived = deriveCourseFromStudentId(user.studentId);
    if (derived && course === undefined) user.course = derived;
  }

  if (course !== undefined) user.course = String(course || '').trim() || user.course;
  if (campus !== undefined) user.campus = String(campus || '').trim() || user.campus;
  if (unitInfo !== undefined) user.orientation = String(unitInfo || '').trim();

  user.fullname = fullname.trim();

  if (isActive !== undefined) {
    const nextActive = Boolean(isActive);
    if (nextActive && !user.passwordHash) {
      user.passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      queueActivationEmail(user.email, user.fullname, DEFAULT_ADMIN_PASSWORD);
    }
    if (!nextActive) user.passwordHash = null;
    user.isActive = nextActive;
  }

  await user.save();

  // Gán / gỡ CLB cho tài khoản Ban tổ chức CLB (club_manager).
  if (user.role === 'club_manager') {
    const Club = require('../models/Club');
    const wantClubId = managedClubId !== undefined ? String(managedClubId || '').trim() : undefined;
    if (wantClubId !== undefined) {
      // Gỡ user khỏi mọi CLB khác đang do user này quản lý (mỗi tài khoản quản 1 CLB).
      await Club.updateMany(
        { managedBy: user._id, ...(wantClubId ? { _id: { $ne: wantClubId } } : {}) },
        { $set: { managedBy: null } },
      );
      if (wantClubId) {
        const club = await Club.findById(wantClubId);
        if (!club) throw new AppError('Không tìm thấy CLB được chọn!', 404);
        const prevManagerId = club.managedBy;
        club.managedBy = user._id;
        if (!String(club.president || '').trim()) club.president = user.fullname;
        await club.save();
        // Người quản lý cũ bị thay: nếu không còn quản CLB nào thì trả về sinh viên
        // (không phải khách), theo đúng quy tắc chuyển nhượng CLB.
        if (prevManagerId && String(prevManagerId) !== String(user._id)) {
          await demoteFormerManagerToStudent(prevManagerId);
        }
      }
    }
  } else {
    // Rời vai trò club_manager → gỡ quyền quản lý các CLB (nếu có).
    const Club = require('../models/Club');
    await Club.updateMany({ managedBy: user._id }, { $set: { managedBy: null } });
  }

  const account = await enrichWithManagedClub(mapUserToAccount(user), user);
  return {
    message: 'Đã cập nhật thông tin tài khoản!',
    account,
  };
};

const deleteAccount = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Không tìm thấy tài khoản!', 404);

  if (user.role === 'admin') {
    throw new AppError('Không thể xóa tài khoản quản trị hệ thống!', 403);
  }

  if (!ADMIN_DELETABLE_DB_ROLES.includes(user.role)) {
    throw new AppError(
      'Không được xóa tài khoản sinh viên hoặc người dùng FPT. Chỉ được xóa khách tham gia hoặc đối tác bên ngoài.',
      403,
    );
  }

  await User.findByIdAndDelete(userId);

  return {
    message: 'Đã xóa tài khoản thành công!',
    id: String(userId),
  };
};

module.exports = {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  updateAccountStatus,
  lockAccountTemporarily,
  unlockAccount,
  deleteAccount,
  resetAccountPassword,
  listAssignableClubs,
  getPendingAdminSummary,
  DEFAULT_ADMIN_PASSWORD,
};
