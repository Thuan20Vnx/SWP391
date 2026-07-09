import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { API_BASE, getAuthHeaders, getEventHeaders, cancelClubEventModeration } from '../utils/api';
import { downloadStudentsExcel } from '../utils/exportStudentsExcel';
import { fetchEventRatingStats } from '../services/eventRatingStatsApi';
import {
  formatEventRating,
  getCheckinProgress,
  getReachWeekDelta,
  getRegistrationProgress,
} from '../utils/eventBentoStats';
import { fetchCtsvEvent } from '../services/ctsvApi';
import {
  fetchIcpdpEvent,
  fetchIcpdpProposal,
  icpdpApproveProposal,
  icpdpRejectProposal,
  icpdpRequestProposalRevision,
  icpdpApproveEventModeration,
  icpdpRejectEventModeration,
} from '../services/icpdpApi';
import {
  approveAdminModeration,
  approveAdminSchoolEvent,
  rejectAdminModeration,
  rejectAdminSchoolEvent,
} from '../services/adminApi';
import PartnerActionDialog from '../components/ctsv/PartnerActionDialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { getUserRole, isIcpdpRole } from '../utils/auth';
import { getCtsvEventAccess } from '../utils/ctsvEventAccess';
import { canCtsvEditSchoolEvent, canEditSchoolEventForPortal, isSchoolEventPendingAdmin, SCHOOL_EVENT_STATUS_LABELS } from '../constants/eventWorkflow';
import { isModerationPending, MODERATION_ACTION_LABELS, MODERATION_REJECTED_TITLES } from '../constants/eventModeration';
import { canClubEditEventProposal, canClubDeleteEventProposal, isClubEventPendingApproval, canClubImmediateDelete, canClubDirectEdit, canClubRequestDeleteModeration, needsClubEditModerationRequest, hasClubModerationPending, wasClubEventAdminApproved, isIcpdpModerationPending, isAdminModerationPending } from '../constants/clubEventModeration';
import ClubEventModerationDialog from '../components/events/ClubEventModerationDialog';
import ClubModerationBannerContent from '../components/events/ClubModerationBannerContent';
import { getManagementEventId, normalizeManagementEvent } from '../utils/normalizeManagementEvent';
import { buildAdminEventOriginLabel } from '../utils/timelineSourceLabel';
import { PORTAL_EVENTS_LIVE_EVENT } from '../utils/adminEventsLiveEvents';
import './EventManagementDetail.css';
import EventBentoStatsGrid from '../components/events/EventBentoStatsGrid';
import EventRatingDetailPanel from '../components/events/EventRatingDetailPanel';
import EventTabsCarousel from '../components/events/EventTabsCarousel';
import EventOverviewPanel from '../components/events/EventOverviewPanel';
import EventCancelRequestsPanel from '../components/events/EventCancelRequestsPanel';
import EventPostponeCancelPanel from '../components/events/EventPostponeCancelPanel';
import TimelineSourceNotice from '../components/club/TimelineSourceNotice';
import EventReportPanel from '../components/events/EventReportPanel';
import EventQrGeneratePanel from '../components/events/EventQrGeneratePanel';
import CtsvEventActionsPanel from '../components/events/CtsvEventActionsPanel';
import AdminSchoolEventActionsPanel from '../components/events/AdminSchoolEventActionsPanel';

/** So sánh nội dung CLB đề xuất sửa (pendingEdit) với giá trị hiện tại của sự kiện. */
const PENDING_EDIT_FIELDS = [
  { key: 'title', label: 'Tên sự kiện' },
  { key: 'location', label: 'Địa điểm' },
  { key: 'startDate', label: 'Bắt đầu', isDate: true },
  { key: 'endDate', label: 'Kết thúc', isDate: true },
  { key: 'registrationStartDate', label: 'Mở đăng ký', isDate: true },
  { key: 'registrationEndDate', label: 'Đóng đăng ký', isDate: true },
  { key: 'capacity', label: 'Số lượng' },
  { key: 'category', label: 'Phân loại' },
  { key: 'description', label: 'Mô tả' },
];

const formatPendingEditValue = (value, isDate) => {
  if (value === undefined || value === null || value === '') return '(trống)';
  if (isDate) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('vi-VN');
  }
  const str = String(value);
  return str.length > 80 ? `${str.slice(0, 80)}…` : str;
};

const getPendingEditChanges = (event) => {
  const payload = event?.pendingEdit?.payload;
  if (!payload) return [];
  const changes = [];
  PENDING_EDIT_FIELDS.forEach(({ key, label, isDate }) => {
    if (payload[key] === undefined) return;
    const next = payload[key];
    const current = event?.[key];
    const norm = (v) => (isDate ? new Date(v ?? 0).getTime() : String(v ?? '').trim());
    if (norm(next) === norm(current)) return;
    changes.push({
      key,
      label,
      from: formatPendingEditValue(current, isDate),
      to: formatPendingEditValue(next, isDate),
    });
  });
  return changes;
};

const CLUB_CANCEL_MODERATION_LABELS = {
  edit: 'Hủy yêu cầu chỉnh sửa',
  delete: 'Hủy yêu cầu xóa',
  cancel: 'Hủy yêu cầu hủy sự kiện',
  postpone: 'Hủy yêu cầu hoãn',
  hide: 'Hủy yêu cầu ẩn',
};

const PORTAL_CONFIG = {
  club: {
    rootLabel: 'Quản lý CLB',
    rootPath: '/quan-ly-clb',
    eventsLabel: 'Sự kiện',
    eventsPath: '/quan-ly-clb',
    headerLabel: 'Quản lý sự kiện',
    currentLabel: 'Chi tiết sự kiện',
  },
  ctsv: {
    rootLabel: 'CTSV',
    rootPath: '/ctsv/dashboard',
    eventsLabel: 'Sự kiện',
    eventsPath: '/ctsv/events',
    headerLabel: 'Quản lý sự kiện CTSV',
    currentLabel: 'Chi tiết quản lý',
  },
  admin: {
    rootLabel: 'Quản trị',
    rootPath: '/admin/events',
    eventsLabel: 'Duyệt sự kiện',
    eventsPath: '/admin/events',
    headerLabel: 'Chi tiết sự kiện',
    currentLabel: 'Xem & xử lý',
    eventEditPath: (id) => `/admin/ctsv/events/${id}/edit`,
  },
  icpdp: {
    rootLabel: 'IC-PDP',
    rootPath: '/icpdp/proposals',
    eventsLabel: 'Đề xuất CLB',
    eventsPath: '/icpdp/proposals',
    headerLabel: 'Duyệt đề xuất',
    currentLabel: 'Chi tiết đề xuất',
  },
  icpdp_school: {
    rootLabel: 'IC-PDP',
    rootPath: '/icpdp/dashboard',
    eventsLabel: 'Quản lý sự kiện',
    eventsPath: '/icpdp/events',
    headerLabel: 'Quản lý sự kiện IC-PDP',
    currentLabel: 'Chi tiết quản lý',
    eventEditPath: (eventId) => `/icpdp/events/${eventId}/edit`,
  },
  icpdp_club: {
    rootLabel: 'IC-PDP',
    rootPath: '/icpdp/dashboard',
    eventsLabel: 'Sự kiện',
    eventsPath: '/icpdp/events',
    headerLabel: 'Theo dõi sự kiện CLB',
    currentLabel: 'Chi tiết sự kiện',
  },
};

const EVENT_STATUS_LABELS = {
  pending: 'Chờ duyệt',
  pending_icpdp: 'Chờ IC-PDP',
  pending_ctsv: 'Chờ CTSV duyệt',
  pending_admin: 'Chờ Admin duyệt',
  revision: 'Cần chỉnh sửa',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  live: 'Đang diễn ra',
  ended: 'Đã kết thúc',
  draft: 'Bản nháp',
};

const isEventEnded = (event) => {
  const end = event?.endDate ? new Date(event.endDate) : null;
  return end && !Number.isNaN(end.getTime()) && end.getTime() < Date.now();
};

const getEventStatusMeta = (event) => {
  const key = event?.statusKey || event?.status || '';
  // Sự kiện đã qua ngày kết thúc: hiển thị "Đã kết thúc" thay vì "Mở đăng ký"/"Đang diễn ra".
  if ((key === 'approved' || key === 'live') && isEventEnded(event)) {
    return { label: 'Đã kết thúc', tone: 'live' };
  }
  if (event?.source === 'school' && SCHOOL_EVENT_STATUS_LABELS[key]) {
    const schoolLabel = SCHOOL_EVENT_STATUS_LABELS[key];
    if (key === 'rejected') return { label: schoolLabel, tone: 'rejected' };
    if (key === 'live' || key === 'approved') return { label: schoolLabel, tone: 'approved' };
    if (String(key).includes('pending') || key === 'revision') {
      return { label: schoolLabel, tone: 'pending' };
    }
    return { label: schoolLabel, tone: 'live' };
  }
  const label = EVENT_STATUS_LABELS[key];

  if (key === 'rejected') return { label: label || 'Từ chối', tone: 'rejected' };
  if (key === 'live') return { label: label || 'Đang diễn ra', tone: 'live' };
  if (key === 'approved') return { label: label || 'Đã duyệt', tone: 'approved' };
  if (String(key).includes('pending') || key === 'revision') {
    return { label: label || 'Chờ duyệt', tone: 'pending' };
  }
  if (label) return { label, tone: 'live' };
  return { label: 'Đang chạy', tone: 'live' };
};

const getStudentRoleMeta = (student) => {
  const role = student?.role;

  if (role === 'club_manager') {
    return { label: 'Ban t\u1ed5 ch\u1ee9c CLB', tone: 'club-manager' };
  }

  if (role === 'staff') {
    return { label: 'C\u00e1n b\u1ed9', tone: 'staff' };
  }

  if (role === 'student') {
    return { label: 'Sinh vi\u00ean', tone: 'student' };
  }

  return { label: 'Kh\u00e1c', tone: 'other' };
};

const getStudentStatusMeta = (status) => {
  if (status === 'checked-in') {
    return { label: '\u0110\u00e3 check-in', tone: 'checked-in' };
  }

  if (status === 'cancelled') {
    return { label: '\u0110\u00e3 h\u1ee7y', tone: 'cancelled' };
  }

  return { label: 'Ch\u01b0a check-in', tone: 'registered' };
};

const formatStudentEventTime = (value) => {
  if (!value) return 'Ch\u01b0a c\u1eadp nh\u1eadt';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ch\u01b0a c\u1eadp nh\u1eadt';
  return date.toLocaleString('vi-VN');
};

const EventManagementDetail = ({
  portal = 'club',
  eventIdOverride,
  proposalId,
  proposalData,
  listPath: listPathProp,
}) => {
  const { id: routeId } = useParams();
  const id = eventIdOverride || routeId;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const outlet = useOutletContext() || {};
  const showToast = outlet.showToast;
  const isCtsvPortal = portal === 'ctsv' || portal === 'admin';
  const isAdminEventView = portal === 'admin';
  const isIcpdpSchoolPortal = portal === 'icpdp_school';
  const isSchoolManagePortal = isCtsvPortal || isIcpdpSchoolPortal;
  const isIcpdpPortal = portal === 'icpdp';
  const isIcpdpClubPortal = portal === 'icpdp_club';
  const isClubPortal = portal === 'club';
  const config = PORTAL_CONFIG[portal] || PORTAL_CONFIG.club;
  const [icpdpNote, setIcpdpNote] = useState('');
  const [icpdpSubmitting, setIcpdpSubmitting] = useState(false);
  const [adminActionBusy, setAdminActionBusy] = useState(false);
  const [adminRejectOpen, setAdminRejectOpen] = useState(false);
  const [adminApproveOpen, setAdminApproveOpen] = useState(false);
  const [proposalReview, setProposalReview] = useState(proposalData || null);
  const [moderationDialog, setModerationDialog] = useState({ open: false, action: 'edit' });
  const [clubModNote, setClubModNote] = useState('');
  const [clubModRejectReason, setClubModRejectReason] = useState('');
  const [clubModBusy, setClubModBusy] = useState(false);

  useEffect(() => {
    setProposalReview(proposalData || null);
  }, [proposalData]);

  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'bao-cao') return 'bao-cao';
    if (tab === 'danh-gia') return 'danh-gia';
    if (tab === 'dieu-phoi' && isSchoolManagePortal) return 'dieu-phoi';
    return 'tong-quan';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [eventData, setEventData] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [clubMeta, setClubMeta] = useState({ clubName: '', clubPresident: '' });
  const [loading, setLoading] = useState(true);
  const [activeBentoCard, setActiveBentoCard] = useState('');
  const tabContentRef = useRef(null);

  const loadEventData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      if (isCtsvPortal) {
        const ctsvData = await fetchCtsvEvent(id);
        if (!ctsvData?.event) {
          showToast?.('Không thể lấy thông tin sự kiện', 'error');
          navigate(config.eventsPath);
          return;
        }

        setEventData(normalizeManagementEvent(ctsvData.event));
        setStudents(ctsvData.students || []);
        return;
      }

      if (isIcpdpSchoolPortal) {
        const icpdpData = await fetchIcpdpEvent(id);
        if (!icpdpData?.event) {
          showToast?.('Không thể lấy thông tin sự kiện', 'error');
          navigate(listPathProp || config.eventsPath);
          return;
        }
        setEventData(normalizeManagementEvent(icpdpData.event));
        setStudents(icpdpData.students || []);
        return;
      }

      if (isIcpdpClubPortal) {
        const icpdpData = await fetchIcpdpEvent(id);
        if (!icpdpData?.event) {
          showToast?.('Không thể lấy thông tin sự kiện', 'error');
          navigate(listPathProp || config.eventsPath);
          return;
        }
        setEventData(normalizeManagementEvent(icpdpData.event));
        setStudents(icpdpData.students || []);
        return;
      }

      if (isIcpdpPortal) {
        let reviewProposal = proposalData;
        if (proposalId) {
          try {
            const propRes = await fetchIcpdpProposal(proposalId);
            reviewProposal = propRes.proposal || reviewProposal;
            setProposalReview(reviewProposal);
          } catch {
            /* keep existing */
          }
        }
        const icpdpData = await fetchIcpdpEvent(id);
        if (!icpdpData?.event) {
          showToast?.('Không thể lấy thông tin sự kiện', 'error');
          navigate(listPathProp || config.eventsPath);
          return;
        }
        const normalized = normalizeManagementEvent(icpdpData.event);
        if (reviewProposal?.clubName) {
          normalized.clubName = reviewProposal.clubName;
        }
        if (reviewProposal?.statusKey) {
          normalized.proposalStatusKey = reviewProposal.statusKey;
          normalized.icpdpNote = reviewProposal.icpdpNote || normalized.icpdpNote;
          normalized.ctsvNote = reviewProposal.ctsvNote || normalized.ctsvNote;
          normalized.rejectionReason = reviewProposal.rejectionReason || normalized.rejectionReason;
        }
        setEventData(normalized);
        setStudents(icpdpData.students || []);
        return;
      }

      let event = null;
      let studentList = [];
      try {
        const res = await fetch(`${API_BASE}/api/events/${id}`, {
          headers: getEventHeaders(false),
        });
        const data = await res.json();
        if (data.success && data.event) {
          event = normalizeManagementEvent(data.event);
          studentList = data.students || [];
        }
      } catch {
        /* optional */
      }

      if (!event) {
        showToast?.('Không thể lấy thông tin sự kiện', 'error');
        navigate(config.eventsPath);
        return;
      }

      setEventData(event);
      setStudents(studentList);
    } catch (error) {
      console.error('Error fetching event data:', error);
      showToast?.('Lỗi khi lấy thông tin sự kiện', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, isCtsvPortal, isIcpdpSchoolPortal, isIcpdpClubPortal, isIcpdpPortal, navigate, config.eventsPath, listPathProp, showToast, proposalData, proposalId]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'bao-cao') setActiveTab('bao-cao');
    if (tab === 'dieu-phoi' && isSchoolManagePortal) setActiveTab('dieu-phoi');
  }, [searchParams, isSchoolManagePortal]);

  useEffect(() => {
    if (!isAdminEventView || !eventData) return;
    if (isModerationPending(eventData) || isSchoolEventPendingAdmin(eventData)) {
      setActiveTab('dieu-phoi');
    }
  }, [isAdminEventView, eventData?.statusKey, eventData?.source]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  useEffect(() => {
    if (!isIcpdpPortal && !isIcpdpClubPortal && !isSchoolManagePortal && !isClubPortal) return undefined;
    const onLive = () => {
      loadEventData();
    };
    window.addEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
    return () => window.removeEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
  }, [isIcpdpPortal, isIcpdpClubPortal, isSchoolManagePortal, isClubPortal, loadEventData]);

  useEffect(() => {
    if (isSchoolManagePortal || isIcpdpPortal || isIcpdpClubPortal || !id) return;
    const fetchClubMeta = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/clubs/manage/profile`, { headers: getEventHeaders(false) });
        const data = await res.json();
        if (data.success && data.club) {
          setClubMeta({
            clubName: data.club.name || '',
            clubPresident: data.club.president || '',
          });
        }
      } catch {
        /* optional */
      }
    };
    fetchClubMeta();
  }, [id, isSchoolManagePortal, isIcpdpPortal, isIcpdpClubPortal]);

  const schoolAccess = useMemo(
    () => (isSchoolManagePortal && eventData ? getCtsvEventAccess(eventData) : null),
    [isSchoolManagePortal, eventData]
  );
  const canManageSchool = Boolean(schoolAccess?.canManage);
  const canEditSchoolManage =
    isSchoolManagePortal &&
    canManageSchool &&
    eventData?.source === 'school' &&
    (isIcpdpSchoolPortal
      ? canEditSchoolEventForPortal(eventData, 'icpdp')
      : canCtsvEditSchoolEvent(eventData));
  const canEditClub = isClubPortal && (canClubDirectEdit(eventData) || needsClubEditModerationRequest(eventData));
  const canDeleteClub = isClubPortal && canClubDeleteEventProposal(eventData);
  const canImmediateDeleteClub = isClubPortal && canClubImmediateDelete(eventData);
  const canRequestDeleteClub = isClubPortal && canClubRequestDeleteModeration(eventData);
  const clubModerationPending = isClubPortal && hasClubModerationPending(eventData);
  const showClubPreApprovalUi =
    isClubPortal && isClubEventPendingApproval(eventData) && !wasClubEventAdminApproved(eventData);
  const clubIcpdpModerationPending = isClubPortal && isIcpdpModerationPending(eventData);
  const clubAdminModerationPending = isClubPortal && isAdminModerationPending(eventData);
  // IC-PDP xem sự kiện CLB: có yêu cầu điều phối (hoãn/hủy/xóa/sửa) đang chờ IC-PDP duyệt.
  const showIcpdpClubModerationReview = isIcpdpClubPortal && isIcpdpModerationPending(eventData);
  const canShowIcpdpActions =
    isIcpdpPortal &&
    eventData?.source !== 'school' &&
    (proposalReview?.statusKey === 'pending_icpdp' || eventData?.proposalStatusKey === 'pending_icpdp') &&
    isIcpdpRole(getUserRole());
  const showSchoolPendingAdminBanner =
    isSchoolManagePortal && !isAdminEventView && eventData?.source === 'school' && isSchoolEventPendingAdmin(eventData);
  const showAdminApprovalActions =
    isAdminEventView &&
    eventData?.source === 'school' &&
    (isModerationPending(eventData) || isSchoolEventPendingAdmin(eventData));
  const adminApprovalIsModeration = showAdminApprovalActions && isModerationPending(eventData);
  const adminApprovalIsSubmit = showAdminApprovalActions && isSchoolEventPendingAdmin(eventData);

  const statusMeta = useMemo(() => {
    if (isIcpdpPortal && proposalReview?.statusKey) {
      return getEventStatusMeta({ statusKey: proposalReview.statusKey });
    }
    return getEventStatusMeta(eventData);
  }, [isIcpdpPortal, proposalReview, eventData]);
  const rejectionReason = eventData?.rejectionReason?.trim() || '';
  const isRejected = eventData?.statusKey === 'rejected' || eventData?.status === 'rejected';
  // Chỉ tạo được mã QR khi sự kiện đã duyệt (mở đăng ký / đang diễn ra / đã kết thúc).
  const isQrEligible = ['approved', 'live', 'ended'].includes(
    eventData?.statusKey || eventData?.status
  );
  // Yêu cầu điều phối (sửa/xóa/hủy/hoãn/ẩn) trên sự kiện ĐÃ duyệt bị từ chối — khác
  // với đơn tổ chức lần đầu bị từ chối (isRejected, status='rejected'). Áp dụng cho
  // cả sự kiện cấp trường lẫn sự kiện CLB để không hiển thị mơ hồ "Đã duyệt".
  const showModerationRejectedBanner =
    !isRejected &&
    !isModerationPending(eventData) &&
    Boolean(rejectionReason) &&
    ['approved', 'live', 'ended'].includes(eventData?.statusKey);
  const isRevision =
    eventData?.statusKey === 'revision' ||
    eventData?.status === 'revision' ||
    proposalData?.statusKey === 'revision' ||
    proposalReview?.statusKey === 'revision';
  const icpdpRevisionNote = eventData?.icpdpNote?.trim() || '';
  const ctsvRevisionNote = eventData?.ctsvNote?.trim() || '';
  const revisionFeedback = icpdpRevisionNote || ctsvRevisionNote;
  const revisionFeedbackLabel = icpdpRevisionNote
    ? 'Yêu cầu bổ sung từ IC-PDP'
    : ctsvRevisionNote
      ? 'Yêu cầu bổ sung từ CTSV / Admin'
      : 'Yêu cầu bổ sung';
  const eventIdStr = getManagementEventId(eventData);
  const adminEventOriginLabel = useMemo(
    () => (isAdminEventView ? buildAdminEventOriginLabel(eventData) : null),
    [isAdminEventView, eventData],
  );

  const registrationProgress = useMemo(
    () => getRegistrationProgress(eventData?.registeredCount, eventData?.capacity),
    [eventData?.registeredCount, eventData?.capacity]
  );
  const checkinProgress = useMemo(
    () => getCheckinProgress(eventData?.checkinCount, eventData?.registeredCount),
    [eventData?.checkinCount, eventData?.registeredCount]
  );
  const ratingStats = useMemo(() => formatEventRating(eventData), [eventData]);
  const reachDelta = useMemo(() => getReachWeekDelta(eventData), [eventData]);
  const reachDeltaLabel = reachDelta > 0 ? `+${reachDelta}%` : `${reachDelta}%`;
  const reachDeltaTone = reachDelta > 0 ? 'up' : reachDelta < 0 ? 'down' : 'flat';

  const scrollToTabs = () => {
    tabContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBentoCardClick = (cardKey) => {
    setActiveBentoCard(cardKey);
    if (cardKey === 'registration' || cardKey === 'checkin') {
      setActiveTab('danh-sach');
      scrollToTabs();
      return;
    }
    if (cardKey === 'rating') {
      setActiveTab('danh-gia');
      scrollToTabs();
      return;
    }
    if (cardKey === 'reach') {
      setActiveTab('tong-quan');
      scrollToTabs();
    }
  };

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((st) => {
      const mssv = (st.student?.studentId || '').toLowerCase();
      const name = (st.student?.fullname || '').toLowerCase();
      return mssv.includes(q) || name.includes(q);
    });
  }, [students, searchQuery]);

  const selectedStudentMeta = useMemo(() => {
    if (!selectedStudent) return null;
    return {
      role: getStudentRoleMeta(selectedStudent.student),
      status: getStudentStatusMeta(selectedStudent.status),
      registeredAt: formatStudentEventTime(selectedStudent.createdAt),
      checkedInAt: formatStudentEventTime(selectedStudent.checkedInAt),
      checkedOutAt: formatStudentEventTime(selectedStudent.checkedOutAt),
      cancelledAt: formatStudentEventTime(selectedStudent.cancelledAt),
      email: selectedStudent.student?.email || 'Ch\u01b0a c\u1eadp nh\u1eadt',
      studentId: selectedStudent.student?.studentId || 'Ch\u01b0a c\u1ea5p MSSV',
      fullname: selectedStudent.student?.fullname || 'Ch\u01b0a r\u00f5 danh t\u00ednh',
    };
  }, [selectedStudent]);

  const handleEdit = () => {
    if (isSchoolManagePortal) {
      if (!canEditSchoolManage) {
        showToast?.('Cần Admin phê duyệt yêu cầu chỉnh sửa trước khi mở form.', 'info');
        setActiveTab('dieu-phoi');
        return;
      }
      navigate(config.eventEditPath?.(id) || (isIcpdpSchoolPortal ? `/icpdp/events/${id}/edit` : `/ctsv/events/${id}/edit`));
      return;
    }
    // Sự kiện CLB đã duyệt: mở form sửa trực tiếp; khi gửi sẽ giữ chờ IC-PDP → Admin duyệt.
    if (!canClubDirectEdit(eventData) && !needsClubEditModerationRequest(eventData)) {
      showToast?.('Sự kiện không thể chỉnh sửa ở trạng thái hiện tại.', 'info');
      return;
    }
    navigate('/quan-ly-clb', {
      state: {
        editEventId: id,
        returnTo: `/quan-ly-clb/su-kien/${id}`,
        editEventPrefill: eventData,
      },
    });
  };

  const handleDeleteClubEvent = async () => {
    if (canRequestDeleteClub) {
      setModerationDialog({ open: true, action: 'delete' });
      return;
    }
    if (!canImmediateDeleteClub) {
      showToast?.('Sự kiện đã được duyệt hoặc đang có yêu cầu chờ xử lý. Vui lòng gửi yêu cầu xóa qua IC-PDP.', 'info');
      return;
    }

    const title = eventData?.title || 'sự kiện này';
    const confirmed = window.confirm(
      `Sự kiện sẽ bị xóa ngay (không cần duyệt). Hệ thống sẽ gửi thông báo ưu tiên cao đến IC-PDP.\n\nBạn có chắc muốn xóa "${title}"?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/api/events/${id}`, {
        method: 'DELETE',
        headers: getEventHeaders(false),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.('Đã xóa sự kiện. IC-PDP đã được thông báo.', 'success');
        navigate(config.eventsPath);
        return;
      }
      showToast?.(data.message || 'Xóa thất bại', 'error');
    } catch {
      showToast?.('Lỗi kết nối server', 'error');
    }
  };

  const [cancelModBusy, setCancelModBusy] = useState(false);
  const handleCancelClubModeration = async () => {
    if (!id) return;
    setCancelModBusy(true);
    try {
      const data = await cancelClubEventModeration(id);
      setEventData(normalizeManagementEvent(data.event));
      showToast?.(data.message || 'Đã hủy yêu cầu.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Hủy yêu cầu thất bại.', 'error');
    } finally {
      setCancelModBusy(false);
    }
  };

  const handleModerationSubmitted = (updatedEvent) => {
    if (updatedEvent) {
      setEventData(normalizeManagementEvent(updatedEvent));
    } else if (moderationDialog.action === 'delete') {
      navigate(config.eventsPath);
      return;
    }
    loadEventData();
  };

  const handleIcpdpClubModApprove = async () => {
    if (!id) return;
    setClubModBusy(true);
    try {
      const data = await icpdpApproveEventModeration(id, clubModNote.trim());
      setEventData(normalizeManagementEvent(data.event));
      setClubModNote('');
      showToast?.(data.message || 'Đã duyệt yêu cầu.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Duyệt thất bại.', 'error');
    } finally {
      setClubModBusy(false);
    }
  };

  const handleIcpdpClubModReject = async () => {
    if (!clubModRejectReason.trim()) {
      showToast?.('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }
    if (!id) return;
    setClubModBusy(true);
    try {
      const data = await icpdpRejectEventModeration(id, clubModRejectReason.trim());
      setEventData(normalizeManagementEvent(data.event));
      setClubModRejectReason('');
      showToast?.(data.message || 'Đã từ chối yêu cầu.', 'info');
    } catch (err) {
      showToast?.(err.message || 'Từ chối thất bại.', 'error');
    } finally {
      setClubModBusy(false);
    }
  };

  const handleExportStudents = useCallback(async () => {
    if (!students.length) {
      showToast?.('Chưa có sinh viên đăng ký để xuất file.', 'info');
      return;
    }
    // Lấy danh sách đánh giá chi tiết để đưa vào sheet "Đánh giá" (không chặn xuất nếu lỗi).
    let ratingDetail = null;
    if (id) {
      try {
        ratingDetail = await fetchEventRatingStats(id);
      } catch {
        ratingDetail = null;
      }
    }
    await downloadStudentsExcel(students, {
      eventTitle: eventData?.title || 'su-kien',
      clubName: eventData?.clubName || clubMeta.clubName || 'CTSV',
      clubPresident:
        eventData?.clubPresident ||
        clubMeta.clubPresident ||
        eventData?.createdBy?.fullname ||
        '',
      capacity: eventData?.capacity,
      registeredCount: eventData?.registeredCount,
      checkinCount: eventData?.checkinCount,
      checkoutCount: eventData?.checkoutCount,
      averageRating: ratingDetail?.averageRating ?? ratingStats?.value ?? eventData?.averageRating,
      reviewCount: ratingDetail?.reviewCount ?? ratingStats?.count ?? eventData?.reviewCount,
      reviews: ratingDetail?.reviews || ratingDetail?.recentReviews || [],
      distribution: ratingDetail?.distribution || [],
      startDate: eventData?.startDate,
      endDate: eventData?.endDate,
      location: eventData?.location,
    });
    showToast?.('Đã xuất báo cáo sự kiện.', 'success');
  }, [students, eventData, clubMeta, ratingStats, id, showToast]);

  const handleAdminApproveConfirm = async () => {
    if (!id || !eventData || adminActionBusy) return;
    setAdminActionBusy(true);
    try {
      if (isModerationPending(eventData)) {
        await approveAdminModeration(id);
        showToast?.('Đã duyệt yêu cầu điều phối.', 'success');
      } else {
        await approveAdminSchoolEvent(id);
        showToast?.('Đã phê duyệt sự kiện cấp trường.', 'success');
      }
      setAdminApproveOpen(false);
      await loadEventData();
    } catch (e) {
      showToast?.(e.message || 'Duyệt thất bại.', 'error');
    } finally {
      setAdminActionBusy(false);
    }
  };

  const handleAdminRejectConfirm = async (reason) => {
    if (!id || !eventData || adminActionBusy) return;
    setAdminActionBusy(true);
    try {
      if (isModerationPending(eventData)) {
        await rejectAdminModeration(id, reason);
        showToast?.(
          'Đã từ chối yêu cầu điều phối. Sự kiện vẫn giữ trạng thái hiện tại (ví dụ Mở đăng ký).',
          'info'
        );
      } else {
        await rejectAdminSchoolEvent(id, reason);
        showToast?.('Đã từ chối đơn tổ chức sự kiện.', 'info');
      }
      setAdminRejectOpen(false);
      await loadEventData();
    } catch (e) {
      showToast?.(e.message || 'Từ chối thất bại.', 'error');
      throw e;
    } finally {
      setAdminActionBusy(false);
    }
  };

  const scrollToTabContent = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = tabContentRef.current;
        if (!target) return;
        const stickyHeaderHeight =
          document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
        const top = target.getBoundingClientRect().top + window.scrollY - stickyHeaderHeight - 12;
        window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
      });
    });
  }, []);

  const openQrTab = useCallback(() => {
    setActiveTab('ma-qr');
    scrollToTabContent();
  }, [scrollToTabContent]);

  const managementTabs = useMemo(() => {
    if (showClubPreApprovalUi) {
      return [{ id: 'tong-quan', label: 'Tổng quan sự kiện' }];
    }
    const items = [
      { id: 'tong-quan', label: 'Tổng quan sự kiện' },
      { id: 'danh-sach', label: 'Danh sách Sinh viên' },
    ];
    if (isSchoolManagePortal) {
      items.push({ id: 'dieu-phoi', label: 'Phê duyệt & Điều phối' });
    }
    items.push({ id: 'huy-ve', label: 'Yêu cầu hủy vé' });
    if (!isIcpdpPortal && !isIcpdpClubPortal && !isAdminEventView) {
      items.push({ id: 'hoan-huy', label: 'Hoãn / Hủy sự kiện' });
    }
    items.push({ id: 'bao-cao', label: 'Báo cáo & Minh chứng' });
    items.push({ id: 'danh-gia', label: 'Đánh giá' });
    if (!isIcpdpPortal && !isAdminEventView && isQrEligible) {
      items.push({ id: 'ma-qr', label: 'Mã QR check-in/out', onClick: openQrTab });
    }
    return items;
  }, [showClubPreApprovalUi, isSchoolManagePortal, isIcpdpPortal, isIcpdpClubPortal, isAdminEventView, isQrEligible, openQrTab]);

  const handleIcpdpApprove = async () => {
    if (!proposalId) return;
    setIcpdpSubmitting(true);
    try {
      await icpdpApproveProposal(proposalId, icpdpNote);
      showToast?.('Đã duyệt nội bộ — đề xuất chuyển sang Admin phê duyệt!', 'success');
      await loadEventData();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setIcpdpSubmitting(false);
    }
  };

  const handleIcpdpReject = async () => {
    if (!proposalId) return;
    if (!icpdpNote.trim()) {
      showToast?.('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }
    setIcpdpSubmitting(true);
    try {
      await icpdpRejectProposal(proposalId, icpdpNote);
      showToast?.('Đã từ chối đề xuất.', 'success');
      await loadEventData();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setIcpdpSubmitting(false);
    }
  };

  const handleIcpdpRevision = async () => {
    if (!proposalId) return;
    if (!icpdpNote.trim()) {
      showToast?.('Vui lòng nhập nội dung yêu cầu bổ sung.', 'error');
      return;
    }
    setIcpdpSubmitting(true);
    try {
      await icpdpRequestProposalRevision(proposalId, icpdpNote);
      showToast?.('Đã gửi yêu cầu chỉnh sửa.', 'success');
      await loadEventData();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setIcpdpSubmitting(false);
    }
  };

  useEffect(() => {
    if (showClubPreApprovalUi && activeTab !== 'tong-quan') {
      setActiveTab('tong-quan');
    }
  }, [showClubPreApprovalUi, activeTab]);

  useEffect(() => {
    if (activeTab === 'danh-gia') {
      setActiveBentoCard('rating');
    }
  }, [activeTab]);

  const formatPendingDateTime = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const eventStartLabel = formatPendingDateTime(eventData?.startDate) || 'Chưa cập nhật';
  const eventEndLabel = formatPendingDateTime(eventData?.endDate);
  const pendingLocationLabel = (eventData?.location || '').trim() || 'Chưa cập nhật';
  const pendingCategoryLabel = (eventData?.category || '').trim() || 'Chưa phân loại';

  const renderPortalShell = (children) => {
    if (!isAdminEventView) return children;
    return <div className="ctsv-portal-body">{children}</div>;
  };

  if (loading) {
    return renderPortalShell(
      <div className="ev-detail-content">
        <main className="ev-detail-main">
          <p style={{ color: '#94a3b8' }}>Đang tải chi tiết sự kiện...</p>
        </main>
      </div>,
    );
  }

  return renderPortalShell(
    <div className="ev-detail-content">
      <main className="ev-detail-main">
        <div className="ev-breadcrumbs">
          <Link to={config.rootPath}>{config.rootLabel}</Link>
          <span className="ev-bc-separator">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>
          </span>
          <Link to={config.eventsPath}>{config.eventsLabel}</Link>
          <span className="ev-bc-separator">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>
          </span>
          <span className="ev-bc-current">{config.currentLabel}</span>
        </div>

        <div className="ev-header-block">
          <div className="ev-header-top">
            <div className="ev-header-main">
              <div className="ev-header-label-row">
                <span className="ev-header-label">{config.headerLabel}</span>
                <span className={`ev-status-badge ev-status-badge--${statusMeta.tone}`}>{statusMeta.label}</span>
              </div>
              <h1 className="ev-title">{eventData?.title || 'Đang tải...'}</h1>
              <p className="ev-subtitle">
                Mã sự kiện: EVT-{eventIdStr ? eventIdStr.substring(eventIdStr.length - 6).toUpperCase() : '...'}
                <span className="ev-subtitle-sep">·</span>
                Ngày tạo:{' '}
                {eventData
                  ? new Date(eventData.createdAt || eventData.startDate).toLocaleDateString('vi-VN')
                  : '...'}
              </p>
              {adminEventOriginLabel && (
                <p className="ev-header-origin" role="note">
                  {adminEventOriginLabel}
                </p>
              )}
            </div>
            <div className="ev-header-actions">
              {isClubPortal ? (
                <>
                  {canEditClub && (
                    <button type="button" className="ev-btn-outline" onClick={handleEdit}>
                      Chỉnh sửa
                    </button>
                  )}
                  {canDeleteClub && (
                    <button
                      type="button"
                      className="ev-btn-outline ev-btn-outline--danger"
                      onClick={handleDeleteClubEvent}
                    >
                      {canRequestDeleteClub && !canImmediateDeleteClub ? 'Yêu cầu xóa' : 'Xóa'}
                    </button>
                  )}
                  {clubModerationPending && (
                    <button
                      type="button"
                      className="ev-btn-outline ev-btn-outline--danger"
                      disabled={cancelModBusy}
                      onClick={handleCancelClubModeration}
                    >
                      {CLUB_CANCEL_MODERATION_LABELS[eventData?.moderationAction] || 'Hủy yêu cầu'}
                    </button>
                  )}
                </>
              ) : isAdminEventView ? (
                <>
                  {showAdminApprovalActions && (
                    <>
                      <button
                        type="button"
                        className="ev-btn-primary"
                        disabled={adminActionBusy}
                        onClick={() => setAdminApproveOpen(true)}
                      >
                        {adminActionBusy
                          ? 'Đang xử lý…'
                          : adminApprovalIsModeration
                            ? 'Duyệt yêu cầu'
                            : 'Phê duyệt'}
                      </button>
                      <button
                        type="button"
                        className="ev-btn-outline ev-btn-outline--danger"
                        disabled={adminActionBusy}
                        onClick={() => setAdminRejectOpen(true)}
                      >
                        {adminApprovalIsModeration ? 'Từ chối yêu cầu' : 'Từ chối đơn'}
                      </button>
                    </>
                  )}
                  <button type="button" className="ev-btn-outline" onClick={handleExportStudents}>
                    Xuất báo cáo
                  </button>
                </>
              ) : (
                <>
                  {(isSchoolManagePortal ? canManageSchool : canEditClub) && (
                    <button type="button" className="ev-btn-outline" onClick={handleEdit}>
                      Chỉnh sửa thông tin
                    </button>
                  )}
                  <button type="button" className="ev-btn-outline" onClick={handleExportStudents}>
                    Xuất báo cáo
                  </button>
                  {canShowIcpdpActions && (
                    <>
                      <button
                        type="button"
                        className="ev-btn-outline ev-btn-outline--danger"
                        disabled={icpdpSubmitting}
                        onClick={handleIcpdpReject}
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        className="ev-btn-outline"
                        disabled={icpdpSubmitting}
                        onClick={handleIcpdpRevision}
                      >
                        Yêu cầu bổ sung
                      </button>
                      <button
                        type="button"
                        className="ev-btn-primary"
                        disabled={icpdpSubmitting}
                        onClick={handleIcpdpApprove}
                      >
                        Phê duyệt
                      </button>
                    </>
                  )}
                  {!isIcpdpPortal && (
                    <button type="button" className="ev-btn-primary ev-btn-qr" onClick={openQrTab}>
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13-2h3v2h-3zm-5 0h3v2h-3zm3 3h3v2h-3zm-3 3h3v2h-3zm3 3h3v2h-3zm-5-3h3v2h-3z" fill="currentColor"/></svg>
                      Mã QR check-in/out
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {showAdminApprovalActions && (
            <div className="ev-moderation-banner ev-moderation-banner--pending" role="status">
              <strong>
                {adminApprovalIsModeration
                  ? 'Yêu cầu điều phối đang chờ Admin xử lý'
                  : 'Đơn tổ chức sự kiện đang chờ Admin phê duyệt'}
              </strong>
              <p>
                {adminApprovalIsModeration
                  ? 'Từ chối yêu cầu không làm thay đổi trạng thái sự kiện (ví dụ vẫn Mở đăng ký). Chỉ từ chối đơn mới chuyển sang Từ chối.'
                  : 'Dùng Phê duyệt để mở đăng ký, hoặc Từ chối đơn nếu không chấp nhận tổ chức sự kiện.'}
              </p>
            </div>
          )}
          {showModerationRejectedBanner && (
            <div className="ev-moderation-banner ev-moderation-banner--orange" role="status">
              <strong>
                {MODERATION_REJECTED_TITLES[eventData?.lastModerationAction] || 'Yêu cầu điều phối bị từ chối'}
              </strong>
              <p>
                {eventData?.lastModerationRejectedBy === 'icpdp'
                  ? 'IC-PDP đã từ chối yêu cầu này. '
                  : eventData?.lastModerationRejectedBy === 'admin'
                    ? 'Admin đã từ chối yêu cầu này. '
                    : ''}
                Sự kiện vẫn ở trạng thái <strong>{statusMeta.label}</strong> (không có gì thay đổi so với trước khi gửi yêu cầu).
                {' '}Lý do từ chối: {rejectionReason}
              </p>
            </div>
          )}
          {showSchoolPendingAdminBanner && (
            <div className="ev-moderation-banner ev-moderation-banner--info" role="status">
              <strong>Đang chờ Admin phê duyệt</strong>
              <p>
                Đơn tổ chức sự kiện cấp trường (kể cả sự kiện phát sinh) chỉ Admin duyệt — không qua IC-PDP.
                Bạn có thể chỉnh sửa và gửi lại trước khi Admin xử lý.
              </p>
            </div>
          )}
          {showClubPreApprovalUi && (
            <div className="ev-pending-edit-hint" role="note">
              <strong>Lưu ý:</strong>{' '}
              Bạn có thể sửa hoặc xóa ngay khi sự kiện chưa được Admin phê duyệt lần đầu. Sau khi đã duyệt, mọi chỉnh sửa
              hoặc xóa phải qua IC-PDP và Admin.
            </div>
          )}
          {clubIcpdpModerationPending && (
            <div className="ev-moderation-banner ev-moderation-banner--pending" role="status">
              <strong>Đang chờ IC-PDP duyệt</strong>
              <ClubModerationBannerContent event={eventData} icpdpHint />
            </div>
          )}
          {clubAdminModerationPending && (
            <div className="ev-moderation-banner ev-moderation-banner--pending" role="status">
              <strong>IC-PDP đã duyệt — đang chờ Admin</strong>
              <ClubModerationBannerContent event={eventData} icpdpNote={eventData?.icpdpNote} />
            </div>
          )}
          {eventData?.pendingEdit?.payload && (
            <div className="ev-moderation-banner ev-moderation-banner--info" role="note">
              <strong>Nội dung CLB đề xuất chỉnh sửa</strong>
              <ul className="ev-pending-edit-list">
                {getPendingEditChanges(eventData).map((c) => (
                  <li key={c.key}>
                    <span className="ev-pending-edit-field">{c.label}:</span>{' '}
                    <span className="ev-pending-edit-old">{c.from}</span>
                    {' → '}
                    <span className="ev-pending-edit-new">{c.to}</span>
                  </li>
                ))}
                {getPendingEditChanges(eventData).length === 0 && (
                  <li>Cập nhật nội dung/tài liệu sự kiện.</li>
                )}
              </ul>
            </div>
          )}
          {showIcpdpClubModerationReview && (
            <div className="ev-moderation-banner ev-moderation-banner--pending ev-icpdp-club-moderation" role="status">
              <strong>
                Duyệt yêu cầu {MODERATION_ACTION_LABELS[eventData?.moderationAction] || 'điều phối'}
              </strong>
              <p>
                CLB gửi: {eventData?.moderationReason || '—'}
                {eventData?.moderationRequestedByEmail && <> · {eventData.moderationRequestedByEmail}</>}
              </p>
              <textarea
                className="ev-icpdp-review-note__input"
                placeholder="Ghi chú IC-PDP (tùy chọn khi duyệt)..."
                value={clubModNote}
                onChange={(e) => setClubModNote(e.target.value)}
                rows={2}
              />
              <textarea
                className="ev-icpdp-review-note__input"
                placeholder="Lý do từ chối (bắt buộc nếu từ chối)..."
                value={clubModRejectReason}
                onChange={(e) => setClubModRejectReason(e.target.value)}
                rows={2}
              />
              <div className="ev-moderation-actions">
                <button
                  type="button"
                  className="ev-btn-outline ev-btn-outline--danger"
                  disabled={clubModBusy}
                  onClick={handleIcpdpClubModReject}
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  className="ev-btn-primary"
                  disabled={clubModBusy}
                  onClick={handleIcpdpClubModApprove}
                >
                  Duyệt — chuyển Admin
                </button>
              </div>
            </div>
          )}
          {eventData?.clubEditUnlocked && isClubPortal && (
            <div className="ev-moderation-banner ev-moderation-banner--info" role="status">
              <strong>Admin đã duyệt chỉnh sửa</strong>
              <p>Bạn có thể mở form chỉnh sửa. Sau khi lưu, đề xuất sẽ được gửi lại IC-PDP duyệt.</p>
            </div>
          )}
          {isIcpdpPortal && (
            <TimelineSourceNotice
              source={proposalReview || eventData}
              className="ev-timeline-source-banner"
            />
          )}
          {canShowIcpdpActions && (
            <div className="ev-icpdp-review-note">
              <label className="ev-icpdp-review-note__label" htmlFor="icpdp-review-note">
                Ghi chú / lý do (tùy chọn khi duyệt, bắt buộc khi từ chối hoặc yêu cầu bổ sung)
              </label>
              <textarea
                id="icpdp-review-note"
                className="ev-icpdp-review-note__input"
                rows={3}
                value={icpdpNote}
                onChange={(e) => setIcpdpNote(e.target.value)}
                placeholder="Nhập ghi chú cho CLB…"
              />
            </div>
          )}
          {isRevision && (
            <div className="ev-rejection-reason ev-revision-feedback">
              <span className="ev-rejection-reason__label">{revisionFeedbackLabel}</span>
              <p className="ev-rejection-reason__text">
                {revisionFeedback || 'Ban tổ chức chưa nhận được nội dung chi tiết. Vui lòng xem thông báo hoặc liên hệ bộ phận duyệt.'}
              </p>
            </div>
          )}
          {isRejected && (
            <div className="ev-rejection-reason">
              <span className="ev-rejection-reason__label">Lý do từ chối</span>
              <p className="ev-rejection-reason__text">
                {rejectionReason || 'Không có lý do cụ thể.'}
              </p>
            </div>
          )}
        </div>

        <EventBentoStatsGrid
          pendingMode={showClubPreApprovalUi}
          statusMeta={statusMeta}
          eventData={eventData}
          pendingLocationLabel={pendingLocationLabel}
          pendingCategoryLabel={pendingCategoryLabel}
          eventStartLabel={eventStartLabel}
          eventEndLabel={eventEndLabel}
          registrationProgress={registrationProgress}
          checkinProgress={checkinProgress}
          ratingStats={ratingStats}
          reachDelta={reachDelta}
          reachDeltaLabel={reachDeltaLabel}
          reachDeltaTone={reachDeltaTone}
          activeCard={activeBentoCard}
          onCardClick={handleBentoCardClick}
        />

        <EventTabsCarousel
          tabs={managementTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="ev-tab-content" ref={tabContentRef}>
          {activeTab === 'danh-sach' && (
            <div className="ev-table-card">
              <div className="ev-table-toolbar">
                <div className="ev-search-box">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="#94a3b8"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                  <input
                    type="text"
                    placeholder={"T\u00ecm MSSV, T\u00ean..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="ev-table-wrapper ev-st-table-wrapper">
                <table className="ev-table">
                  <thead>
                    <tr>
                      <th>MSSV</th>
                      <th>{'H\u1ecc V\u00c0 T\u00caN'}</th>
                      <th>{'TH\u1edcI GIAN \u0110K'}</th>
                      <th>{'TR\u1ea0NG TH\u00c1I V\u00c9'}</th>
                      <th>{'H\u00c0NH \u0110\u1ed8NG'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                          {"Ch\u01b0a c\u00f3 sinh vi\u00ean n\u00e0o \u0111\u0103ng k\u00fd"}
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st) => {
                        const mssv = st.student?.studentId || 'Ch\u01b0a c\u1ea5p MSSV';
                        const name = st.student?.fullname || 'Ch\u01b0a r\u00f5 danh t\u00ednh';
                        const time = new Date(st.createdAt).toLocaleString('vi-VN');
                        const studentRole = getStudentRoleMeta(st.student);
                        const ticketStatus = getStudentStatusMeta(st.status);
                        const avatarCode = name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase();
                        return (
                          <tr key={st._id}>
                            <td className="ev-st-id-cell">
                              <strong>{mssv}</strong>
                              {!st.student?.studentId && (
                                <span className="ev-st-id-hint">{"T\u00e0i kho\u1ea3n ch\u01b0a c\u00f3 m\u00e3 s\u1ed1"}</span>
                              )}
                            </td>
                            <td>
                              <div className="ev-st-name-cell">
                                <div className="ev-st-avatar" style={{ backgroundColor: '#ffffff', color: '#64748b' }}>
                                  {avatarCode}
                                </div>
                                <div className="ev-st-name-block">
                                  <span className="ev-st-name">{name}</span>
                                  <span className={`ev-st-role-badge ev-st-role-badge--${studentRole.tone}`}>
                                    {studentRole.label}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td style={{ color: '#64748b' }}>{time}</td>
                            <td>
                              <span className={`ev-st-status-badge ev-st-status-badge--${ticketStatus.tone}`}>
                                {ticketStatus.label}
                              </span>
                            </td>
                            <td>
                              <button type="button" className="ev-action-link" onClick={() => setSelectedStudent(st)}>
                                {"Chi ti\u1ebft"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="ev-st-mobile-list">
                {filteredStudents.length === 0 ? (
                  <div className="ev-st-mobile-empty">{"Ch\u01b0a c\u00f3 sinh vi\u00ean n\u00e0o \u0111\u0103ng k\u00fd"}</div>
                ) : (
                  filteredStudents.map((st) => {
                    const mssv = st.student?.studentId || 'Ch\u01b0a c\u1ea5p MSSV';
                    const name = st.student?.fullname || 'Ch\u01b0a r\u00f5 danh t\u00ednh';
                    const time = new Date(st.createdAt).toLocaleString('vi-VN');
                    const studentRole = getStudentRoleMeta(st.student);
                    const ticketStatus = getStudentStatusMeta(st.status);
                    const avatarCode = name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();
                    return (
                      <article key={`mobile-${st._id}`} className="ev-st-mobile-card">
                        <div className="ev-st-mobile-top">
                          <div className="ev-st-name-cell">
                            <div className="ev-st-avatar" style={{ backgroundColor: '#ffffff', color: '#64748b' }}>
                              {avatarCode}
                            </div>
                            <div className="ev-st-name-block">
                              <span className="ev-st-name">{name}</span>
                              <span className={`ev-st-role-badge ev-st-role-badge--${studentRole.tone}`}>
                                {studentRole.label}
                              </span>
                            </div>
                          </div>
                          <span className={`ev-st-status-badge ev-st-status-badge--${ticketStatus.tone}`}>
                            {ticketStatus.label}
                          </span>
                        </div>
                        <div className="ev-st-mobile-grid">
                          <div className="ev-st-mobile-item">
                            <span className="ev-st-mobile-label">MSSV</span>
                            <span className="ev-st-mobile-value">{mssv}</span>
                          </div>
                          <div className="ev-st-mobile-item">
                            <span className="ev-st-mobile-label">{"Th\u1eddi gian \u0111\u0103ng k\u00fd"}</span>
                            <span className="ev-st-mobile-value">{time}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="ev-action-link ev-action-link--mobile"
                          onClick={() => setSelectedStudent(st)}
                        >
                          {"Chi ti\u1ebft sinh vi\u00ean"}
                        </button>
                      </article>
                    );
                  })
                )}
              </div>

              <div className="ev-pagination">
                <span className="ev-page-info">
                  {"Hi\u1ec3n th\u1ecb"} {filteredStudents.length === 0 ? 0 : 1} - {filteredStudents.length} {"trong s\u1ed1"} {students.length} {"sinh vi\u00ean"}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'danh-sach' && selectedStudent && selectedStudentMeta && (
            <div className="ev-st-detail-modal" role="dialog" aria-modal="true" aria-labelledby="ev-st-detail-title">
              <div className="ev-st-detail-backdrop" onClick={() => setSelectedStudent(null)} />
              <div className="ev-st-detail-panel">
                <button
                  type="button"
                  className="ev-st-detail-close"
                  onClick={() => setSelectedStudent(null)}
                  aria-label={"\u0110\u00f3ng chi ti\u1ebft sinh vi\u00ean"}
                >
                  ×
                </button>
                <div className="ev-st-detail-hero">
                  <div className="ev-st-avatar ev-st-avatar--lg">
                    {selectedStudentMeta.fullname
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="ev-st-detail-heading">
                    <p className="ev-st-detail-kicker">{"H\u1ed3 s\u01a1 ng\u01b0\u1eddi tham gia"}</p>
                    <h3 id="ev-st-detail-title">{selectedStudentMeta.fullname}</h3>
                    <div className="ev-st-detail-badges">
                      <span className={`ev-st-role-badge ev-st-role-badge--${selectedStudentMeta.role.tone}`}>
                        {selectedStudentMeta.role.label}
                      </span>
                      <span className={`ev-st-status-badge ev-st-status-badge--${selectedStudentMeta.status.tone}`}>
                        {selectedStudentMeta.status.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ev-st-detail-grid">
                  <div className="ev-st-detail-item">
                    <span className="ev-st-detail-label">MSSV</span>
                    <strong>{selectedStudentMeta.studentId}</strong>
                  </div>
                  <div className="ev-st-detail-item">
                    <span className="ev-st-detail-label">Email</span>
                    <strong>{selectedStudentMeta.email}</strong>
                  </div>
                  <div className="ev-st-detail-item">
                    <span className="ev-st-detail-label">{"\u0110\u0103ng k\u00fd l\u00fac"}</span>
                    <strong>{selectedStudentMeta.registeredAt}</strong>
                  </div>
                  <div className="ev-st-detail-item">
                    <span className="ev-st-detail-label">Check-in</span>
                    <strong>{selectedStudentMeta.checkedInAt}</strong>
                  </div>
                  <div className="ev-st-detail-item">
                    <span className="ev-st-detail-label">Check-out</span>
                    <strong>{selectedStudentMeta.checkedOutAt}</strong>
                  </div>
                  <div className="ev-st-detail-item">
                    <span className="ev-st-detail-label">{"H\u1ee7y v\u00e9"}</span>
                    <strong>{selectedStudentMeta.cancelledAt}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tong-quan' && <EventOverviewPanel event={eventData} />}

          {activeTab === 'dieu-phoi' && isSchoolManagePortal && id && (
            isAdminEventView ? (
              <AdminSchoolEventActionsPanel
                event={eventData}
                busy={adminActionBusy}
                isModerationRequest={adminApprovalIsModeration}
                onApprove={() => setAdminApproveOpen(true)}
                onReject={() => setAdminRejectOpen(true)}
              />
            ) : (
              <CtsvEventActionsPanel
                event={eventData}
                eventId={id}
                showToast={showToast}
                onEventUpdated={loadEventData}
                editBasePath={isIcpdpSchoolPortal ? '/icpdp/events' : '/ctsv/events'}
              />
            )
          )}

          {activeTab === 'huy-ve' && <EventCancelRequestsPanel students={students} />}

          {activeTab === 'hoan-huy' && isClubPortal && id && (
            <EventPostponeCancelPanel
              event={eventData}
              eventId={id}
              showToast={showToast}
              onEventUpdated={(updated) => setEventData(normalizeManagementEvent(updated))}
            />
          )}

          {activeTab === 'bao-cao' && (
            <EventReportPanel event={eventData} students={students} pendingApproval={showClubPreApprovalUi} />
          )}

          {activeTab === 'danh-gia' && id && (
            <EventRatingDetailPanel
              eventId={id}
              eventTitle={eventData?.title}
              fallbackStats={ratingStats}
            />
          )}

          {activeTab === 'ma-qr' && id && isQrEligible && (
            <EventQrGeneratePanel eventId={id} showToast={showToast} />
          )}
        </div>
      </main>

      <footer className="ev-detail-footer">
        <div className="ev-footer-content">
          <p>© 2026 FPT Event Platform - All Rights Reserved.</p>
          <p>Hotline: 024.1234.5678 | Email: contact@fevents.com</p>
        </div>
      </footer>

      {isClubPortal && (
        <ClubEventModerationDialog
          open={moderationDialog.open}
          eventId={id}
          action={moderationDialog.action}
          eventTitle={eventData?.title || ''}
          onClose={() => setModerationDialog((prev) => ({ ...prev, open: false }))}
          onSubmitted={handleModerationSubmitted}
          showToast={showToast}
        />
      )}

      {isAdminEventView && (
        <PartnerActionDialog
          open={adminRejectOpen}
          mode={adminApprovalIsModeration ? 'adminModerationReject' : 'adminEventReject'}
          loading={adminActionBusy}
          onCancel={() => !adminActionBusy && setAdminRejectOpen(false)}
          onConfirm={handleAdminRejectConfirm}
        />
      )}

      {isAdminEventView && (
        <ConfirmDialog
          open={adminApproveOpen}
          title={
            adminApprovalIsModeration
              ? 'Xác nhận duyệt yêu cầu điều phối?'
              : 'Xác nhận phê duyệt đơn tổ chức?'
          }
          message={
            adminApprovalIsModeration
              ? 'Sau khi xác nhận, yêu cầu điều phối sẽ được chấp nhận và đơn vị gửi có thể tiếp tục xử lý theo quy trình.'
              : 'Sau khi xác nhận, sự kiện cấp trường sẽ được phê duyệt và có thể chuyển sang các bước tiếp theo (mở đăng ký, công bố…).'
          }
          confirmLabel={adminApprovalIsModeration ? 'Xác nhận duyệt' : 'Xác nhận phê duyệt'}
          cancelLabel="Hủy"
          onConfirm={handleAdminApproveConfirm}
          onCancel={() => !adminActionBusy && setAdminApproveOpen(false)}
          loading={adminActionBusy}
        />
      )}

    </div>,
  );
};

export default EventManagementDetail;
