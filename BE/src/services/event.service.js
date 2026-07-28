const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventProposal = require('../models/EventProposal');
const Club = require('../models/Club');
const EventRegistration = require('../models/EventRegistration');
const AppError = require('../utils/AppError');
const { isValidEventVenue } = require('../constants/eventVenues');
const { normalizeEventCategory } = require('../constants/eventCategories');
const { SCHOOL_EVENT_PUBLIC_STATUSES, canRoleManageSchoolEvent } = require('../constants/eventWorkflow');
const { getRegisteredEventIds } = require('./registration.service');
const { enrichEventWithPricing } = require('../constants/eventPricing');
const {
  normalizeTicketTypes,
  deriveTicketPriceFromTypes,
  totalQtyFromTypes,
  attachTicketRegistrationCounts
} = require('../utils/ticketTypes');
const { normalizeLearningOutcomes } = require('../utils/learningOutcomes');
const { findClubManagedBy, findManagedClubs, resolveManagedClub } = require('./club.service');
const { applyEventTextSearch, normalizeSearchTerm, escapeRegex } = require('../utils/eventSearch');
const { getCachedApprovedEvents, setCachedApprovedEvents } = require('../utils/eventCache');
const { createAndBroadcast } = require('./notification.service');
const { canClubImmediateDelete } = require('../constants/eventModeration');
const { buildEditPayload, applyEditPayload } = require('../utils/eventEditPayload');
const { assertCapacityCoversRegistrations } = require('./eventCapacity.service');
const { assertEventScheduleDates } = require('../utils/dateValidation');
const { assertNoVenueTimeConflict } = require('../utils/venueTimeConflict');
const {
  eventHasAnyCover,
  sanitizeEventCoverForApi,
  resolveCoverResponse,
  attachInlineEventCover,
  isDataUri,
  writeCoverFromDataUri,
} = require('../utils/eventCoverStorage');
const {
  entityHasAnyPlanFile,
  sanitizeEventPlanForApi,
  sendPlanFile,
  PLAN_SCOPES,
  writePlanFromDataUri,
} = require('../utils/eventPlanStorage');
const {
  sanitizeSpeakersForApi,
  resolveSpeakerAvatarResponse,
  writeSpeakerAvatarFromDataUri,
} = require('../utils/speakerAvatarStorage');
const { isDataUri: isAnyDataUri } = require('../utils/dataUriStorage');

/** Trạng thái chờ duyệt (đồng bộ với luồng CTSV / CLB) */
const PENDING_EVENT_STATUSES = ['pending', 'pending_ctsv', 'pending_icpdp', 'pending_admin', 'revision'];
const CLUB_ADMIN_APPROVE_STATUS = 'pending_admin';

const buildProposalPayloadFromEvent = (event, managedClub, userEmail) => ({
  title: event.title,
  description: event.description || '',
  learningOutcomes: Array.isArray(event.learningOutcomes) ? event.learningOutcomes : [],
  category: event.category,
  startDate: event.startDate,
  endDate: event.endDate || null,
  location: event.location || '',
  totalTickets: event.totalTickets || event.capacity || 100,
  ticketPrice: event.ticketPrice ?? 0,
  ticketTypes: event.ticketTypes || [],
  expectedAttendees: event.expectedAttendees ?? 0,
  image: event.thumbnail || event.image || '',
  eventPlanFile: '',
  eventPlanFileExt: event.eventPlanFileExt || '',
  eventPlanFileName: event.eventPlanFileName || '',
  eventPlanFileMime: event.eventPlanFileMime || '',
  eventPlanLink: event.eventPlanLink || '',
  clubId: managedClub ? String(managedClub._id) : (event.clubId ? String(event.clubId) : ''),
  clubName: managedClub?.name || event.clubName || '',
  submittedByEmail: userEmail || event.createdByEmail || '',
  linkedEventId: event._id,
  timelineSource: event.timelineSource?.itemTitle
    ? {
        timelineId: event.timelineSource.timelineId || null,
        itemTitle: event.timelineSource.itemTitle || '',
        semesterLabel: event.timelineSource.semesterLabel || '',
      }
    : undefined,
});

const normalizeTimelineSource = (body) => {
  const src = body?.timelineSource;
  if (!src || !String(src.itemTitle || '').trim()) return null;
  return {
    timelineId: src.timelineId || null,
    itemTitle: String(src.itemTitle).trim(),
    semesterLabel: String(src.semesterLabel || '').trim(),
  };
};

const syncClubEventProposal = async (event, { managedClub, userEmail, proposalStatus = 'pending_icpdp', resetReviewNotes = false }) => {
  const payload = {
    ...buildProposalPayloadFromEvent(event, managedClub, userEmail),
    status: proposalStatus,
  };
  if (resetReviewNotes) {
    payload.icpdpNote = '';
    payload.ctsvNote = '';
    payload.rejectionReason = '';
  }

  if (event.proposalId) {
    await EventProposal.findByIdAndUpdate(event.proposalId, payload);
    return;
  }

  const proposal = await EventProposal.create(payload);
  event.proposalId = proposal._id;
  await event.save();
};

const ClubSemesterTimeline = require('../models/ClubSemesterTimeline');

const assertApprovedTimelineForClub = async (clubId) => {
  const approved = await ClubSemesterTimeline.findOne({
    clubId,
    status: 'approved',
  }).select('_id semesterLabel').lean();

  if (!approved) {
    throw new AppError(
      'CLB cần có timeline kỳ học đã được phê duyệt trước khi tạo đề xuất sự kiện.',
      400
    );
  }
};

const isClubManagedEvent = (event) => event.source === 'club' || Boolean(event.clubId);

// Quyền thao tác sự kiện: chính người tạo, hoặc club_manager của CLB sở hữu sự
// kiện đó (dựa trên clubId), để chuyển chủ nhiệm hay nhiều quản lý cùng CLB đều
// truy cập được sự kiện của CLB thay vì chỉ người đã tạo.
const userCanManageEvent = async (user, event) => {
  if (String(event.createdBy) === String(user._id)) return true;
  if (user.role === 'club_manager' && event.clubId) {
    const managedClubs = await findManagedClubs(user._id);
    return managedClubs.some((c) => String(c._id) === String(event.clubId));
  }
  return false;
};

const notifyClubProposalToIcpdp = async (event, { isResubmit = false, clubName = '' } = {}) => {
  if (!isClubManagedEvent(event) && event.source !== 'club') return;

  let proposalRef = event.proposalId ? String(event.proposalId) : '';
  if (!proposalRef) {
    const fresh = await Event.findById(event._id).select('proposalId').lean();
    proposalRef = fresh?.proposalId ? String(fresh.proposalId) : String(event._id);
  }

  const label = clubName || event.clubName || 'CLB';
  const eventTitle = event.title || 'đề xuất sự kiện';

  createAndBroadcast({
    recipientRoles: ['icpdp'],
    title: isResubmit ? 'CLB đã gửi lại đề xuất sự kiện' : 'CLB gửi đề xuất sự kiện mới',
    body: isResubmit
      ? `${label} đã cập nhật và gửi lại đề xuất "${eventTitle}" để IC-PDP duyệt.`
      : `${label} gửi đề xuất sự kiện "${eventTitle}" cần IC-PDP duyệt.`,
    type: isResubmit ? 'event_resubmit' : 'event_submit',
    refId: proposalRef,
    refType: 'event_proposal',
  }).catch(() => {});
};

// Báo cho CLB khi đề xuất sự kiện của họ được duyệt / bị từ chối (chấm đỏ + email).
const notifyClubEventDecision = async (event, status, rejectionReason = '') => {
  try {
    if (!isClubManagedEvent(event)) return;
    let managerEmail = '';
    let clubName = event.clubName || 'CLB';
    if (event.clubId) {
      const club = await Club.findById(event.clubId).select('name managedBy').lean();
      if (club) {
        clubName = club.name || clubName;
        if (club.managedBy) {
          const User = require('../models/User');
          const manager = await User.findById(club.managedBy).select('email').lean();
          managerEmail = manager?.email || '';
        }
      }
    }
    const eventTitle = event.title || 'sự kiện';
    const approved = status === 'approved';
    createAndBroadcast({
      recipientRoles: managerEmail ? [] : ['club_manager'],
      recipientEmails: managerEmail ? [managerEmail] : [],
      title: approved ? 'Đề xuất sự kiện đã được duyệt' : 'Đề xuất sự kiện bị từ chối',
      body: approved
        ? `Sự kiện "${eventTitle}" của ${clubName} đã được phê duyệt.`
        : `Sự kiện "${eventTitle}" của ${clubName} đã bị từ chối${rejectionReason ? `: ${rejectionReason}` : '.'}`,
      type: approved ? 'event_approved' : 'event_rejected',
      refId: event.proposalId ? String(event.proposalId) : String(event._id),
      refType: 'event_proposal',
    }).catch(() => {});
  } catch (err) {
    console.error('[notifyClubEventDecision]', err.message);
  }
};

// Báo chuông cho những người đang theo dõi CLB khi CLB có sự kiện mới được duyệt.
const notifyClubFollowersNewEvent = async (event) => {
  try {
    if (!isClubManagedEvent(event) || !event.clubId) return;
    const ClubFollow = require('../models/ClubFollow');
    const [club, follows] = await Promise.all([
      Club.findById(event.clubId).select('name').lean(),
      ClubFollow.find({ club: event.clubId, status: 'following' })
        .populate('user', 'email')
        .lean(),
    ]);
    const emails = follows.map((f) => f.user?.email).filter(Boolean);
    if (!emails.length) return;
    const clubName = club?.name || event.clubName || 'CLB bạn theo dõi';
    createAndBroadcast({
      recipientEmails: emails,
      title: `${clubName} vừa có sự kiện mới`,
      body: `Sự kiện "${event.title || 'Sự kiện mới'}" đã mở — xem chi tiết và đăng ký ngay.`,
      type: 'club_new_event',
      refId: String(event._id),
      // refType 'Event' → chuông dẫn tới /events/:id, không nằm nhóm gửi email hàng loạt.
      refType: 'Event',
    }).catch(() => {});
  } catch (err) {
    console.error('[notifyClubFollowersNewEvent]', err.message);
  }
};

const notifyClubProposalDeletedToIcpdp = async (event, { clubName = '' } = {}) => {
  if (!isClubManagedEvent(event) && event.source !== 'club') return;

  let proposalRef = event.proposalId ? String(event.proposalId) : '';
  if (!proposalRef) {
    const fresh = await Event.findById(event._id).select('proposalId').lean();
    proposalRef = fresh?.proposalId ? String(fresh.proposalId) : String(event._id);
  }

  const label = clubName || event.clubName || 'CLB';
  const eventTitle = event.title || 'đề xuất sự kiện';

  createAndBroadcast({
    recipientRoles: ['icpdp'],
    title: 'CLB đã xóa đề xuất sự kiện',
    body: `${label} đã hủy đề xuất "${eventTitle}" đang chờ duyệt. Vui lòng cập nhật hàng đợi phê duyệt.`,
    type: 'event_delete',
    refId: proposalRef,
    refType: 'event_proposal',
  }).catch(() => {});
};

const CLUB_META_FIELDS = 'name slug description memberCount eventsHeld coverImage logoText logoColor';

// ticketTypes + studentRegisteredCount để thẻ sự kiện tách được tiến độ vé sinh viên
// và vé khách; thiếu hai field này thì FE chỉ có tổng gộp, không biết ai còn chỗ.
const EVENT_PUBLIC_LIST_META_FIELDS =
  'title description category startDate endDate location capacity registeredCount studentRegisteredCount ticketTypes ticketPrice eventState eventType source schoolOrganizerRole status clubId partnerId createdAt postponeReason coverFileExt registrationStartDate registrationEndDate';

const PUBLIC_LIST_DESC_LIMIT = 320;
const DEFAULT_LIST_LIMIT = 24;
const MAX_LIST_LIMIT = 48;
const MAX_PUBLIC_EVENTS_INDEX = 500;

const parseListPage = (page) => Math.max(1, parseInt(page, 10) || 1);

const parseListLimit = (limit) =>
  Math.min(MAX_LIST_LIMIT, Math.max(1, parseInt(limit, 10) || DEFAULT_LIST_LIMIT));

/** Metadata cache — không giữ base64; ảnh lấy qua GET /api/events/:id/cover */
const stripImagesFromCachedEvent = (event) => {
  const hasCover = eventHasAnyCover(event);
  const { image: _image, thumbnail: _thumbnail, ...rest } = event;
  return { ...rest, hasCover };
};

/** Payload danh sách công khai — nhẹ, có coverUrl lazy-load */
const slimEventForPublicList = (event) => {
  const { image: _image, thumbnail: _thumbnail, description, ...rest } = event;
  const id = String(event._id || event.id || '');
  const hasCover = event.hasCover === true || eventHasAnyCover(event);
  return {
    ...rest,
    description: description ? String(description).slice(0, PUBLIC_LIST_DESC_LIMIT) : '',
    hasCover,
    coverUrl: hasCover && id ? `/api/events/${id}/cover` : '',
  };
};

const attachEventMediaForApi = (event) => {
  const cover = sanitizeEventCoverForApi(event);
  const plan = sanitizeEventPlanForApi(event, PLAN_SCOPES.events);
  const speakers = sanitizeSpeakersForApi(event);
  const {
    image: _image,
    thumbnail: _thumbnail,
    eventPlanFile: _plan,
    speakers: _speakers,
    ...rest
  } = event;
  return {
    ...rest,
    ...cover,
    ...plan,
    eventPlanFile: '',
    speakers: speakers.speakers,
    speaker: speakers.speaker,
    speakerRole: speakers.speakerRole,
    speakerAvatar: speakers.speakerAvatar,
  };
};

const resolveOrganizerType = (event) => {
  const source = event?.source || 'club';
  if (source === 'partner') return 'partner';
  if (source === 'club') return 'club';
  if (source === 'school') {
    return event?.schoolOrganizerRole === 'icpdp' ? 'icpdp' : 'ctsv';
  }
  return 'club';
};

const applyOrganizerFilter = (events, organizerId) => {
  const key = String(organizerId || '').trim();
  if (!key || key === 'all') return events;
  return events.filter((event) => resolveOrganizerType(event) === key);
};

/**
 * Nhóm hiển thị của các pill lọc trên trang Sự kiện — xét theo việc KHÁCH CÓ ĐĂNG KÝ
 * VÉ ĐƯỢC KHÔNG, không phải theo ngày diễn ra:
 *   ongoing   — đang cho đăng ký (đã mở đăng ký, còn vé, chưa đóng)
 *   upcoming  — mới chỉ công bố, chưa tới ngày mở đăng ký
 *   soldout   — còn trong hạn đăng ký nhưng đã bán hết vé
 *   ended     — hết hạn: sự kiện đã diễn ra xong, hoặc đã quá hạn đăng ký
 *   postponed — bị hoãn
 * Thứ tự kiểm tra bên dưới khiến năm nhóm rời nhau và phủ hết danh sách, nên tổng
 * số của chúng luôn bằng số sự kiện ở "Tất cả".
 */
const resolveRegistrationState = (event, now) => {
  if (event.eventState === 'postponed') return 'postponed';

  const end = new Date(event.endDate || 0).getTime();
  if (event.eventState === 'expired' || (!Number.isNaN(end) && end < now)) return 'ended';

  const regEnd = new Date(event.registrationEndDate || 0).getTime();
  if (event.registrationEndDate && !Number.isNaN(regEnd) && regEnd < now) return 'ended';

  // Hết vé xét sau "hết hạn": sự kiện đã qua hạn thì nhãn "hết hạn" mới đúng, dù
  // trước đó có bán hết vé hay không.
  const capacity = event.capacity ?? 0;
  const registered = event.registeredCount ?? 0;
  if (capacity > 0 && registered >= capacity) return 'soldout';

  const regStart = new Date(event.registrationStartDate || 0).getTime();
  if (event.registrationStartDate && !Number.isNaN(regStart) && regStart > now) return 'upcoming';

  return 'ongoing';
};

const applyStateFilter = (events, stateId, registeredSet) => {
  const key = String(stateId || '').trim();
  if (!key || key === 'all') return events;
  const now = Date.now();

  return events.filter((event) => {
    if (key === 'registered') return registeredSet.has(String(event._id));

    const state = resolveRegistrationState(event, now);
    if (key === 'ongoing') return state === 'ongoing';
    if (key === 'upcoming') return state === 'upcoming';
    if (key === 'soldout') return state === 'soldout';
    if (key === 'expired') return state === 'ended';
    if (key === 'postponed') return state === 'postponed';
    // 'open' (tương thích ngược): còn đăng ký được hoặc sắp mở đăng ký.
    if (key === 'open') return state === 'ongoing' || state === 'upcoming';
    return true;
  });
};

/**
 * Banner trang chủ: sự kiện chưa kết thúc luôn được ưu tiên hơn sự kiện đã qua.
 * Trước đây chỉ xếp theo registeredCount toàn thời gian, nên vài sự kiện lớn đã
 * kết thúc (Jamboree, Miss Grand...) chiếm banner vĩnh viễn và sự kiện mới
 * không bao giờ lên được.
 */
const rankFeatured = (list) => {
  const now = Date.now();
  const isUpcoming = (event) => {
    if (event.eventState !== 'active') return false;
    const end = new Date(event.endDate).getTime();
    return Number.isNaN(end) || end >= now;
  };

  return list.sort((a, b) => {
    const upcomingDiff = Number(isUpcoming(b)) - Number(isUpcoming(a));
    if (upcomingDiff !== 0) return upcomingDiff;

    // Trong nhóm sắp diễn ra: sự kiện bắt đầu sớm nhất lên trước, để banner luôn
    // xoay theo lịch thay vì đứng yên ở sự kiện đông nhất.
    if (isUpcoming(a) && isUpcoming(b)) {
      const startDiff = new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
      if (startDiff !== 0) return startDiff;
    }

    return (b.registeredCount ?? 0) - (a.registeredCount ?? 0);
  });
};

/**
 * Danh sách sự kiện với bộ lọc "Tất cả": xếp theo giai đoạn thay vì startDate
 * tăng dần, vì startDate tăng dần đẩy toàn bộ sự kiện đã kết thúc lên đầu.
 * Thứ tự: đang diễn ra → sắp diễn ra → tạm hoãn → đã kết thúc.
 *
 * Lưu ý: đây là giai đoạn THEO NGÀY DIỄN RA, khác resolveRegistrationState (theo
 * khả năng đăng ký) dùng cho các pill lọc. Sắp xếp phải bám ngày thật, nếu không
 * một sự kiện đang diễn ra nhưng đã đóng đăng ký sẽ bị đẩy xuống cuối trang.
 */
const PHASE_ORDER = { ongoing: 0, upcoming: 1, postponed: 2, ended: 3 };

const resolveEventPhase = (event, now) => {
  const start = new Date(event.startDate || 0).getTime();
  const end = new Date(event.endDate || 0).getTime();
  const hasEnded = !Number.isNaN(end) && end < now;

  // Hoãn xét trước khi kết thúc: sự kiện bị hoãn không còn giữ mốc ngày cũ (giao diện
  // hiển thị "TBA"), nên không được xếp lẫn xuống đáy cùng nhóm đã kết thúc.
  if (event.eventState === 'postponed') return 'postponed';
  if (event.eventState === 'expired' || hasEnded) return 'ended';
  if (!Number.isNaN(start) && start <= now) return 'ongoing';
  return 'upcoming';
};

const rankByPhase = (list) => {
  const now = Date.now();
  const phases = new Map(list.map((event) => [event, resolveEventPhase(event, now)]));

  return list.sort((a, b) => {
    const phaseA = phases.get(a);
    const phaseB = phases.get(b);
    if (phaseA !== phaseB) return PHASE_ORDER[phaseA] - PHASE_ORDER[phaseB];

    // Đã kết thúc: sự kiện vừa kết thúc lên trước (mới nhất trước).
    if (phaseA === 'ended') {
      return new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime();
    }
    // Đang diễn ra: sắp hết trước; còn lại: bắt đầu sớm nhất trước.
    if (phaseA === 'ongoing') {
      return new Date(a.endDate || 0).getTime() - new Date(b.endDate || 0).getTime();
    }
    return new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
  });
};

const applySort = (events, sort) => {
  const list = [...events];
  switch (String(sort || '').trim()) {
    case 'featured':
      return rankFeatured(list);
    case 'popular':
      return list.sort((a, b) => (b.registeredCount ?? 0) - (a.registeredCount ?? 0));
    case 'newest':
      return list.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    case 'startDate':
    default:
      return list.sort(
        (a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime()
      );
  }
};

const isValidClubId = (clubId) => {
  const value = String(clubId || '').trim();
  return Boolean(value && value !== 'null' && value !== 'undefined' && mongoose.Types.ObjectId.isValid(value));
};

const mapClubMeta = (club) => {
  if (!club) return {};
  return {
    clubName: club.name || '',
    clubSlug: club.slug || '',
    clubDescription: club.description || '',
    clubMemberCount: club.memberCount ?? 0,
    clubEventsHeld: club.eventsHeld ?? 0,
    clubLogo: club.coverImage || '',
    clubLogoText: club.logoText || '',
    clubLogoColor: club.logoColor || '',
  };
};

const pickClubMetaFromDoc = (doc) => {
  if (!doc?.clubName) return null;
  return {
    clubName: doc.clubName,
    clubSlug: doc.clubSlug,
    clubDescription: doc.clubDescription,
    clubMemberCount: doc.clubMemberCount,
    clubEventsHeld: doc.clubEventsHeld,
    clubLogo: doc.clubLogo,
    clubLogoText: doc.clubLogoText,
    clubLogoColor: doc.clubLogoColor,
  };
};

const attachClubMetaBatch = async (docs) => {
  const clubIds = [...new Set(docs.map((doc) => String(doc.clubId)).filter(isValidClubId))];
  if (!clubIds.length) return docs;

  const clubs = await Club.find({ _id: { $in: clubIds } }).select(CLUB_META_FIELDS).lean();
  const clubMap = new Map(clubs.map((club) => [String(club._id), club]));

  return docs.map((doc) => {
    if (!isValidClubId(doc.clubId)) return doc;
    const club = clubMap.get(String(doc.clubId));
    return club ? { ...doc, ...mapClubMeta(club) } : doc;
  });
};

const createEvent = async (user, body, activeClubId = null) => {
  const {
    title,
    description,
    thumbnail,
    bannerFileName,
    eventPlanFile,
    eventPlanFileName,
    eventPlanFileMime,
    eventPlanLink,
    category,
    registrationStartDate,
    registrationEndDate,
    startDate,
    endDate,
    location,
    capacity,
    ticketPrice,
    ticketTypes,
    speaker,
    agenda,
    learningOutcomes,
    timelineSource: timelineSourceBody,
  } = body;

  const timelineSource = normalizeTimelineSource({ timelineSource: timelineSourceBody });

  const normalizedTickets = normalizeTicketTypes(ticketTypes);
  const resolvedTicketPrice =
    Math.max(0, Number(ticketPrice) || 0) || deriveTicketPriceFromTypes(normalizedTickets);
  const resolvedCapacity = Math.max(1, Number(capacity) || 0);
  const resolvedTotalTickets =
    totalQtyFromTypes(normalizedTickets) || resolvedCapacity;

  if (!title || !registrationStartDate || !startDate || !location || !capacity) {
    throw new AppError('Vui lòng điền đầy đủ thông tin bắt buộc!', 400);
  }

  assertEventScheduleDates({
    registrationStartDate: new Date(registrationStartDate),
    startDate: new Date(startDate),
  });

  const isClubManager = user.role === 'club_manager';
  const managedClub = isClubManager ? await resolveManagedClub(user._id, activeClubId) : null;
  if (!isClubManager && !isValidEventVenue(location)) {
    throw new AppError(
      'Địa điểm không hợp lệ. Chọn một trong: Sảnh tòa Gamma, Sảnh tòa Beta, Tầng 4 tòa Beta, Tầng 5 tòa Alpha.',
      400
    );
  }

  // Chặn trùng địa điểm + khung giờ với sự kiện khác (mọi nguồn) hoặc đơn đối tác chờ duyệt.
  await assertNoVenueTimeConflict({ location, startDate, endDate });

  if (isClubManager) {
    if (!managedClub?._id) {
      throw new AppError('Không tìm thấy CLB bạn đang quản lý.', 400);
    }
    await assertApprovedTimelineForClub(managedClub._id);
    const planLink = String(eventPlanLink || '').trim();
    const hasPlanFile = Boolean(eventPlanFile?.trim());
    const hasPlanLink = /^https?:\/\//i.test(planLink);
    if (!hasPlanFile && !hasPlanLink) {
      throw new AppError('Vui lòng tải file hoặc dán link bảng kế hoạch sự kiện!', 400);
    }
  }

  const initialStatus = isClubManager ? 'pending_icpdp' : 'pending';

  const newEvent = await Event.create({
    title,
    description: description || 'Chưa có mô tả',
    thumbnail: thumbnail || undefined,
    bannerFileName: bannerFileName?.trim() || '',
    eventPlanFile: eventPlanFile || '',
    eventPlanFileName: eventPlanFileName?.trim() || '',
    eventPlanFileMime: eventPlanFileMime?.trim() || '',
    eventPlanLink: String(eventPlanLink || '').trim(),
    category: normalizeEventCategory(category || 'Khác'),
    registrationStartDate: registrationStartDate || null,
    registrationEndDate: registrationEndDate || null,
    startDate,
    endDate,
    location,
    capacity: resolvedCapacity,
    totalTickets: resolvedTotalTickets,
    ticketPrice: resolvedTicketPrice,
    ticketTypes: normalizedTickets,
    registeredCount: 0,
    eventState: 'active',
    createdBy: user._id,
    createdByEmail: user.email || '',
    clubId: managedClub?._id || null,
    source: isClubManager ? 'club' : undefined,
    status: initialStatus,
    speaker: speaker || undefined,
    agenda: agenda || undefined,
    learningOutcomes: normalizeLearningOutcomes(learningOutcomes),
    ...(timelineSource ? { timelineSource } : {}),
  });

  if (isClubManager) {
    await syncClubEventProposal(newEvent, {
      managedClub,
      userEmail: user.email,
      proposalStatus: 'pending_icpdp',
    });
    await notifyClubProposalToIcpdp(newEvent, {
      isResubmit: false,
      clubName: managedClub?.name || '',
    });
  }

  return {
    message: isClubManager
      ? 'Đề xuất sự kiện đã gửi IC-PDP duyệt!'
      : 'Đề xuất sự kiện đã được gửi thành công và đang chờ duyệt!',
    event: newEvent,
  };
};

const MY_EVENTS_LIST_FIELDS =
  'title category startDate endDate location capacity registeredCount status eventState rejectionReason moderationReason ticketPrice speaker createdAt updatedAt createdBy thumbnail image coverFileExt';

const getMyEvents = async (user, activeClubId = null) => {
  let query = { createdBy: user._id };

  if (user.role === 'club_manager') {
    const managedClubs = await findManagedClubs(user._id);
    const managedClubIds = managedClubs.map((c) => c._id);
    // Chủ nhiệm thấy: sự kiện do mình tạo HOẶC sự kiện thuộc CLB mình quản lý
    // (không phụ thuộc người tạo — quan trọng sau khi chuyển chủ nhiệm).
    const or = [{ createdBy: user._id }];
    // activeClubId đến từ header FE và có thể là CLB cũ / không còn thuộc quyền
    // quản lý (ví dụ sau khi admin đổi vai trò). Chỉ dùng khi nó thực sự nằm
    // trong danh sách CLB đang quản lý, nếu không thì lấy toàn bộ.
    const isManagedActiveClub = activeClubId
      && managedClubIds.some((id) => String(id) === String(activeClubId));
    if (isManagedActiveClub) {
      or.push({ clubId: activeClubId });
    } else if (managedClubIds.length) {
      or.push({ clubId: { $in: managedClubIds } });
    }
    query = { $or: or };
  }

  const events = await Event.find(query)
    .select(MY_EVENTS_LIST_FIELDS)
    .sort({ createdAt: -1 })
    .lean();
  return { events: events.map(slimEventForPublicList) };
};

const DELETABLE_CLUB_STATUSES = ['pending', 'pending_icpdp', 'pending_ctsv', 'pending_admin', 'revision', 'rejected'];

const deleteMyEvent = async (eventId, user) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }
  if (!(await userCanManageEvent(user, event))) {
    throw new AppError('Bạn không có quyền xóa sự kiện này!', 403);
  }

  const isClubEvent = isClubManagedEvent(event) || user.role === 'club_manager';
  if (isClubEvent) {
    if (!canClubImmediateDelete(event)) {
      throw new AppError(
        'Sự kiện đã được duyệt hoặc đang có yêu cầu chờ xử lý. Vui lòng gửi yêu cầu xóa qua IC-PDP.',
        400
      );
    }

    const managedClub = await resolveManagedClub(
      user._id,
      event.clubId ? String(event.clubId) : null
    );
    const clubName = managedClub?.name || event.clubName || '';

    await notifyClubProposalDeletedToIcpdp(event, { clubName });

    if (event.proposalId) {
      await EventProposal.findByIdAndDelete(event.proposalId);
    }
    await Event.findByIdAndDelete(eventId);
    return { message: 'Đã xóa sự kiện thành công!' };
  }

  if (event.status !== 'rejected') {
    throw new AppError('Chỉ có thể xóa sự kiện ở trạng thái bị từ chối.', 400);
  }
  await Event.findByIdAndDelete(eventId);
  return { message: 'Đã xóa sự kiện thành công!' };
};

const EDITABLE_CLUB_STATUSES = ['pending', 'rejected', 'approved', 'revision', 'pending_ctsv', 'pending_icpdp', 'pending_admin', 'live', 'ended'];

const updateMyEvent = async (eventId, user, body, activeClubId = null) => {
  const event = await Event.findById(eventId);
  if (!event) throw new AppError('Không tìm thấy sự kiện!', 404);
  if (!(await userCanManageEvent(user, event))) {
    throw new AppError('Bạn không có quyền chỉnh sửa sự kiện này!', 403);
  }
  if (!EDITABLE_CLUB_STATUSES.includes(event.status)) {
    throw new AppError('Sự kiện không thể chỉnh sửa ở trạng thái hiện tại.', 400);
  }
  // Sự kiện CLB đã được duyệt: CLB điền form sửa và gửi luôn — nội dung giữ chờ
  // (pending edit), chỉ áp dụng khi Admin duyệt (IC-PDP → Admin). Không cần xin
  // phép chỉnh sửa trước.
  const isClubModerationEdit =
    isClubManagedEvent(event) &&
    ['approved', 'live', 'ended'].includes(event.status) &&
    !event.clubEditUnlocked;

  if (user.role === 'club_manager' && !event.clubId) {
    const managedClub = await resolveManagedClub(user._id, activeClubId);
    if (managedClub) event.clubId = managedClub._id;
  }

  const {
    title,
    description,
    thumbnail,
    bannerFileName,
    eventPlanFile,
    eventPlanFileName,
    eventPlanFileMime,
    eventPlanLink,
    category,
    registrationStartDate,
    registrationEndDate,
    startDate,
    endDate,
    location,
    capacity,
    ticketPrice,
    ticketTypes,
    speaker,
    agenda,
    learningOutcomes,
    timelineSource: timelineSourceBody,
  } = body;

  const timelineSource = normalizeTimelineSource({ timelineSource: timelineSourceBody });

  const normalizedTickets = normalizeTicketTypes(ticketTypes);
  const resolvedTicketPrice =
    Math.max(0, Number(ticketPrice) || 0) || deriveTicketPriceFromTypes(normalizedTickets);
  const resolvedCapacity = Math.max(1, Number(capacity) || event.capacity || 100);
  const resolvedTotalTickets = totalQtyFromTypes(normalizedTickets) || resolvedCapacity;

  if (!title || !registrationStartDate || !startDate || !location || !capacity) {
    throw new AppError('Vui lòng điền đầy đủ thông tin bắt buộc!', 400);
  }

  assertCapacityCoversRegistrations(event, {
    capacity: resolvedCapacity,
    totalTickets: resolvedTotalTickets,
  });

  assertEventScheduleDates({
    registrationStartDate: new Date(registrationStartDate),
    startDate: new Date(startDate),
  });

  // Chặn trùng địa điểm + khung giờ (bỏ qua chính sự kiện đang sửa).
  await assertNoVenueTimeConflict({ location, startDate, endDate, excludeEventId: event._id });

  const existingPlanLink = String(event.eventPlanLink || '').trim();
  const incomingPlanLink = String(eventPlanLink ?? event.eventPlanLink ?? '').trim();
  const hasIncomingPlanFile = Boolean(eventPlanFile?.trim());
  const hasIncomingPlanLink = /^https?:\/\//i.test(incomingPlanLink);
  const hasExistingPlan =
    entityHasAnyPlanFile(event, PLAN_SCOPES.events) || Boolean(existingPlanLink);

  if (user.role === 'club_manager' && !hasIncomingPlanFile && !hasIncomingPlanLink && !hasExistingPlan) {
    throw new AppError('Vui lòng tải file hoặc dán link bảng kế hoạch sự kiện!', 400);
  }

  const editFields = {
    title,
    description,
    thumbnail: thumbnail || undefined,
    bannerFileName,
    eventPlanFile: eventPlanFile || undefined,
    eventPlanFileName,
    eventPlanFileMime,
    eventPlanLink: eventPlanLink !== undefined ? incomingPlanLink : undefined,
    category: normalizeEventCategory(category || event.category),
    registrationStartDate,
    registrationEndDate,
    startDate,
    endDate,
    location,
    capacity: resolvedCapacity,
    totalTickets: resolvedTotalTickets,
    ticketPrice: resolvedTicketPrice,
    ticketTypes: normalizedTickets,
    speaker,
    agenda,
    learningOutcomes:
      learningOutcomes !== undefined ? normalizeLearningOutcomes(learningOutcomes) : undefined,
    timelineSource: timelineSource || undefined,
  };

  // CLB gửi form sửa cho sự kiện đã duyệt → giữ chờ, chỉ áp dụng khi Admin duyệt.
  if (isClubModerationEdit) {
    event.pendingEdit = {
      payload: buildEditPayload(editFields),
      requestedByEmail: user.email || '',
      requestedAt: new Date(),
    };
    event.statusBeforeModeration = event.status;
    event.status = 'pending_icpdp_edit';
    event.moderationReason = String(body.moderationReason || '').trim();
    event.moderationReasonCategory = '';
    event.moderationRequestedByEmail = user.email || '';
    event.moderationRequestedAt = new Date();
    event.clubEditUnlocked = false;
    event.icpdpNote = '';
    event.rejectionReason = '';
    event.lastModerationAction = '';
    event.lastModerationRejectedBy = '';
    await event.save();

    createAndBroadcast({
      recipientRoles: ['icpdp'],
      title: 'CLB gửi yêu cầu chỉnh sửa sự kiện',
      body: `CLB vừa gửi nội dung chỉnh sửa cho sự kiện "${event.title}".`,
      type: 'event_change_submit',
      refId: String(event._id),
      refType: 'Event',
    }).catch(() => {});

    return {
      message: 'Đã gửi yêu cầu chỉnh sửa — chờ IC-PDP duyệt, sau đó Admin phê duyệt.',
      event,
    };
  }

  applyEditPayload(event, editFields);

  const previousStatus = event.status;
  const wasUnlockedEdit = Boolean(event.clubEditUnlocked);
  const shouldResubmitClubProposal =
    isClubManagedEvent(event) &&
    // Sửa khi đang chờ Admin duyệt lần đầu -> nội dung ICPDP đã duyệt không còn khớp,
    // phải gửi lại IC-PDP xét duyệt lại trước khi tới Admin.
    (['rejected', 'revision', 'pending_admin'].includes(previousStatus) ||
      (['approved', 'live', 'ended'].includes(previousStatus) && wasUnlockedEdit));
  if (shouldResubmitClubProposal) {
    event.status = 'pending_icpdp';
    event.rejectionReason = '';
    event.moderationReason = '';
    event.icpdpNote = '';
    event.ctsvNote = '';
    if (['approved', 'live', 'ended'].includes(previousStatus)) {
      event.approvedByEmail = '';
    }
    if (wasUnlockedEdit) {
      event.clubEditUnlocked = false;
    }
  }
  if (user.role === 'club_manager' && !event.source) {
    event.source = 'club';
  }

  await event.save();

  if (isClubManagedEvent(event)) {
    const managedClub = await resolveManagedClub(
      user._id,
      event.clubId ? String(event.clubId) : activeClubId
    );
    await syncClubEventProposal(event, {
      managedClub,
      userEmail: user.email,
      proposalStatus: 'pending_icpdp',
      resetReviewNotes: shouldResubmitClubProposal,
    });
    if (shouldResubmitClubProposal) {
      await notifyClubProposalToIcpdp(event, {
        isResubmit: true,
        clubName: managedClub?.name || event.clubName || '',
      });
    }
    return {
      message: 'Đã cập nhật đề xuất sự kiện và gửi lại duyệt!',
      event,
    };
  }

  const resubmitted =
    previousStatus === 'rejected' ||
    previousStatus === 'approved' ||
    previousStatus === 'revision' ||
    event.status === 'pending';
  const message = resubmitted
    ? 'Đã cập nhật đề xuất sự kiện và gửi lại duyệt!'
    : 'Đã cập nhật đề xuất sự kiện!';
  return {
    message,
    event,
  };
};

const getPendingEvents = async () => {
  const events = await Event.find({ status: { $in: PENDING_EVENT_STATUSES } })
    .populate('createdBy', 'fullname email studentId')
    .sort({ createdAt: -1 });

  return { events };
};

const updateEventStatus = async (eventId, { status, rejectionReason, authEmail }) => {
  if (!['approved', 'rejected'].includes(status)) {
    throw new AppError('Trạng thái không hợp lệ!', 400);
  }

  const event = await Event.findById(eventId);

  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  if (isClubManagedEvent(event)) {
    if (status === 'approved') {
      if (event.status === 'pending_icpdp') {
        throw new AppError('Sự kiện CLB cần IC-PDP duyệt trước, sau đó Admin phê duyệt.', 400);
      }
      if (event.status !== CLUB_ADMIN_APPROVE_STATUS) {
        throw new AppError('Chỉ phê duyệt sự kiện CLB khi đang chờ Admin duyệt.', 400);
      }
    } else if (!PENDING_EVENT_STATUSES.includes(event.status)) {
      throw new AppError('Sự kiện không ở trạng thái chờ duyệt!', 400);
    }
  } else if (!PENDING_EVENT_STATUSES.includes(event.status)) {
    throw new AppError('Sự kiện không ở trạng thái chờ duyệt!', 400);
  }

  event.status = status;
  if (status === 'approved') {
    event.approvedByEmail = authEmail || event.approvedByEmail || '';
    if (isClubManagedEvent(event)) {
      event.adminApprovedByEmail = authEmail || '';
      event.adminApprovedAt = new Date();
    }
  }
  if (status === 'rejected' && rejectionReason) {
    event.rejectionReason = rejectionReason;
  }

  await event.save();

  if (isClubManagedEvent(event) && event.proposalId) {
    const proposalUpdate = {
      status: status === 'approved' ? 'approved' : 'rejected',
    };
    if (status === 'rejected' && rejectionReason) {
      proposalUpdate.rejectionReason = rejectionReason;
    }
    if (status === 'approved') {
      proposalUpdate.eventId = event._id;
    }
    await EventProposal.findByIdAndUpdate(event.proposalId, proposalUpdate);
  }

  if (isClubManagedEvent(event)) {
    notifyClubEventDecision(event, status, rejectionReason).catch(() => {});
    if (status === 'approved') {
      notifyClubFollowersNewEvent(event).catch(() => {});
    }
  }

  return {
    message: `Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} sự kiện thành công!`,
    event,
  };
};

const resolveClubRef = async (idOrSlug) => {
  const raw = String(idOrSlug || '').trim();
  if (!raw) return null;
  if (mongoose.Types.ObjectId.isValid(raw)) {
    const byId = await Club.findById(raw).select('_id').lean();
    if (byId) return byId;
  }
  return Club.findOne({ slug: raw }).select('_id').lean();
};

const getApprovedEvents = async ({
  category,
  search,
  q,
  club,
  user,
  page = 1,
  limit = DEFAULT_LIST_LIMIT,
  sort = 'startDate',
  state,
  organizer,
  skipPagination = false,
} = {}) => {
  let allEvents = getCachedApprovedEvents();

  if (!allEvents) {
    const query = {
      status: { $in: SCHOOL_EVENT_PUBLIC_STATUSES },
      isHidden: { $ne: true },
      isDeleted: { $ne: true },
    };

    const rawEvents = await Event.find(query)
      .select(`${EVENT_PUBLIC_LIST_META_FIELDS} thumbnail image`)
      .sort({ startDate: 1 })
      .limit(MAX_PUBLIC_EVENTS_INDEX)
      .lean();

    allEvents = (await attachClubMetaBatch(rawEvents)).map(stripImagesFromCachedEvent);
    setCachedApprovedEvents(allEvents);
  }

  // 1. Filter by category in-memory
  let filtered = allEvents;
  const categoryValue = String(category || '').trim();
  if (categoryValue && categoryValue !== 'all' && categoryValue !== 'Tất cả') {
    filtered = filtered.filter((event) => event.category === categoryValue);
  }

  // 2. Filter by club in-memory
  const clubRef = String(club || '').trim();
  if (clubRef) {
    const clubDoc = await resolveClubRef(clubRef);
    if (!clubDoc) {
      return { events: [], total: 0 };
    }
    filtered = filtered.filter((event) => String(event.clubId) === String(clubDoc._id));
  }

  // 3. Filter by search term in-memory
  const searchTerm = normalizeSearchTerm(search || q);
  if (searchTerm) {
    const re = new RegExp(escapeRegex(searchTerm), 'i');
    
    // Find matching clubs first
    const matchingClubs = await Club.find({
      $or: [{ name: re }, { slug: re }],
    })
      .select('_id')
      .lean();
    const matchingClubIds = new Set(matchingClubs.map((c) => String(c._id)));

    filtered = filtered.filter((event) => {
      const matchesField = (text) => text && re.test(String(text));
      
      const titleMatch = matchesField(event.title);
      const locMatch = matchesField(event.location);
      const catMatch = matchesField(event.category);
      const descMatch = matchesField(event.description);
      const orgMatch = matchesField(event.schoolOrganizerRole);
      const clubMatch = event.clubId && matchingClubIds.has(String(event.clubId));
      
      return titleMatch || locMatch || catMatch || descMatch || orgMatch || clubMatch;
    });
  }

  const registeredIds = user?._id ? await getRegisteredEventIds(user._id) : [];
  const registeredSet = new Set(registeredIds.map((id) => String(id)));

  filtered = applyOrganizerFilter(filtered, organizer);
  filtered = applyStateFilter(filtered, state, registeredSet);

  // Bộ lọc "Tất cả" trộn mọi giai đoạn nên phải xếp theo giai đoạn; các bộ lọc
  // khác đã đồng nhất giai đoạn rồi, giữ nguyên sort cũ.
  const stateKey = String(state || 'all').trim() || 'all';
  const sortKey = String(sort || 'startDate').trim() || 'startDate';
  filtered =
    stateKey === 'all' && sortKey === 'startDate'
      ? rankByPhase([...filtered])
      : applySort(filtered, sort);

  const total = filtered.length;
  const safePage = parseListPage(page);
  const safeLimit = skipPagination ? total || DEFAULT_LIST_LIMIT : parseListLimit(limit);
  const skip = skipPagination ? 0 : (safePage - 1) * safeLimit;
  const pagedEvents = skipPagination
    ? filtered
    : filtered.slice(skip, skip + safeLimit);

  const finalEvents = pagedEvents.map((event) => {
    const doc = {
      ...event,
      isRegistered: registeredSet.has(String(event._id)),
    };
    return enrichEventWithPricing(doc, user);
  });

  return {
    events: finalEvents.map(slimEventForPublicList),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: skipPagination ? 1 : Math.max(1, Math.ceil(total / safeLimit)),
  };
};

const canAccessEventCover = async (event, { user, userRole, activeClubId } = {}) => {
  if (!event || event.isDeleted) return false;

  const isPublic =
    SCHOOL_EVENT_PUBLIC_STATUSES.includes(event.status) &&
    event.isHidden !== true &&
    event.isDeleted !== true;
  if (isPublic) return true;

  if (!user?._id && !userRole) return false;

  const role = userRole || user?.role || '';
  if (['admin', 'staff', 'ctsv'].includes(role)) return true;

  if (event.source === 'school' && canRoleManageSchoolEvent(event, role)) return true;

  if (role === 'icpdp') return true;

  if (role === 'club_manager' && event.clubId && user?._id) {
    const club = await resolveManagedClub(user._id, activeClubId);
    return Boolean(club && String(club._id) === String(event.clubId));
  }

  const ownerId = event.createdBy?._id || event.createdBy;
  if (ownerId && user?._id && String(ownerId) === String(user._id)) return true;

  return false;
};

const sendEventCover = async (eventId, res, { user, userRole, activeClubId } = {}) => {
  const id = String(eventId || '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Không tìm thấy ảnh sự kiện', 404);
  }

  const event = await Event.findById(id)
    .select('thumbnail image coverFileExt status isHidden isDeleted source schoolOrganizerRole clubId createdBy')
    .lean();

  if (!event) {
    throw new AppError('Không tìm thấy ảnh sự kiện', 404);
  }

  const canView = await canAccessEventCover(event, { user, userRole, activeClubId });
  if (!canView) {
    throw new AppError('Không tìm thấy ảnh sự kiện', 404);
  }

  const resolved = await resolveCoverResponse({ ...event, _id: id });
  if (!resolved) {
    throw new AppError('Không tìm thấy ảnh sự kiện', 404);
  }

  const legacySrc = event.thumbnail || event.image || '';
  if (isDataUri(legacySrc) && !event.coverFileExt) {
    writeCoverFromDataUri(id, legacySrc)
      .then((ext) =>
        Event.updateOne({ _id: id }, { $set: { coverFileExt: ext, thumbnail: '', image: '' } })
      )
      .catch((err) => console.warn('[cover] lazy migrate failed:', id, err.message));
  }

  if (resolved.redirectUrl) {
    res.redirect(302, resolved.redirectUrl);
    return;
  }

  res.set('Content-Type', resolved.mime);
  res.set('Cache-Control', 'public, max-age=86400, immutable');
  res.set('Content-Length', String(resolved.buffer.length));
  res.send(resolved.buffer);
};

const canAccessEventPlan = async (event, user, activeClubId) => {
  if (!user?._id) return false;
  const role = user.role || '';
  if (['admin', 'ctsv', 'icpdp', 'staff'].includes(role)) return true;

  const ownerId = event.createdBy?._id || event.createdBy;
  if (ownerId && String(ownerId) === String(user._id)) return true;

  if (role === 'club_manager' && event.clubId) {
    const club = await resolveManagedClub(user._id, activeClubId);
    if (club && String(club._id) === String(event.clubId)) return true;
  }

  return false;
};

const sendEventPlan = async (eventId, res, { user, activeClubId } = {}) => {
  const id = String(eventId || '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Không tìm thấy file kế hoạch', 404);
  }

  const event = await Event.findById(id)
    .select('eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt eventPlanLink createdBy clubId')
    .lean();

  if (!event) {
    throw new AppError('Không tìm thấy file kế hoạch', 404);
  }

  const allowed = await canAccessEventPlan(event, user, activeClubId);
  if (!allowed) {
    throw new AppError('Bạn không có quyền tải file kế hoạch này', 403);
  }

  if (isAnyDataUri(event.eventPlanFile) && !event.eventPlanFileExt) {
    writePlanFromDataUri(
      PLAN_SCOPES.events,
      id,
      event.eventPlanFile,
      event.eventPlanFileMime,
      event.eventPlanFileName
    )
      .then((ext) =>
        Event.updateOne(
          { _id: id },
          { $set: { eventPlanFileExt: ext, eventPlanFile: '' } }
        )
      )
      .catch((err) => console.warn('[plan] lazy migrate failed:', id, err.message));
  }

  await sendPlanFile({ ...event, _id: id }, PLAN_SCOPES.events, res);
};

const sendSpeakerAvatar = async (eventId, speakerIndex, res) => {
  const id = String(eventId || '').trim();
  const index = Number(speakerIndex);
  if (!mongoose.Types.ObjectId.isValid(id) || !Number.isInteger(index) || index < 0) {
    throw new AppError('Không tìm thấy ảnh diễn giả', 404);
  }

  const event = await Event.findById(id)
    .select('thumbnail image coverFileExt status isHidden isDeleted speakers speaker speakerRole speakerAvatar speakerAvatarExts')
    .lean();

  if (!event) {
    throw new AppError('Không tìm thấy ảnh diễn giả', 404);
  }

  const isPublic =
    SCHOOL_EVENT_PUBLIC_STATUSES.includes(event.status) &&
    event.isHidden !== true &&
    event.isDeleted !== true;

  if (!isPublic) {
    throw new AppError('Không tìm thấy ảnh diễn giả', 404);
  }

  const resolved = await resolveSpeakerAvatarResponse({ ...event, _id: id }, index);
  if (!resolved) {
    throw new AppError('Không tìm thấy ảnh diễn giả', 404);
  }

  const { resolveEventSpeakers } = require('../constants/eventSpeaker');
  const rawSpeakers = resolveEventSpeakers(event);
  const legacyAvatar = rawSpeakers[index]?.avatar || '';
  if (isDataUri(legacyAvatar) && !event.speakerAvatarExts?.[index]) {
    writeSpeakerAvatarFromDataUri(id, index, legacyAvatar)
      .then((ext) => {
        const exts = Array.isArray(event.speakerAvatarExts) ? [...event.speakerAvatarExts] : [];
        exts[index] = ext;
        return Event.updateOne({ _id: id }, { $set: { speakerAvatarExts: exts } });
      })
      .catch((err) => console.warn('[speaker] lazy migrate failed:', id, index, err.message));
  }

  if (resolved.redirectUrl) {
    res.redirect(302, resolved.redirectUrl);
    return;
  }

  res.set('Content-Type', resolved.mime);
  res.set('Cache-Control', 'public, max-age=86400, immutable');
  res.set('Content-Length', String(resolved.buffer.length));
  res.send(resolved.buffer);
};

const getEventById = async (eventId, { user, activeClubId } = {}) => {
  const event = await Event.findById(eventId)
    .populate('createdBy', 'fullname email studentId role')
    .lean();

  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  // "Owner" = người tạo HOẶC chủ nhiệm đang quản lý CLB của sự kiện — sau khi
  // chuyển nhượng chủ nhiệm, createdBy vẫn là người cũ nên không thể chỉ so createdBy.
  let isOwner = Boolean(user?._id && String(event.createdBy?._id || event.createdBy) === String(user._id));
  if (!isOwner && user?._id && user.role === 'club_manager' && isValidClubId(event.clubId)) {
    const managedClubs = await findManagedClubs(user._id);
    isOwner = managedClubs.some((c) => String(c._id) === String(event.clubId));
  }
  const isPublic = SCHOOL_EVENT_PUBLIC_STATUSES.includes(event.status) && event.isHidden !== true;

  if (!isPublic && !isOwner) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  const clubId = event.clubId;
  const cachedListEvent = getCachedApprovedEvents()?.find(
    (item) => String(item._id) === String(eventId)
  );

  const ownerRegistrationPromise = isOwner
    ? EventRegistration.find({ event: eventId })
        .populate('user', 'fullname studentId email')
        .sort({ registeredAt: -1 })
        .limit(200)
        .lean()
    : Promise.resolve([]);

  const EventReview = require('../models/EventReview');
  const [liveRegisteredCount, checkinCount, registrations, registeredIds, clubMeta, myRegistration, myReview] =
    await Promise.all([
      isOwner
        ? EventRegistration.countDocuments({ event: eventId, status: { $ne: 'cancelled' } })
        : Promise.resolve(null),
      // Luôn đếm, không chỉ cho chủ sự kiện: Event không lưu sẵn checkinCount, nên
      // người xem khác (IC-PDP, CTSV, partner duyệt đề xuất) sẽ thấy 0 dù đã có
      // người check-in. Query này đi thẳng vào index {event, status}.
      EventRegistration.countDocuments({ event: eventId, status: 'attended' }),
      ownerRegistrationPromise,
      user?._id ? getRegisteredEventIds(user._id) : Promise.resolve([]),
      isValidClubId(clubId) && !pickClubMetaFromDoc(cachedListEvent)
        ? Club.findById(clubId).select(CLUB_META_FIELDS).lean()
        : Promise.resolve(null),
      user?._id
        ? EventRegistration.findOne({ event: eventId, user: user._id }).lean()
        : Promise.resolve(null),
      user?._id
        ? EventReview.findOne({ event: eventId, user: user._id }).select('_id').lean()
        : Promise.resolve(null),
    ]);

  const doc = { ...event };
  doc.registeredCount =
    isOwner && liveRegisteredCount != null
      ? liveRegisteredCount
      : doc.registeredCount ?? 0;
  if (checkinCount != null) {
    doc.checkinCount = checkinCount;
  }
  // Thanh "x/50 đã đăng ký" theo từng loại vé — Event không lưu counter riêng
  // từng loại nên phải suy từ registeredCount + studentRegisteredCount.
  doc.ticketTypes = attachTicketRegistrationCounts(doc.ticketTypes, doc);
  doc.reach = doc.reach || 0;
  doc.rating = doc.averageRating ?? 0;
  doc.ratingCount = doc.reviewCount ?? 0;
  doc.averageRating = doc.averageRating ?? 0;
  doc.reviewCount = doc.reviewCount ?? 0;
  doc.isRegistered = registeredIds.includes(String(event._id));
  if (myRegistration && myRegistration.status !== 'cancelled') {
    const sessions = Array.isArray(myRegistration.attendanceLog)
      ? myRegistration.attendanceLog
          .map((s) => ({
            sessionKey: s.sessionKey,
            checkedInAt: s.checkedInAt || null,
            checkedOutAt: s.checkedOutAt || null,
          }))
          .sort((a, b) => String(a.sessionKey).localeCompare(String(b.sessionKey)))
      : [];
    doc.myRegistration = {
      status: myRegistration.status,
      checkedInAt: myRegistration.checkedInAt || null,
      checkedOutAt: myRegistration.checkedOutAt || null,
      attendanceLog: sessions,
      hasReviewed: Boolean(myReview),
      // Để FE ẩn nút "Hủy đăng ký" với vé có phí (vé phí không cho tự hủy).
      amountPaid: myRegistration.amountPaid || 0,
    };
  }

  const cachedClubMeta = pickClubMetaFromDoc(cachedListEvent);
  if (cachedClubMeta) {
    Object.assign(doc, cachedClubMeta);
  } else if (clubMeta) {
    Object.assign(doc, mapClubMeta(clubMeta));
  }

  // Sự kiện đối tác: gắn tên/mô tả công ty thật để trang chi tiết không hiển thị
  // "Đối tác FPT" mockup ở khối Đơn vị tổ chức.
  if (doc.source === 'partner' && event.partnerId) {
    const Partner = require('../models/Partner');
    const { sanitizePartnerForApi } = require('../utils/partnerMediaStorage');
    const partner = await Partner.findById(event.partnerId)
      .select('name description representative logo logoFileExt')
      .lean();
    if (partner) {
      doc.partnerName = partner.name || '';
      doc.partnerDescription = partner.description || '';
      doc.partnerLogo = sanitizePartnerForApi(partner).logoUrl || '';
    }
  }

  if (isOwner && doc.source === 'club') {
    const ownerId = event.createdBy?._id || event.createdBy;
    const club = await resolveManagedClub(user._id, activeClubId)
      || (ownerId ? await resolveManagedClub(ownerId, activeClubId) : null);
    if (club) {
      doc.clubPresident = club.president || event.createdBy?.fullname || user.fullname || '';
    } else {
      doc.clubPresident = event.createdBy?.fullname || user.fullname || '';
    }
  }

  const students = registrations.map((r) => ({
    _id: r._id,
    status: r.status === 'attended' ? 'checked-in' : r.status,
    createdAt: r.createdAt,
    cancelledAt: r.cancelledAt || null,
    checkedInAt: r.checkedInAt || null,
    checkedOutAt: r.checkedOutAt || null,
    attendanceLog: Array.isArray(r.attendanceLog)
      ? r.attendanceLog.map((s) => ({
          sessionKey: s.sessionKey,
          checkedInAt: s.checkedInAt || null,
          checkedOutAt: s.checkedOutAt || null,
        }))
      : [],
    student: r.user,
  }));

  let eventPayload = enrichEventWithPricing(attachEventMediaForApi(doc), user);
  if (!isPublic) {
    eventPayload = await attachInlineEventCover(eventPayload, doc);
  }
  if (isOwner) {
    eventPayload.attendanceOpenDays = Array.isArray(event.attendanceOpenDays)
      ? event.attendanceOpenDays
      : [];
  }

  return {
    event: eventPayload,
    students: isOwner ? students : undefined,
  };
};

module.exports = {
  createEvent,
  getMyEvents,
  deleteMyEvent,
  updateMyEvent,
  getPendingEvents,
  updateEventStatus,
  notifyClubFollowersNewEvent,
  getApprovedEvents,
  getEventById,
  sendEventCover,
  sendEventPlan,
  sendSpeakerAvatar,
};
