const mongoose = require('mongoose');
const Club = require('../models/Club');
const ClubFollow = require('../models/ClubFollow');
const ClubMembership = require('../models/ClubMembership');
const AppError = require('../utils/AppError');
const {
  sanitizeClubMediaForApi,
  resolveClubMediaResponse,
  persistClubMediaOnDocument,
} = require('../utils/clubMediaStorage');

const resolveClub = async (idOrSlug) => {
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    const byId = await Club.findById(idOrSlug);
    if (byId) return byId;
  }
  return Club.findOne({ slug: idOrSlug });
};

const getFollowedClubIds = async (userId) => {
  if (!userId) return new Set();

  const follows = await ClubFollow.find({
    user: userId,
    status: 'following',
  }).select('club');

  return new Set(follows.map((f) => String(f.club)));
};

const getMembershipMap = async (userId) => {
  if (!userId) return new Map();

  const memberships = await ClubMembership.find({
    user: userId,
    status: { $in: ['pending', 'member'] },
  }).select('club status requestedAt joinedAt');

  return new Map(memberships.map((m) => [String(m.club), m]));
};

const attachUserClubFlags = (clubDoc, followedSet, membershipMap) => {
  const doc = clubDoc.toObject ? clubDoc.toObject() : { ...clubDoc };
  doc.isFollowing = followedSet.has(String(doc._id));

  const membership = membershipMap.get(String(doc._id));
  doc.membershipStatus = membership?.status || null;
  doc.membershipRequestedAt = membership?.requestedAt || null;
  doc.membershipJoinedAt = membership?.joinedAt || null;

  const media = sanitizeClubMediaForApi(doc);
  return { ...doc, ...media };
};

const buildClubQuery = ({ category, search }) => {
  const query = { status: 'active' };

  if (category && category !== 'all') {
    query.category = category;
  }

  if (search?.trim()) {
    const q = search.trim();
    query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
    ];
  }

  return query;
};

const getClubs = async ({ category, search, userId } = {}) => {
  const followedSet = await getFollowedClubIds(userId);
  const membershipMap = await getMembershipMap(userId);

  const clubs = await Club.find(buildClubQuery({ category, search }))
    .sort({ name: 1 });

  return {
    clubs: clubs.map((club) => attachUserClubFlags(club, followedSet, membershipMap)),
    total: clubs.length,
  };
};

const getClubBySlug = async (idOrSlug, userId) => {
  const club = await resolveClub(idOrSlug);

  if (!club || club.status !== 'active') {
    throw new AppError('Không tìm thấy câu lạc bộ!', 404);
  }

  const followedSet = await getFollowedClubIds(userId);
  const membershipMap = await getMembershipMap(userId);

  return { club: attachUserClubFlags(club, followedSet, membershipMap) };
};

const followClub = async (userId, idOrSlug) => {
  const club = await resolveClub(idOrSlug);

  if (!club || club.status !== 'active') {
    throw new AppError('Không tìm thấy câu lạc bộ!', 404);
  }

  let follow = await ClubFollow.findOne({ user: userId, club: club._id });

  if (follow?.status === 'following') {
    throw new AppError('Bạn đã theo dõi câu lạc bộ này rồi.', 409);
  }

  if (follow?.status === 'unfollowed') {
    follow.status = 'following';
    follow.followedAt = new Date();
    follow.unfollowedAt = null;
    await follow.save();
  } else {
    follow = await ClubFollow.create({
      user: userId,
      club: club._id,
      status: 'following',
    });
  }

  club.followerCount = Math.max(0, (club.followerCount || 0) + 1);
  await club.save();

  const membershipMap = await getMembershipMap(userId);
  const updatedClub = attachUserClubFlags(club, new Set([String(club._id)]), membershipMap);

  return {
    message: 'Đã theo dõi câu lạc bộ!',
    club: updatedClub,
    follow,
  };
};

const unfollowClub = async (userId, idOrSlug) => {
  const club = await resolveClub(idOrSlug);

  if (!club) {
    throw new AppError('Không tìm thấy câu lạc bộ!', 404);
  }

  const follow = await ClubFollow.findOne({
    user: userId,
    club: club._id,
    status: 'following',
  });

  if (!follow) {
    throw new AppError('Bạn chưa theo dõi câu lạc bộ này.', 404);
  }

  follow.status = 'unfollowed';
  follow.unfollowedAt = new Date();
  await follow.save();

  club.followerCount = Math.max(0, (club.followerCount || 0) - 1);
  await club.save();

  const membershipMap = await getMembershipMap(userId);
  const updatedClub = attachUserClubFlags(club, new Set(), membershipMap);

  return {
    message: 'Đã bỏ theo dõi câu lạc bộ.',
    club: updatedClub,
  };
};

const joinClub = async () => {
  throw new AppError('Tính năng tham gia CLB đã ngừng. Vui lòng dùng Yêu thích CLB để theo dõi.', 403);
};

const cancelJoinClub = async () => {
  throw new AppError('Tính năng tham gia CLB đã ngừng.', 403);
};

const approveMembership = async (staffUserId, idOrSlug, targetUserId) => {
  const club = await resolveClub(idOrSlug);

  if (!club || club.status !== 'active') {
    throw new AppError('Không tìm thấy câu lạc bộ!', 404);
  }

  const membership = await ClubMembership.findOne({
    user: targetUserId,
    club: club._id,
    status: 'pending',
  });

  if (!membership) {
    throw new AppError('Không tìm thấy yêu cầu tham gia đang chờ duyệt.', 404);
  }

  membership.status = 'member';
  membership.joinedAt = new Date();
  await membership.save();

  club.memberCount = Math.max(0, (club.memberCount || 0) + 1);
  await club.save();

  return {
    message: 'Đã duyệt thành viên CLB.',
    membership,
    approvedBy: staffUserId,
  };
};

const formatClubForFollowList = (follow) => {
  const club = follow.club;
  if (!club || typeof club !== 'object') return null;
  const media = sanitizeClubMediaForApi(club);

  return {
    id: follow._id,
    clubId: club._id,
    slug: club.slug,
    name: club.name,
    category: club.category,
    logoText: club.logoText,
    logoColor: club.logoColor,
    coverImage: media.coverImage,
    logoImage: media.logoImage,
    coverUrl: media.coverUrl,
    logoUrl: media.logoUrl,
    memberCount: club.memberCount,
    followerCount: club.followerCount,
    description: club.description,
    followedAt: follow.followedAt,
    status: 'Đang theo dõi',
    listType: 'following',
  };
};

const formatClubForMembershipList = (membership) => {
  const club = membership.club;
  if (!club || typeof club !== 'object') return null;
  const media = sanitizeClubMediaForApi(club);

  const isPending = membership.status === 'pending';

  return {
    id: membership._id,
    clubId: club._id,
    slug: club.slug,
    name: club.name,
    category: club.category,
    logoText: club.logoText,
    logoColor: club.logoColor,
    coverImage: media.coverImage,
    logoImage: media.logoImage,
    coverUrl: media.coverUrl,
    logoUrl: media.logoUrl,
    memberCount: club.memberCount,
    followerCount: club.followerCount,
    description: club.description,
    requestedAt: membership.requestedAt,
    joinedAt: membership.joinedAt,
    status: isPending ? 'Đang chờ duyệt' : 'Đã tham gia',
    membershipStatus: membership.status,
    listType: isPending ? 'pending' : 'joined',
  };
};

const getMyClubsCounts = async (userId) => {
  const [following, pending, joined] = await Promise.all([
    ClubFollow.countDocuments({ user: userId, status: 'following' }),
    ClubMembership.countDocuments({ user: userId, status: 'pending' }),
    ClubMembership.countDocuments({ user: userId, status: 'member' }),
  ]);

  return { following, pending, joined };
};

const getMyClubs = async (userId, tab = 'following') => {
  const counts = await getMyClubsCounts(userId);
  const normalizedTab = ['following'].includes(tab) ? tab : 'following';

  if (normalizedTab === 'following') {
    const follows = await ClubFollow.find({
      user: userId,
      status: 'following',
    })
      .populate('club')
      .sort({ followedAt: -1 });

    return {
      tab: normalizedTab,
      counts,
      clubs: follows.map(formatClubForFollowList).filter(Boolean),
    };
  }

  const status = normalizedTab === 'pending' ? 'pending' : 'member';
  const sortField = normalizedTab === 'pending' ? 'requestedAt' : 'joinedAt';

  const memberships = await ClubMembership.find({
    user: userId,
    status,
  })
    .populate('club')
    .sort({ [sortField]: -1 });

  return {
    tab: normalizedTab,
    counts,
    clubs: memberships.map(formatClubForMembershipList).filter(Boolean),
  };
};

const MANAGED_CLUB_SLUG = 'fu-dever';

const MEDIA_PROFILE_FIELDS = new Set(['coverImage', 'logoImage']);

/**
 * Chỉ nhận coverImage/logoImage khi là ảnh thật mới (data URI) hoặc URL ngoài (http).
 * Giá trị hiển thị nội bộ (vd "/api/clubs/:id/cover") hay rỗng do client gửi lại
 * KHÔNG được phép ghi đè, tránh làm mất ảnh đang lưu.
 */
const isAssignableMediaValue = (value) => {
  const v = String(value || '').trim();
  return /^data:image\//i.test(v) || /^https?:\/\//i.test(v);
};

/** Gán các field hồ sơ; trả về true nếu có ảnh mới (data/http) được gán. */
const applyProfileFields = (club, payload) => {
  let mediaChanged = false;
  ALLOWED_PROFILE_FIELDS.forEach((field) => {
    if (payload[field] === undefined) return;
    if (MEDIA_PROFILE_FIELDS.has(field)) {
      if (!isAssignableMediaValue(payload[field])) return;
      mediaChanged = true;
    }
    club[field] = payload[field];
  });
  return mediaChanged;
};

const ALLOWED_PROFILE_FIELDS = [
  'name',
  'shortName',
  'category',
  'activityField',
  'founded',
  'foundedDate',
  'scale',
  'president',
  'hotline',
  'email',
  'facebook',
  'website',
  'slogan',
  'description',
  'coverImage',
  'coverPositionY',
  'logoImage',
  'logoText',
  'logoColor',
];

const findManagedClubs = async (userId) => {
  const clubs = await Club.find({ managedBy: userId }).sort({ name: 1 });
  if (clubs.length) return clubs;
  const fallback = await Club.findOne({ slug: MANAGED_CLUB_SLUG });
  return fallback ? [fallback] : [];
};

const formatManagedClubBrief = (club) => ({
  id: String(club._id),
  name: club.name || '',
  slug: club.slug || '',
  president: club.president || '',
  logoText: club.logoText || '',
});

const resolveManagedClub = async (userId, activeClubId = null) => {
  const clubs = await findManagedClubs(userId);
  if (!clubs.length) return null;

  if (activeClubId) {
    const matched = clubs.find((club) => String(club._id) === String(activeClubId));
    if (matched) return matched;
  }

  return clubs[0];
};

const findClubManagedBy = async (userId, activeClubId = null) =>
  resolveManagedClub(userId, activeClubId);

const getManagedClubs = async (userId, activeClubId = null) => {
  const clubs = await findManagedClubs(userId);
  const activeClub = await resolveManagedClub(userId, activeClubId);

  return {
    clubs: clubs.map(formatManagedClubBrief),
    activeClubId: activeClub ? String(activeClub._id) : '',
    activeClub: activeClub ? formatManagedClubBrief(activeClub) : null,
  };
};

/** Thực thi chuyển nhượng: đổi managedBy, role, quyền sở hữu sự kiện. */
const executeChairmanTransfer = async (club, targetUser, presidentName = '') => {
  const User = require('../models/User');
  const SchoolMember = require('../models/SchoolMember');
  const previousManagerId = club.managedBy;
  const previousUser = previousManagerId ? await User.findById(previousManagerId) : null;

  club.managedBy = targetUser._id;
  club.president = String(presidentName || targetUser.fullname || '').trim();
  await club.save();
  if (targetUser.role !== 'club_manager') {
    targetUser.role = 'club_manager';
    await targetUser.save();
  }
  await SchoolMember.updateOne({ email: targetUser.email }, { $set: { role: 'club_manager' } }, { upsert: true });

  // App gắn sự kiện theo người tạo (createdBy). Khi đổi chủ nhiệm, chuyển luôn
  // quyền sở hữu toàn bộ sự kiện + đề xuất của CLB sang chủ mới, nếu không chủ
  // mới sẽ không thấy và không sửa/xóa được các sự kiện cũ của CLB.
  const Event = require('../models/Event');
  const EventProposal = require('../models/EventProposal');
  const clubEvents = await Event.find({ clubId: club._id }).select('_id proposalId').lean();
  if (clubEvents.length) {
    await Event.updateMany(
      { clubId: club._id },
      { $set: { createdBy: targetUser._id, createdByEmail: targetUser.email } }
    );
    const proposalIds = clubEvents.map((e) => e.proposalId).filter(Boolean);
    if (proposalIds.length) {
      await EventProposal.updateMany(
        { _id: { $in: proposalIds } },
        { $set: { submittedByEmail: targetUser.email } }
      );
    }
  }
  if (previousUser && String(previousUser._id) !== String(targetUser._id)) {
    const otherClubs = await Club.countDocuments({ managedBy: previousUser._id, _id: { $ne: club._id } });
    if (otherClubs === 0 && previousUser.role === 'club_manager') {
      previousUser.role = 'student';
      await previousUser.save();
      await SchoolMember.updateOne({ email: previousUser.email }, { $set: { role: 'student' } });
    }
  }
  return { previousUser };
};

/**
 * Chủ nhiệm gửi YÊU CẦU chuyển nhượng — không thực thi ngay.
 * IC-PDP duyệt mới đổi chủ nhiệm; Admin chỉ nhận thông báo khi hoàn tất.
 */
const transferClubChairman = async (currentUserId, payload = {}, activeClubId = null) => {
  const club = await resolveManagedClub(currentUserId, activeClubId);
  if (!club) throw new AppError('Không tìm thấy CLB bạn đang quản lý.', 404);
  if (club.managedBy && String(club.managedBy) !== String(currentUserId)) {
    throw new AppError('Bạn không có quyền chuyển nhượng chủ nhiệm CLB này.', 403);
  }
  const targetEmail = String(payload.targetEmail || payload.email || '').trim().toLowerCase();
  if (!targetEmail) throw new AppError('Vui lòng nhập email sinh viên nhận chuyển nhượng.', 400);
  if (payload.confirm !== true && payload.confirm !== 'true') {
    throw new AppError('Vui lòng xác nhận chuyển nhượng (confirm: true).', 400);
  }
  const User = require('../models/User');
  const targetUser = await User.findOne({ email: targetEmail });
  if (!targetUser) throw new AppError('Không tìm thấy tài khoản với email đã nhập.', 404);
  if (String(targetUser._id) === String(currentUserId)) {
    throw new AppError('Không thể chuyển nhượng cho chính bạn.', 400);
  }
  if (!['student', 'club_manager'].includes(targetUser.role)) {
    throw new AppError('Chỉ có thể chuyển nhượng Chủ nhiệm CLB cho sinh viên hoặc chủ nhiệm CLB khác.', 400);
  }

  const ClubChangeRequest = require('../models/ClubChangeRequest');
  const existing = await ClubChangeRequest.findOne({
    clubId: club._id,
    requestType: 'transfer',
    status: 'pending',
  });
  if (existing) {
    throw new AppError('CLB đang có yêu cầu chuyển nhượng chờ IC-PDP duyệt.', 409);
  }

  const requester = await User.findById(currentUserId).select('email fullname').lean();
  const request = await ClubChangeRequest.create({
    clubId: club._id,
    requestType: 'transfer',
    status: 'pending',
    reason: String(payload.reason || '').trim(),
    requestedByEmail: requester?.email || '',
    requestedByName: requester?.fullname || '',
    snapshot: { name: club.name, president: club.president },
    payload: {
      president: String(payload.presidentName || payload.president || targetUser.fullname || '').trim(),
      targetEmail,
      targetName: targetUser.fullname || '',
    },
  });

  return {
    message: `Đã gửi yêu cầu chuyển nhượng chủ nhiệm cho ${targetUser.fullname} — chờ IC-PDP duyệt.`,
    request: { id: String(request._id), status: request.status },
    club: { id: String(club._id), name: club.name },
    targetUser: { fullname: targetUser.fullname, email: targetUser.email },
  };
};

/** IC-PDP: danh sách yêu cầu chuyển nhượng chủ nhiệm. */
const listChairmanTransferRequests = async ({ status = 'pending' } = {}) => {
  const ClubChangeRequest = require('../models/ClubChangeRequest');
  const filter = { requestType: 'transfer' };
  if (status && status !== 'all') filter.status = status;
  const rows = await ClubChangeRequest.find(filter)
    .populate('clubId', 'name slug president')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return rows.map((r) => ({
    id: String(r._id),
    status: r.status,
    reason: r.reason || '',
    adminNote: r.adminNote || '',
    clubId: r.clubId ? String(r.clubId._id) : '',
    clubName: r.clubId?.name || r.snapshot?.name || '',
    currentPresident: r.snapshot?.president || r.clubId?.president || '',
    requestedByEmail: r.requestedByEmail || '',
    requestedByName: r.requestedByName || '',
    targetEmail: r.payload?.targetEmail || '',
    targetName: r.payload?.targetName || '',
    newPresidentName: r.payload?.president || '',
    createdAt: r.createdAt,
    processedByEmail: r.processedByEmail || '',
  }));
};

/** IC-PDP duyệt yêu cầu chuyển nhượng — thực thi đổi chủ nhiệm. */
const approveChairmanTransfer = async (requestId, reviewerEmail = '') => {
  const ClubChangeRequest = require('../models/ClubChangeRequest');
  const User = require('../models/User');
  const request = await ClubChangeRequest.findById(requestId);
  if (!request || request.requestType !== 'transfer') {
    throw new AppError('Không tìm thấy yêu cầu chuyển nhượng.', 404);
  }
  if (request.status !== 'pending') {
    throw new AppError('Yêu cầu đã được xử lý trước đó.', 400);
  }
  const club = await Club.findById(request.clubId);
  if (!club) throw new AppError('CLB của yêu cầu không còn tồn tại.', 404);
  const targetUser = await User.findOne({ email: request.payload?.targetEmail });
  if (!targetUser) throw new AppError('Tài khoản nhận chuyển nhượng không còn tồn tại.', 404);

  const { previousUser } = await executeChairmanTransfer(club, targetUser, request.payload?.president);

  request.status = 'approved';
  request.processedByEmail = String(reviewerEmail || '').trim().toLowerCase();
  await request.save();

  return {
    message: `Đã duyệt — chủ nhiệm CLB "${club.name}" chuyển sang ${targetUser.fullname}.`,
    club: { id: String(club._id), name: club.name },
    newManager: { id: String(targetUser._id), fullname: targetUser.fullname, email: targetUser.email },
    previousManager: previousUser
      ? { id: String(previousUser._id), fullname: previousUser.fullname, email: previousUser.email }
      : null,
  };
};

/** IC-PDP từ chối yêu cầu chuyển nhượng. */
const rejectChairmanTransfer = async (requestId, reason = '', reviewerEmail = '') => {
  const ClubChangeRequest = require('../models/ClubChangeRequest');
  const request = await ClubChangeRequest.findById(requestId);
  if (!request || request.requestType !== 'transfer') {
    throw new AppError('Không tìm thấy yêu cầu chuyển nhượng.', 404);
  }
  if (request.status !== 'pending') {
    throw new AppError('Yêu cầu đã được xử lý trước đó.', 400);
  }
  const trimmed = String(reason || '').trim();
  if (!trimmed) throw new AppError('Vui lòng nhập lý do từ chối.', 400);
  request.status = 'rejected';
  request.adminNote = trimmed;
  request.processedByEmail = String(reviewerEmail || '').trim().toLowerCase();
  await request.save();
  const club = await Club.findById(request.clubId).select('name').lean();
  return {
    message: 'Đã từ chối yêu cầu chuyển nhượng.',
    requestedByEmail: request.requestedByEmail || '',
    clubName: club?.name || '',
    reason: trimmed,
  };
};

const getManagedClubProfile = async (userId, activeClubId = null) => {
  const club = await resolveManagedClub(userId, activeClubId);

  if (!club) {
    throw new AppError('Không tìm thấy câu lạc bộ được gán cho quản lý.', 404);
  }

  if (club.managedBy && String(club.managedBy) !== String(userId)) {
    throw new AppError('Bạn không có quyền quản lý hồ sơ CLB này.', 403);
  }

  if (!club.managedBy) {
    club.managedBy = userId;
    await club.save();
  }

  return { club: attachUserClubFlags(club, new Set(), new Map()) };
};

const sendClubMedia = async (clubId, kind, res) => {
  if (!mongoose.Types.ObjectId.isValid(clubId)) {
    throw new AppError('Không tìm thấy media CLB', 404);
  }
  const club = await Club.findById(clubId).lean();
  if (!club) throw new AppError('Không tìm thấy media CLB', 404);
  const resolved = await resolveClubMediaResponse(club, kind);
  if (!resolved) throw new AppError('Không tìm thấy media CLB', 404);
  if (resolved.redirectUrl) {
    res.redirect(302, resolved.redirectUrl);
    return;
  }
  res.set('Content-Type', resolved.mime);
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(resolved.buffer);
};

const updateManagedClubProfile = async (userId, payload = {}, activeClubId = null) => {
  const club = await resolveManagedClub(userId, activeClubId);

  if (!club) {
    throw new AppError('Không tìm thấy câu lạc bộ được gán cho quản lý.', 404);
  }

  if (club.managedBy && String(club.managedBy) !== String(userId)) {
    throw new AppError('Bạn không có quyền cập nhật hồ sơ CLB này.', 403);
  }

  const mediaChanged = applyProfileFields(club, payload);

  if (payload.coverPositionY !== undefined && payload.coverPositionY !== null) {
    const y = Number(payload.coverPositionY);
    club.coverPositionY = Number.isFinite(y)
      ? Math.min(100, Math.max(0, Math.round(y * 10) / 10))
      : 50;
  }

  if (!club.managedBy) {
    club.managedBy = userId;
  }

  if (mediaChanged) await persistClubMediaOnDocument(club);
  await club.save();

  return {
    message: 'Đã cập nhật hồ sơ câu lạc bộ thành công!',
    club: attachUserClubFlags(club, new Set(), new Map()),
  };
};

const getAllClubsForManagement = async () => {
  const clubs = await Club.find({ status: { $ne: 'inactive' } }).sort({ name: 1 });
  return { clubs, total: clubs.length };
};

const updateClubByIcpdp = async (clubId, payload = {}) => {
  const club = await Club.findById(clubId);
  if (!club) {
    throw new AppError('Không tìm thấy câu lạc bộ!', 404);
  }

  const mediaChanged = applyProfileFields(club, payload);

  if (payload.coverPositionY !== undefined && payload.coverPositionY !== null) {
    const y = Number(payload.coverPositionY);
    club.coverPositionY = Number.isFinite(y) ? Math.min(100, Math.max(0, Math.round(y * 10) / 10)) : 50;
  }

  if (mediaChanged) await persistClubMediaOnDocument(club);
  await club.save();

  return { message: 'Đã cập nhật câu lạc bộ thành công!', club };
};

const deleteClubByIcpdp = async (clubId) => {
  const club = await Club.findById(clubId);
  if (!club) {
    throw new AppError('Không tìm thấy câu lạc bộ!', 404);
  }
  club.status = 'inactive';
  await club.save();
  return { message: 'Đã xóa câu lạc bộ thành công!' };
};

module.exports = {
  getClubs,
  getClubBySlug,
  followClub,
  unfollowClub,
  joinClub,
  cancelJoinClub,
  approveMembership,
  getMyClubs,
  getManagedClubProfile,
  updateManagedClubProfile,
  transferClubChairman,
  listChairmanTransferRequests,
  approveChairmanTransfer,
  rejectChairmanTransfer,
  getManagedClubs,
  findClubManagedBy,
  findManagedClubs,
  resolveManagedClub,
  getAllClubsForManagement,
  updateClubByIcpdp,
  deleteClubByIcpdp,
  sendClubMedia,
  MANAGED_CLUB_SLUG,
};
