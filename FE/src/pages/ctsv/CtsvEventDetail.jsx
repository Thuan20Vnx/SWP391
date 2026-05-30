import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  approveCtsvEvent,
  fetchCtsvEvent,
  publishCtsvEvent,
  rejectCtsvEvent,
  revisionCtsvEvent
} from '../../services/ctsvApi';
import { getUserRole } from '../../utils/auth';
import { getCtsvEventAccess } from '../../utils/ctsvEventAccess';
import { statusClass } from '../../utils/eventStatus';
import { resolveEventSpeakers } from '../../constants/eventSpeaker';
import { isSchoolEventPendingAdmin, canCtsvPublishSchoolEvent, canCtsvEditSchoolEvent } from '../../constants/eventWorkflow';

const SOURCE_META = {
  school: { label: 'Cấp trường', tone: 'school' },
  partner: { label: 'Đối tác', tone: 'partner' },
  club: { label: 'CLB', tone: 'club' }
};

const TABS = [
  { id: 'info', label: 'Thông tin' },
  { id: 'tickets', label: 'Vé' }
];

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const IconPin = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const IconTicket = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M3 9a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v1H3V9zm0 2h18v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-4z" />
  </svg>
);

const CtsvEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [event, setEvent] = useState(null);
  const [note, setNote] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const isCtsvOnly = getUserRole() === 'ctsv';

  useEffect(() => {
    fetchCtsvEvent(id)
      .then((d) => setEvent(d.event))
      .catch(() => {
        showToast?.('Không tải được sự kiện.', 'error');
        navigate('/ctsv/events');
      });
  }, [id, navigate, showToast]);

  const refresh = () => fetchCtsvEvent(id).then((d) => setEvent(d.event));

  const stats = useMemo(() => {
    if (!event) return null;
    const total = event.totalTickets || event.capacity || 0;
    const remaining = event.remainingTickets ?? Math.max(0, total - (event.registeredCount || 0));
    const registered =
      event.registeredCount ?? Math.max(0, total - remaining);
    const fillRate = total > 0 ? Math.round((registered / total) * 100) : 0;
    return { total, remaining, registered, fillRate };
  }, [event]);

  const handleApprove = async () => {
    if (!isCtsvOnly) {
      showToast?.('Chỉ cán bộ CTSV mới được phê duyệt cuối.', 'error');
      return;
    }
    try {
      await approveCtsvEvent(id, note);
      showToast?.('Đã phê duyệt sự kiện!', 'success');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    }
  };

  const handleReject = async () => {
    if (!note.trim()) {
      showToast?.('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }
    try {
      await rejectCtsvEvent(id, note);
      showToast?.('Đã từ chối sự kiện.', 'info');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    }
  };

  const handleRevision = async () => {
    try {
      await revisionCtsvEvent(id, note);
      showToast?.('Đã gửi yêu cầu chỉnh sửa.', 'info');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    }
  };

  const handlePublish = async () => {
    try {
      await publishCtsvEvent(id);
      showToast?.('Đã publish sự kiện!', 'success');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    }
  };

  if (!event || !stats) {
    return (
      <div className="ctsv-ed-page">
        <div className="ctsv-ed-skeleton-hero sk" />
        <div className="ctsv-ed-skeleton-tabs">
          <div className="sk sk-line sk-line--short" />
          <div className="sk sk-line sk-line--short" />
          <div className="sk sk-line sk-line--short" />
        </div>
        <div className="ctsv-ed-skeleton-panel sk" />
      </div>
    );
  }

  const access = getCtsvEventAccess(event);
  const source = SOURCE_META[event.source] || SOURCE_META.club;
  const eventSpeakers = resolveEventSpeakers(event);
  const canApprove =
    access.canManage && ['pending_ctsv', 'pending_icpdp', 'revision'].includes(event.statusKey);
  const showPartnerActions = canApprove && isCtsvOnly;
  const showPublish = canCtsvPublishSchoolEvent(event);
  const showEditSchoolEvent = access.canManage && canCtsvEditSchoolEvent(event);
  const showCtsvActions = access.canManage && (showPartnerActions || showPublish || showEditSchoolEvent);

  return (
    <div className="ctsv-ed-page">
      <Link to="/ctsv/events" className="ctsv-ed-back">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Danh sách sự kiện
      </Link>

      <section className="ctsv-ed-hero">
        <div className="ctsv-ed-hero-media">
          {event.image ? (
            <img src={event.image} alt="" className="ctsv-ed-hero-img" />
          ) : (
            <div className="ctsv-ed-hero-img ctsv-ed-hero-img--placeholder" aria-hidden />
          )}
          <span className="ctsv-ed-hero-category">{event.category || 'Sự kiện'}</span>
        </div>
        <div className="ctsv-ed-hero-body">
          <div className="ctsv-ed-hero-tags">
            <span className={`ctsv-ed-source ctsv-ed-source--${source.tone}`}>{source.label}</span>
            <span className={`status-pill ${statusClass(event.status, event.statusKey)}`}>
              {event.status}
            </span>
          </div>
          <h1>{event.title}</h1>
          <ul className="ctsv-ed-meta">
            <li>
              <IconCalendar />
              {event.date}
              {event.time ? ` · ${event.time}` : ''}
            </li>
            {event.location && (
              <li>
                <IconPin />
                {event.location}
              </li>
            )}
            {event.format && (
              <li>
                <IconTicket />
                {event.format === 'online' ? 'Trực tuyến' : 'Tại campus'}
              </li>
            )}
          </ul>
          <div className="ctsv-ed-hero-stats">
            <div className="ctsv-ed-hero-stat">
              <span className="ctsv-ed-hero-stat-num">{stats.registered}</span>
              <span className="ctsv-ed-hero-stat-label">Đã đăng ký</span>
            </div>
            <div className="ctsv-ed-hero-stat">
              <span className="ctsv-ed-hero-stat-num">{stats.total}</span>
              <span className="ctsv-ed-hero-stat-label">Tổng vé</span>
            </div>
            <div className="ctsv-ed-hero-stat">
              <span className="ctsv-ed-hero-stat-num">{stats.fillRate}%</span>
              <span className="ctsv-ed-hero-stat-label">Lấp đầy</span>
            </div>
          </div>
        </div>
      </section>

      <div className="ctsv-ed-tabs" role="tablist" aria-label="Chi tiết sự kiện">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`ctsv-ed-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!access.canManage && (
        <div className="ctsv-ed-banner" role="status">
          <span className="ctsv-ed-banner-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12" y2="16" />
            </svg>
          </span>
          <p>
            Sự kiện do CLB tổ chức — bạn chỉ xem thông tin, không chỉnh sửa hay phê duyệt tại đây.
          </p>
        </div>
      )}

      {access.canManage && event.source === 'school' && event.statusKey === 'approved' && (
        <div className="ctsv-ed-banner ctsv-ed-banner--info" role="status">
          <span className="ctsv-ed-banner-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="8" />
            </svg>
          </span>
          <p>
            Admin đã phê duyệt. Bạn có thể publish hoặc chỉnh sửa — nếu sửa, đơn sẽ gửi lại Admin duyệt trước khi publish.
          </p>
        </div>
      )}

      {access.canManage && event.source === 'school' && isSchoolEventPendingAdmin(event) && (
        <div className="ctsv-ed-banner ctsv-ed-banner--info" role="status">
          <span className="ctsv-ed-banner-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <p>
            Đơn tổ chức đã gửi và đang chờ Admin phê duyệt. Bạn có thể chỉnh sửa và gửi lại trước khi Admin duyệt.
          </p>
        </div>
      )}

      {access.canManage && event.source === 'school' && event.statusKey === 'rejected' && event.rejectionReason && (
        <div className="ctsv-ed-banner ctsv-ed-banner--danger" role="alert">
          <span className="ctsv-ed-banner-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </span>
          <p>
            Admin đã từ chối đơn: {event.rejectionReason}. Chỉnh sửa thông tin và gửi lại để Admin xem xét.
          </p>
        </div>
      )}

      <div className="ctsv-ed-content">
        {activeTab === 'info' && (
          <div className="ctsv-ed-panel">
            <h2 className="ctsv-ed-panel-title">Mô tả sự kiện</h2>
            <p className="ctsv-ed-description">
              {event.description?.trim() || 'Chưa có mô tả chi tiết cho sự kiện này.'}
            </p>
            <div className="ctsv-ed-info-grid">
              <div className="ctsv-ed-info-card">
                <span className="ctsv-ed-info-label">Nguồn tổ chức</span>
                <strong>{source.label}</strong>
              </div>
              <div className="ctsv-ed-info-card">
                <span className="ctsv-ed-info-label">Loại sự kiện</span>
                <strong>{event.eventType || event.category || '—'}</strong>
              </div>
              {event.expectedAttendees > 0 && (
                <div className="ctsv-ed-info-card">
                  <span className="ctsv-ed-info-label">Dự kiến tham dự</span>
                  <strong>{event.expectedAttendees.toLocaleString('vi-VN')} người</strong>
                </div>
              )}
              {eventSpeakers.length > 0 && (
                <div className="ctsv-ed-info-card ctsv-ed-info-card--speaker">
                  <span className="ctsv-ed-info-label">Diễn giả / Khách mời</span>
                  <div className="ctsv-ed-speaker-list">
                    {eventSpeakers.map((sp) => (
                      <div key={`${sp.name}-${sp.role}`} className="ctsv-ed-speaker">
                        {sp.avatar ? (
                          <img src={sp.avatar} alt="" className="ctsv-ed-speaker-avatar" />
                        ) : (
                          <span className="ctsv-ed-speaker-avatar ctsv-ed-speaker-avatar--fallback" aria-hidden>
                            {sp.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="ctsv-ed-speaker-text">
                          <strong>{sp.name}</strong>
                          {sp.role && <span>{sp.role}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {event.ctsvNote && (
                <div className="ctsv-ed-info-card ctsv-ed-info-card--wide">
                  <span className="ctsv-ed-info-label">Ghi chú CTSV</span>
                  <strong>{event.ctsvNote}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="ctsv-ed-panel">
            <h2 className="ctsv-ed-panel-title">Thống kê vé</h2>
            <div className="ctsv-ed-ticket-stats">
              <article className="ctsv-ed-ticket-card">
                <span className="ctsv-ed-ticket-card-label">Tổng vé</span>
                <strong>{stats.total.toLocaleString('vi-VN')}</strong>
              </article>
              <article className="ctsv-ed-ticket-card ctsv-ed-ticket-card--accent">
                <span className="ctsv-ed-ticket-card-label">Đã đăng ký</span>
                <strong>{stats.registered.toLocaleString('vi-VN')}</strong>
              </article>
              <article className="ctsv-ed-ticket-card">
                <span className="ctsv-ed-ticket-card-label">Còn lại</span>
                <strong>{stats.remaining.toLocaleString('vi-VN')}</strong>
              </article>
            </div>
            <div className="ctsv-ed-fill">
              <div className="ctsv-ed-fill-head">
                <span>Tỷ lệ lấp đầy</span>
                <strong>{stats.fillRate}%</strong>
              </div>
              <div className="ctsv-ed-fill-bar" aria-hidden>
                <span className="ctsv-ed-fill-progress" style={{ width: `${stats.fillRate}%` }} />
              </div>
            </div>
            {event.ticketTypes?.length > 0 && (
              <div className="ctsv-ed-ticket-types">
                <h3>Loại vé</h3>
                <ul>
                  {event.ticketTypes.map((t, i) => (
                    <li key={t.name || i}>
                      <span>{t.name || `Vé ${i + 1}`}</span>
                      <span>{t.quantity != null ? `${t.quantity} vé` : '—'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      </div>

      {showCtsvActions && (
        <section className="ctsv-ed-actions">
          <h2 className="ctsv-ed-panel-title">Thao tác CTSV</h2>
          {showPartnerActions && (
            <textarea
              className="ctsv-textarea ctsv-ed-note"
              placeholder="Ghi chú / lý do (bắt buộc khi từ chối)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          )}
          <div className="ctsv-action-buttons">
            {showEditSchoolEvent && (
              <Link to={`/ctsv/events/${id}/edit`} className="ctsv-btn-secondary">
                Chỉnh sửa & gửi lại Admin
              </Link>
            )}
            {showPartnerActions && (
              <>
                <button type="button" className="ctsv-btn-primary" onClick={handleApprove}>
                  Phê duyệt
                </button>
                <button type="button" className="ctsv-btn-danger" onClick={handleReject}>
                  Từ chối
                </button>
                <button type="button" className="ctsv-btn-secondary" onClick={handleRevision}>
                  Yêu cầu chỉnh sửa
                </button>
              </>
            )}
            {showPublish && (
              <button type="button" className="ctsv-btn-primary" onClick={handlePublish}>
                Publish sự kiện
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default CtsvEventDetail;
