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
import ClubEventListCard from '../components/club/mobile/ClubEventListCard';
import { EMPTY_EVENT_FORM, mapApiEventToForm } from '../utils/eventFormState';

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
  const totalEvents = events.length;

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

  const getStatusLabel = (status) => {
    if (status === 'approved') return { label: 'Đã duyệt', tone: 'approved' };
    if (status === 'pending_icpdp') return { label: 'Chờ IC-PDP', tone: 'pending' };
    if (status === 'pending_admin') return { label: 'Chờ Admin', tone: 'pending' };
    if (status === 'pending' || status === 'pending_ctsv') return { label: 'Chờ duyệt', tone: 'pending' };
    if (status === 'revision') return { label: 'Cần chỉnh sửa', tone: 'pending' };
    if (status === 'rejected') return { label: 'Từ chối', tone: 'rejected' };
    return { label: status || 'Không rõ', tone: 'pending' };
  };

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
          editingEventId ? 'Đã cập nhật và gửi lại duyệt!' : 'Đề xuất sự kiện đã được gửi duyệt!',
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
                  <h1 className="clb-page-title">DANH SÁCH SỰ KIỆN QUẢN LÝ</h1>
                  <p className="clb-page-subtitle">Chào mừng trở lại, <strong>{userProfile.fullname || 'Manager'}</strong>. Bạn đang quản lý <strong>{events.length}</strong> sự kiện.</p>
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

              <div className="clb-table-wrapper club-m-hide-mobile">
                <div className="clb-table-scroll">
                  <table className="clb-table">
                    <thead>
                      <tr>
                        <th>TÊN SỰ KIỆN</th>
                        <th>THỂ LOẠI</th>
                        <th>THỜI GIAN</th>
                        <th>SỐ SLOT</th>
                        <th>TRẠNG THÁI</th>
                        <th className="clb-table-col-action">HÀNH ĐỘNG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingEvents ? (
                        <tr><td colSpan={6} className="clb-panel-empty-cell">Đang tải...</td></tr>
                      ) : events.length === 0 ? (
                        <tr><td colSpan={6} className="clb-panel-empty-cell">Chưa có sự kiện nào. Tạo sự kiện đầu tiên của bạn!</td></tr>
                      ) : events.map(ev => {
                        const { label, tone } = getStatusLabel(ev.status);
                        const startDate = ev.startDate ? new Date(ev.startDate).toLocaleDateString('vi-VN') : '--';
                        const startTime = ev.startDate ? new Date(ev.startDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--';
                        const reg = ev.registeredCount || 0;
                        const cap = ev.capacity || 0;
                        const pct = cap > 0 ? Math.min(100, Math.round((reg / cap) * 100)) : 0;
                        return (
                          <tr key={ev._id}>
                            <td><span className="clb-event-name">{ev.title}</span></td>
                            <td><span className="clb-table-chip">{ev.category || 'Workshop'}</span></td>
                            <td>
                              <div className="clb-table-date">
                                <strong>{startDate}</strong>
                                <span>{startTime}</span>
                              </div>
                            </td>
                            <td>
                              <div className="clb-slot-cell">
                                <span className="clb-slot-nums">{reg}/{cap}</span>
                                <div className="clb-slot-bar-bg">
                                  <div className="clb-slot-bar-fill" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`clb-table-status clb-table-status--${tone}`}>{label}</span>
                            </td>
                            <td className="clb-table-col-action">
                              <div className="clb-table-actions">
                                <button
                                  type="button"
                                  className="clb-action-btn clb-action-btn--info"
                                  title="Xem chi tiết"
                                  aria-label={`Xem chi tiết ${ev.title}`}
                                  onClick={() => navigate(`/quan-ly-clb/su-kien/${ev._id}`)}
                                >
                                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                                    <path d="M12 10v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx="12" cy="7.5" r="1.25" fill="currentColor" />
                                  </svg>
                                </button>
                                {ev.status === 'rejected' ? (
                                  <button
                                    type="button"
                                    className="clb-action-btn clb-action-btn--danger"
                                    title="Xóa sự kiện"
                                    aria-label={`Xóa sự kiện ${ev.title}`}
                                    onClick={() => handleDeleteEvent(ev._id)}
                                  >
                                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                  </button>
                                ) : (
                                  <span className="clb-action-btn-spacer" aria-hidden="true" />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="clb-pagination">
                  <span className="clb-pagination-info">1-{events.length} trong tổng số {totalEvents}</span>
                  <div className="clb-pagination-btns">
                    <button className="clb-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                      <svg viewBox="0 0 24 24" width="16" height="16"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" fill="currentColor" /></svg>
                    </button>
                    <button className="clb-page-btn" onClick={() => setCurrentPage(p => p + 1)}>
                      <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" fill="currentColor" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="club-m-event-list club-m-show-mobile">
                {loadingEvents ? (
                  <p className="clb-panel-empty">Đang tải...</p>
                ) : events.length === 0 ? (
                  <p className="clb-panel-empty">Chưa có sự kiện nào. Tạo sự kiện đầu tiên của bạn!</p>
                ) : (
                  events.map((ev) => {
                    const { label, tone } = getStatusLabel(ev.status);
                    return (
                      <ClubEventListCard
                        key={ev._id}
                        event={ev}
                        statusLabel={label}
                        statusTone={tone}
                        onView={(id) => navigate(`/quan-ly-clb/su-kien/${id}`)}
                        onDelete={handleDeleteEvent}
                        showDelete={ev.status === 'rejected'}
                      />
                    );
                  })
                )}
              </div>
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
              onViewReport={(eventId) =>
                navigate(`/quan-ly-clb/su-kien/${eventId}?tab=bao-cao`)
              }
            />
          )}

          {activeNav === 'notifications' && (
            <div className="club-m-notifications">
              <div className="club-m-notifications__header">
                <h2 className="clb-modal-title" style={{ margin: 0 }}>THÔNG BÁO XÉT DUYỆT</h2>
                <p className="clb-modal-subtitle" style={{ margin: '4px 0 0 0' }}>
                  Trạng thái phê duyệt các sự kiện của câu lạc bộ.
                </p>
              </div>

              <div className="club-m-notifications__list">
                {eventNotifications.length === 0 ? (
                  <p className="clb-panel-empty">Chưa có thông báo nào.</p>
                ) : (
                  eventNotifications.map((notif) => (
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
                  ))
                )}
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
