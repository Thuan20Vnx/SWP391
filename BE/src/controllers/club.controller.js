const clubService = require('../services/club.service');
const clubRegistrationService = require('../services/clubRegistration.service');
const clubSemesterTimelineService = require('../services/clubSemesterTimeline.service');
const { createAndBroadcast } = require('../services/notification.service');

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
    createAndBroadcast({
      recipientRoles: ['icpdp'],
      title: 'Đơn thành lập CLB mới',
      body: `${registration.clubName || 'Một CLB'} vừa gửi đơn thành lập và đang chờ xét duyệt.`,
      type: 'club_submit',
      refId: String(registration.id || registration._id || ''),
      refType: 'club_registration'
    }).catch(() => {});
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

const handleTimelineError = (res, error) => {
  const status = error.statusCode || 500;
  res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
};

const listSemesterTimelines = async (req, res) => {
  try {
    const timelines = await clubSemesterTimelineService.listForClub(
      req.user._id,
      readActiveClubId(req)
    );
    res.status(200).json({ success: true, timelines });
  } catch (error) {
    handleTimelineError(res, error);
  }
};

const getSemesterTimeline = async (req, res) => {
  try {
    const timeline = await clubSemesterTimelineService.getByIdForClub(
      req.params.id,
      req.user._id,
      readActiveClubId(req)
    );
    res.status(200).json({ success: true, timeline });
  } catch (error) {
    handleTimelineError(res, error);
  }
};

const createSemesterTimeline = async (req, res) => {
  try {
    const timeline = await clubSemesterTimelineService.createForClub(
      req.body,
      req.user._id,
      readActiveClubId(req),
      req.authEmail
    );
    res.status(201).json({
      success: true,
      timeline,
      message: 'Đã tạo timeline kỳ học.',
    });
  } catch (error) {
    handleTimelineError(res, error);
  }
};

const updateSemesterTimeline = async (req, res) => {
  try {
    const timeline = await clubSemesterTimelineService.updateForClub(
      req.params.id,
      req.body,
      req.user._id,
      readActiveClubId(req)
    );
    if (['pending_icpdp', 'revision'].includes(timeline.statusKey)) {
      createAndBroadcast({
        recipientRoles: ['icpdp'],
        title: 'CLB cập nhật timeline kỳ học',
        body: `${timeline.clubName || 'CLB'} đã chỉnh sửa timeline ${timeline.semesterLabel || ''}.`,
        type: 'timeline_update',
        refId: String(timeline.id || ''),
        refType: 'semester_timeline',
      }).catch(() => {});
    }
    res.status(200).json({ success: true, timeline, message: 'Đã cập nhật timeline.' });
  } catch (error) {
    handleTimelineError(res, error);
  }
};

const submitSemesterTimeline = async (req, res) => {
  try {
    const timeline = await clubSemesterTimelineService.submitForClub(
      req.params.id,
      req.user._id,
      readActiveClubId(req)
    );
    createAndBroadcast({
      recipientRoles: ['icpdp'],
      title: 'Timeline CLB mới cần duyệt',
      body: `${timeline.clubName || 'CLB'} vừa gửi timeline ${timeline.semesterLabel || ''}.`,
      type: 'timeline_submit',
      refId: String(timeline.id || timeline._id || ''),
      refType: 'semester_timeline'
    }).catch(() => {});
    res.status(200).json({
      success: true,
      timeline,
      message: 'Đã gửi timeline kỳ học — chờ IC-PDP xét duyệt.',
    });
  } catch (error) {
    handleTimelineError(res, error);
  }
};

const deleteSemesterTimeline = async (req, res) => {
  try {
    const result = await clubSemesterTimelineService.deleteForClub(
      req.params.id,
      req.user._id,
      readActiveClubId(req)
    );
    if (result.mode === 'cancelled' && result.timeline) {
      createAndBroadcast({
        recipientRoles: ['icpdp'],
        title: 'CLB đã hủy đơn timeline',
        body: `${result.timeline.clubName || 'CLB'} đã hủy timeline ${result.timeline.semesterLabel || ''}.`,
        type: 'timeline_cancel',
        refId: String(result.id || ''),
        refType: 'semester_timeline',
      }).catch(() => {});
    }
    res.status(200).json({
      success: true,
      ...result,
      message: result.mode === 'cancelled' ? 'Đã hủy đơn timeline.' : 'Đã xóa timeline.',
    });
  } catch (error) {
    handleTimelineError(res, error);
  }
};

const requestSemesterTimelineChange = async (req, res) => {
  try {
    const timeline = await clubSemesterTimelineService.requestChangeForClub(
      req.params.id,
      req.body,
      req.user._id,
      readActiveClubId(req)
    );
    createAndBroadcast({
      recipientRoles: ['icpdp'],
      title: 'Yêu cầu thay đổi timeline CLB',
      body: `${timeline.clubName || 'CLB'} vừa gửi yêu cầu thay đổi timeline.`,
      type: 'timeline_change',
      refId: String(timeline.id || timeline._id || ''),
      refType: 'semester_timeline'
    }).catch(() => {});
    res.status(200).json({
      success: true,
      timeline,
      message: 'Đã gửi yêu cầu — chờ IC-PDP và Admin duyệt.',
    });
  } catch (error) {
    handleTimelineError(res, error);
  }
};

const withdrawSemesterTimeline = async (req, res) => {
  try {
    const timeline = await clubSemesterTimelineService.withdrawForClub(
      req.params.id,
      req.user._id,
      readActiveClubId(req)
    );
    res.status(200).json({
      success: true,
      timeline,
      message: 'Đã thu hồi đơn về bản nháp.',
    });
  } catch (error) {
    handleTimelineError(res, error);
  }
};

const icpdpListClubs = async (req, res) => {
  const result = await clubService.getAllClubsForManagement();
  res.status(200).json({ success: true, ...result });
};

const icpdpUpdateClub = async (req, res) => {
  const result = await clubService.updateClubByIcpdp(req.params.id, req.body);
  res.status(200).json({ success: true, ...result });
};

const icpdpDeleteClub = async (req, res) => {
  const result = await clubService.deleteClubByIcpdp(req.params.id);
  res.status(200).json({ success: true, ...result });
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
  listSemesterTimelines,
  getSemesterTimeline,
  createSemesterTimeline,
  updateSemesterTimeline,
  submitSemesterTimeline,
  deleteSemesterTimeline,
  withdrawSemesterTimeline,
  requestSemesterTimelineChange,
  icpdpListClubs,
  icpdpUpdateClub,
  icpdpDeleteClub,
};
