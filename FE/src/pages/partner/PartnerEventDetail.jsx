import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { PORTAL_EVENTS_LIVE_EVENT } from '../../utils/adminEventsLiveEvents';
import {
  fetchPartnerEvent,
  deletePartnerEventRequest,
  fetchPartnerOwnReportSubmissions,
  submitPartnerEventReport,
} from '../../services/partnerApi';
import { statusClass } from '../../utils/eventStatus';
import { resolveEventSpeakers } from '../../constants/eventSpeaker';
import { getCategoryDisplayLabel } from '../../constants/eventCategories';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EventBentoStatsGrid from '../../components/events/EventBentoStatsGrid';
import EventRatingDetailPanel from '../../components/events/EventRatingDetailPanel';
import {
  formatEventRating,
  getCheckinProgress,
  getReachWeekDelta,
  getRegistrationProgress,
} from '../../utils/eventBentoStats';
import '../EventManagementDetail.css';

const TABS = [
  { id: 'info', label: 'Thông tin' },
  { id: 'tickets', label: 'Vé' },
  { id: 'danh-gia', label: 'Đánh giá' },
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

const PartnerEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [event, setEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeBentoCard, setActiveBentoCard] = useState('');
  const [reportSubmittedAt, setReportSubmittedAt] = useState(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [nowTs] = useState(() => Date.now());
  const tabContentRef = useRef(null);

  const loadEvent = useCallback(
    ({ silent = false } = {}) => {
      fetchPartnerEvent(id)
        .then((d) => setEvent(d.event))
        .catch(() => {
          if (silent) return;
          showToast?.('Không tải được sự kiện.', 'error');
          navigate('/partner/events');
        });
    },
    [id, navigate, showToast]
  );

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // Cập nhật realtime khi có thay đổi liên quan (duyệt/từ chối/điều chỉnh...).
  useEffect(() => {
    const onLive = () => loadEvent({ silent: true });
    window.addEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
    return () => window.removeEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
  }, [loadEvent]);

  useEffect(() => {
    let cancelled = false;
    fetchPartnerOwnReportSubmissions()
      .then((d) => {
        if (cancelled) return;
        const match = (d.submissions || []).find((s) => String(s.reportId) === String(id));
        setReportSubmittedAt(match?.submittedAt || null);
      })
      .catch(() => {
        if (!cancelled) setReportSubmittedAt(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const stats = useMemo(() => {
    if (!event) return null;
    const total = event.totalTickets || event.capacity || 0;
    const remaining = event.remainingTickets ?? Math.max(0, total - (event.registeredCount || 0));
    const registered = event.registeredCount ?? Math.max(0, total - remaining);
    const fillRate = total > 0 ? Math.round((registered / total) * 100) : 0;
    return { total, remaining, registered, fillRate };
  }, [event]);

  useEffect(() => {
    if (activeTab === 'danh-gia') {
      setActiveBentoCard('rating');
    }
  }, [activeTab]);

  const formatLabel = (value) => {
    if (!value) return '—';
    if (value === 'campus') return 'Tại campus';
    if (value === 'online') return 'Trực tuyến';
    if (value === 'hybrid') return 'Kết hợp';
    return value;
  };

  if (!event || !stats) {
    return (
      <div className="ctsv-ed-page">
        <div className="ctsv-ed-skeleton-hero sk" />
        <div className="ctsv-ed-skeleton-panel sk" />
      </div>
    );
  }

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePartnerEventRequest(String(event.id).replace(/^req-/, ''));
      showToast?.('Đã xóa yêu cầu sự kiện.', 'success');
      navigate('/partner/events');
    } catch (err) {
      showToast?.(err.message || 'Xóa yêu cầu thất bại.', 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const isEndedPhase = (() => {
    if (!event || event.isRequest) return false;
    if (event.statusKey === 'live') return false;
    if (event.statusKey === 'ended' || event.eventState === 'expired') return true;
    const end = event.endDate ? new Date(event.endDate).getTime() : null;
    if (end && !Number.isNaN(end)) return end <= nowTs;
    const start = event.startDate ? new Date(event.startDate).getTime() : null;
    return Boolean(start && !Number.isNaN(start) && start <= nowTs);
  })();

  const handleSubmitReport = async () => {
    if (submittingReport || reportSubmittedAt) return;
    setSubmittingReport(true);
    try {
      const data = await submitPartnerEventReport(id);
      setReportSubmittedAt(data.submission?.submittedAt || new Date().toISOString());
      showToast?.(data.message || 'Đã gửi báo cáo cho CTSV và Admin.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Không gửi được báo cáo.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const eventSpeakers = resolveEventSpeakers(event);
  const ticketTypes = event.ticketTypes?.length
    ? event.ticketTypes
    : [{ name: 'Vé chung', qty: stats.total }];

  const registrationProgress = getRegistrationProgress(event.registeredCount, event.capacity || stats.total);
  const checkinProgress = getCheckinProgress(event.checkinCount, event.registeredCount);
  const ratingStats = formatEventRating(event);
  const reachDelta = getReachWeekDelta(event);
  const reachDeltaLabel = reachDelta > 0 ? `+${reachDelta}%` : `${reachDelta}%`;
  const reachDeltaTone = reachDelta > 0 ? 'up' : reachDelta < 0 ? 'down' : 'flat';

  const handleBentoCardClick = (cardKey) => {
    setActiveBentoCard(cardKey);
    if (cardKey === 'registration' || cardKey === 'checkin') {
      setActiveTab('tickets');
      tabContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (cardKey === 'rating') {
      setActiveTab('danh-gia');
      tabContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (cardKey === 'reach') {
      setActiveTab('info');
      tabContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const visibleTabs = event?.isRequest ? TABS.filter((tab) => tab.id !== 'danh-gia') : TABS;

  return (
    <div className="ctsv-ed-page">
      <Link to="/partner/events" className="ctsv-ed-back">
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
          <span className="ctsv-ed-hero-category">
            {getCategoryDisplayLabel(event.category) || 'Sự kiện'}
          </span>
        </div>
        <div className="ctsv-ed-hero-body">
          <div className="ctsv-ed-hero-tags">
            <span className="ctsv-ed-source ctsv-ed-source--partner">Đối tác</span>
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

      {!event.isRequest && (
        <EventBentoStatsGrid
          eventData={event}
          registrationProgress={registrationProgress}
          checkinProgress={checkinProgress}
          ratingStats={ratingStats}
          reachDelta={reachDelta}
          reachDeltaLabel={reachDeltaLabel}
          reachDeltaTone={reachDeltaTone}
          activeCard={activeBentoCard}
          onCardClick={handleBentoCardClick}
        />
      )}

      <div className="ctsv-ed-tabs" role="tablist" aria-label="Chi tiết sự kiện">
        {visibleTabs.map((tab) => (
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

      {event.isRequest ? (
        <div className="ctsv-pd-banner ctsv-pd-banner--warn" style={{ marginBottom: 16 }}>
          {event.statusKey === 'rejected' ? (
            <>
              <strong>Yêu cầu bị từ chối:</strong> {event.rejectionReason || 'CTSV đã từ chối yêu cầu này.'}
            </>
          ) : event.statusKey === 'info_requested' ? (
            <>
              <strong>Yêu cầu bổ sung:</strong> {event.supplementReason || 'CTSV cần thêm thông tin.'}
            </>
          ) : (
            <strong>Yêu cầu đang chờ CTSV duyệt.</strong>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/partner/proposals/create" className="ctsv-dash-btn ctsv-dash-btn--ghost">
              Sửa sự kiện
            </Link>
            {event.statusKey === 'rejected' && (
              <button
                type="button"
                className="ctsv-dash-btn ctsv-dash-btn--ghost"
                onClick={() => setConfirmDelete(true)}
              >
                Xóa sự kiện
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="ctsv-ed-banner" role="status">
          <span className="ctsv-ed-banner-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12" y2="16" />
            </svg>
          </span>
          <p>Chế độ xem — chỉ theo dõi thông tin sự kiện. Liên hệ CTSV nếu cần chỉnh sửa.</p>
        </div>
      )}

      <div ref={tabContentRef}>
      {activeTab === 'info' && (
        <div className="ctsv-ed-panels">
          <section className="ctsv-ed-panel">
            <h2>Mô tả sự kiện</h2>
            <p className="ctsv-ed-desc">{event.description || 'Chưa có mô tả.'}</p>
          </section>

          <section className="ctsv-ed-panel">
            <h2>Thông tin bổ sung</h2>
            <dl className="ctsv-ed-dl">
              <div>
                <dt>Hình thức</dt>
                <dd>{formatLabel(event.format)}</dd>
              </div>
              <div>
                <dt>Campus</dt>
                <dd>{event.campus || '—'}</dd>
              </div>
              {event.agenda && (
                <div>
                  <dt>Chương trình</dt>
                  <dd>{event.agenda}</dd>
                </div>
              )}
            </dl>
          </section>

          {eventSpeakers.length > 0 && (
            <section className="ctsv-ed-panel">
              <h2>Diễn giả</h2>
              <ul className="ctsv-ed-speakers">
                {eventSpeakers.map((sp, i) => (
                  <li key={i} className="ctsv-ed-speaker">
                    {sp.avatar ? (
                      <img src={sp.avatar} alt="" className="ctsv-ed-speaker-avatar" />
                    ) : (
                      <span className="ctsv-ed-speaker-avatar ctsv-ed-speaker-avatar--placeholder" />
                    )}
                    <div>
                      <strong>{sp.name}</strong>
                      {sp.role && <span>{sp.role}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {activeTab === 'tickets' && (
        <section className="ctsv-ed-panel">
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
              <span>Tỷ lệ đăng ký</span>
              <strong>{stats.fillRate}%</strong>
            </div>
            <div className="ctsv-ed-fill-bar" aria-hidden>
              <span className="ctsv-ed-fill-progress" style={{ width: `${stats.fillRate}%` }} />
            </div>
          </div>
          {ticketTypes.length > 0 && (
            <div className="ctsv-ed-ticket-types">
              <h3>Loại vé</h3>
              <ul>
                {ticketTypes.map((t, i) => (
                  <li key={t.name || i}>
                    <span>{t.name || `Vé ${i + 1}`}</span>
                    <span>
                      {t.quantity != null
                        ? `${t.quantity} vé`
                        : t.qty != null
                          ? `${t.qty} vé`
                          : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {activeTab === 'danh-gia' && !event.isRequest && (
        <EventRatingDetailPanel
          eventId={id}
          eventTitle={event.title}
          fallbackStats={ratingStats}
        />
      )}
      </div>

      <div className="ctsv-ed-footer-actions">
        <Link to={`/partner/analytics`} className="ctsv-dash-btn ctsv-dash-btn--ghost">
          Xem báo cáo hiệu suất
        </Link>
        {isEndedPhase && !reportSubmittedAt && (
          <button
            type="button"
            className="ctsv-dash-btn"
            onClick={handleSubmitReport}
            disabled={submittingReport}
          >
            {submittingReport ? 'Đang gửi...' : 'Gửi báo cáo cho CTSV & Admin'}
          </button>
        )}
      </div>

      {isEndedPhase && reportSubmittedAt && (
        <p className="ctsv-rd-sent-note">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Đã gửi CTSV & Admin
          {reportSubmittedAt ? ` · ${new Date(reportSubmittedAt).toLocaleString('vi-VN')}` : ''}.
        </p>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Xóa yêu cầu sự kiện?"
        message="Hành động này không thể hoàn tác. Yêu cầu sẽ bị xóa khỏi hệ thống."
        confirmLabel="Xóa yêu cầu"
        cancelLabel="Quay lại"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirmDelete(false)}
        loading={deleting}
        danger
      />
    </div>
  );
};

export default PartnerEventDetail;
