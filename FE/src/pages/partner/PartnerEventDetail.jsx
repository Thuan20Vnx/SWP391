import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { PORTAL_EVENTS_LIVE_EVENT } from '../../utils/adminEventsLiveEvents';
import {
  fetchPartnerEvent,
  deletePartnerEventRequest,
  hidePartnerEventRequest,
  fetchPartnerOwnReportSubmissions,
  submitPartnerEventReport,
  requestPartnerSettlement,
} from '../../services/partnerApi';
import { statusClass } from '../../utils/eventStatus';
import { resolveEventSpeakers } from '../../constants/eventSpeaker';
import { getCategoryDisplayLabel } from '../../constants/eventCategories';
import { resolvePartnerAttachmentUrl } from '../../utils/partnerDisplay';
import { openProtectedMedia } from '../../utils/mediaFile';
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

const formatVnd = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} đ`;

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('vi-VN')} · ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

const SETTLEMENT_STATUS_LABEL = {
  none: 'Chưa yêu cầu',
  requested: 'Đã gửi yêu cầu — chờ Trường tất toán',
  paid: 'Đã tất toán',
};

const PartnerEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [event, setEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmHide, setConfirmHide] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [activeBentoCard, setActiveBentoCard] = useState('');
  const [reportSubmittedAt, setReportSubmittedAt] = useState(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [requestingSettlement, setRequestingSettlement] = useState(false);
  const [confirmSettlementOpen, setConfirmSettlementOpen] = useState(false);
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
      // Sự kiện đã duyệt: xóa theo requestId liên kết; đơn (req-...) thì xóa theo id đơn.
      const deleteId = event.requestId || String(event.id).replace(/^req-/, '');
      await deletePartnerEventRequest(deleteId);
      showToast?.('Đã xóa yêu cầu sự kiện.', 'success');
      navigate('/partner/events');
    } catch (err) {
      showToast?.(err.message || 'Xóa yêu cầu thất bại.', 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleToggleHide = async () => {
    if (!event?.requestId) return;
    setHiding(true);
    try {
      await hidePartnerEventRequest(event.requestId);
      showToast?.(
        event.requestStatus === 'hidden'
          ? 'Đã hiển thị lại sự kiện.'
          : 'Đã ẩn sự kiện khỏi danh sách công khai.',
        'success'
      );
      loadEvent({ silent: true });
    } catch (err) {
      showToast?.(err.message || 'Thao tác thất bại.', 'error');
    } finally {
      setHiding(false);
      setConfirmHide(false);
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

  const doRequestSettlement = async () => {
    if (requestingSettlement) return;
    setConfirmSettlementOpen(false);
    setRequestingSettlement(true);
    try {
      const data = await requestPartnerSettlement(id);
      showToast?.(data.message || 'Đã gửi yêu cầu tất toán.', 'success');
      loadEvent({ silent: true });
    } catch (err) {
      showToast?.(err.message || 'Không gửi được yêu cầu tất toán.', 'error');
    } finally {
      setRequestingSettlement(false);
    }
  };

  const handleRequestSettlement = () => {
    if (requestingSettlement) return;
    // Sự kiện chưa kết thúc → hỏi xác nhận trước khi gửi.
    if (!isEndedPhase) {
      setConfirmSettlementOpen(true);
      return;
    }
    doRequestSettlement();
  };

  const eventSpeakers = resolveEventSpeakers(event);
  const ticketTypes = event.ticketTypes?.length
    ? event.ticketTypes
    : [{ name: 'Vé chung', qty: stats.total }];

  // Thông tin đối tác đã nộp (đơn/sự kiện) để hiển thị đầy đủ trên trang chi tiết.
  const benefits = (event.benefits || []).filter(Boolean);
  const learningOutcomes = (event.learningOutcomes || []).filter(Boolean);
  const attachmentLinks = (event.attachmentLinks || []).filter(Boolean);
  const attachmentItems = (event.attachments || [])
    .map((f, i) => ({ key: `att-${i}`, ...f, href: resolvePartnerAttachmentUrl(f) }))
    .filter((f) => f.hasFile || f.href);

  const openAttachment = async (file) => {
    const href = file.href || file.url || '';
    if (!href || href === '#') return;
    try {
      await openProtectedMedia(file.attachmentUrl || file.url || href, file.name || 'attachment');
    } catch (err) {
      showToast?.(err.message || 'Không mở được tệp.', 'error');
    }
  };

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

      {!event.isRequest && (() => {
        const settlement = event.settlement || {};
        const revenue = event.revenue || {};
        const isPaid = settlement.status === 'paid';
        let blockNote = '';
        if (!isPaid && !settlement.canRequest) {
          if (settlement.blockReason === 'daily_limit') {
            blockNote = 'Đã hết lượt yêu cầu trong hôm nay (tối đa 3 lần/ngày).';
          } else if (settlement.blockReason === 'cooldown' && settlement.nextAllowedAt) {
            const t = new Date(settlement.nextAllowedAt);
            blockNote = `Có thể gửi lại sau ${t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`;
          }
        }
        return (
          <section className="partner-revenue-panel">
            <div className="partner-revenue-panel__head">
              <h2>Doanh thu của bạn</h2>
              <span className={`partner-revenue-status partner-revenue-status--${settlement.status || 'none'}`}>
                {SETTLEMENT_STATUS_LABEL[settlement.status] || SETTLEMENT_STATUS_LABEL.none}
              </span>
            </div>
            <div className="partner-revenue-grid">
              <div className="partner-revenue-cell">
                <span className="partner-revenue-cell__label">Doanh thu vé đã thu</span>
                <strong className="partner-revenue-cell__value">{formatVnd(revenue.paidRevenue)}</strong>
                <span className="partner-revenue-cell__sub">{revenue.paidCount || 0} vé đã thanh toán</span>
              </div>
              <div className="partner-revenue-cell">
                <span className="partner-revenue-cell__label">Giá vé niêm yết</span>
                <strong className="partner-revenue-cell__value">
                  {event.ticketPrice > 0 ? formatVnd(event.ticketPrice) : 'Miễn phí'}
                </strong>
                <span className="partner-revenue-cell__sub">{stats.registered} lượt đăng ký</span>
              </div>
              {isPaid && (
                <div className="partner-revenue-cell">
                  <span className="partner-revenue-cell__label">Đã tất toán</span>
                  <strong className="partner-revenue-cell__value">{formatVnd(settlement.paidAmount)}</strong>
                  <span className="partner-revenue-cell__sub">
                    {settlement.paidAt ? new Date(settlement.paidAt).toLocaleDateString('vi-VN') : ''}
                  </span>
                </div>
              )}
            </div>
            {isPaid && settlement.proofUrl && (
              <div className="partner-revenue-proof">
                <span className="partner-revenue-proof__label">Ảnh biên lai chuyển khoản từ Nhà trường</span>
                <a href={settlement.proofUrl} target="_blank" rel="noopener noreferrer">
                  <img src={settlement.proofUrl} alt="Biên lai chuyển khoản" className="partner-revenue-proof__img" />
                </a>
              </div>
            )}
            <p className="partner-revenue-panel__note">
              Tiền vé được thu về tài khoản chung của Nhà trường (CTSV). Bấm "Yêu cầu thanh toán" để đề nghị Trường tất toán
              phần doanh thu của bạn về tài khoản ngân hàng đã đăng ký trong hồ sơ đối tác.
            </p>
            {(!isPaid || settlement.canRequest) && (
              <div className="partner-revenue-panel__actions">
                <button
                  type="button"
                  className="ctsv-dash-btn"
                  onClick={handleRequestSettlement}
                  disabled={requestingSettlement || !settlement.canRequest}
                >
                  {requestingSettlement
                    ? 'Đang gửi...'
                    : isPaid
                      ? 'Yêu cầu tất toán lại'
                      : 'Yêu cầu Trường thanh toán'}
                </button>
                {settlement.canRequest ? (
                  <span className="partner-revenue-panel__hint">
                    {isPaid
                      ? 'Sự kiện đã kết thúc — bạn có thể mở một yêu cầu tất toán mới.'
                      : `Còn ${settlement.remainingToday} lượt trong hôm nay.`}
                  </span>
                ) : (
                  <span className="partner-revenue-panel__hint">{blockNote}</span>
                )}
              </div>
            )}
          </section>
        );
      })()}

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
      ) : event.requestId ? (
        <div className="ctsv-ed-banner" role="status" style={{ flexWrap: 'wrap', gap: 12 }}>
          <span className="ctsv-ed-banner-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12" y2="16" />
            </svg>
          </span>
          <p style={{ flex: '1 1 240px' }}>
            {event.editLock
              ? event.editLock === 'settled'
                ? 'Sự kiện đã tất toán nên không thể gửi yêu cầu chỉnh sửa.'
                : 'Sự kiện đã có người đăng ký nên không thể gửi yêu cầu chỉnh sửa.'
              : event.requestStatus === 'hidden'
                ? 'Sự kiện đang được ẩn khỏi danh sách công khai.'
                : 'Bạn có thể gửi yêu cầu chỉnh sửa (cần CTSV duyệt lại) hoặc ẩn khỏi trang công khai.'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!event.editLock && (
              <Link
                to={`/partner/proposals/create?edit=${event.requestId}`}
                className="ctsv-dash-btn ctsv-dash-btn--ghost"
              >
                Yêu cầu sửa
              </Link>
            )}
            <button
              type="button"
              className="ctsv-dash-btn ctsv-dash-btn--ghost"
              onClick={() => setConfirmHide(true)}
              disabled={hiding}
            >
              {event.requestStatus === 'hidden' ? 'Bỏ ẩn sự kiện' : 'Ẩn sự kiện'}
            </button>
            {event.requestStatus === 'hidden' && !event.editLock && (
              <button
                type="button"
                className="ctsv-dash-btn ctsv-dash-btn--ghost"
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
              >
                Xóa hoàn toàn
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
              {(event.startDate || event.endDate) && (
                <div>
                  <dt>Thời gian diễn ra</dt>
                  <dd>
                    {event.startDate ? formatDateTime(event.startDate) : '—'}
                    {event.endDate ? ` – ${formatDateTime(event.endDate)}` : ''}
                  </dd>
                </div>
              )}
              {(event.registrationStartDate || event.registrationEndDate) && (
                <div>
                  <dt>Thời gian đăng ký</dt>
                  <dd>
                    {event.registrationStartDate
                      ? new Date(event.registrationStartDate).toLocaleDateString('vi-VN')
                      : '—'}
                    {' – '}
                    {event.registrationEndDate
                      ? new Date(event.registrationEndDate).toLocaleDateString('vi-VN')
                      : '—'}
                  </dd>
                </div>
              )}
              {event.agenda && (
                <div className="ctsv-ed-dl-full">
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

          {learningOutcomes.length > 0 && (
            <section className="ctsv-ed-panel">
              <h2>Bạn sẽ học được gì</h2>
              <ul className="ctsv-ed-bullet-list">
                {learningOutcomes.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {benefits.length > 0 && (
            <section className="ctsv-ed-panel">
              <h2>Quyền lợi đối tác yêu cầu</h2>
              <ul className="ctsv-ed-bullet-list">
                {benefits.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {event.partnerMessage && (
            <section className="ctsv-ed-panel">
              <h2>Lời nhắn gửi CTSV</h2>
              <p className="ctsv-ed-desc">{event.partnerMessage}</p>
            </section>
          )}

          {(attachmentItems.length > 0 || attachmentLinks.length > 0) && (
            <section className="ctsv-ed-panel">
              <h2>Tệp & liên kết đính kèm</h2>
              <ul className="ctsv-ed-file-list">
                {attachmentItems.map((f) => (
                  <li key={f.key}>
                    <button
                      type="button"
                      className="ctsv-ed-file"
                      onClick={() => openAttachment(f)}
                      disabled={!f.href}
                    >
                      <span className="ctsv-ed-file-icon" aria-hidden>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </span>
                      <span className="ctsv-ed-file-body">
                        <span className="ctsv-ed-file-name">{f.name}</span>
                        <span className="ctsv-ed-file-size">{f.sizeLabel || 'Tệp đính kèm'}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {attachmentLinks.map((link, i) => (
                  <li key={`link-${i}`}>
                    <a href={link} className="ctsv-ed-file" target="_blank" rel="noreferrer">
                      <span className="ctsv-ed-file-icon" aria-hidden>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
                          <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
                        </svg>
                      </span>
                      <span className="ctsv-ed-file-body">
                        <span className="ctsv-ed-file-name">{link}</span>
                        <span className="ctsv-ed-file-size">Liên kết</span>
                      </span>
                    </a>
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

      <ConfirmDialog
        open={confirmSettlementOpen}
        title="Sự kiện chưa kết thúc"
        message="Sự kiện hiện chưa kết thúc. Bạn vẫn muốn gửi yêu cầu Nhà trường tất toán doanh thu ngay bây giờ chứ?"
        confirmLabel="Vẫn gửi yêu cầu"
        cancelLabel="Để sau"
        onConfirm={doRequestSettlement}
        onCancel={() => !requestingSettlement && setConfirmSettlementOpen(false)}
        loading={requestingSettlement}
      />

      <ConfirmDialog
        open={confirmHide}
        title={event.requestStatus === 'hidden' ? 'Hiển thị lại sự kiện?' : 'Ẩn sự kiện?'}
        message={
          event.requestStatus === 'hidden'
            ? 'Sự kiện sẽ hiển thị trở lại trên trang công khai để sinh viên xem và đăng ký.'
            : 'Sự kiện sẽ bị ẩn khỏi trang công khai. Sinh viên sẽ không thấy để đăng ký. Bạn có thể bỏ ẩn lại sau.'
        }
        confirmLabel={event.requestStatus === 'hidden' ? 'Hiển thị lại' : 'Ẩn sự kiện'}
        cancelLabel="Quay lại"
        onConfirm={handleToggleHide}
        onCancel={() => !hiding && setConfirmHide(false)}
        loading={hiding}
      />
    </div>
  );
};

export default PartnerEventDetail;
