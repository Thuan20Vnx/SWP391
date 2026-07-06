import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import PublicAdminShell from '../layouts/PublicAdminShell';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EventTicketModal from '../components/EventTicketModal';
import PaymentModal from '../components/PaymentModal';
import { checkoutEventTicket } from '../services/paymentApi';
import { fetchAdminPayments } from '../services/adminApi';
import useUserProfile from '../hooks/useUserProfile';
import useManagedClubs from '../hooks/useManagedClubs';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { getUserRole, isAdminRole, isClubManagerRole } from '../utils/auth';
import {
  getClubPublicEventAccess,
  getCtsvPublicEventAccess,
  isPureCtsvStaff,
  navigateClubEventManage,
} from '../utils/publicEventStaffAccess';
import { mapApiEventToDetail } from '../data/eventDetailData';
import {
  fetchPublicEventById,
  getCachedEventSummary,
  syncEventRegistrationInCache,
  eventDetailCacheKey,
  remindEventRegistration,
  fetchEventRemindStatus,
} from '../services/eventsApi';
import { getCached } from '../utils/apiCache';
import { formatVnd } from '../utils/ticketPricing';
import { eventRequiresPayment } from '../utils/eventRegisterAction';
import { buildTicketFromDetailEvent } from '../utils/eventTicket';
import '../styles/admin-public-pages.css';

const pad2 = (n) => String(n).padStart(2, '0');
const toGCalDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
};
const buildGoogleCalendarUrl = ({ title, start, end, details = '', location = '' }) => {
  const startDate = start ? new Date(start) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) return '';
  const endDate = end && !Number.isNaN(new Date(end).getTime())
    ? new Date(end)
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Sự kiện F-Events',
    dates: `${toGCalDate(startDate)}/${toGCalDate(endDate)}`,
    details,
    location: location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="20" fill="currentColor" aria-hidden="true">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
  </svg>
);

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="20" fill="currentColor" aria-hidden="true">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#e8f5e9" />
    <path d="M8 12.5l2.5 2.5L16 9" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="20" fill="currentColor" aria-hidden="true">
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="10" fill="currentColor" aria-hidden="true">
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="16" fill="currentColor" aria-hidden="true">
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
);

const EventDetail = ({ showToast, embedded = false, backPath = '/events', readOnly: readOnlyProp = false }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [registerConfirmOpen, setRegisterConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [registrationId, setRegistrationId] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentPaid, setPaymentPaid] = useState(false);
  const [adminPayments, setAdminPayments] = useState(null);
  const [adminPaymentsLoading, setAdminPaymentsLoading] = useState(false);
  const [remindEmail, setRemindEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const [remindLoading, setRemindLoading] = useState(false);
  const [remindDone, setRemindDone] = useState(false);
  const checkoutTriggeredRef = useRef(false);
  const { isLoggedIn, userProfile } = useUserProfile();
  const role = userProfile.role || getUserRole();
  const isAdminViewer = isLoggedIn && isAdminRole(role);
  const isCtsvStaff = isLoggedIn && isPureCtsvStaff(role);
  const isClubManager = isLoggedIn && isClubManagerRole(role);
  const { clubs: managedClubs, activeClub } = useManagedClubs(isClubManager, role);
  const clubManagerContext = useMemo(
    () =>
      isClubManager
        ? {
            managedClubs,
            activeClubId: activeClub?.id || '',
            userEmail: localStorage.getItem('userEmail') || '',
          }
        : null,
    [isClubManager, managedClubs, activeClub?.id]
  );
  const clubManageAccess =
    event && isClubManager && clubManagerContext
      ? getClubPublicEventAccess(event, clubManagerContext)
      : null;
  const readOnly =
    readOnlyProp || isAdminViewer || isCtsvStaff || Boolean(clubManageAccess?.canManage);
  const ctsvManageAccess = event && isCtsvStaff ? getCtsvPublicEventAccess(event) : null;

  const holderName = useMemo(
    () => userProfile.fullname || localStorage.getItem('userFullname') || localStorage.getItem('userEmail') || '',
    [userProfile.fullname]
  );

  const viewerRole = isLoggedIn ? role : 'guest';
  const mapEvent = (apiEvent) => mapApiEventToDetail(apiEvent, { viewerRole });

  useEffect(() => {
    checkoutTriggeredRef.current = false;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    const id = String(eventId || '');

    const detailCached = getCached(eventDetailCacheKey(id));
    const summary = getCachedEventSummary(id);
    let hasInstant = false;

    if (detailCached?.success && detailCached.event) {
      setEvent(mapEvent(detailCached.event));
      setLoading(false);
      hasInstant = true;
    } else if (summary) {
      setEvent(mapEvent(summary));
      setLoading(false);
      hasInstant = true;
    } else {
      setEvent(null);
      setLoading(true);
    }

    fetchPublicEventById(id)
      .then((data) => {
        if (cancelled) return;
        if (data?.notFound) {
          setEvent(null);
          return;
        }
        if (data?.success && data.event) {
          setEvent(mapEvent(data.event));
        } else if (!hasInstant) {
          setEvent(null);
        }
      })
      .catch(() => {
        if (cancelled || hasInstant) return;
        setEvent(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, isLoggedIn, userProfile.role, viewerRole]);

  // Kiểm tra đã đặt nhắc chưa (giữ trạng thái sau khi tải lại trang).
  useEffect(() => {
    if (!event?.registrationNotOpen) return;
    const accountEmail = userProfile?.email || localStorage.getItem('userEmail') || '';
    if (!isLoggedIn && !accountEmail) return; // khách chưa nhập email thì chưa kiểm tra được
    let cancelled = false;
    fetchEventRemindStatus(eventId, accountEmail).then((res) => {
      if (!cancelled && res?.subscribed) setRemindDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, event?.registrationNotOpen, isLoggedIn, userProfile?.email]);

  const openTicket = () => {
    if (!event) return;
    setTicketData(
      buildTicketFromDetailEvent(event, {
        holderName,
        registrationId,
      })
    );
  };

  const handleRemind = async () => {
    if (remindLoading) return;
    const accountEmail = userProfile?.email || localStorage.getItem('userEmail') || '';
    const email = isLoggedIn ? accountEmail : String(remindEmail || '').trim();
    if (!isLoggedIn && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast?.('Vui lòng nhập email hợp lệ để nhận nhắc.', 'error');
      return;
    }
    setRemindLoading(true);
    try {
      const data = await remindEventRegistration(eventId, email);
      setRemindDone(true);
      showToast?.(data.message || 'Đã đặt nhắc — kiểm tra email của bạn nhé.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Không đặt được nhắc.', 'error');
    } finally {
      setRemindLoading(false);
    }
  };

  const handlePrimaryAction = () => {
    if (!event) return;

    if (event.eventState === 'expired') {
      showToast?.('Sự kiện này đã kết thúc.', 'error');
      return;
    }

    if (event.eventState === 'postponed') return;

    if (!isLoggedIn) {
      showToast?.('Vui lòng đăng nhập để đăng ký tham gia sự kiện!', 'error');
      setTimeout(() => navigate('/login'), 1200);
      return;
    }

    if (event.isRegistered) {
      openTicket();
      return;
    }

    if (event.primaryDisabled) {
      showToast?.('Sự kiện đã hết chỗ.', 'error');
      return;
    }

    // Vé có phí → mở luồng thanh toán SePay; vé miễn phí → xác nhận đăng ký thường
    if (eventRequiresPayment(event, viewerRole)) {
      handleCheckout();
      return;
    }

    setRegisterConfirmOpen(true);
  };

  const handleCheckout = useCallback(async () => {
    if (!event) return;
    setRegisterLoading(true);
    try {
      const res = await checkoutEventTicket(event.id);
      setPaymentPaid(false);
      setPaymentData(res.payment);
    } catch (err) {
      showToast?.(err.message || 'Không thể tạo đơn thanh toán.', 'error');
    } finally {
      setRegisterLoading(false);
    }
  }, [event, showToast]);

  useEffect(() => {
    if (!event || checkoutTriggeredRef.current || readOnly) return;
    if (!location.state?.openCheckout) return;
    if (event.isRegistered || !eventRequiresPayment(event, viewerRole)) {
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    checkoutTriggeredRef.current = true;
    navigate(location.pathname, { replace: true, state: null });
    handleCheckout();
  }, [event, location.pathname, location.state, viewerRole, readOnly, navigate, handleCheckout]);

  const handlePaymentPaid = async () => {
    setPaymentPaid(true);
    try {
      const refreshData = await fetchPublicEventById(event.id, { forceRefresh: true });
      if (refreshData?.success && refreshData.event) {
        const updatedEvent = mapEvent({ ...refreshData.event, isRegistered: true });
        setEvent(updatedEvent);
        syncEventRegistrationInCache(event.id, refreshData.event, { registered: true });
      }
    } catch {
      /* vẫn coi như đã thanh toán; lần tải lại sau sẽ đồng bộ */
    }
  };

  const handleClosePayment = () => {
    setPaymentData(null);
    if (paymentPaid && event) {
      setTicketData(
        buildTicketFromDetailEvent(
          { ...event, isRegistered: true },
          { holderName, registrationId },
        ),
      );
    }
    setPaymentPaid(false);
  };

  const handleConfirmRegister = async () => {
    if (!event) return;

    setRegisterLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/events/${event.id}/register`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast?.(data.message || 'Không thể đăng ký sự kiện.', 'error');
        return;
      }

      const nextRegistrationId = data.registration?.id || data.registration?._id;
      if (nextRegistrationId) {
        setRegistrationId(nextRegistrationId);
      }

      const updatedEvent = mapEvent({ ...data.event, isRegistered: true });
      setEvent(updatedEvent);
      syncEventRegistrationInCache(event.id, data.event, { registered: true });
      setRegisterConfirmOpen(false);
      showToast?.(data.message || 'Đăng ký sự kiện thành công!', 'success');
      setTicketData(
        buildTicketFromDetailEvent(updatedEvent, {
          holderName,
          registrationId: nextRegistrationId,
        })
      );
    } catch {
      showToast?.('Không thể kết nối máy chủ. Vui lòng thử lại.', 'error');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!event) return;

    setCancelLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/events/${event.id}/register`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast?.(data.message || 'Không thể hủy đăng ký.', 'error');
        return;
      }

      setRegistrationId(null);
      setTicketData(null);
      setCancelConfirmOpen(false);
      showToast?.(data.message || 'Đã hủy đăng ký sự kiện.', 'success');

      syncEventRegistrationInCache(event.id, null, { registered: false });
      const refreshData = await fetchPublicEventById(event.id, { forceRefresh: true });
      if (refreshData?.success && refreshData.event) {
        setEvent(mapEvent(refreshData.event));
      }
    } catch {
      showToast?.('Không thể kết nối máy chủ. Vui lòng thử lại.', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleShare = async (type) => {
    const url = window.location.href;
    if (type === 'copy') {
      try {
        await navigator.clipboard.writeText(url);
        showToast?.('Đã sao chép liên kết sự kiện.', 'success');
      } catch {
        showToast?.('Không thể sao chép liên kết.', 'error');
      }
      return;
    }
    if (type === 'mail') {
      window.location.href = `mailto:?subject=${encodeURIComponent(event?.title || 'Sự kiện FPT')}&body=${encodeURIComponent(url)}`;
      return;
    }
    if (navigator.share) {
      navigator.share({ title: event?.title, url }).catch(() => {});
    } else {
      handleShare('copy');
    }
  };

  const renderPublicShell = (content) => (
    <PublicAdminShell activeNav="events" searchPlaceholder="Tìm kiếm sự kiện...">
      {content}
    </PublicAdminShell>
  );

  if (loading) {
    const loadingBody = (
      <div className="event-detail-page home-layout">
        <main className="event-detail-page__loading" aria-busy="true" aria-live="polite">
          <span className="btn-spinner events-page__spinner" aria-hidden="true" />
          <p>Đang tải thông tin sự kiện...</p>
        </main>
      </div>
    );
    if (embedded) {
      return <div className="event-detail-page event-detail-page--embedded">{loadingBody}</div>;
    }
    return renderPublicShell(loadingBody);
  }

  if (!event) {
    const notFoundBody = (
      <div className="event-detail-page home-layout">
        <main className="event-detail-page__not-found">
          <h1>Không tìm thấy sự kiện</h1>
          <button type="button" className="event-detail-page__back-link" onClick={() => navigate(backPath)}>
            ← Quay lại
          </button>
        </main>
      </div>
    );
    if (embedded) {
      return <div className="event-detail-page event-detail-page--embedded">{notFoundBody}</div>;
    }
    return renderPublicShell(notFoundBody);
  }

  const statusClass = `event-detail-page__status event-detail-page__status--${event.registrationStatus.tone}`;

  const detailMain = (
    <main className="event-detail-page__main">
        <div className="event-detail-page__grid">
          <section className="event-detail-page__hero">
            <img src={event.thumbnail} alt="" className="event-detail-page__hero-img" />
            <div className="event-detail-page__hero-overlay">
              <div className="event-detail-page__hero-tags">
                <span
                  className="event-detail-page__tag event-detail-page__tag--primary"
                  style={{ backgroundColor: event.categoryColor }}
                >
                  {event.categoryLabel || event.category}
                </span>
                {event.secondaryTag ? (
                  <span className="event-detail-page__tag event-detail-page__tag--secondary">
                    {event.secondaryTag}
                  </span>
                ) : null}
              </div>
              <h1>{event.title}</h1>
              <div className="event-detail-page__hero-meta">
                {event.isMultiDay ? (
                  <>
                    <span><CalendarIcon /> Bắt đầu: {event.startDateTimeLabel}</span>
                    <span><ClockIcon /> Kết thúc: {event.endDateTimeLabel}</span>
                  </>
                ) : (
                  <>
                    <span><CalendarIcon /> {event.dateShort}</span>
                    <span><ClockIcon /> {event.timeRange}</span>
                  </>
                )}
                <span><LocationIcon /> {event.location}</span>
              </div>
            </div>
          </section>

          <div className="event-detail-page__content">
            <section className="event-detail-page__section">
              <div className="event-detail-page__section-title">
                <span className="event-detail-page__title-accent" />
                <h2>Giới thiệu sự kiện</h2>
              </div>
              <div className="event-detail-page__intro">
                {event.descriptionParagraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
                <h3>Bạn sẽ học được gì?</h3>
                <ul className="event-detail-page__checklist">
                  {event.learningOutcomes.map((item) => (
                    <li key={item}>
                      <CheckIcon />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="event-detail-page__card">
              <h2>Nội dung chi tiết</h2>
              <div className="event-detail-page__agenda">
                {event.agenda.map((step, index) => (
                  <div key={step.title} className="event-detail-page__agenda-item">
                    <div className="event-detail-page__agenda-track">
                      <span className="event-detail-page__agenda-num">{index + 1}</span>
                      {index < event.agenda.length - 1 && (
                        <span className="event-detail-page__agenda-line" aria-hidden="true" />
                      )}
                    </div>
                    <div className="event-detail-page__agenda-body">
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {event.speakers?.length > 0 && (
              <section className="event-detail-page__section">
                <h2>Diễn giả đồng hành</h2>
                <div className="event-detail-page__speakers">
                  {event.speakers.map((speaker) => (
                    <article key={`${speaker.name}-${speaker.role}`} className="event-detail-page__speaker-card">
                      <div className="event-detail-page__speaker-head">
                        {speaker.avatar ? (
                          <img src={speaker.avatar} alt="" />
                        ) : (
                          <div className="event-detail-page__speaker-avatar-placeholder" aria-hidden="true">
                            {speaker.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <h4>{speaker.name}</h4>
                          {speaker.role ? <span>{speaker.role}</span> : null}
                        </div>
                      </div>
                      {speaker.quote ? (
                        <p className="event-detail-page__speaker-quote">&ldquo;{speaker.quote}&rdquo;</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="event-detail-page__organizer">
              <div className="event-detail-page__organizer-logo">
                <img src={event.organizer.logo} alt="" />
              </div>
              <div className="event-detail-page__organizer-body">
                <div className="event-detail-page__organizer-top">
                  <h3>{event.organizer.name}</h3>
                  {event.organizer.kind === 'club' && (
                    <div className="event-detail-page__organizer-stats">
                      <span><strong>{event.organizer.memberCount}+</strong> Thành viên</span>
                      <span><strong>{event.organizer.eventsHeld}</strong> Sự kiện</span>
                    </div>
                  )}
                  {event.organizer.kind === 'school' && (
                    <span className="event-detail-page__organizer-badge">
                      Cấp trường · {event.schoolOrganizerRole === 'icpdp' ? 'IC-PDP' : 'CTSV'}
                    </span>
                  )}
                </div>
                <p>{event.organizer.description}</p>
                {event.organizer.kind === 'club' && event.organizer.slug && (
                  <div className="event-detail-page__organizer-actions">
                    <button
                      type="button"
                      className="event-detail-page__btn event-detail-page__btn--primary"
                      onClick={() => navigate(`/clubs/${event.organizer.slug}`)}
                    >
                      Khám phá câu lạc bộ
                    </button>
                    <button
                      type="button"
                      className="event-detail-page__btn event-detail-page__btn--text"
                      onClick={() => {
                        const clubKey = event.organizer.slug || event.organizer.clubId || event.clubId;
                        if (clubKey) {
                          navigate(`/events?club=${encodeURIComponent(clubKey)}`);
                          return;
                        }
                        navigate('/events');
                      }}
                    >
                      Xem thêm sự kiện từ CLB
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="event-detail-page__sidebar">
            {readOnly ? (
              <div className="event-detail-page__admin-info-card">
                <h3>Thông tin quản trị</h3>
                <div className="event-detail-page__admin-info-row">
                  <span>Trạng thái</span>
                  <strong>{event.registrationStatus.label}</strong>
                </div>
                <div className="event-detail-page__admin-info-row">
                  <span>Đăng ký</span>
                  <strong>{event.registeredCount}/{event.capacity} slot</strong>
                </div>
                <div className="event-detail-page__admin-info-row">
                  <span>Giá vé</span>
                  <strong>{event.priceLabel}</strong>
                </div>
                <div className="event-detail-page__admin-info-row">
                  <span>Hạn đăng ký</span>
                  <strong>{event.registrationDeadline}</strong>
                </div>
                <p style={{ margin: '12px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {isCtsvStaff
                    ? 'CTSV không đăng ký hoặc mua vé từ trang này — chỉ xem thông tin sự kiện.'
                    : clubManageAccess?.canManage
                      ? 'Quản lý CLB không đăng ký tham gia sự kiện do CLB mình tổ chức.'
                      : 'Chế độ xem — Admin không đăng ký tham gia từ trang này.'}
                </p>
                {isAdminViewer && (
                  <>
                    <Link to="/admin/events" className="event-detail-page__admin-portal-link">
                      Mở trong portal duyệt sự kiện
                    </Link>
                    <div style={{ marginTop: 16, borderTop: '1px solid var(--border-light, #e8e0da)', paddingTop: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lịch sử thanh toán</span>
                        {adminPayments === null && (
                          <button
                            type="button"
                            onClick={async () => {
                              setAdminPaymentsLoading(true);
                              try {
                                const res = await fetchAdminPayments({ eventId: eventId, limit: 50 });
                                setAdminPayments(res);
                              } catch {
                                setAdminPayments({ payments: [], total: 0 });
                              } finally {
                                setAdminPaymentsLoading(false);
                              }
                            }}
                            style={{ fontSize: '0.78rem', color: 'var(--primary, #e85d04)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                          >
                            {adminPaymentsLoading ? 'Đang tải…' : 'Xem'}
                          </button>
                        )}
                        {adminPayments !== null && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{adminPayments.total ?? adminPayments.payments?.length ?? 0} giao dịch</span>
                        )}
                      </div>
                      {adminPayments !== null && (
                        adminPayments.payments?.length === 0 ? (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Chưa có giao dịch nào.</p>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-light, #e8e0da)' }}>
                                  <th style={{ textAlign: 'left', padding: '4px 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Mã</th>
                                  <th style={{ textAlign: 'left', padding: '4px 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Email</th>
                                  <th style={{ textAlign: 'right', padding: '4px 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Số tiền</th>
                                  <th style={{ textAlign: 'left', padding: '4px 6px', color: 'var(--text-muted)', fontWeight: 600 }}>TT</th>
                                </tr>
                              </thead>
                              <tbody>
                                {adminPayments.payments.map((p) => (
                                  <tr key={p._id || p.code} style={{ borderBottom: '1px solid #f5f0ec' }}>
                                    <td style={{ padding: '4px 6px', fontFamily: 'monospace' }}>{p.code}</td>
                                    <td style={{ padding: '4px 6px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.userEmail}</td>
                                    <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>{(p.amount || 0).toLocaleString('vi-VN')}đ</td>
                                    <td style={{ padding: '4px 6px' }}>
                                      <span style={{
                                        display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                                        background: p.status === 'paid' ? '#d1fae5' : p.status === 'pending' ? '#fef3c7' : '#f1f5f9',
                                        color: p.status === 'paid' ? '#065f46' : p.status === 'pending' ? '#92400e' : '#64748b',
                                      }}>
                                        {p.status === 'paid' ? 'Đã TT' : p.status === 'pending' ? 'Chờ' : p.status === 'expired' ? 'Hết hạn' : p.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <a href="/admin/payments" style={{ display: 'block', marginTop: 8, fontSize: '0.78rem', color: 'var(--primary)', textAlign: 'right' }}>
                              Xem đầy đủ →
                            </a>
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}
                {ctsvManageAccess?.canManage && ctsvManageAccess.managePath && (
                  <Link to={ctsvManageAccess.managePath} className="event-detail-page__admin-portal-link">
                    {ctsvManageAccess.label} sự kiện
                  </Link>
                )}
                {clubManageAccess?.canManage && clubManageAccess.managePath && (
                  <>
                    {clubManageAccess.switchClubHint ? (
                      <p className="event-detail-page__club-switch-hint">{clubManageAccess.switchClubHint}</p>
                    ) : null}
                    <button
                      type="button"
                      className="event-detail-page__admin-portal-link event-detail-page__admin-portal-link--button"
                      onClick={() =>
                        navigateClubEventManage({
                          access: clubManageAccess,
                          navigate,
                          showToast,
                        })
                      }
                    >
                      {clubManageAccess.label} sự kiện
                    </button>
                  </>
                )}
              </div>
            ) : (
            <div className="event-detail-page__register-card">
              <div className="event-detail-page__register-head">
                <span className={statusClass}>{event.registrationStatus.label}</span>
                <span className="event-detail-page__slots">
                  {event.registeredCount}/{event.capacity} slot
                </span>
              </div>
              <div className="event-detail-page__progress">
                <div
                  className="event-detail-page__progress-fill"
                  style={{ width: `${event.fillPercent}%` }}
                />
              </div>
              <div className="event-detail-page__register-meta">
                <div className="event-detail-page__price-row">
                  <span>Giá vé:</span>
                  <div className="event-detail-page__price-values">
                    {event.studentPrivilegeApplied && event.listPrice > 0 && (
                      <span className="event-detail-page__list-price">{formatVnd(event.listPrice)}</span>
                    )}
                    <strong className="event-detail-page__price">{event.priceLabel}</strong>
                  </div>
                </div>
                {event.studentPrivilegeApplied && (
                  <p className="event-detail-page__student-privilege">
                    Bạn được miễn phí tham gia sự kiện này
                  </p>
                )}
                {!event.studentPrivilegeApplied && event.listPrice > 0 && event.amountDue > 0 && (
                  <p className="event-detail-page__guest-price-note">
                    Khách mua vé theo giá niêm yết
                  </p>
                )}
                {event.registrationNotOpen && event.registrationStartLabel && (
                  <div>
                    <span>Mở đăng ký:</span>
                    <strong>{event.registrationStartLabel}</strong>
                  </div>
                )}
                <div>
                  <span>Hạn đăng ký:</span>
                  <strong>{event.registrationDeadline}</strong>
                </div>
                {event.registrationNotOpen && (
                  <p className="event-detail-page__guest-price-note">
                    Sự kiện chưa tới ngày mở đăng ký — bạn có thể xem thông tin, nút đăng ký sẽ mở khi tới ngày.
                  </p>
                )}
                {event.reviewCount > 0 && (
                  <div>
                    <span>Đánh giá:</span>
                    <strong>{event.averageRating} ★ ({event.reviewCount})</strong>
                  </div>
                )}
              </div>
              {event.registrationNotOpen ? (
                remindDone ? (
                  <div className="event-detail-page__remind">
                    <div className="event-detail-page__remind-done">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Đã đặt nhắc. Chúng tôi sẽ email trước khi mở đăng ký 5 phút.
                    </div>
                    {buildGoogleCalendarUrl({
                      title: `Mở đăng ký: ${event.title}`,
                      start: event.registrationStartISO,
                      end: event.registrationStartISO
                        ? new Date(new Date(event.registrationStartISO).getTime() + 30 * 60 * 1000)
                        : null,
                      details: `Mở đăng ký vé sự kiện "${event.title}" trên F-Events.`,
                      location: event.location || '',
                    }) && (
                      <a
                        className="event-detail-page__calendar-btn"
                        href={buildGoogleCalendarUrl({
                          title: `Mở đăng ký: ${event.title}`,
                          start: event.registrationStartISO,
                          end: event.registrationStartISO
                            ? new Date(new Date(event.registrationStartISO).getTime() + 30 * 60 * 1000)
                            : null,
                          details: `Mở đăng ký vé sự kiện "${event.title}" trên F-Events.`,
                          location: event.location || '',
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <CalendarIcon />
                        Thêm vào Google Calendar
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="event-detail-page__remind">
                    <label className="event-detail-page__remind-label" htmlFor="remind-email">
                      Nhắc tôi khi mở đăng ký
                    </label>
                    {isLoggedIn ? (
                      <p className="event-detail-page__remind-account">
                        Gửi tới email tài khoản:{' '}
                        <strong>{userProfile?.email || localStorage.getItem('userEmail') || ''}</strong>
                      </p>
                    ) : (
                      <input
                        id="remind-email"
                        type="email"
                        className="event-detail-page__remind-input"
                        placeholder="Email nhận nhắc"
                        value={remindEmail}
                        onChange={(e) => setRemindEmail(e.target.value)}
                        disabled={remindLoading}
                      />
                    )}
                    <button
                      type="button"
                      className="event-detail-page__register-btn"
                      disabled={remindLoading}
                      onClick={handleRemind}
                    >
                      {remindLoading ? 'Đang đặt nhắc...' : 'Nhắc tôi qua email'}
                    </button>
                    {buildGoogleCalendarUrl({
                      title: `Mở đăng ký: ${event.title}`,
                      start: event.registrationStartISO,
                      end: event.registrationStartISO
                        ? new Date(new Date(event.registrationStartISO).getTime() + 30 * 60 * 1000)
                        : null,
                      details: `Mở đăng ký vé sự kiện "${event.title}" trên F-Events.`,
                      location: event.location || '',
                    }) && (
                      <a
                        className="event-detail-page__calendar-btn"
                        href={buildGoogleCalendarUrl({
                          title: `Mở đăng ký: ${event.title}`,
                          start: event.registrationStartISO,
                          end: event.registrationStartISO
                            ? new Date(new Date(event.registrationStartISO).getTime() + 30 * 60 * 1000)
                            : null,
                          details: `Mở đăng ký vé sự kiện "${event.title}" trên F-Events.`,
                          location: event.location || '',
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <CalendarIcon />
                        Thêm vào Google Calendar
                      </a>
                    )}
                    <p className="event-detail-page__remind-hint">
                      Bấm "Nhắc tôi" để nhận email trước khi mở đăng ký 5 phút. Bạn cũng có thể thêm mốc mở đăng ký vào Google Calendar.
                    </p>
                  </div>
                )
              ) : (
                <button
                  type="button"
                  className="event-detail-page__register-btn"
                  disabled={(event.primaryDisabled && !event.isRegistered) || registerLoading}
                  onClick={handlePrimaryAction}
                >
                  {registerLoading ? 'Đang xử lý...' : event.primaryActionLabel}
                </button>
              )}
              {event.isRegistered && event.eventState !== 'expired' && buildGoogleCalendarUrl({
                title: event.title,
                start: event.startISO,
                end: event.endISO,
                details: `Sự kiện "${event.title}" trên F-Events.`,
                location: event.location || '',
              }) && (
                <a
                  className="event-detail-page__calendar-btn"
                  style={{ marginTop: 10 }}
                  href={buildGoogleCalendarUrl({
                    title: event.title,
                    start: event.startISO,
                    end: event.endISO,
                    details: `Sự kiện "${event.title}" trên F-Events.`,
                    location: event.location || '',
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CalendarIcon />
                  Thêm vào Google Calendar
                </a>
              )}
              {event.isRegistered && event.eventState !== 'expired' && (
                <button
                  type="button"
                  className="event-detail-page__cancel-btn"
                  disabled={cancelLoading}
                  onClick={() => setCancelConfirmOpen(true)}
                >
                  {cancelLoading ? 'Đang hủy...' : 'Hủy đăng ký'}
                </button>
              )}
              <div className="event-detail-page__share">
                <p>Chia sẻ sự kiện</p>
                <div className="event-detail-page__share-actions">
                  <button type="button" aria-label="Chia sẻ" onClick={() => handleShare('native')}>
                    <ShareIcon />
                  </button>
                  <button type="button" aria-label="Sao chép liên kết" onClick={() => handleShare('copy')}>
                    <LinkIcon />
                  </button>
                  <button type="button" aria-label="Gửi email" onClick={() => handleShare('mail')}>
                    <MailIcon />
                  </button>
                </div>
              </div>
            </div>
            )}
          </aside>
        </div>
      </main>
  );

  const dialogs = readOnly ? null : (
    <>
      <ConfirmDialog
        open={registerConfirmOpen}
        title="Xác nhận đăng ký"
        message={event ? `Bạn có chắc muốn đăng ký tham gia "${event.title}"?` : ''}
        confirmLabel="Đăng ký"
        cancelLabel="Hủy"
        loading={registerLoading}
        onConfirm={handleConfirmRegister}
        onCancel={() => !registerLoading && setRegisterConfirmOpen(false)}
      />
      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Hủy đăng ký"
        message={event ? `Bạn có chắc muốn hủy đăng ký sự kiện "${event.title}"?` : ''}
        confirmLabel="Hủy đăng ký"
        cancelLabel="Giữ lại"
        danger
        loading={cancelLoading}
        onConfirm={handleConfirmCancel}
        onCancel={() => !cancelLoading && setCancelConfirmOpen(false)}
      />
      <EventTicketModal
        open={Boolean(ticketData)}
        ticket={ticketData}
        onClose={() => setTicketData(null)}
      />
      {paymentData && (
        <PaymentModal
          payment={paymentData}
          onPaid={handlePaymentPaid}
          onClose={handleClosePayment}
          showToast={showToast}
        />
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="event-detail-page event-detail-page--embedded">
        <button type="button" className="announcements-detail-back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(backPath))}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor" />
          </svg>
          Quay lại
        </button>
        {detailMain}
        {dialogs}
      </div>
    );
  }

  return renderPublicShell(
    <>
      <div className="event-detail-page home-layout">
        {detailMain}
      </div>
      {dialogs}
    </>
  );
};

export default EventDetail;
