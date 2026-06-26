import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { API_BASE, getAuthHeaders, getEventHeaders } from '../utils/api';
import { downloadStudentsExcel } from '../utils/exportStudentsExcel';
import {
  formatEventRating,
  getCheckinProgress,
  getReachWeekDelta,
  getRegistrationProgress,
} from '../utils/eventBentoStats';
import { fetchCtsvEvent } from '../services/ctsvApi';
import { fetchIcpdpEvent, fetchIcpdpProposal, icpdpApproveProposal, icpdpRejectProposal, icpdpRequestProposalRevision } from '../services/icpdpApi';
import { getUserRole, isIcpdpRole } from '../utils/auth';
import { getCtsvEventAccess } from '../utils/ctsvEventAccess';
import { canCtsvEditSchoolEvent } from '../constants/eventWorkflow';
import { canClubEditEventProposal, canClubDeleteEventProposal, isClubEventPendingApproval, canClubImmediateDelete, canClubDirectEdit, canClubRequestDeleteModeration, needsClubEditModerationRequest, hasClubModerationPending, wasClubEventAdminApproved, isIcpdpModerationPending, isAdminModerationPending } from '../constants/clubEventModeration';
import { MODERATION_ACTION_LABELS } from '../constants/eventModeration';
import ClubEventModerationDialog from '../components/events/ClubEventModerationDialog';
import { getManagementEventId, normalizeManagementEvent } from '../utils/normalizeManagementEvent';
import { PORTAL_EVENTS_LIVE_EVENT } from '../utils/adminEventsLiveEvents';
import './EventManagementDetail.css';
import BentoStarRating from '../components/events/BentoStarRating';
import EventOverviewPanel from '../components/events/EventOverviewPanel';
import EventCancelRequestsPanel from '../components/events/EventCancelRequestsPanel';
import EventPostponeCancelPanel from '../components/events/EventPostponeCancelPanel';
import EventReportPanel from '../components/events/EventReportPanel';
import EventQrGeneratePanel from '../components/events/EventQrGeneratePanel';
import CtsvEventActionsPanel from '../components/events/CtsvEventActionsPanel';

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
  icpdp: {
    rootLabel: 'IC-PDP',
    rootPath: '/icpdp/proposals',
    eventsLabel: 'Đề xuất CLB',
    eventsPath: '/icpdp/proposals',
    headerLabel: 'Duyệt đề xuất',
    currentLabel: 'Chi tiết đề xuất',
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

const getEventStatusMeta = (event) => {
  const key = event?.statusKey || event?.status || '';
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
  const isCtsvPortal = portal === 'ctsv';
  const isIcpdpPortal = portal === 'icpdp';
  const isClubPortal = portal === 'club';
  const config = PORTAL_CONFIG[portal] || PORTAL_CONFIG.club;
  const [icpdpNote, setIcpdpNote] = useState('');
  const [icpdpSubmitting, setIcpdpSubmitting] = useState(false);
  const [proposalReview, setProposalReview] = useState(proposalData || null);
  const [moderationDialog, setModerationDialog] = useState({ open: false, action: 'edit' });

  useEffect(() => {
    setProposalReview(proposalData || null);
  }, [proposalData]);

  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'bao-cao') return 'bao-cao';
    if (tab === 'dieu-phoi' && isCtsvPortal) return 'dieu-phoi';
    return 'tong-quan';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [eventData, setEventData] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [clubMeta, setClubMeta] = useState({ clubName: '', clubPresident: '' });
  const [loading, setLoading] = useState(true);
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
  }, [id, isCtsvPortal, isIcpdpPortal, navigate, config.eventsPath, listPathProp, showToast, proposalData, proposalId]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'bao-cao') setActiveTab('bao-cao');
    if (tab === 'dieu-phoi' && isCtsvPortal) setActiveTab('dieu-phoi');
  }, [searchParams, isCtsvPortal]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  useEffect(() => {
    if (!isIcpdpPortal && !isCtsvPortal) return undefined;
    const onLive = () => {
      loadEventData();
    };
    window.addEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
    return () => window.removeEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
  }, [isIcpdpPortal, isCtsvPortal, loadEventData]);

  useEffect(() => {
    if (isCtsvPortal || isIcpdpPortal || !id) return;
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
  }, [id, isCtsvPortal]);

  const ctsvAccess = useMemo(
    () => (isCtsvPortal && eventData ? getCtsvEventAccess(eventData) : null),
    [isCtsvPortal, eventData]
  );
  const canManageCtsv = Boolean(ctsvAccess?.canManage);
  const canEditCtsv =
    isCtsvPortal &&
    canManageCtsv &&
    eventData?.source === 'school' &&
    canCtsvEditSchoolEvent(eventData);
  const canEditClub = isClubPortal && (canClubDirectEdit(eventData) || needsClubEditModerationRequest(eventData));
  const canDeleteClub = isClubPortal && canClubDeleteEventProposal(eventData);
  const canImmediateDeleteClub = isClubPortal && canClubImmediateDelete(eventData);
  const canRequestDeleteClub = isClubPortal && canClubRequestDeleteModeration(eventData);
  const clubModerationPending = isClubPortal && hasClubModerationPending(eventData);
  const showClubPreApprovalUi =
    isClubPortal && isClubEventPendingApproval(eventData) && !wasClubEventAdminApproved(eventData);
  const clubIcpdpModerationPending = isClubPortal && isIcpdpModerationPending(eventData);
  const clubAdminModerationPending = isClubPortal && isAdminModerationPending(eventData);
  const canShowIcpdpActions =
    isIcpdpPortal &&
    (proposalReview?.statusKey === 'pending_icpdp' || eventData?.proposalStatusKey === 'pending_icpdp') &&
    isIcpdpRole(getUserRole());

  const statusMeta = useMemo(() => {
    if (isIcpdpPortal && proposalReview?.statusKey) {
      return getEventStatusMeta({ statusKey: proposalReview.statusKey });
    }
    return getEventStatusMeta(eventData);
  }, [isIcpdpPortal, proposalReview, eventData]);
  const rejectionReason =
    eventData?.rejectionReason?.trim() ||
    eventData?.moderationReason?.trim() ||
    '';
  const isRejected = eventData?.statusKey === 'rejected' || eventData?.status === 'rejected';
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
    if (isCtsvPortal) {
      if (!canEditCtsv) {
        showToast?.('Cần Admin phê duyệt yêu cầu chỉnh sửa trước khi mở form.', 'info');
        setActiveTab('dieu-phoi');
        return;
      }
      navigate(`/ctsv/events/${id}/edit`);
      return;
    }
    if (!canClubDirectEdit(eventData) && needsClubEditModerationRequest(eventData)) {
      setModerationDialog({ open: true, action: 'edit' });
      return;
    }
    if (!canClubDirectEdit(eventData)) {
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

  const handleModerationSubmitted = (updatedEvent) => {
    if (updatedEvent) {
      setEventData(normalizeManagementEvent(updatedEvent));
    } else if (moderationDialog.action === 'delete') {
      navigate(config.eventsPath);
      return;
    }
    loadEventData();
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

  if (loading) {
    return (
      <div className="ev-detail-content">
        <main className="ev-detail-main">
          <p style={{ color: '#94a3b8' }}>Đang tải chi tiết sự kiện...</p>
        </main>
      </div>
    );
  }

  return (
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
            </div>
            <div className="ev-header-actions">
              {isClubPortal ? (
                <>
                  {canEditClub && (
                    <button type="button" className="ev-btn-outline" onClick={handleEdit}>
                      {needsClubEditModerationRequest(eventData) ? 'Yêu cầu chỉnh sửa' : 'Chỉnh sửa'}
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
                </>
              ) : (
                <>
                  {(isCtsvPortal ? canManageCtsv : canEditClub) && (
                    <button type="button" className="ev-btn-outline" onClick={handleEdit}>
                      Chỉnh sửa thông tin
                    </button>
                  )}
                  <button
                    type="button"
                    className="ev-btn-outline"
                    onClick={async () => {
                      if (!students.length) {
                        showToast?.('Chưa có sinh viên đăng ký để xuất file.', 'info');
                        return;
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
                        startDate: eventData?.startDate,
                        endDate: eventData?.endDate,
                        location: eventData?.location,
                      });
                      showToast?.('Đã xuất danh sách sinh viên.', 'success');
                    }}
                  >
                    Xuất danh sách SV (Excel)
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
              <p>
                Yêu cầu{' '}
                <strong>{MODERATION_ACTION_LABELS[eventData?.moderationAction] || 'điều phối'}</strong>
                {eventData?.moderationReason ? `: ${eventData.moderationReason}` : '.'}
              </p>
              <p className="ev-moderation-banner__hint">
                Sau khi IC-PDP duyệt, yêu cầu sẽ chuyển sang Admin phê duyệt.
              </p>
            </div>
          )}
          {clubAdminModerationPending && (
            <div className="ev-moderation-banner ev-moderation-banner--pending" role="status">
              <strong>IC-PDP đã duyệt — đang chờ Admin</strong>
              <p>
                Yêu cầu{' '}
                <strong>{MODERATION_ACTION_LABELS[eventData?.moderationAction] || 'điều phối'}</strong>
                {eventData?.moderationReason ? `: ${eventData.moderationReason}` : '.'}
              </p>
              {eventData?.icpdpNote ? (
                <p className="ev-moderation-banner__hint">Ghi chú IC-PDP: {eventData.icpdpNote}</p>
              ) : null}
            </div>
          )}
          {eventData?.clubEditUnlocked && isClubPortal && (
            <div className="ev-moderation-banner ev-moderation-banner--info" role="status">
              <strong>Admin đã duyệt chỉnh sửa</strong>
              <p>Bạn có thể mở form chỉnh sửa. Sau khi lưu, đề xuất sẽ được gửi lại IC-PDP duyệt.</p>
            </div>
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

        <div className={`ev-bento-grid${showClubPreApprovalUi ? ' ev-bento-grid--pending' : ''}`}>
          {showClubPreApprovalUi ? (
            <>
              <div className="ev-bento-card ev-bento-card--pending">
                <div className="ev-bento-card-header">
                  <h3>TRẠNG THÁI DUYỆT</h3>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#f59e0b"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>
                </div>
                <div className="ev-bento-value">
                  <span className="ev-bento-num ev-bento-num--text">{statusMeta.label}</span>
                </div>
                <p className="ev-bento-desc">Đề xuất đang trong hàng đợi IC-PDP</p>
              </div>

              <div className="ev-bento-card ev-bento-card--pending">
                <div className="ev-bento-card-header">
                  <h3>SỨC CHỨA DỰ KIẾN</h3>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#f26f21"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/></svg>
                </div>
                <div className="ev-bento-value ev-bento-value--metric">
                  <span className="ev-bento-num">{eventData?.capacity || 0}</span>
                  <span className="ev-bento-total">chỗ</span>
                </div>
                <p className="ev-bento-desc">Quy mô tham gia trong đề xuất</p>
              </div>

              <div className="ev-bento-card ev-bento-card--pending">
                <div className="ev-bento-card-header">
                  <h3>ĐỊA ĐIỂM DỰ KIẾN</h3>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#64748b" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/></svg>
                </div>
                <div className="ev-bento-value">
                  <span className="ev-bento-num ev-bento-num--sm" title={pendingLocationLabel}>
                    {pendingLocationLabel}
                  </span>
                </div>
                <p className="ev-bento-desc">Chủ đề: {pendingCategoryLabel}</p>
              </div>

              <div className="ev-bento-card ev-bento-card--pending">
                <div className="ev-bento-card-header">
                  <h3>THỜI GIAN DIỄN RA</h3>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#334155"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" fill="currentColor"/></svg>
                </div>
                <div className="ev-bento-value">
                  <span className="ev-bento-num ev-bento-num--sm">{eventStartLabel}</span>
                </div>
                <p className="ev-bento-desc">
                  {eventEndLabel ? `Kết thúc: ${eventEndLabel}` : 'Chưa có thời gian kết thúc'}
                </p>
              </div>
            </>
          ) : (
            <>
          <div className="ev-bento-card">
            <div className="ev-bento-card-header">
              <h3>LƯỢT ĐĂNG KÝ VÉ</h3>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#f26f21"><path d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2-1.46V6H4v2.54A3.996 3.996 0 0 0 4 15.46V18h16v-2.54A3.996 3.996 0 0 0 20 8.54zM11 15h2v2h-2zm0-4h2v2h-2zm0-4h2v2h-2z" /></svg>
            </div>
            <div className="ev-bento-value">
              <span className="ev-bento-num">{eventData?.registeredCount || 0}</span>{' '}
              <span className="ev-bento-total">/ {eventData ? eventData.capacity : '...'}</span>
            </div>
            <div className="ev-bento-progress-bar">
              <div
                className={`ev-bento-progress-fill ev-bento-progress-fill--${registrationProgress.tone}`}
                style={{ width: `${registrationProgress.pct}%` }}
              />
            </div>
            <p className="ev-bento-desc">{registrationProgress.label}</p>
          </div>

          <div className="ev-bento-card">
            <div className="ev-bento-card-header">
              <h3>ĐÃ CHECK-IN</h3>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#334155"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM10.47 14.86l-2.12-2.12a.996.996 0 1 0-1.41 1.41l2.83 2.83c.39.39 1.02.39 1.41 0l5.66-5.66a.996.996 0 0 0-1.41-1.41l-4.96 4.95z"/></svg>
            </div>
            <div className="ev-bento-value">
              <span className="ev-bento-num">{eventData?.checkinCount || 0}</span>{' '}
              <span className="ev-bento-total">/ {eventData?.registeredCount || 0} sinh viên</span>
            </div>
            <div className="ev-bento-progress-bar ev-bento-progress-bar--checkin">
              <div
                className={`ev-bento-progress-fill ev-bento-progress-fill--checkin-${checkinProgress.tone}`}
                style={{ width: `${checkinProgress.pct}%` }}
              />
            </div>
            <p className="ev-bento-desc">{checkinProgress.label}</p>
          </div>

          <div className="ev-bento-card">
            <div className="ev-bento-card-header">
              <h3>ĐÁNH GIÁ</h3>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#eab308"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            </div>
            <div className="ev-bento-value">
              <span className="ev-bento-num">{ratingStats.label}</span>
              <BentoStarRating value={ratingStats.value} />
            </div>
            <p className="ev-bento-desc ev-bento-desc--spaced">
              {ratingStats.count > 0
                ? `Từ ${ratingStats.count} lượt phản hồi`
                : 'Chưa có lượt phản hồi'}
            </p>
          </div>

          <div className="ev-bento-card">
            <div className="ev-bento-card-header">
              <h3>LƯỢT TIẾP CẬN</h3>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#334155"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
            </div>
            <div className="ev-bento-value">
              <span className="ev-bento-num">{eventData?.reach || 0}</span>
            </div>
            <p className={`ev-bento-desc ev-bento-desc--spaced ev-bento-desc--delta ev-bento-desc--delta-${reachDeltaTone}`}>
              {reachDelta > 0 && (
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" fill="currentColor" />
                </svg>
              )}
              {reachDelta < 0 && (
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" fill="currentColor" />
                </svg>
              )}
              <span className="ev-bento-delta-value">{reachDeltaLabel}</span> so với tuần trước
            </p>
          </div>
            </>
          )}
        </div>

        <div className="ev-tabs-container">
          {showClubPreApprovalUi ? (
            <button type="button" className="ev-tab active">Tổng quan sự kiện</button>
          ) : (
            <>
          <button type="button" className={`ev-tab ${activeTab === 'tong-quan' ? 'active' : ''}`} onClick={() => setActiveTab('tong-quan')}>Tổng quan sự kiện</button>
          <button type="button" className={`ev-tab ${activeTab === 'danh-sach' ? 'active' : ''}`} onClick={() => setActiveTab('danh-sach')}>Danh sách Sinh viên</button>
          {isCtsvPortal && (
            <button type="button" className={`ev-tab ${activeTab === 'dieu-phoi' ? 'active' : ''}`} onClick={() => setActiveTab('dieu-phoi')}>Phê duyệt & Điều phối</button>
          )}
          <button type="button" className={`ev-tab ${activeTab === 'huy-ve' ? 'active' : ''}`} onClick={() => setActiveTab('huy-ve')}>Yêu cầu hủy vé</button>
          {!isIcpdpPortal && (
            <button type="button" className={`ev-tab ${activeTab === 'hoan-huy' ? 'active' : ''}`} onClick={() => setActiveTab('hoan-huy')}>Hoãn / Hủy sự kiện</button>
          )}
          <button type="button" className={`ev-tab ${activeTab === 'bao-cao' ? 'active' : ''}`} onClick={() => setActiveTab('bao-cao')}>Báo cáo & Minh chứng</button>
          {!isIcpdpPortal && (
            <button type="button" className={`ev-tab ${activeTab === 'ma-qr' ? 'active' : ''}`} onClick={openQrTab}>Mã QR check-in/out</button>
          )}
            </>
          )}
        </div>

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

          {activeTab === 'dieu-phoi' && isCtsvPortal && id && (
            <CtsvEventActionsPanel
              event={eventData}
              eventId={id}
              showToast={showToast}
              onEventUpdated={loadEventData}
            />
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

          {activeTab === 'ma-qr' && id && <EventQrGeneratePanel eventId={id} showToast={showToast} />}
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
    </div>
  );
};

export default EventManagementDetail;
