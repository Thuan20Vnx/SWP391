import React, { useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import EventCalendarPage from '../../components/calendar/EventCalendarPage';
import { fetchAdminCalendar } from '../../services/adminApi';
import { useTranslation } from '../../i18n/I18nContext';
import { resolveLabel } from '../../i18n/helpers';

const ADMIN_STATUS_FILTERS = [
  { id: 'pending_admin', labelKey: 'admin.calendar.filter.pendingAdmin' },
  { id: 'pending_any', labelKey: 'admin.calendar.filter.pendingAny' },
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
  const { t } = useTranslation();
  const loadEvents = useCallback(() => fetchAdminCalendar(), []);

  const statusFilters = useMemo(
    () => ADMIN_STATUS_FILTERS.map((f) => ({ ...f, label: resolveLabel(f, t) })),
    [t],
  );

  return (
    <EventCalendarPage
      showToast={showToast}
      fetchEvents={loadEvents}
      resolveEventLink={resolveAdminEventLink}
      eyebrow={t('admin.calendar.eyebrow')}
      title={t('admin.calendar.title')}
      description={t('admin.calendar.description')}
      statusFilters={statusFilters}
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
