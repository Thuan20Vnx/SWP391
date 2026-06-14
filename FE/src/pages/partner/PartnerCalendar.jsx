import React, { useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import EventCalendarPage from '../../components/calendar/EventCalendarPage';
import { fetchCtsvCalendar } from '../../services/ctsvApi';

const resolvePartnerEventLink = (event) => `/partner/events/${event.id}`;

const PartnerCalendar = () => {
  const { showToast } = useOutletContext() || {};
  const loadEvents = useCallback(() => fetchCtsvCalendar(), []);

  return (
    <EventCalendarPage
      showToast={showToast}
      fetchEvents={loadEvents}
      resolveEventLink={resolvePartnerEventLink}
      eyebrow="Lịch toàn trường"
      title="Lịch sự kiện toàn trường"
      description="Theo dõi toàn bộ sự kiện cấp trường, đối tác và CLB theo tháng để lên kế hoạch phối hợp tốt hơn."
    />
  );
};

export default PartnerCalendar;
