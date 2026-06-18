const mongoose = require('mongoose');
const Club = require('../models/Club');
const ClubFollow = require('../models/ClubFollow');
const ClubMembership = require('../models/ClubMembership');
const AppError = require('../utils/AppError');

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

  return doc;
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

  return {
    id: follow._id,
    clubId: club._id,
    slug: club.slug,
    name: club.name,
    category: club.category,
    logoText: club.logoText,
    logoColor: club.logoColor,
    coverImage: club.coverImage,
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

  const isPending = membership.status === 'pending';

  return {
    id: membership._id,
    clubId: club._id,
    slug: club.slug,
    name: club.name,
    category: club.category,
    logoText: club.logoText,
    logoColor: club.logoColor,
    coverImage: club.coverImage,
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
  const SchoolMember = require('../models/SchoolMember');
  const targetUser = await User.findOne({ email: targetEmail });
  if (!targetUser) throw new AppError('Không tìm thấy tài khoản với email đã nhập.', 404);
  if (String(targetUser._id) === String(currentUserId)) {
    throw new AppError('Không thể chuyển nhượng cho chính bạn.', 400);
  }
  if (!['student', 'staff'].includes(targetUser.role)) {
    throw new AppError('Người nhận phải là sinh viên hoặc cán bộ trường.', 400);
  }
  const previousManagerId = club.managedBy || currentUserId;
  const previousUser = await User.findById(previousManagerId);
  club.managedBy = targetUser._id;
  club.president = String(payload.presidentName || payload.president || targetUser.fullname || '').trim();
  await club.save();
  targetUser.role = 'club_manager';
  await targetUser.save();
  await SchoolMember.updateOne({ email: targetUser.email }, { $set: { role: 'club_manager' } }, { upsert: true });
  if (previousUser && String(previousUser._id) !== String(targetUser._id)) {
    const otherClubs = await Club.countDocuments({ managedBy: previousUser._id, _id: { $ne: club._id } });
    if (otherClubs === 0 && previousUser.role === 'club_manager') {
      previousUser.role = 'student';
      await previousUser.save();
      await SchoolMember.updateOne({ email: previousUser.email }, { $set: { role: 'student' } });
    }
  }
  return {
    message: `Đã chuyển nhượng chủ nhiệm CLB cho ${targetUser.fullname}.`,
    club,
    newManager: { id: String(targetUser._id), fullname: targetUser.fullname, email: targetUser.email },
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

  return { club };
};

const updateManagedClubProfile = async (userId, payload = {}, activeClubId = null) => {
  const club = await resolveManagedClub(userId, activeClubId);

  if (!club) {
    throw new AppError('Không tìm thấy câu lạc bộ được gán cho quản lý.', 404);
  }

  if (club.managedBy && String(club.managedBy) !== String(userId)) {
    throw new AppError('Bạn không có quyền cập nhật hồ sơ CLB này.', 403);
  }

  ALLOWED_PROFILE_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) {
      club[field] = payload[field];
    }
  });

  if (payload.coverPositionY !== undefined && payload.coverPositionY !== null) {
    const y = Number(payload.coverPositionY);
    club.coverPositionY = Number.isFinite(y)
      ? Math.min(100, Math.max(0, Math.round(y * 10) / 10))
      : 50;
  }

  if (!club.managedBy) {
    club.managedBy = userId;
  }

  await club.save();

  return {
    message: 'Đã cập nhật hồ sơ câu lạc bộ thành công!',
    club,
  };
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
  getManagedClubs,
  findClubManagedBy,
  findManagedClubs,
  resolveManagedClub,
  MANAGED_CLUB_SLUG,
};
