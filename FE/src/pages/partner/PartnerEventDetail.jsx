import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { fetchPartnerEvent } from '../../services/partnerApi';
import { statusClass } from '../../utils/eventStatus';
import { resolveEventSpeakers } from '../../constants/eventSpeaker';
import { getCategoryDisplayLabel } from '../../constants/eventCategories';

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

const PartnerEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [event, setEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    fetchPartnerEvent(id)
      .then((d) => setEvent(d.event))
      .catch(() => {
        showToast?.('Không tải được sự kiện.', 'error');
        navigate('/partner/events');
      });
  }, [id, navigate, showToast]);

  const stats = useMemo(() => {
    if (!event) return null;
    const total = event.totalTickets || event.capacity || 0;
    const remaining = event.remainingTickets ?? Math.max(0, total - (event.registeredCount || 0));
    const registered = event.registeredCount ?? Math.max(0, total - remaining);
    const fillRate = total > 0 ? Math.round((registered / total) * 100) : 0;
    return { total, remaining, registered, fillRate };
  }, [event]);

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

  const eventSpeakers = resolveEventSpeakers(event);
  const ticketTypes = event.ticketTypes?.length
    ? event.ticketTypes
    : [{ name: 'Vé chung', qty: stats.total }];

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
          )}{' '}
          <Link to="/partner/proposals/create">Chỉnh sửa yêu cầu</Link>
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

      <div className="ctsv-ed-footer-actions">
        <Link to={`/partner/analytics`} className="ctsv-dash-btn ctsv-dash-btn--ghost">
          Xem báo cáo hiệu suất
        </Link>
      </div>
    </div>
  );
};

export default PartnerEventDetail;
