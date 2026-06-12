import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventDiscoveryCard from '../EventDiscoveryCard';
import EventTicketModal from '../EventTicketModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { fetchPartnerCampusEvents } from '../../services/partnerApi';
import { API_BASE, getAuthHeaders } from '../../utils/api';
import { mapApiEventToCard } from '../../data/eventDiscoveryData';
import { buildTicketFromCardEvent } from '../../utils/eventTicket';
import { resolveDiscoveryCardProps } from '../../utils/publicEventStaffAccess';

const CAMPUS_EVENTS_PAGE_SIZE = 6;
const CAMPUS_EVENTS_FETCH_LIMIT = 24;

/**
 * Danh sách sự kiện campus (đăng ký tham gia) — dùng trên PartnerHome.
 */
const PartnerCampusEventsSection = ({
  showToast,
  title = 'Tất cả sự kiện',
  description,
  className = ''
}) => {
  const navigate = useNavigate();
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

    fetchPartnerCampusEvents({ limit: CAMPUS_EVENTS_FETCH_LIMIT })
      .then((data) => {
        const list = Array.isArray(data.events) ? data.events : [];
        setEvents(list.map(mapApiEventToCard));
        setPage(1);
        setPartnerContext({
          partnerId: data.partnerId || '',
          managedEventIds: data.managedEventIds || [],
          userEmail: localStorage.getItem('userEmail') || ''
        });
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

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
          registrationId: registrationIds[event.id]
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

      setConfirmEvent(event);
    },
    [handleDetail, openTicket, showToast]
  );

  const handleConfirmRegister = useCallback(async () => {
    if (!confirmEvent) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/events/${confirmEvent.id}/register`, {
        method: 'POST',
        headers: getAuthHeaders()
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
        isRegistered: true
      });

      setEvents((prev) => prev.map((ev) => (ev.id === confirmEvent.id ? updatedCard : ev)));

      showToast?.(data.message || 'Đăng ký sự kiện thành công!', 'success');
      setConfirmEvent(null);
      setTicketData(
        buildTicketFromCardEvent(updatedCard, {
          holderName,
          registrationId
        })
      );
    } catch {
      showToast?.('Không thể kết nối máy chủ. Vui lòng thử lại.', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [confirmEvent, holderName, showToast]);

  const totalPages = Math.max(1, Math.ceil(events.length / CAMPUS_EVENTS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedEvents = useMemo(() => {
    const start = (currentPage - 1) * CAMPUS_EVENTS_PAGE_SIZE;
    return events.slice(start, start + CAMPUS_EVENTS_PAGE_SIZE);
  }, [currentPage, events]);

  return (
    <>
      <section className={`recommended-section ctsv-home-live-section partner-campus-section ${className}`.trim()}>
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
              {pagedEvents.map((ev) => {
                const cardProps = resolveDiscoveryCardProps({
                  event: ev,
                  isPartner: true,
                  partnerContext,
                  onDetail: handleDetail,
                  onRegister: handlePrimaryAction,
                  onManageNavigate: (path) => navigate(path)
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
              <nav className="ctsv-events-pagination partner-campus-events-pagination" aria-label="Phân trang sự kiện campus">
                <button
                  type="button"
                  className="ctsv-events-page-btn"
                  onClick={() => setPage((n) => Math.max(1, n - 1))}
                  disabled={currentPage === 1}
                >
                  Trước
                </button>
                <span className="ctsv-events-page-status" aria-live="polite">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="ctsv-events-page-btn"
                  onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
                  disabled={currentPage === totalPages}
                >
                  Sau
                </button>
              </nav>
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirmEvent)}
        title="Xác nhận đăng ký"
        message={
          confirmEvent ? `Bạn có chắc muốn đăng ký tham gia "${confirmEvent.title}"?` : ''
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
