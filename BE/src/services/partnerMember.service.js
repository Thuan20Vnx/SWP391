const bcrypt = require('bcrypt');
const PartnerMember = require('../models/PartnerMember');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendActivationEmail } = require('./email.service');

const DEFAULT_PARTNER_PASSWORD = process.env.ADMIN_DEFAULT_USER_PASSWORD || 'Fpt@2026';

const STAFF_ROLES = new Set(['admin', 'ctsv', 'icpdp', 'club_manager', 'staff']);

const formatMember = (member, user = null) => {
  const m = member.toObject ? member.toObject() : member;
  const u = user || null;
  return {
    id: String(m._id),
    partnerId: String(m.partnerId),
    email: m.email,
    fullname: m.fullname || u?.fullname || '',
    phone: m.phone || u?.phone || '',
    title: m.title || '',
    isPrimary: Boolean(m.isPrimary),
    isActive: m.isActive !== false,
    userId: m.userId ? String(m.userId) : u?._id ? String(u._id) : '',
    hasAccount: Boolean(m.userId || u),
    accountActive: u ? u.isActive !== false : false,
    avatar: u?.picture || u?.avatar || '',
    createdAt: m.createdAt,
  };
};

const loadUsersForMembers = async (members) => {
  const userIds = members.map((m) => m.userId).filter(Boolean);
  const emails = members.map((m) => m.email).filter(Boolean);
  const usersById = new Map();
  const usersByEmail = new Map();

  if (userIds.length) {
    const byId = await User.find({ _id: { $in: userIds } }).lean();
    byId.forEach((u) => {
      usersById.set(String(u._id), u);
      usersByEmail.set(u.email, u);
    });
  }

  const missingEmails = emails.filter((e) => !usersByEmail.has(e));
  if (missingEmails.length) {
    const byEmail = await User.find({ email: { $in: missingEmails } }).lean();
    byEmail.forEach((u) => usersByEmail.set(u.email, u));
  }

  return { usersById, usersByEmail };
};

const ensurePrimaryPartnerMember = async (partner) => {
  const partnerId = partner._id;
  const email = String(partner.email || '').trim().toLowerCase();
  if (!email) return;

  let primary = await PartnerMember.findOne({ partnerId, isPrimary: true });
  if (!primary) {
    primary = await PartnerMember.findOne({ partnerId, email });
  }

  const payload = {
    partnerId,
    email,
    fullname: String(partner.representative || '').trim(),
    phone: String(partner.phone || '').trim(),
    title: String(partner.representativeTitle || '').trim(),
    isPrimary: true,
    isActive: true,
  };

  const user = await User.findOne({ email }).lean();
  if (user) payload.userId = user._id;

  if (!primary) {
    await PartnerMember.create(payload);
    return;
  }

  let changed = false;
  if (!primary.isPrimary) {
    primary.isPrimary = true;
    changed = true;
  }
  if (!primary.fullname && payload.fullname) {
    primary.fullname = payload.fullname;
    changed = true;
  }
  if (!primary.title && payload.title) {
    primary.title = payload.title;
    changed = true;
  }
  if (!primary.userId && payload.userId) {
    primary.userId = payload.userId;
    changed = true;
  }
  if (changed) await primary.save();
};

const listPartnerMembers = async (partnerId) => {
  const members = await PartnerMember.find({ partnerId }).sort({ isPrimary: -1, createdAt: 1 });
  const { usersById, usersByEmail } = await loadUsersForMembers(members);
  return members.map((m) => {
    const user =
      (m.userId && usersById.get(String(m.userId))) || usersByEmail.get(m.email) || null;
    return formatMember(m, user);
  });
};

const assertCanManagePartner = (partner) => {
  if (!partner) throw new AppError('Không tìm thấy đối tác!', 404);
  if (partner.status === 'rejected') {
    throw new AppError('Không thể quản lý tài khoản cho đơn đã bị từ chối.', 400);
  }
};

const addPartnerMember = async (partner, body, addedByEmail = '') => {
  assertCanManagePartner(partner);

  const email = String(body.email || '').trim().toLowerCase();
  const fullname = String(body.fullname || '').trim();
  const phone = String(body.phone || '').trim();
  const title = String(body.title || '').trim();
  const activateNow = body.activateNow !== false;

  if (!email) throw new AppError('Email tài khoản là bắt buộc!', 400);
  if (!fullname) throw new AppError('Họ tên người quản lý là bắt buộc!', 400);

  const existingMember = await PartnerMember.findOne({ partnerId: partner._id, email });
  if (existingMember && existingMember.isActive) {
    throw new AppError('Email này đã được gắn với công ty đối tác.', 400);
  }

  let user = await User.findOne({ email });
  let issuedPassword = false;
  if (user) {
    if (STAFF_ROLES.has(user.role) || user.role === 'student') {
      throw new AppError(
        'Email đã thuộc vai trò khác trên hệ thống. Vui lòng dùng email khác.',
        400,
      );
    }
    if (user.role !== 'partner') {
      user.role = 'partner';
    }
    if (!user.fullname && fullname) user.fullname = fullname;
    if (!user.phone && phone) user.phone = phone;
    if (activateNow && !user.passwordHash) {
      user.passwordHash = await bcrypt.hash(DEFAULT_PARTNER_PASSWORD, 10);
      issuedPassword = true;
      sendActivationEmail(user.email, user.fullname, DEFAULT_PARTNER_PASSWORD).catch(() => {});
    }
    if (activateNow) user.isActive = true;
    await user.save();
  } else {
    user = await User.create({
      fullname,
      email,
      phone: phone || '',
      role: 'partner',
      campus: 'FPT University Da Nang',
      course: 'K18',
      isActive: activateNow,
      authProvider: 'local',
      passwordHash: activateNow ? await bcrypt.hash(DEFAULT_PARTNER_PASSWORD, 10) : null,
    });
    if (activateNow) {
      issuedPassword = true;
      sendActivationEmail(user.email, user.fullname, DEFAULT_PARTNER_PASSWORD).catch(() => {});
    }
  }

  let member;
  if (existingMember) {
    existingMember.fullname = fullname;
    existingMember.phone = phone;
    existingMember.title = title;
    existingMember.userId = user._id;
    existingMember.isActive = true;
    existingMember.addedByEmail = addedByEmail;
    await existingMember.save();
    member = existingMember;
  } else {
    member = await PartnerMember.create({
      partnerId: partner._id,
      email,
      fullname,
      phone,
      title,
      isPrimary: false,
      userId: user._id,
      isActive: true,
      addedByEmail,
    });
  }

  return {
    member: formatMember(member, user),
    defaultPassword: issuedPassword ? DEFAULT_PARTNER_PASSWORD : null,
  };
};

const deactivatePartnerMember = async (partner, memberId) => {
  assertCanManagePartner(partner);
  const member = await PartnerMember.findOne({ _id: memberId, partnerId: partner._id });
  if (!member) throw new AppError('Không tìm thấy tài khoản quản lý!', 404);
  if (member.isPrimary) {
    throw new AppError('Không thể vô hiệu hóa người đăng ký chính.', 400);
  }
  member.isActive = false;
  await member.save();
  return formatMember(member);
};

module.exports = {
  ensurePrimaryPartnerMember,
  listPartnerMembers,
  addPartnerMember,
  deactivatePartnerMember,
  formatMember,
  DEFAULT_PARTNER_PASSWORD,
};
