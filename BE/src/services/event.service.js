const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventProposal = require('../models/EventProposal');
const Club = require('../models/Club');
const EventRegistration = require('../models/EventRegistration');
const AppError = require('../utils/AppError');
const { isValidEventVenue } = require('../constants/eventVenues');
const { normalizeEventCategory } = require('../constants/eventCategories');
const { SCHOOL_EVENT_PUBLIC_STATUSES } = require('../constants/eventWorkflow');
const { getRegisteredEventIds } = require('./registration.service');
const { enrichEventWithPricing } = require('../constants/eventPricing');
const {
  normalizeTicketTypes,
  deriveTicketPriceFromTypes,
  totalQtyFromTypes
} = require('../utils/ticketTypes');
const { normalizeLearningOutcomes } = require('../utils/learningOutcomes');
const { findClubManagedBy, findManagedClubs, resolveManagedClub } = require('./club.service');
const { applyEventTextSearch, normalizeSearchTerm, escapeRegex } = require('../utils/eventSearch');
const { getCachedApprovedEvents, setCachedApprovedEvents } = require('../utils/eventCache');
const { createAndBroadcast } = require('./notification.service');
const { canClubImmediateDelete } = require('../constants/eventModeration');

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
  eventPlanFile: event.eventPlanFile || '',
  eventPlanFileName: event.eventPlanFileName || '',
  eventPlanFileMime: event.eventPlanFileMime || '',
  eventPlanLink: event.eventPlanLink || '',
  clubId: managedClub ? String(managedClub._id) : (event.clubId ? String(event.clubId) : ''),
  clubName: managedClub?.name || event.clubName || '',
  submittedByEmail: userEmail || event.createdByEmail || '',
  linkedEventId: event._id,
});

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

const EVENT_PUBLIC_LIST_FIELDS =
  'title description thumbnail image category startDate endDate location capacity registeredCount ticketPrice eventState eventType source schoolOrganizerRole status clubId partnerId createdAt postponeReason';

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
  } = body;

  const normalizedTickets = normalizeTicketTypes(ticketTypes);
  const resolvedTicketPrice =
    Math.max(0, Number(ticketPrice) || 0) || deriveTicketPriceFromTypes(normalizedTickets);
  const resolvedCapacity = Math.max(1, Number(capacity) || 0);
  const resolvedTotalTickets =
    totalQtyFromTypes(normalizedTickets) || resolvedCapacity;

  if (!title || !registrationStartDate || !startDate || !location || !capacity) {
    throw new AppError('Vui lòng điền đầy đủ thông tin bắt buộc!', 400);
  }

  const isClubManager = user.role === 'club_manager';
  const managedClub = isClubManager ? await resolveManagedClub(user._id, activeClubId) : null;
  if (!isClubManager && !isValidEventVenue(location)) {
    throw new AppError(
      'Địa điểm không hợp lệ. Chọn một trong: Sảnh tòa Gamma, Sảnh tòa Beta, Tầng 4 tòa Beta, Tầng 5 tòa Alpha.',
      400
    );
  }

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
  'title category startDate endDate location capacity registeredCount status eventState rejectionReason moderationReason ticketPrice speaker createdAt updatedAt createdBy';

const getMyEvents = async (user, activeClubId = null) => {
  const query = { createdBy: user._id };

  if (user.role === 'club_manager') {
    const managedClubs = await findManagedClubs(user._id);

    if (activeClubId) {
      query.$or = [
        { clubId: activeClubId },
        { clubId: null },
        { clubId: { $exists: false } },
      ];
    } else if (managedClubs.length === 1) {
      const onlyId = String(managedClubs[0]._id);
      query.$or = [
        { clubId: onlyId },
        { clubId: null },
        { clubId: { $exists: false } },
      ];
    }
    // Nhiều CLB mà chưa chọn: trả về tất cả sự kiện của user
  }

  const events = await Event.find(query)
    .select(MY_EVENTS_LIST_FIELDS)
    .sort({ createdAt: -1 })
    .lean();
  return { events };
};

const DELETABLE_CLUB_STATUSES = ['pending', 'pending_icpdp', 'pending_ctsv', 'pending_admin', 'revision', 'rejected'];

const deleteMyEvent = async (eventId, user) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }
  if (String(event.createdBy) !== String(user._id)) {
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

const EDITABLE_CLUB_STATUSES = ['pending', 'rejected', 'approved', 'revision', 'pending_ctsv', 'pending_icpdp'];

const updateMyEvent = async (eventId, user, body, activeClubId = null) => {
  const event = await Event.findById(eventId);
  if (!event) throw new AppError('Không tìm thấy sự kiện!', 404);
  if (String(event.createdBy) !== String(user._id)) {
    throw new AppError('Bạn không có quyền chỉnh sửa sự kiện này!', 403);
  }
  if (!EDITABLE_CLUB_STATUSES.includes(event.status)) {
    throw new AppError('Sự kiện không thể chỉnh sửa ở trạng thái hiện tại.', 400);
  }
  if (
    isClubManagedEvent(event) &&
    ['approved', 'live', 'ended'].includes(event.status) &&
    !event.clubEditUnlocked
  ) {
    throw new AppError(
      'Sự kiện đã được duyệt. Vui lòng gửi yêu cầu chỉnh sửa và chờ IC-PDP/Admin phê duyệt trước.',
      400
    );
  }

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
  } = body;

  const normalizedTickets = normalizeTicketTypes(ticketTypes);
  const resolvedTicketPrice =
    Math.max(0, Number(ticketPrice) || 0) || deriveTicketPriceFromTypes(normalizedTickets);
  const resolvedCapacity = Math.max(1, Number(capacity) || event.capacity || 100);
  const resolvedTotalTickets = totalQtyFromTypes(normalizedTickets) || resolvedCapacity;

  if (!title || !registrationStartDate || !startDate || !location || !capacity) {
    throw new AppError('Vui lòng điền đầy đủ thông tin bắt buộc!', 400);
  }

  const existingPlanLink = String(event.eventPlanLink || '').trim();
  const incomingPlanLink = String(eventPlanLink ?? event.eventPlanLink ?? '').trim();
  const hasIncomingPlanFile = Boolean(eventPlanFile?.trim());
  const hasIncomingPlanLink = /^https?:\/\//i.test(incomingPlanLink);
  const hasExistingPlan = Boolean(event.eventPlanFile?.trim()) || Boolean(existingPlanLink);

  if (user.role === 'club_manager' && !hasIncomingPlanFile && !hasIncomingPlanLink && !hasExistingPlan) {
    throw new AppError('Vui lòng tải file hoặc dán link bảng kế hoạch sự kiện!', 400);
  }

  event.title = title;
  event.description = description || 'Chưa có mô tả';
  if (thumbnail) event.thumbnail = thumbnail;
  if (bannerFileName !== undefined) event.bannerFileName = bannerFileName?.trim() || '';
  if (eventPlanFile) {
    event.eventPlanFile = eventPlanFile;
    event.eventPlanFileName = eventPlanFileName?.trim() || event.eventPlanFileName || '';
    event.eventPlanFileMime = eventPlanFileMime?.trim() || event.eventPlanFileMime || '';
  }
  if (eventPlanLink !== undefined) {
    event.eventPlanLink = incomingPlanLink;
  }
  event.category = normalizeEventCategory(category || event.category);
  event.registrationStartDate = registrationStartDate || null;
  event.registrationEndDate = registrationEndDate || null;
  event.startDate = startDate;
  event.endDate = endDate;
  event.location = location;
  event.capacity = resolvedCapacity;
  event.totalTickets = resolvedTotalTickets;
  event.ticketPrice = resolvedTicketPrice;
  if (normalizedTickets.length) event.ticketTypes = normalizedTickets;
  if (speaker !== undefined) event.speaker = speaker;
  if (agenda !== undefined) event.agenda = agenda;
  if (learningOutcomes !== undefined) {
    event.learningOutcomes = normalizeLearningOutcomes(learningOutcomes);
  }

  const previousStatus = event.status;
  const wasUnlockedEdit = Boolean(event.clubEditUnlocked);
  const shouldResubmitClubProposal =
    isClubManagedEvent(event) &&
    (['rejected', 'revision'].includes(previousStatus) ||
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

const getApprovedEvents = async ({ category, search, q, club, user } = {}) => {
  let allEvents = getCachedApprovedEvents();

  if (!allEvents) {
    const query = {
      status: { $in: SCHOOL_EVENT_PUBLIC_STATUSES },
      isHidden: { $ne: true },
      isDeleted: { $ne: true },
    };

    const rawEvents = await Event.find(query)
      .select(EVENT_PUBLIC_LIST_FIELDS)
      .sort({ startDate: 1 })
      .limit(300)
      .lean();

    allEvents = await attachClubMetaBatch(rawEvents);
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

  // Limit to 300 to match database query limit
  const slicedEvents = filtered.slice(0, 300);

  // 4. Map user-specific properties dynamically
  const registeredIds = user?._id ? await getRegisteredEventIds(user._id) : [];
  const registeredSet = new Set(registeredIds.map(id => String(id)));

  const finalEvents = slicedEvents.map((event) => {
    const doc = {
      ...event,
      isRegistered: registeredSet.has(String(event._id)),
    };
    return enrichEventWithPricing(doc, user);
  });

  return { events: finalEvents, total: finalEvents.length };
};

const getEventById = async (eventId, { user, activeClubId } = {}) => {
  const event = await Event.findById(eventId)
    .populate('createdBy', 'fullname email studentId role')
    .lean();

  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  const isOwner = user?._id && String(event.createdBy?._id || event.createdBy) === String(user._id);
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

  const [liveRegisteredCount, checkinCount, registrations, registeredIds, clubMeta] = await Promise.all([
    isOwner
      ? EventRegistration.countDocuments({ event: eventId, status: { $ne: 'cancelled' } })
      : Promise.resolve(null),
    isOwner
      ? EventRegistration.countDocuments({ event: eventId, status: 'attended' })
      : Promise.resolve(null),
    ownerRegistrationPromise,
    user?._id ? getRegisteredEventIds(user._id) : Promise.resolve([]),
    isValidClubId(clubId) && !pickClubMetaFromDoc(cachedListEvent)
      ? Club.findById(clubId).select(CLUB_META_FIELDS).lean()
      : Promise.resolve(null),
  ]);

  const doc = { ...event };
  doc.registeredCount =
    isOwner && liveRegisteredCount != null
      ? liveRegisteredCount
      : doc.registeredCount ?? 0;
  if (isOwner && checkinCount != null) {
    doc.checkinCount = checkinCount;
  }
  doc.reach = doc.reach || 0;
  doc.rating = doc.averageRating ?? 0;
  doc.ratingCount = doc.reviewCount ?? 0;
  doc.averageRating = doc.averageRating ?? 0;
  doc.reviewCount = doc.reviewCount ?? 0;
  doc.isRegistered = registeredIds.includes(String(event._id));

  const cachedClubMeta = pickClubMetaFromDoc(cachedListEvent);
  if (cachedClubMeta) {
    Object.assign(doc, cachedClubMeta);
  } else if (clubMeta) {
    Object.assign(doc, mapClubMeta(clubMeta));
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
    student: r.user,
  }));

  return {
    event: enrichEventWithPricing(doc, user),
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
  getApprovedEvents,
  getEventById,
};
