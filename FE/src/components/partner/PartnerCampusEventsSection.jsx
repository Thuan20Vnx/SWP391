import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventDiscoveryCard from '../EventDiscoveryCard';
import EventTicketModal from '../EventTicketModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { fetchPartnerEvents, fetchPartnerMe } from '../../services/partnerApi';
import { API_BASE, getAuthHeaders } from '../../utils/api';
import { filterEventsByState, mapApiEventToCard } from '../../data/eventDiscoveryData';
import { buildTicketFromCardEvent } from '../../utils/eventTicket';
import { resolveDiscoveryCardProps } from '../../utils/publicEventStaffAccess';

/**
 * Danh sách sự kiện campus (đăng ký tham gia) — dùng chung PartnerHome & PartnerEventList.
 */
const PartnerCampusEventsSection = ({ showToast, title = 'Tất cả sự kiện', description, className = '' }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
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
          <div className="event-discovery-grid partner-campus-events-grid">
            {events.map((ev) => {
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
