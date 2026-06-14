/** Chuẩn hóa event từ API CLB / CTSV cho màn EventManagementDetail */
export const normalizeManagementEvent = (event) => {
  if (!event) return null;
  const rawId = event._id || event.id;
  const id = typeof rawId === 'string' ? rawId : rawId?.toString?.() || rawId;
  const capacity = event.capacity || event.totalTickets || 0;

  return {
    ...event,
    _id: id,
    id,
    capacity,
    registeredCount: event.registeredCount ?? 0,
    checkinCount: event.checkinCount ?? 0,
    reach: event.reach ?? 0,
    statusKey: event.statusKey || event.status || '',
  };
};

export const getManagementEventId = (event) => {
  if (!event) return '';
  return String(event._id || event.id || '');
};
