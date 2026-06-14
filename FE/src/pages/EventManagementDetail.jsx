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
import { getCtsvEventAccess } from '../utils/ctsvEventAccess';
import { canCtsvEditSchoolEvent } from '../constants/eventWorkflow';
import { canClubEditEventProposal } from '../constants/clubEventModeration';
import { getManagementEventId, normalizeManagementEvent } from '../utils/normalizeManagementEvent';
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
    currentLabel: 'Chi tiết quản lý',
  },
  ctsv: {
    rootLabel: 'CTSV',
    rootPath: '/ctsv/dashboard',
    eventsLabel: 'Sự kiện',
    eventsPath: '/ctsv/events',
    headerLabel: 'Quản lý sự kiện CTSV',
    currentLabel: 'Chi tiết quản lý',
  },
};

const getEventStatusMeta = (event) => {
  const key = event?.statusKey || event?.status || '';
  const displayLabel =
    typeof event?.status === 'string' &&
    !['approved', 'pending', 'rejected', 'live', 'draft'].includes(event.status)
      ? event.status
      : null;

  if (key === 'rejected') return { label: displayLabel || 'Từ chối', tone: 'rejected' };
  if (key === 'live') return { label: displayLabel || 'Đang diễn ra', tone: 'live' };
  if (key === 'approved') return { label: displayLabel || 'Đã duyệt', tone: 'approved' };
  if (String(key).includes('pending') || key === 'pending' || key === 'revision') {
    return { label: displayLabel || 'Chờ duyệt', tone: 'pending' };
  }
  if (displayLabel) return { label: displayLabel, tone: 'live' };
  if (key === 'approved') return { label: 'Đã duyệt', tone: 'approved' };
  if (key === 'pending') return { label: 'Chờ duyệt', tone: 'pending' };
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

const EventManagementDetail = ({ portal = 'club' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const outlet = useOutletContext() || {};
  const showToast = outlet.showToast;
  const isCtsvPortal = portal === 'ctsv';
  const config = PORTAL_CONFIG[portal] || PORTAL_CONFIG.club;

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
  }, [id, isCtsvPortal, navigate, config.eventsPath, showToast]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'bao-cao') setActiveTab('bao-cao');
    if (tab === 'dieu-phoi' && isCtsvPortal) setActiveTab('dieu-phoi');
  }, [searchParams, isCtsvPortal]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  useEffect(() => {
    if (isCtsvPortal || !id) return;
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
  const canEditClub = !isCtsvPortal && canClubEditEventProposal(eventData);

  const statusMeta = getEventStatusMeta(eventData);
  const rejectionReason =
    eventData?.rejectionReason?.trim() ||
    eventData?.moderationReason?.trim() ||
    '';
  const isRejected = eventData?.statusKey === 'rejected' || eventData?.status === 'rejected';
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
    if (!canClubEditEventProposal(eventData)) {
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
              <button type="button" className="ev-btn-primary ev-btn-qr" onClick={openQrTab}>
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13-2h3v2h-3zm-5 0h3v2h-3zm3 3h3v2h-3zm-3 3h3v2h-3zm3 3h3v2h-3zm-5-3h3v2h-3z" fill="currentColor"/></svg>
                Mã QR check-in/out
              </button>
            </div>
          </div>
          {isRejected && (
            <div className="ev-rejection-reason">
              <span className="ev-rejection-reason__label">Lý do từ chối</span>
              <p className="ev-rejection-reason__text">
                {rejectionReason || 'Không có lý do cụ thể.'}
              </p>
            </div>
          )}
        </div>

        <div className="ev-bento-grid">
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
        </div>

        <div className="ev-tabs-container">
          <button type="button" className={`ev-tab ${activeTab === 'tong-quan' ? 'active' : ''}`} onClick={() => setActiveTab('tong-quan')}>Tổng quan sự kiện</button>
          <button type="button" className={`ev-tab ${activeTab === 'danh-sach' ? 'active' : ''}`} onClick={() => setActiveTab('danh-sach')}>Danh sách Sinh viên</button>
          {isCtsvPortal && (
            <button type="button" className={`ev-tab ${activeTab === 'dieu-phoi' ? 'active' : ''}`} onClick={() => setActiveTab('dieu-phoi')}>Phê duyệt & Điều phối</button>
          )}
          <button type="button" className={`ev-tab ${activeTab === 'huy-ve' ? 'active' : ''}`} onClick={() => setActiveTab('huy-ve')}>Yêu cầu hủy vé</button>
          {!isCtsvPortal && (
            <button type="button" className={`ev-tab ${activeTab === 'hoan-huy' ? 'active' : ''}`} onClick={() => setActiveTab('hoan-huy')}>Hoãn / Hủy sự kiện</button>
          )}
          <button type="button" className={`ev-tab ${activeTab === 'bao-cao' ? 'active' : ''}`} onClick={() => setActiveTab('bao-cao')}>Báo cáo & Minh chứng</button>
          <button type="button" className={`ev-tab ${activeTab === 'ma-qr' ? 'active' : ''}`} onClick={openQrTab}>Mã QR check-in/out</button>
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

          {activeTab === 'hoan-huy' && !isCtsvPortal && id && (
            <EventPostponeCancelPanel
              event={eventData}
              eventId={id}
              showToast={showToast}
              onEventUpdated={(updated) => setEventData(normalizeManagementEvent(updated))}
            />
          )}

          {activeTab === 'bao-cao' && <EventReportPanel event={eventData} students={students} />}

          {activeTab === 'ma-qr' && id && <EventQrGeneratePanel eventId={id} showToast={showToast} />}
        </div>
      </main>

      <footer className="ev-detail-footer">
        <div className="ev-footer-content">
          <p>© 2026 FPT Event Platform - All Rights Reserved.</p>
          <p>Hotline: 024.1234.5678 | Email: contact@fevents.com</p>
        </div>
      </footer>
    </div>
  );
};

export default EventManagementDetail;
