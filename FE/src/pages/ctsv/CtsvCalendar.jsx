import React, { useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import EventCalendarPage from '../../components/calendar/EventCalendarPage';
import { fetchCtsvCalendar } from '../../services/ctsvApi';

const resolveCtsvEventLink = (event) => `/ctsv/events/${event.id}`;

const CtsvCalendar = () => {
  const { showToast } = useOutletContext() || {};
  const loadEvents = useCallback(() => fetchCtsvCalendar(), []);

  return (
    <EventCalendarPage
      showToast={showToast}
      fetchEvents={loadEvents}
      resolveEventLink={resolveCtsvEventLink}
      eyebrow="Lịch CTSV"
      title="Lịch sự kiện toàn trường"
      description="Tổng quan toàn bộ sự kiện (cấp trường, đối tác, CLB) — mọi trạng thái, theo tháng."
    />
  );
};

export default CtsvCalendar;
