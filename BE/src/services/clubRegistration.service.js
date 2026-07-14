const mongoose = require('mongoose');
const Club = require('../models/Club');
const ClubRegistration = require('../models/ClubRegistration');
const User = require('../models/User');
const SchoolMember = require('../models/SchoolMember');
const { formatClubRegistration } = require('../utils/clubRegistrationFormat');
const emailService = require('./email.service');
const { APP_URL } = require('../config/env');

// Gửi mail khi đơn thành lập CLB được Admin duyệt: cho chủ nhiệm + cho IC-PDP (chạy nền).
const notifyClubRegistrationApproved = async (registration, club) => {
  const clubUrl = club?.slug ? `${APP_URL}/clubs/${club.slug}` : `${APP_URL}/cau-lac-bo`;
  const clubName = registration.clubName || club?.name || 'CLB';

  const tasks = [];

  if (registration.presidentEmail) {
    tasks.push(
      emailService.sendStatusUpdateEmail({
        to: registration.presidentEmail,
        title: `CLB "${clubName}" đã được duyệt`,
        body: `Chúc mừng! Đơn thành lập CLB "${clubName}" đã được Admin phê duyệt và bạn được giao làm Chủ nhiệm CLB. Bạn có thể bắt đầu quản lý CLB, tạo timeline và đề xuất sự kiện trên F-Events.`,
        ctaUrl: clubUrl,
        ctaLabel: 'Xem CLB',
      })
    );
  }

  // IC-PDP: người tạo đơn (nếu là IC-PDP) và toàn bộ tài khoản IC-PDP để nắm tình trạng.
  const icpdpUsers = await User.find({ role: 'icpdp' }).select('email').lean();
  const icpdpEmails = new Set(
    icpdpUsers.map((u) => String(u.email || '').toLowerCase()).filter(Boolean)
  );
  if (registration.submittedByEmail) icpdpEmails.add(String(registration.submittedByEmail).toLowerCase());
  icpdpEmails.delete(String(registration.presidentEmail || '').toLowerCase());
  icpdpEmails.forEach((to) => {
    tasks.push(
      emailService.sendStatusUpdateEmail({
        to,
        title: `Đơn thành lập CLB "${clubName}" đã được duyệt`,
        body: `Đơn thành lập CLB "${clubName}" (chủ nhiệm: ${registration.presidentEmail || '—'}) đã được Admin phê duyệt. CLB đã được tạo và kích hoạt trên hệ thống.`,
        ctaUrl: clubUrl,
        ctaLabel: 'Xem CLB',
      })
    );
  });

  await Promise.allSettled(tasks);
};

// Gửi mail cho IC-PDP khi Admin TỪ CHỐI đơn thành lập CLB (chạy nền).
const notifyClubRegistrationRejectedToIcpdp = async (registration, reason) => {
  const clubName = registration.clubName || 'CLB';
  const icpdpUsers = await User.find({ role: 'icpdp' }).select('email').lean();
  const emails = new Set(
    icpdpUsers.map((u) => String(u.email || '').toLowerCase()).filter(Boolean)
  );
  if (registration.submittedByEmail) emails.add(String(registration.submittedByEmail).toLowerCase());
  if (emails.size === 0) return;

  const tasks = [];
  emails.forEach((to) => {
    tasks.push(
      emailService.sendStatusUpdateEmail({
        to,
        title: `Đơn thành lập CLB "${clubName}" bị từ chối`,
        body: `Đơn thành lập CLB "${clubName}" (chủ nhiệm: ${registration.presidentEmail || '—'}) đã bị Admin từ chối.\nLý do: ${reason || '—'}`,
        ctaUrl: `${APP_URL}/icpdp/club-registrations`,
        ctaLabel: 'Xem đơn CLB',
      })
    );
  });
  await Promise.allSettled(tasks);
};

const slugify = (name) =>
  String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'club';

const ensureUniqueSlug = async (base) => {
  let slug = base;
  let n = 0;
  while (await Club.findOne({ slug })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
};

const defaultStatusFilterForRole = (viewerRole) => {
  if (viewerRole === 'admin') {
    return { status: { $in: ['pending_admin'] } };
  }
  return { status: { $in: ['pending_icpdp', 'revision'] } };
};

const listRegistrations = async ({ status, q, limit = 100, viewerRole } = {}) => {
  const filter = {};
  if (status && status !== 'all') {
    filter.status = status;
  } else if (!status) {
    Object.assign(filter, defaultStatusFilterForRole(viewerRole));
  }
  if (q && String(q).trim()) {
    const re = new RegExp(String(q).trim(), 'i');
    filter.$or = [{ clubName: re }, { president: re }, { presidentEmail: re }];
  }
  const rows = await ClubRegistration.find(filter).sort({ createdAt: -1 }).limit(limit);
  return rows.map(formatClubRegistration);
};

const getRegistrationById = async (id) => {
  const row = await ClubRegistration.findById(id);
  if (!row) {
    const err = new Error('Không tìm thấy đơn đăng ký CLB!');
    err.statusCode = 404;
    throw err;
  }
  return formatClubRegistration(row);
};

const createRegistration = async (payload, submitter = {}) => {
  const categories = Club.CATEGORIES || [];
  if (!categories.includes(payload.category)) {
    const err = new Error('Lĩnh vực CLB không hợp lệ!');
    err.statusCode = 400;
    throw err;
  }
  const email = String(submitter.email || payload.presidentEmail || '').trim().toLowerCase();
  const registration = await ClubRegistration.create({
    clubName: payload.clubName,
    proposedSlug: payload.proposedSlug || '',
    category: payload.category,
    description: payload.description,
    president: payload.president,
    presidentEmail: payload.presidentEmail,
    contactEmail: payload.contactEmail || payload.presidentEmail,
    phone: payload.phone || '',
    facebook: payload.facebook || '',
    website: payload.website || '',
    activityField: payload.activityField || '',
    scale: payload.scale || '',
    logoText: payload.logoText || '',
    logoColor: payload.logoColor || '#7c3aed',
    coverImage: payload.coverImage || '',
    submittedByEmail: email,
    submittedByUser: submitter.userId || null,
    status: 'pending_icpdp',
  });
  return formatClubRegistration(registration);
};

const createClubFromRegistration = async (registration, session) => {
  const baseSlug = slugify(registration.proposedSlug || registration.clubName);
  const slug = await ensureUniqueSlug(baseSlug);
  const managerEmail = registration.presidentEmail;
  let managerUser = await User.findOne({ email: managerEmail }).session(session);

  const [club] = await Club.create(
    [
      {
        slug,
        name: registration.clubName,
        category: registration.category,
        description: registration.description,
        president: registration.president,
        email: registration.contactEmail || registration.presidentEmail,
        phone: registration.phone,
        facebook: registration.facebook,
        website: registration.website,
        activityField: registration.activityField,
        scale: registration.scale,
        logoText: registration.logoText || registration.clubName.slice(0, 8),
        logoColor: registration.logoColor,
        coverImage: registration.coverImage,
        status: 'active',
        joinMode: 'approval',
        managedBy: managerUser?._id || registration.submittedByUser || null,
      },
    ],
    { session }
  );

  if (managerEmail) {
    await SchoolMember.updateOne(
      { email: managerEmail },
      { $set: { role: 'club_manager' } },
      { upsert: true, session }
    );
    if (managerUser) {
      managerUser.role = 'club_manager';
      await managerUser.save({ session });
    }
  }

  registration.clubId = club._id;
  registration.clubSlug = club.slug;
  return club;
};

/** IC-PDP rà soát và chuyển Admin phê duyệt cuối */
const icpdpForwardToAdmin = async (id, { note, reviewerEmail } = {}) => {
  const registration = await ClubRegistration.findById(id);
  if (!registration) {
    const err = new Error('Không tìm thấy đơn đăng ký CLB!');
    err.statusCode = 404;
    throw err;
  }
  if (!['pending_icpdp', 'revision'].includes(registration.status)) {
    const err = new Error('Đơn không ở trạng thái chờ IC-PDP xử lý!');
    err.statusCode = 400;
    throw err;
  }

  registration.status = 'pending_admin';
  registration.icpdpNote = String(note || '').trim();
  registration.reviewedByEmail = reviewerEmail || '';
  registration.reviewedAt = new Date();
  await registration.save();

  return formatClubRegistration(registration);
};

/** Admin phê duyệt cuối — tạo CLB */
const adminApproveRegistration = async (id, { note, reviewerEmail } = {}) => {
  const registration = await ClubRegistration.findById(id);
  if (!registration) {
    const err = new Error('Không tìm thấy đơn đăng ký CLB!');
    err.statusCode = 404;
    throw err;
  }
  if (registration.status !== 'pending_admin') {
    const err = new Error('Đơn không ở trạng thái chờ Admin duyệt!');
    err.statusCode = 400;
    throw err;
  }

  const session = await mongoose.startSession();
  let club;
  try {
    await session.withTransaction(async () => {
      club = await createClubFromRegistration(registration, session);
      registration.status = 'approved';
      registration.adminNote = String(note || '').trim();
      registration.reviewedByEmail = reviewerEmail || '';
      registration.reviewedAt = new Date();
      await registration.save({ session });
    });
  } finally {
    session.endSession();
  }

  // Gửi mail thông báo đã duyệt (không chặn phản hồi nếu email lỗi).
  notifyClubRegistrationApproved(registration, club).catch((err) =>
    console.warn('[club-registration] approval email failed:', err.message)
  );

  return {
    registration: formatClubRegistration(registration),
    club: {
      id: club.slug,
      _id: String(club._id),
      name: club.name,
      slug: club.slug,
    },
  };
};

const rejectRegistration = async (id, { reason, reviewerEmail, reviewerRole } = {}) => {
  const registration = await ClubRegistration.findById(id);
  if (!registration) {
    const err = new Error('Không tìm thấy đơn đăng ký CLB!');
    err.statusCode = 404;
    throw err;
  }

  const allowedByRole =
    reviewerRole === 'admin'
      ? ['pending_admin']
      : ['pending_icpdp', 'revision'];

  if (!allowedByRole.includes(registration.status)) {
    const err = new Error('Đơn không thể từ chối ở trạng thái hiện tại!');
    err.statusCode = 400;
    throw err;
  }

  const trimmed = String(reason || '').trim();
  if (!trimmed) {
    const err = new Error('Vui lòng nhập lý do từ chối!');
    err.statusCode = 400;
    throw err;
  }
  registration.status = 'rejected';
  registration.rejectionReason = trimmed;
  registration.reviewedByEmail = reviewerEmail || '';
  registration.reviewedAt = new Date();
  await registration.save();

  // Admin từ chối → báo mail cho IC-PDP về tình trạng (không chặn phản hồi).
  if (reviewerRole === 'admin') {
    notifyClubRegistrationRejectedToIcpdp(registration, trimmed).catch((err) =>
      console.warn('[club-registration] reject email failed:', err.message)
    );
  }

  return formatClubRegistration(registration);
};

const requestRevision = async (id, { note, reviewerEmail } = {}) => {
  const registration = await ClubRegistration.findById(id);
  if (!registration) {
    const err = new Error('Không tìm thấy đơn đăng ký CLB!');
    err.statusCode = 404;
    throw err;
  }
  if (!['pending_icpdp', 'revision'].includes(registration.status)) {
    const err = new Error('Chỉ có thể yêu cầu chỉnh sửa đơn đang chờ IC-PDP!');
    err.statusCode = 400;
    throw err;
  }
  const trimmed = String(note || '').trim();
  if (!trimmed) {
    const err = new Error('Vui lòng nhập ghi chú yêu cầu chỉnh sửa!');
    err.statusCode = 400;
    throw err;
  }
  registration.status = 'revision';
  registration.icpdpNote = trimmed;
  registration.reviewedByEmail = reviewerEmail || '';
  registration.reviewedAt = new Date();
  await registration.save();
  return formatClubRegistration(registration);
};

/** IC-PDP sửa lại đơn bị từ chối/cần chỉnh sửa và gửi lại cho Admin. */
const icpdpResubmitRegistration = async (id, payload = {}, creatorEmail) => {
  const registration = await ClubRegistration.findById(id);
  if (!registration) {
    const err = new Error('Không tìm thấy đơn đăng ký CLB!');
    err.statusCode = 404;
    throw err;
  }
  if (!['rejected', 'revision', 'cancelled'].includes(registration.status)) {
    const err = new Error('Chỉ có thể sửa & gửi lại đơn đã bị từ chối, cần chỉnh sửa hoặc đã hủy!');
    err.statusCode = 400;
    throw err;
  }

  if (payload.clubName !== undefined) {
    const clubName = String(payload.clubName || '').trim();
    if (!clubName) {
      const err = new Error('Tên CLB là bắt buộc!');
      err.statusCode = 400;
      throw err;
    }
    registration.clubName = clubName;
  }
  if (payload.category !== undefined) {
    const categories = Club.CATEGORIES || [];
    if (!categories.includes(payload.category)) {
      const err = new Error('Lĩnh vực CLB không hợp lệ!');
      err.statusCode = 400;
      throw err;
    }
    registration.category = payload.category;
  }

  // Đổi email chủ nhiệm → vẫn phải là tài khoản sinh viên.
  if (payload.presidentEmail !== undefined) {
    const presidentEmail = String(payload.presidentEmail || '').trim().toLowerCase();
    if (!presidentEmail) {
      const err = new Error('Email chủ nhiệm là bắt buộc!');
      err.statusCode = 400;
      throw err;
    }
    const presidentUser = await User.findOne({ email: presidentEmail }).select('role fullname');
    if (!presidentUser) {
      const err = new Error('Email chủ nhiệm phải là tài khoản đã có trong hệ thống.');
      err.statusCode = 400;
      throw err;
    }
    if (presidentUser.role !== 'student') {
      const err = new Error('Chỉ có thể chọn tài khoản sinh viên làm chủ nhiệm CLB.');
      err.statusCode = 400;
      throw err;
    }
    registration.presidentEmail = presidentEmail;
    registration.contactEmail = payload.contactEmail || presidentEmail;
    if (!String(payload.president || '').trim() && !registration.president) {
      registration.president = presidentUser.fullname || 'Chủ nhiệm CLB';
    }
  }

  if (payload.president !== undefined) {
    registration.president = String(payload.president || '').trim() || registration.president;
  }
  if (payload.phone !== undefined) registration.phone = String(payload.phone || '').trim();
  if (payload.description !== undefined) {
    registration.description = String(payload.description || '').trim() || registration.description;
  }

  registration.status = 'pending_admin';
  registration.rejectionReason = '';
  registration.adminNote = '';
  registration.icpdpNote = 'Đơn được IC-PDP sửa và gửi lại.';
  registration.reviewedByEmail = String(creatorEmail || '').trim().toLowerCase();
  registration.reviewedAt = new Date();
  await registration.save();
  return formatClubRegistration(registration);
};

/** IC-PDP hủy gửi đơn đang chờ Admin duyệt. */
const icpdpCancelRegistration = async (id) => {
  const registration = await ClubRegistration.findById(id);
  if (!registration) {
    const err = new Error('Không tìm thấy đơn đăng ký CLB!');
    err.statusCode = 404;
    throw err;
  }
  if (registration.status !== 'pending_admin') {
    const err = new Error('Chỉ có thể hủy đơn đang chờ Admin duyệt!');
    err.statusCode = 400;
    throw err;
  }
  registration.status = 'cancelled';
  registration.reviewedAt = new Date();
  await registration.save();
  return formatClubRegistration(registration);
};

const countPendingForRole = (viewerRole) => {
  if (viewerRole === 'admin') {
    return ClubRegistration.countDocuments({ status: 'pending_admin' });
  }
  return ClubRegistration.countDocuments({ status: 'pending_icpdp' });
};

// IC-PDP tự tạo đơn thành lập CLB → gửi thẳng cho Admin phê duyệt.
const icpdpCreateRegistration = async (payload, creatorEmail) => {
  const categories = Club.CATEGORIES || [];
  if (!payload.clubName || !String(payload.clubName).trim()) {
    const err = new Error('Tên CLB là bắt buộc!');
    err.statusCode = 400;
    throw err;
  }
  if (!categories.includes(payload.category)) {
    const err = new Error('Lĩnh vực CLB không hợp lệ!');
    err.statusCode = 400;
    throw err;
  }
  const presidentEmail = String(payload.presidentEmail || '').trim().toLowerCase();
  if (!presidentEmail) {
    const err = new Error('Email chủ nhiệm là bắt buộc!');
    err.statusCode = 400;
    throw err;
  }

  // Chủ nhiệm CLB bắt buộc là tài khoản SINH VIÊN đã có trong hệ thống.
  const presidentUser = await User.findOne({ email: presidentEmail }).select('role fullname');
  if (!presidentUser) {
    const err = new Error('Email chủ nhiệm phải là tài khoản đã có trong hệ thống.');
    err.statusCode = 400;
    throw err;
  }
  if (presidentUser.role !== 'student') {
    const err = new Error('Chỉ có thể chọn tài khoản sinh viên làm chủ nhiệm CLB.');
    err.statusCode = 400;
    throw err;
  }

  const registration = await ClubRegistration.create({
    clubName: payload.clubName,
    proposedSlug: payload.proposedSlug || '',
    category: payload.category,
    description: String(payload.description || '').trim() || 'Đơn thành lập CLB do IC-PDP tạo trực tiếp.',
    president: String(payload.president || '').trim() || presidentUser.fullname || 'Chủ nhiệm CLB',
    presidentEmail,
    contactEmail: payload.contactEmail || presidentEmail,
    phone: payload.phone || '',
    activityField: payload.activityField || '',
    scale: payload.scale || '',
    submittedByEmail: String(creatorEmail || '').trim().toLowerCase(),
    icpdpNote: 'Đơn do IC-PDP tạo trực tiếp.',
    reviewedByEmail: String(creatorEmail || '').trim().toLowerCase(),
    reviewedAt: new Date(),
    status: 'pending_admin',
  });
  return formatClubRegistration(registration);
};

module.exports = {
  listRegistrations,
  getRegistrationById,
  createRegistration,
  icpdpCreateRegistration,
  icpdpResubmitRegistration,
  icpdpCancelRegistration,
  icpdpForwardToAdmin,
  adminApproveRegistration,
  rejectRegistration,
  requestRevision,
  countPendingForRole,
};
