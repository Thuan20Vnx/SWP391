import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventDiscoveryCard from '../EventDiscoveryCard';
import EventTicketModal from '../EventTicketModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { fetchPartnerEvents, fetchPartnerMe } from '../../services/partnerApi';
import { eventRequiresPayment } from '../../utils/eventRegisterAction';
import { API_BASE, getAuthHeaders } from '../../utils/api';
import { filterEventsByState, mapApiEventToCard } from '../../data/eventDiscoveryData';
import { buildTicketFromCardEvent } from '../../utils/eventTicket';
import { resolveDiscoveryCardProps } from '../../utils/publicEventStaffAccess';

/**
 * Danh sách sự kiện campus (đăng ký tham gia) — dùng trên PartnerHome.
 */
const PAGE_SIZE = 6;

const PartnerCampusEventsSection = ({ showToast, title = 'Tất cả sự kiện', description, className = '' }) => {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [confirmEvent, setConfirmEvent] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [registrationIds, setRegistrationIds] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [partnerContext, setPartnerContext] = useState(null);

  const holderName = useMemo(
    () => localStorage.getItem('userFullname') || localStorage.getItem('userEmail') || '',
    []
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/events`, { headers: getAuthHeaders(false) }).then((res) => res.json()),
      fetchPartnerMe().catch(() => ({ partner: null })),
      fetchPartnerEvents().catch(() => ({ events: [] })),
    ])
      .then(([data, meRes, partnerEventsRes]) => {
        if (data.success && data.events?.length) {
          setEvents(filterEventsByState(data.events.map(mapApiEventToCard), 'open'));
        } else {
          setEvents([]);
        }
        setPartnerContext({
          partnerId: meRes.partner?._id || meRes.partner?.id || '',
          managedEventIds: (partnerEventsRes.events || []).map((ev) => ev.id || ev._id),
          userEmail: localStorage.getItem('userEmail') || '',
        });
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(events.length / PAGE_SIZE)),
    [events.length]
  );

  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visibleEvents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return events.slice(start, start + PAGE_SIZE);
  }, [events, currentPage]);

  const rangeStart = events.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, events.length);

  const scrollSectionIntoView = useCallback(() => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const goToPage = useCallback(
    (nextPage) => {
      setPage(nextPage);
      scrollSectionIntoView();
    },
    [scrollSectionIntoView]
  );

  const handleDetail = useCallback(
    (event) => {
      navigate(`/partner/join/events/${event.id}`);
    },
    [navigate]
  );

  const openTicket = useCallback(
    (event) => {
      setTicketData(
        buildTicketFromCardEvent(event, {
          holderName,
          registrationId: registrationIds[event.id],
        })
      );
    },
    [holderName, registrationIds]
  );

  const handlePrimaryAction = useCallback(
    (event) => {
      if (event.cardState === 'postponed') {
        handleDetail(event);
        return;
      }

      if (event.cardState === 'expired') {
        showToast?.('Sự kiện này đã kết thúc, không thể đăng ký.', 'error');
        return;
      }

      if (event.cardState === 'registered' || event.registered) {
        openTicket(event);
        return;
      }

      const viewerRole = localStorage.getItem('userRole') || 'partner';
      if (eventRequiresPayment(event, viewerRole)) {
        navigate(`/events/${event.id}`, { state: { openCheckout: true } });
        return;
      }

      setConfirmEvent(event);
    },
    [handleDetail, navigate, openTicket, showToast]
  );

  const handleConfirmRegister = useCallback(async () => {
    if (!confirmEvent) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/events/${confirmEvent.id}/register`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast?.(data.message || 'Không thể đăng ký sự kiện.', 'error');
        return;
      }

      const registrationId = data.registration?.id || data.registration?._id;
      if (registrationId) {
        setRegistrationIds((prev) => ({ ...prev, [confirmEvent.id]: registrationId }));
      }

      const updatedCard = mapApiEventToCard({
        ...data.event,
        isRegistered: true,
      });

      setEvents((prev) =>
        prev.map((ev) => (ev.id === confirmEvent.id ? updatedCard : ev))
      );

      showToast?.(data.message || 'Đăng ký sự kiện thành công!', 'success');
      setConfirmEvent(null);
      setTicketData(
        buildTicketFromCardEvent(updatedCard, {
          holderName,
          registrationId,
        })
      );
    } catch {
      showToast?.('Không thể kết nối máy chủ. Vui lòng thử lại.', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [confirmEvent, holderName, showToast]);

  return (
    <>
      <section
        ref={sectionRef}
        className={`recommended-section ctsv-home-live-section partner-campus-section ${className}`.trim()}
      >
        <div className="recommended-header-row">
          <div className="recommended-title-container">
            <h2>{title}</h2>
            {description && <p className="ctsv-home-section-desc">{description}</p>}
          </div>
        </div>

        {loading ? (
          <div className="ctsv-home-section-empty">
            <span className="btn-spinner events-page__spinner" />
          </div>
        ) : events.length === 0 ? (
          <div className="ctsv-home-section-empty">
            <p>Hiện chưa có sự kiện nào đang mở đăng ký.</p>
          </div>
        ) : (
          <>
            <div className="event-discovery-grid partner-campus-events-grid">
              {visibleEvents.map((ev) => {
                const cardProps = resolveDiscoveryCardProps({
                  event: ev,
                  isPartner: true,
                  partnerContext,
                  onDetail: handleDetail,
                  onRegister: handlePrimaryAction,
                  onManageNavigate: (path) => navigate(path),
                });
                return (
                  <EventDiscoveryCard
                    key={ev.id}
                    event={ev}
                    onDetail={cardProps.onDetail}
                    onPrimaryAction={cardProps.onPrimaryAction}
                    onManage={cardProps.onManage}
                    manageLabel={cardProps.manageLabel}
                    viewOnly={cardProps.viewOnly}
                  />
                );
              })}
            </div>

            {totalPages > 1 && (
              <nav className="partner-campus-pagination" aria-label="Phân trang sự kiện campus">
                <p className="partner-campus-pagination__summary" aria-live="polite">
                  Hiển thị {rangeStart}–{rangeEnd} / {events.length} sự kiện
                </p>
                <div className="partner-campus-pagination__controls">
                  <button
                    type="button"
                    className="partner-campus-pagination__btn"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Trang trước"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                      <path
                        d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <span className="partner-campus-pagination__status">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="partner-campus-pagination__btn"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Trang sau"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                      <path
                        d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirmEvent)}
        title="Xác nhận đăng ký"
        message={
          confirmEvent
            ? `Bạn có chắc muốn đăng ký tham gia "${confirmEvent.title}"?`
            : ''
        }
        confirmLabel="Đăng ký"
        cancelLabel="Hủy"
        loading={actionLoading}
        onConfirm={handleConfirmRegister}
        onCancel={() => !actionLoading && setConfirmEvent(null)}
      />

      <EventTicketModal
        open={Boolean(ticketData)}
        ticket={ticketData}
        onClose={() => setTicketData(null)}
      />
    </>
  );
};

export default PartnerCampusEventsSection;
