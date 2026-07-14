export const TYPE_TO_TONE = {
  event_submit: 'info',
  event_resubmit: 'info',
  event_delete: 'alert',
  event_approve: 'success',
  event_reject: 'alert',
  partner_submit: 'info',
  club_submit: 'info',
  club_reject: 'alert',
  club_revision: 'warning',
  event_revision: 'warning',
  event_change_approve: 'success',
  event_change_reject: 'alert',
  event_change_submit: 'info',
  partner_reject: 'alert',
  partner_revision: 'warning',
  timeline_submit: 'info',
  timeline_change: 'warning',
  timeline_cancel: 'warning',
  timeline_update: 'warning',
  timeline_approve: 'success',
  timeline_reject: 'alert',
  timeline_revision: 'warning',
};

export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
};

export const refToLink = (refType, refId, role) => {
  if (!refId) return null;
  if (refType === 'Event') {
    if (role === 'admin') return '/admin/events';
    if (role === 'ctsv') return `/ctsv/events/${refId}`;
    if (role === 'icpdp') return `/icpdp/events/${refId}`;
    return `/events/${refId}`;
  }
  if (refType === 'event_proposal') {
    if (role === 'admin') return '/admin/events';
    if (role === 'ctsv') return `/ctsv/proposals/${refId}`;
    if (role === 'icpdp') return `/icpdp/proposals/${refId}`;
    return '/quan-ly-clb';
  }
  if (refType === 'club_registration') {
    if (role === 'admin') return `/admin/icpdp/club-registrations/${refId}`;
    if (role === 'icpdp') return `/icpdp/club-registrations/${refId}`;
    return '/quan-ly-clb';
  }
  if (refType === 'semester_timeline') {
    if (role === 'admin') return `/admin/semester-timelines/${refId}`;
    if (role === 'icpdp') return `/icpdp/semester-timelines/${refId}`;
    if (role === 'ctsv') return `/ctsv/semester-timelines/${refId}`;
    return '/quan-ly-clb';
  }
  if (refType === 'partner_event_request' && role === 'partner') {
    return `/partner/events/req-${refId}`;
  }
  if (refType === 'partner' || refType === 'partner_proposal' || refType === 'partner_event_request') {
    if (role === 'admin') return '/admin/events';
    if (role === 'ctsv') return `/ctsv/partners/${refId}`;
    if (role === 'partner') return '/partner/profile';
    return '/partner';
  }
  if (refType === 'event_change_request') return '/admin/event-requests';
  if (refType === 'club_change_request') return '/admin/club-requests';
  return null;
};

export const mapSysNotif = (n, role) => ({
  id: `sys_${n._id || n.id}`,
  _sysId: String(n._id || n.id),
  _isSys: true,
  title: n.title,
  body: n.body || '',
  time: formatRelativeTime(n.createdAt),
  unread: !n.isRead,
  tone: TYPE_TO_TONE[n.type] || 'info',
  toneLabel: 'Hệ thống',
  link: refToLink(n.refType, n.refId, role),
});
