const clubService = require('../services/club.service');
const clubRegistrationService = require('../services/clubRegistration.service');

const getClubs = async (req, res) => {
  const result = await clubService.getClubs({
    category: req.query.category,
    search: req.query.search,
    userId: req.user?._id,
  });
  res.status(200).json({ success: true, ...result });
};

const getClubBySlug = async (req, res) => {
  const result = await clubService.getClubBySlug(req.params.slug, req.user?._id);
  res.status(200).json({ success: true, ...result });
};

const followClub = async (req, res) => {
  const result = await clubService.followClub(req.user._id, req.params.id);
  res.status(201).json({ success: true, ...result });
};

const unfollowClub = async (req, res) => {
  const result = await clubService.unfollowClub(req.user._id, req.params.id);
  res.status(200).json({ success: true, ...result });
};

const joinClub = async (req, res) => {
  const result = await clubService.joinClub(req.user._id, req.params.id, req.body?.note);
  res.status(201).json({ success: true, ...result });
};

const cancelJoinClub = async (req, res) => {
  const result = await clubService.cancelJoinClub(req.user._id, req.params.id);
  res.status(200).json({ success: true, ...result });
};

const approveMembership = async (req, res) => {
  const result = await clubService.approveMembership(
    req.user._id,
    req.params.id,
    req.params.userId
  );
  res.status(200).json({ success: true, ...result });
};

const readActiveClubId = (req) => {
  const raw = String(req.headers['x-managed-club-id'] || '').trim();
  return raw || null;
};

const getManagedClubs = async (req, res) => {
  const result = await clubService.getManagedClubs(req.user._id, readActiveClubId(req));
  res.status(200).json({ success: true, ...result });
};

const getManagedClubProfile = async (req, res) => {
  const result = await clubService.getManagedClubProfile(req.user._id, readActiveClubId(req));
  res.status(200).json({ success: true, ...result });
};

const updateManagedClubProfile = async (req, res) => {
  const result = await clubService.updateManagedClubProfile(req.user._id, req.body, readActiveClubId(req));
  res.status(200).json({ success: true, ...result });
};

const transferClubChairman = async (req, res) => {
  const result = await clubService.transferClubChairman(req.user._id, req.body, readActiveClubId(req));
  res.status(200).json({ success: true, ...result });
};

const submitClubRegistration = async (req, res) => {
  try {
    const registration = await clubRegistrationService.createRegistration(req.body, {
      email: req.authEmail,
      userId: req.user?._id,
    });
    res.status(201).json({
      success: true,
      registration,
      message: 'Đã gửi đơn thành lập CLB — chờ IC-PDP xét duyệt.',
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
};

module.exports = {
  getClubs,
  getClubBySlug,
  followClub,
  unfollowClub,
  joinClub,
  cancelJoinClub,
  approveMembership,
  getManagedClubProfile,
  updateManagedClubProfile,
  transferClubChairman,
  getManagedClubs,
  submitClubRegistration,
};
