import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { API_BASE, getAuthHeaders, getEventHeaders, parseApiResponse } from '../utils/api';
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

const EventManagementDetail = ({ portal = 'club' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const outlet = useOutletContext() || {};
  const showToast = outlet.showToast;
  const listEvents = outlet.events || [];
  const isCtsvPortal = portal === 'ctsv';
  const config = PORTAL_CONFIG[portal] || PORTAL_CONFIG.club;

  const listEvent = useMemo(
    () => listEvents.find((ev) => String(ev._id) === String(id)),
    [listEvents, id]
  );

  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'bao-cao') return 'bao-cao';
    if (tab === 'dieu-phoi' && isCtsvPortal) return 'dieu-phoi';
    return 'tong-quan';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [eventData, setEventData] = useState(() =>
    listEvent ? normalizeManagementEvent(listEvent) : null
  );
  const [students, setStudents] = useState([]);
  const [clubMeta, setClubMeta] = useState({ clubName: '', clubPresident: '' });
  const [loading, setLoading] = useState(() => !listEvent);
  const [detailRefreshing, setDetailRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshEventData = () => setRefreshKey((key) => key + 1);

  useEffect(() => {
    if (!listEvent) return;
    setEventData((prev) => {
      if (prev && String(getManagementEventId(prev)) === String(id)) return prev;
      return normalizeManagementEvent(listEvent);
    });
    setLoading(false);
  }, [listEvent, id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const hasBootstrap = Boolean(listEvent);
    const controller = new AbortController();
    let timeoutId;

    const loadEventData = async () => {
      if (!hasBootstrap) setLoading(true);
      else setDetailRefreshing(true);

      try {
        let event = hasBootstrap ? normalizeManagementEvent(listEvent) : null;
        let studentList = [];

        if (isCtsvPortal) {
          try {
            const ctsvData = await fetchCtsvEvent(id);
            if (ctsvData?.event) {
              event = normalizeManagementEvent({ ...event, ...ctsvData.event });
            }
          } catch {
            /* fallback public API */
          }
        }

        timeoutId = window.setTimeout(() => controller.abort(), 20000);

        const res = await fetch(`${API_BASE}/api/events/${id}?includeMedia=1`, {
          headers: isCtsvPortal ? getAuthHeaders(false) : getEventHeaders(false),
          signal: controller.signal,
        });
        window.clearTimeout(timeoutId);

        const { ok, data } = await parseApiResponse(res);
        if (cancelled) return;

        if (ok && data.success && data.event) {
          event = normalizeManagementEvent({ ...event, ...data.event });
          studentList = data.students || studentList;
        }

        if (!event) {
          showToast?.('Không thể lấy thông tin sự kiện', 'error');
          navigate(config.eventsPath);
          return;
        }

        setEventData(event);
        setStudents(studentList);
      } catch (error) {
        if (cancelled) return;
        if (error?.name === 'AbortError') {
          showToast?.('Tải chi tiết sự kiện quá lâu. Vui lòng thử lại.', 'error');
        } else {
          console.error('Error fetching event data:', error);
          if (!hasBootstrap) {
            showToast?.('Lỗi khi lấy thông tin sự kiện', 'error');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setDetailRefreshing(false);
        }
      }
    };

    loadEventData();
    return () => {
      cancelled = true;
      controller.abort();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [id, isCtsvPortal, listEvent, navigate, config.eventsPath, showToast, refreshKey]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'bao-cao') setActiveTab('bao-cao');
    if (tab === 'dieu-phoi' && isCtsvPortal) setActiveTab('dieu-phoi');
  }, [searchParams, isCtsvPortal]);

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
    navigate('/quan-ly-clb', {
      state: { editEventId: id, returnTo: `/quan-ly-clb/su-kien/${id}` },
    });
  };

  if (loading) {
    return (
      <div className="ev-detail-content">
        <main className="ev-detail-main">
          <p style={{ color: '#94a3b8' }}>Đang tải chi tiết sự kiện...</p>
        </main>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="ev-detail-content">
        <main className="ev-detail-main">
          <p style={{ color: '#94a3b8', marginBottom: 12 }}>Không tải được chi tiết sự kiện.</p>
          <Link to={config.eventsPath} className="ev-btn-outline" style={{ display: 'inline-flex' }}>
            Quay lại danh sách
          </Link>
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
              <h1 className="ev-title">
                {eventData?.title || 'Đang tải...'}
                {detailRefreshing && (
                  <span className="ev-detail-refresh-hint" style={{ marginLeft: 8, fontSize: '0.85rem', color: '#94a3b8' }}>
                    (đang cập nhật…)
                  </span>
                )}
              </h1>
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
              {(isCtsvPortal ? canManageCtsv : true) && (
                <button type="button" className="ev-btn-outline" onClick={handleEdit}>
                  Chỉnh sửa thông tin
                </button>
              )}
              <button
                type="button"
                className="ev-btn-outline"
                onClick={() => {
                  if (!students.length) {
                    showToast?.('Chưa có sinh viên đăng ký để xuất file.', 'info');
                    return;
                  }
                  downloadStudentsExcel(students, {
                    eventTitle: eventData?.title || 'su-kien',
                    clubName: eventData?.clubName || clubMeta.clubName || 'CTSV',
                    clubPresident:
                      eventData?.clubPresident ||
                      clubMeta.clubPresident ||
                      eventData?.createdBy?.fullname ||
                      '',
                  });
                  showToast?.('Đã xuất danh sách sinh viên.', 'success');
                }}
              >
                Xuất danh sách SV (Excel)
              </button>
              <button type="button" className="ev-btn-primary ev-btn-qr" onClick={() => setActiveTab('ma-qr')}>
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
          <button type="button" className={`ev-tab ${activeTab === 'ma-qr' ? 'active' : ''}`} onClick={() => setActiveTab('ma-qr')}>Mã QR check-in/out</button>
        </div>

        <div className="ev-tab-content">
          {activeTab === 'danh-sach' && (
            <div className="ev-table-card">
              <div className="ev-table-toolbar">
                <div className="ev-search-box">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="#94a3b8"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                  <input
                    type="text"
                    placeholder="Tìm MSSV, Tên..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="ev-table-wrapper">
                <table className="ev-table">
                  <thead>
                    <tr>
                      <th>MSSV</th>
                      <th>HỌ VÀ TÊN</th>
                      <th>THỜI GIAN ĐK</th>
                      <th>TRẠNG THÁI VÉ</th>
                      <th>HÀNH ĐỘNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                          Chưa có sinh viên nào đăng ký
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st) => {
                        const mssv = st.student?.studentId || 'N/A';
                        const name = st.student?.fullname || 'Unknown';
                        const time = new Date(st.createdAt).toLocaleString('vi-VN');
                        const avatarCode = name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase();
                        const statusDisplay =
                          st.status === 'checked-in'
                            ? 'Đã check-in'
                            : st.status === 'registered'
                              ? 'Chưa check-in'
                              : 'Đã hủy';
                        return (
                          <tr key={st._id}>
                            <td style={{ fontWeight: '500', color: '#334155' }}>{mssv}</td>
                            <td>
                              <div className="ev-st-name-cell">
                                <div className="ev-st-avatar" style={{ backgroundColor: '#ffffff', color: '#64748b' }}>
                                  {avatarCode}
                                </div>
                                {name}
                              </div>
                            </td>
                            <td style={{ color: '#64748b' }}>{time}</td>
                            <td>
                              {st.status === 'checked-in' ? (
                                <span style={{ color: '#334155' }}>{statusDisplay}</span>
                              ) : (
                                <span style={{ color: '#eab308', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#eab308' }} />
                                  {statusDisplay}
                                </span>
                              )}
                            </td>
                            <td>
                              <button type="button" className="ev-action-link" onClick={() => showToast?.(`Xem chi tiết SV: ${name}`, 'info')}>
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="ev-pagination">
                <span className="ev-page-info">
                  Hiển thị {filteredStudents.length === 0 ? 0 : 1} - {filteredStudents.length} trong số {students.length} sinh viên
                </span>
              </div>
            </div>
          )}

          {activeTab === 'tong-quan' && <EventOverviewPanel event={eventData} />}

          {activeTab === 'dieu-phoi' && isCtsvPortal && id && (
            <CtsvEventActionsPanel
              event={eventData}
              eventId={id}
              showToast={showToast}
              onEventUpdated={refreshEventData}
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
