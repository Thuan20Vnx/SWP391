export const hasMeaningfulClubChangeReason = (reason) => {
  const text = String(reason || '').trim();
  if (!text) return false;
  if (text === '.' || text === '—' || text === '-') return false;
  return true;
};

const TIMELINE_OWNER_COPY = {
  club: { reasonLong: 'Lý do CLB gửi', reasonShort: 'Lý do CLB', requestor: 'CLB' },
  icpdp: { reasonLong: 'Lý do IC-PDP gửi', reasonShort: 'Lý do IC-PDP', requestor: 'IC-PDP' },
  ctsv: { reasonLong: 'Lý do CTSV gửi', reasonShort: 'Lý do CTSV', requestor: 'CTSV' },
};

export const getTimelineOwnerCopy = (ownerType = 'club') =>
  TIMELINE_OWNER_COPY[ownerType] || TIMELINE_OWNER_COPY.club;

export const getChangeRequestTypeLabel = (changeRequest) => {
  if (!changeRequest?.type || changeRequest.type === 'none') return '';
  if (changeRequest.statusKey === 'rejected') {
    if (changeRequest.type === 'cancel') return 'Đã từng bị hủy đơn timeline';
    if (changeRequest.type === 'delete') return 'Đã từng bị yêu cầu xóa timeline';
  }
  return changeRequest.typeLabel || '';
};

export const isScheduledTimelineDelete = (timeline) =>
  timeline?.changeRequest?.statusKey === 'scheduled_delete';

export const shouldShowTimelineChangeBanner = (timeline) => {
  const cr = timeline?.changeRequest;
  if (!cr || cr.statusKey === 'none' || !cr.type || cr.type === 'none') return false;

  const statusKey = timeline?.statusKey;
  if (['revision', 'rejected', 'pending_icpdp', 'pending_admin', 'draft'].includes(statusKey)) {
    return false;
  }

  if (statusKey === 'approved' || statusKey === 'cancelled') return true;
  return ['pending_icpdp', 'pending_admin', 'rejected', 'scheduled_delete'].includes(cr.statusKey);
};

export const buildTimelineChangeBannerCopy = (changeRequest) => {
  const clubReason = hasMeaningfulClubChangeReason(changeRequest?.reason)
    ? String(changeRequest.reason).trim()
    : '';
  const icpdpNote = String(changeRequest?.icpdpNote || '').trim();
  const adminNote = String(changeRequest?.adminNote || '').trim();
  const scheduledDeleteAt = changeRequest?.scheduledDeleteAt || null;

  let scheduledDeleteLine = '';
  if (changeRequest?.statusKey === 'scheduled_delete' && scheduledDeleteAt) {
    const at = new Date(scheduledDeleteAt);
    if (!Number.isNaN(at.getTime())) {
      scheduledDeleteLine = `Timeline sẽ bị xóa lúc ${at.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })}. Bạn có thể hủy yêu cầu xóa trong 1 giờ.`;
    }
  }

  return {
    clubReason,
    icpdpNote,
    adminNote,
    scheduledDeleteLine,
  };
};

export const buildTimelineReviewFeedback = (timeline) => {
  const statusKey = timeline?.statusKey;
  const icpdpNote = String(timeline?.icpdpNote || '').trim();
  const rejectionReason = String(timeline?.rejectionReason || '').trim();

  if (statusKey === 'approved' && timeline?.editRejected) {
    const note = String(timeline?.ctsvNote || timeline?.icpdpNote || '').trim();
    return {
      title: 'Bản chỉnh sửa đã bị từ chối',
      body: note
        ? `Timeline vẫn giữ nguyên nội dung đã duyệt trước đó (không áp dụng thay đổi). Lý do: ${note}`
        : 'Timeline vẫn giữ nguyên nội dung đã duyệt trước đó (không áp dụng thay đổi).',
      tone: 'rejected',
    };
  }

  if (statusKey === 'revision' && icpdpNote) {
    return {
      title: 'IC-PDP yêu cầu chỉnh sửa timeline',
      body: `Ghi chú: ${icpdpNote}`,
      tone: 'revision',
    };
  }

  if (statusKey === 'rejected' && rejectionReason) {
    return {
      title: 'Timeline bị từ chối',
      body: `Lý do: ${rejectionReason}`,
      tone: 'rejected',
    };
  }

  if (statusKey === 'pending_admin' && icpdpNote) {
    return {
      title: 'IC-PDP đã chuyển Admin duyệt',
      body: `Ghi chú IC-PDP: ${icpdpNote}`,
      tone: 'pending',
    };
  }

  return null;
};
