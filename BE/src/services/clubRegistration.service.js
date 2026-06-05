const Club = require('../models/Club');
const ClubRegistration = require('../models/ClubRegistration');
const User = require('../models/User');
const SchoolMember = require('../models/SchoolMember');
const { formatClubRegistration } = require('../utils/clubRegistrationFormat');

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

const listRegistrations = async ({ status, q, limit = 100 } = {}) => {
  const filter = {};
  if (status && status !== 'all') {
    filter.status = status;
  } else if (!status) {
    filter.status = { $in: ['pending_icpdp', 'revision'] };
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

const approveRegistration = async (id, { note, reviewerEmail } = {}) => {
  const registration = await ClubRegistration.findById(id);
  if (!registration) {
    const err = new Error('Không tìm thấy đơn đăng ký CLB!');
    err.statusCode = 404;
    throw err;
  }
  if (registration.status !== 'pending_icpdp') {
    const err = new Error('Đơn không ở trạng thái chờ IC-PDP duyệt!');
    err.statusCode = 400;
    throw err;
  }

  const baseSlug = slugify(registration.proposedSlug || registration.clubName);
  const slug = await ensureUniqueSlug(baseSlug);

  const managerEmail = registration.presidentEmail;
  let managerUser = await User.findOne({ email: managerEmail });

  const club = await Club.create({
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
  });

  if (managerEmail) {
    await SchoolMember.updateOne(
      { email: managerEmail },
      { $set: { role: 'club_manager' } },
      { upsert: true }
    );
    if (managerUser) {
      managerUser.role = 'club_manager';
      await managerUser.save();
    }
  }

  registration.status = 'approved';
  registration.icpdpNote = note || '';
  registration.reviewedByEmail = reviewerEmail || '';
  registration.reviewedAt = new Date();
  registration.clubId = club._id;
  registration.clubSlug = club.slug;
  await registration.save();

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

const rejectRegistration = async (id, { reason, reviewerEmail } = {}) => {
  const registration = await ClubRegistration.findById(id);
  if (!registration) {
    const err = new Error('Không tìm thấy đơn đăng ký CLB!');
    err.statusCode = 404;
    throw err;
  }
  if (!['pending_icpdp', 'revision'].includes(registration.status)) {
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
  return formatClubRegistration(registration);
};

const requestRevision = async (id, { note, reviewerEmail } = {}) => {
  const registration = await ClubRegistration.findById(id);
  if (!registration) {
    const err = new Error('Không tìm thấy đơn đăng ký CLB!');
    err.statusCode = 404;
    throw err;
  }
  if (registration.status !== 'pending_icpdp') {
    const err = new Error('Chỉ có thể yêu cầu chỉnh sửa đơn đang chờ duyệt!');
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

const countPending = () => ClubRegistration.countDocuments({ status: 'pending_icpdp' });

module.exports = {
  listRegistrations,
  getRegistrationById,
  createRegistration,
  approveRegistration,
  rejectRegistration,
  requestRevision,
  countPending,
};
