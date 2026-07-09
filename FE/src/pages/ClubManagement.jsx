import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { API_BASE, getEventHeaders, parseApiResponse } from '../utils/api';
import ClubProfileUpdate from '../components/ClubProfileUpdate';
import ClubChairmanTransfer from '../components/club/ClubChairmanTransfer';
import ClubDashboardPanel from '../components/club/ClubDashboardPanel';
import ClubParticipantsPanel from '../components/club/ClubParticipantsPanel';
import ClubEventReportsPanel from '../components/club/ClubEventReportsPanel';
import './ClubManagement.css';
import EventProposalForm from '../components/events/EventProposalForm';
import ClubSemesterTimelinePanel from '../components/club/ClubSemesterTimelinePanel';
import ClubTablePagination from '../components/ui/ClubTablePagination';
import EventDiscoveryCard from '../components/EventDiscoveryCard';
import { resolveEventDisplayImage } from '../utils/eventDisplay';
import { getCategoryDisplayLabel } from '../constants/eventCategories';
import { fetchClubSemesterTimelines } from '../services/clubTimelineApi';
import { EMPTY_EVENT_FORM, mapApiEventToForm } from '../utils/eventFormState';

// Ánh xạ sự kiện CLB sang card giống trang quản lý sự kiện của CTSV.
const clubCardState = (ev) => {
  const s = ev.status || '';
  if (s === 'ended') return 'expired';
  if (s === 'postponed') return 'postponed';
  const end = ev.endDate ? new Date(ev.endDate) : null;
  if (end && !Number.isNaN(end.getTime()) && end.getTime() < Date.now()) return 'expired';
  return 'active';
};

const toClubDiscoveryCard = (ev) => {
  const start = ev.startDate ? new Date(ev.startDate) : null;
  const dateLabel = start && !Number.isNaN(start.getTime())
    ? `${start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${start.toLocaleDateString('vi-VN')}`
    : '';
  return {
    id: String(ev._id || ev.id || ''),
    title: ev.title,
    thumbnail: resolveEventDisplayImage(ev),
    isPending: /^pending/.test(ev.status || '') || ev.status === 'revision',
    category: ev.category || 'Sự kiện',
    categoryLabel: getCategoryDisplayLabel(ev.category) || ev.category,
    dateLabel,
    location: ev.location || 'Chưa có địa điểm',
    filledSlots: ev.registeredCount ?? 0,
    totalSlots: ev.capacity ?? 0,
    cardState: clubCardState(ev),
    primaryLabel: 'Quản lý',
    priceLabel: ev.ticketPrice > 0 ? `${Number(ev.ticketPrice).toLocaleString('vi-VN')}đ` : 'MIỄN PHÍ',
    organizerLabel: 'CLB',
  };
};

const PAGE_SIZE = 10;

const ClubManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    showToast,
    userProfile,
    activeNav,
    setActiveNav,
    events = [],
    setEvents,
    lastSeenNotifs,
  } = useOutletContext();
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rejectModalData, setRejectModalData] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [editReturnTo, setEditReturnTo] = useState(null);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [eventFormKey, setEventFormKey] = useState(0);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [bannerFileName, setBannerFileName] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [notifFilter, setNotifFilter] = useState('all');
  const [approvedTimelines, setApprovedTimelines] = useState([]);

  const eventNotifications = useMemo(() => {
    return events
      .filter(ev => ev.status && ev.status !== 'draft')
      .sort((a, b) => {
        const dA = new Date(a.updatedAt || a.createdAt || 0);
        const dB = new Date(b.updatedAt || b.createdAt || 0);
        return dB - dA;
      })
      .map(ev => {
        let tone = 'info';
        let title = 'Cập nhật trạng thái';
        let body = `Sự kiện "${ev.title}" đã được cập nhật.`;
        let reason = ev.rejectionReason || ev.moderationReason || 'Không có lý do cụ thể.';
        
        if (ev.status === 'approved') {
          tone = 'success';
          title = 'Sự kiện đã được duyệt';
          body = `Đề xuất sự kiện "${ev.title}" đã được phê duyệt.`;
        } else if (ev.status === 'rejected') {
          tone = 'alert';
          title = 'Sự kiện bị từ chối';
          body = `Đề xuất sự kiện "${ev.title}" bị từ chối. Lý do: ${reason}`;
        } else if (ev.status === 'pending') {
          tone = 'warning';
          title = 'Sự kiện đang chờ duyệt';
          body = `Đề xuất "${ev.title}" đã được gửi và đang chờ xét duyệt.`;
        }

        const dateObj = new Date(ev.updatedAt || ev.createdAt || Date.now());
        const rawDate = dateObj.getTime();
        const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + dateObj.toLocaleDateString('vi-VN');

        return {
          id: ev._id,
          title,
          body,
          tone,
          time: timeStr,
          rawDate,
          unread: rawDate > lastSeenNotifs,
          reason
        };
      });
  }, [events, lastSeenNotifs]);

  useEffect(() => {
    fetchMyEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeNav !== 'create') return undefined;
    let cancelled = false;
    fetchClubSemesterTimelines()
      .then((data) => {
        if (!cancelled) setApprovedTimelines(data.timelines || []);
      })
      .catch(() => {
        if (!cancelled) setApprovedTimelines([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeNav]);

  const handleOpenExistingEventFromTimeline = async (event) => {
    const eventId = event?._id || event?.id;
    if (!eventId) return;
    setEditingEventId(eventId);
    setEditReturnTo(null);
    try {
      const res = await fetch(`${API_BASE}/api/events/${eventId}?includeMedia=1`, {
        headers: getEventHeaders(false),
      });
      const data = await res.json();
      if (data.success && data.event) {
        setEventForm(mapApiEventToForm(data.event));
        setBannerFileName(data.event.bannerFileName || 'event-banner.jpg');
        setEventFormKey((k) => k + 1);
        showToast?.('Đã mở sự kiện từ timeline để chỉnh sửa.', 'info');
      } else {
        showToast?.(data.message || 'Không tải được sự kiện.', 'error');
      }
    } catch {
      showToast?.('Lỗi khi tải sự kiện.', 'error');
    }
  };

  useEffect(() => {
    const editId = location.state?.editEventId;
    const returnTo = location.state?.returnTo || null;
    if (!editId) return;
    setEditingEventId(editId);
    setEditReturnTo(returnTo);
    setActiveNav('create');
    fetch(`${API_BASE}/api/events/${editId}?includeMedia=1`, { headers: getEventHeaders(false) })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.event) {
          setEventForm(mapApiEventToForm(data.event));
          setBannerFileName(data.event.bannerFileName || 'event-banner.jpg');
          setEventFormKey((k) => k + 1);
        } else {
          showToast?.(data.message || 'Không tải được sự kiện để chỉnh sửa.', 'error');
        }
      })
      .catch(() => showToast?.('Lỗi khi tải sự kiện.', 'error'));
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.editEventId]);

  const fetchMyEvents = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoadingEvents(false);
      setEvents?.([]);
      showToast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'error');
      return;
    }

    setLoadingEvents(true);
    try {
      const res = await fetch(`${API_BASE}/api/events/my`, { headers: getEventHeaders(false) });
      const { ok, data } = await parseApiResponse(res);
      if (ok && data.success && Array.isArray(data.events)) {
        setEvents?.(data.events);
      } else {
        console.error('fetchMyEvents:', res.status, data);
        showToast(data.message || 'Không tải được danh sách sự kiện. Hãy restart backend.', 'error');
        setEvents?.([]);
      }
    } catch (err) {
      console.error('Lỗi tải sự kiện:', err);
      showToast('Không kết nối được server. Kiểm tra BE đang chạy port 5000.', 'error');
      setEvents?.([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return events;
    if (eventFilter === 'pending') {
      return events.filter((e) => e.status && e.status.startsWith('pending'));
    }
    return events.filter((e) => e.status === eventFilter);
  }, [events, eventFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const pageSafe = Math.min(currentPage, totalPages);

  const pagedEvents = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filteredEvents.slice(start, start + PAGE_SIZE);
  }, [filteredEvents, pageSafe]);

  useEffect(() => {
    setCurrentPage(1);
  }, [eventFilter]);

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/events/${id}`, {
        method: 'DELETE',
        headers: getEventHeaders(false)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xóa sự kiện thành công!', 'success');
        fetchMyEvents();
      } else {
        showToast(data.message || 'Xóa thất bại!', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối server!', 'error');
    }
  };
  const handleClubEventSubmit = async (body) => {
    setSubmittingEvent(true);
    try {
      const payload = {
        title: body.title,
        description: body.description,
        thumbnail: body.thumbnail,
        bannerFileName: body.bannerFileName,
        eventPlanFile: body.eventPlanFile,
        eventPlanFileName: body.eventPlanFileName,
        eventPlanFileMime: body.eventPlanFileMime,
        eventPlanLink: body.eventPlanLink,
        speaker: body.speaker,
        agenda: body.agenda,
        learningOutcomes: body.learningOutcomes,
        location: body.location,
        capacity: body.capacity,
        category: body.category,
        registrationStartDate: body.registrationStartDate,
        registrationEndDate: body.registrationEndDate,
        startDate: body.startDate,
        endDate: body.endDate,
        ticketPrice: body.ticketPrice,
        ticketTypes: body.ticketTypes,
        totalTickets: body.totalTickets,
        timelineSource: body.timelineSource,
      };
      const endpoint = editingEventId
        ? `${API_BASE}/api/events/${editingEventId}`
        : `${API_BASE}/api/events`;
      const res = await fetch(endpoint, {
        method: editingEventId ? 'PUT' : 'POST',
        headers: getEventHeaders(true),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          data.message ||
            (editingEventId ? 'Đã cập nhật và gửi lại duyệt!' : 'Đề xuất sự kiện đã được gửi duyệt!'),
          'success'
        );
        const returnTo = editReturnTo;
        setEditingEventId(null);
        setEditReturnTo(null);
        setBannerFileName('');
        setEventForm(EMPTY_EVENT_FORM);
        setEventFormKey((k) => k + 1);
        fetchMyEvents();
        if (returnTo) {
          navigate(returnTo);
        } else {
          setActiveNav('list');
        }
      } else {
        showToast(data.message || 'Tạo sự kiện thất bại!', 'error');
        throw new Error(data.message);
      }
    } catch (err) {
      if (!err.message) showToast('Lỗi kết nối server!', 'error');
      throw err;
    } finally {
      setSubmittingEvent(false);
    }
  };

  return (
    <>
          {activeNav === 'profile' && (
            <ClubProfileUpdate showToast={showToast} />
          )}

          {activeNav === 'transfer-chairman' && (
            <div className="clb-transfer-chairman-page" style={{ width: '100%', maxWidth: '720px', margin: '0 auto' }}>
              <ClubChairmanTransfer showToast={showToast} onTransferred={() => navigate('/')} />
            </div>
          )}

          {activeNav === 'semester-timeline' && (
            <ClubSemesterTimelinePanel showToast={showToast} />
          )}

          {activeNav === 'list' && (
            <>
              <div className="clb-page-header">
                <div>
                  <h1 className="clb-page-title">Danh sách sự kiện</h1>
                  <p className="clb-page-subtitle">Chào mừng, <strong>{userProfile.fullname || 'Manager'}</strong> — bạn đang quản lý <strong>{events.length}</strong> sự kiện.</p>
                </div>
                <button
                  className="clb-create-btn"
                  onClick={() => {
                    setEditingEventId(null);
                    setEditReturnTo(null);
                    setActiveNav('create');
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" /></svg>
                  Tạo sự kiện mới
                </button>
              </div>

              {(() => {
                const EVENT_FILTERS = [
                  { key: 'all', label: 'Tất cả', count: events.length },
                  { key: 'approved', label: 'Đã duyệt', count: events.filter(e => e.status === 'approved').length },
                  { key: 'pending', label: 'Đang duyệt', count: events.filter(e => e.status && e.status.startsWith('pending')).length },
                  { key: 'rejected', label: 'Từ chối', count: events.filter(e => e.status === 'rejected').length },
                  { key: 'revision', label: 'Cần chỉnh sửa', count: events.filter(e => e.status === 'revision').length },
                ];
                return (
                  <div className="clb-filter-tabs">
                    {EVENT_FILTERS.map(f => (
                      <button
                        key={f.key}
                        type="button"
                        className={`clb-filter-tab clb-filter-tab--${f.key}${eventFilter === f.key ? ' is-active' : ''}`}
                        onClick={() => setEventFilter(f.key)}
                      >
                        <span className="clb-filter-tab__label">{f.label}</span>
                        <span className="clb-filter-tab__count">{f.count}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}

              {loadingEvents ? (
                <div className="event-grid-cards" aria-busy="true">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="event-discovery-card event-discovery-card--active" style={{ minHeight: 320 }}>
                      <div className="event-discovery-card__media" style={{ background: '#f1f5f9' }} />
                      <div className="event-discovery-card__body" style={{ padding: 16 }}>
                        <div className="sk sk-line sk-line--lg" />
                        <div className="sk sk-line" />
                        <div className="sk sk-line sk-line--short" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="ctsv-events-empty">
                  <span className="ctsv-events-empty-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </span>
                  <h2>Không có sự kiện nào{eventFilter !== 'all' ? ' ở trạng thái này' : ''}.</h2>
                  <p>Tạo sự kiện mới hoặc đổi bộ lọc trạng thái phía trên.</p>
                </div>
              ) : (
                <>
                  <div className="event-grid-cards">
                    {pagedEvents.map((ev) => (
                      <div key={ev._id} className="clb-event-card-cell">
                        <EventDiscoveryCard
                          event={toClubDiscoveryCard(ev)}
                          protectedImage
                          viewOnly
                          detailTo={`/quan-ly-clb/su-kien/${ev._id}`}
                          onManage={() => navigate(`/quan-ly-clb/su-kien/${ev._id}`)}
                          manageLabel="Quản lý"
                        />
                        {ev.status === 'rejected' && (
                          <button
                            type="button"
                            className="clb-card-delete-btn"
                            onClick={() => handleDeleteEvent(ev._id)}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Xóa sự kiện
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <ClubTablePagination
                    page={pageSafe}
                    totalItems={filteredEvents.length}
                    pageSize={PAGE_SIZE}
                    onChange={setCurrentPage}
                  />
                </>
              )}
            </>
          )}

          {activeNav === 'create' && (
            <EventProposalForm
              key={eventFormKey}
              role="club"
              showToast={showToast}
              editingId={editingEventId}
              isEditMode={Boolean(editingEventId)}
              form={eventForm}
              onFormChange={setEventForm}
              bannerFileName={bannerFileName}
              onBannerFileNameChange={setBannerFileName}
              submitting={submittingEvent}
              onCancel={() => {
                const returnTo = editReturnTo;
                setEditingEventId(null);
                setEditReturnTo(null);
                if (returnTo) {
                  navigate(returnTo);
                } else {
                  setActiveNav('list');
                }
              }}
              onDraftSave={() => showToast('Đã lưu bản nháp!', 'info')}
              onSubmit={handleClubEventSubmit}
              approvedTimelines={approvedTimelines}
              clubEvents={events}
              onOpenExistingEvent={handleOpenExistingEventFromTimeline}
              onClearEditMode={() => {
                setEditingEventId(null);
                setEditReturnTo(null);
              }}
            />
          )}

          {activeNav === 'participants' && (
            <ClubParticipantsPanel
              events={events}
              showToast={showToast}
              onViewEvent={(eventId) => navigate(`/quan-ly-clb/su-kien/${eventId}`)}
            />
          )}

          {activeNav === 'dashboard' && (
            <ClubDashboardPanel
              events={events}
              loadingEvents={loadingEvents}
              userProfile={userProfile}
              onViewEvent={(eventId) => navigate(`/quan-ly-clb/su-kien/${eventId}`)}
            />
          )}

          {activeNav === 'report' && (
            <ClubEventReportsPanel
              events={events}
              loadingEvents={loadingEvents}
              showToast={showToast}
              onViewReport={(eventId) =>
                navigate(`/quan-ly-clb/su-kien/${eventId}?tab=bao-cao`)
              }
            />
          )}

          {activeNav === 'notifications' && (
            <div className="club-m-notifications">
              <div className="club-m-notifications__header">
                <h2 className="clb-modal-title" style={{ margin: 0 }}>Thông báo xét duyệt</h2>
                <p className="clb-modal-subtitle" style={{ margin: '4px 0 0 0' }}>
                  Trạng thái phê duyệt các sự kiện của câu lạc bộ.
                </p>
              </div>

              {(() => {
                const NOTIF_FILTERS = [
                  { key: 'all', label: 'Tất cả', count: eventNotifications.length },
                  { key: 'success', label: 'Đã duyệt', count: eventNotifications.filter(n => n.tone === 'success').length },
                  { key: 'warning', label: 'Đang duyệt', count: eventNotifications.filter(n => n.tone === 'warning').length },
                  { key: 'alert', label: 'Từ chối', count: eventNotifications.filter(n => n.tone === 'alert').length },
                ];
                return (
                  <div className="clb-filter-tabs">
                    {NOTIF_FILTERS.map(f => (
                      <button
                        key={f.key}
                        type="button"
                        className={`clb-filter-tab clb-filter-tab--${f.key}${notifFilter === f.key ? ' is-active' : ''}`}
                        onClick={() => setNotifFilter(f.key)}
                      >
                        <span className="clb-filter-tab__label">{f.label}</span>
                        <span className="clb-filter-tab__count">{f.count}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}

              <div className="club-m-notifications__list">
                {(() => {
                  const filtered = notifFilter === 'all' ? eventNotifications : eventNotifications.filter(n => n.tone === notifFilter);
                  if (filtered.length === 0) return <p className="clb-panel-empty">Không có thông báo nào{notifFilter !== 'all' ? ' ở mục này' : ''}.</p>;
                  return filtered.map((notif) => (
                    <div
                      key={notif.id}
                      className={`club-m-notif-card${notif.unread ? ' club-m-notif-card--unread' : ''}`}
                    >
                      <div className="club-m-notif-card__icon">
                        {notif.tone === 'success' && (
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="#22c55e" aria-hidden="true">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        )}
                        {notif.tone === 'alert' && (
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="#ef4444" aria-hidden="true">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                          </svg>
                        )}
                        {notif.tone === 'warning' && (
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="#f59e0b" aria-hidden="true">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                          </svg>
                        )}
                        {notif.tone === 'info' && (
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="#3b82f6" aria-hidden="true">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                          </svg>
                        )}
                      </div>
                      <div className="club-m-notif-card__body">
                        <h4 className={`club-m-notif-card__title${notif.unread ? ' is-unread' : ''}`}>{notif.title}</h4>
                        <p className="club-m-notif-card__text">{notif.body}</p>
                        <div className="club-m-notif-card__footer">
                          <span>{notif.time}</span>
                          {notif.tone === 'alert' && (
                            <button
                              type="button"
                              className="club-m-notif-card__reason-btn"
                              onClick={() => setRejectModalData({ title: notif.title, reason: notif.reason })}
                            >
                              Xem lý do chi tiết
                            </button>
                          )}
                        </div>
                      </div>
                      {notif.unread && <div className="club-m-notif-card__dot" aria-hidden="true" />}
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {rejectModalData && (
            <div
              className="club-m-modal-backdrop"
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
              }}
              onClick={() => setRejectModalData(null)}
            >
              <div
                className="club-m-modal"
                style={{
                  background: '#fff', borderRadius: '12px', padding: '24px',
                  width: '100%', maxWidth: '480px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  Phản hồi từ Ban cán bộ
                </h3>
                <div style={{ background: '#ffffff', border: '1px solid #fca5a5', padding: '16px', borderRadius: '8px', color: '#991b1b', lineHeight: '1.5', fontSize: '0.95rem', marginTop: '16px' }}>
                  {rejectModalData.reason}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button className="clb-btn-primary" onClick={() => setRejectModalData(null)}>Đóng</button>
                </div>
              </div>
            </div>
          )}

    </>
  );
};

export default ClubManagement;
