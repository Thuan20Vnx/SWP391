export const isPartnerManagedEvent = (
  event,
  { partnerId = '', managedEventIds = [], userEmail = '' } = {}
) => {
  const eventId = String(event?.id || event?._id || '');
  const managedSet = new Set(managedEventIds.map(String));
  if (eventId && managedSet.has(eventId)) return true;

  if ((event?.source || '') === 'partner' && partnerId) {
    const pid = String(event?.partnerId || '');
    if (pid && pid === String(partnerId)) return true;
  }

  const email = String(userEmail || '').trim().toLowerCase();
  const creatorEmail = String(
    event?.createdByEmail || event?.createdBy?.email || ''
  )
    .trim()
    .toLowerCase();
  if (email && creatorEmail && email === creatorEmail && (event?.source || '') === 'partner') {
    return true;
  }

  return false;
};

export const getPartnerPublicEventAccess = (event, partnerContext = {}) => {
  if (!isPartnerManagedEvent(event, partnerContext)) {
    return {
      viewOnly: false,
      canManage: false,
      label: 'Quản lý',
      managePath: null,
    };
  }

  const eventId = event?.id || event?._id;
  return {
    viewOnly: true,
    canManage: Boolean(eventId),
    label: 'Quản lý',
    managePath: eventId ? `/partner/events/${eventId}` : null,
  };
};

export const getPartnerOwnedEventCardAccess = () => ({
  canManage: true,
  label: 'Quản lý',
  buttonClass: 'btn-card-manage',
});
