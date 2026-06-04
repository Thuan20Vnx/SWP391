import React, { useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import EventCalendarPage from '../../components/calendar/EventCalendarPage';
import { fetchAdminCalendar } from '../../services/adminApi';

const ADMIN_STATUS_FILTERS = [
  { id: 'pending_admin', label: 'Chờ Admin' },
  { id: 'pending_any', label: 'Mọi trạng thái chờ' },
];

const resolveAdminEventLink = (event) => {
  if (event.statusKey === 'pending_admin' && event.source === 'school') {
    return '/admin/events/school-approvals';
  }
  if (event.source === 'school') {
    return `/ctsv/events/${event.id}`;
  }
  return `/events/${event.id}`;
};

const AdminCalendar = () => {
  const { showToast } = useOutletContext() || {};
  const loadEvents = useCallback(() => fetchAdminCalendar(), []);

  return (
    <EventCalendarPage
      showToast={showToast}
      fetchEvents={loadEvents}
      resolveEventLink={resolveAdminEventLink}
      eyebrow="Lịch Admin"
      title="Lịch sự kiện hệ thống"
      description="Theo dõi sự kiện cấp trường, đối tác và CLB — lọc nhanh các mục chờ Admin phê duyệt."
      statusFilters={ADMIN_STATUS_FILTERS}
      computeStats={(eventsInMonth) => ({
        total: eventsInMonth.length,
        pending: eventsInMonth.filter((e) => e.isPending).length,
        pendingAdmin: eventsInMonth.filter((e) => e.statusKey === 'pending_admin').length,
        school: eventsInMonth.filter((e) => e.source === 'school').length,
      })}
    />
  );
};

export default AdminCalendar;
