const Event = require('../models/Event');
const EventProposal = require('../models/EventProposal');
const AppError = require('../utils/AppError');
const { applyEditPayload } = require('../utils/eventEditPayload');
const {
  MODERATION_ACTIONS,
  CLUB_MODERATION_ACTIONS,
  MODERATION_STATUS_BY_ACTION,
  ICPDP_MODERATION_STATUS_BY_ACTION,
  canCtsvRequestModeration,
  canClubRequestModeration,
  canClubCancelPending,
  canClubUnhide,
  isModerationPendingStatus,
  isIcpdpModerationPendingStatus,
  getModerationActionFromStatus,
  buildClubModerationReason,
  canClubRequestDeleteModeration,
} = require('../constants/eventModeration');

/**
 * Ghi nhận trạng thái gốc trước khi vào hàng đợi điều phối. Nếu event đã đang ở
 * một trạng thái chờ (vd. yêu cầu sửa) và một yêu cầu khác (vd. xóa) đè lên, GIỮ
 * NGUYÊN statusBeforeModeration cũ — nó đã đúng là trạng thái gốc thật sự, ghi đè
 * lại sẽ làm mất trạng thái gốc (vd. 'approved' bị ghi thành 'pending_icpdp_edit').
 */
const captureStatusBeforeModeration = (event) => {
  if (isModerationPendingStatus(event.status) || isIcpdpModerationPendingStatus(event.status)) {
    return;
  }
  event.statusBeforeModeration = event.status;
};

const applyWeatherPostpone = (event, reason, authEmail) => {
  event.eventState = 'postponed';
  event.postponeReason = reason;
  event.postponeIsWeather = true;
  event.moderationReason = '';
  event.moderationReasonCategory = '';
  event.moderationRequestedByEmail = authEmail || '';
  event.moderationRequestedAt = new Date();
};

const requestModeration = async (eventId, { action, reason, isWeatherPostpone }, authEmail) => {
  if (!MODERATION_ACTIONS.includes(action)) {
    throw new AppError('Hành động không hợp lệ.', 400);
  }

  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) {
    throw new AppError('Vui lòng nhập lý do.', 400);
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }
  if (event.source !== 'school') {
    throw new AppError('Chỉ áp dụng cho sự kiện cấp trường.', 400);
  }
  if (!canCtsvRequestModeration(event)) {
    throw new AppError('Sự kiện không thể gửi yêu cầu quản lý ở trạng thái hiện tại.', 400);
  }

  if (action === 'postpone' && isWeatherPostpone === true) {
    applyWeatherPostpone(event, trimmedReason, authEmail);
    await event.save();
    return {
      message: 'Đã hoãn sự kiện do thời tiết (không cần Admin duyệt).',
      event
    };
  }

  captureStatusBeforeModeration(event);
  event.status = MODERATION_STATUS_BY_ACTION[action];
  event.moderationReason = trimmedReason;
  event.moderationReasonCategory = '';
  event.moderationRequestedByEmail = authEmail || '';
  event.moderationRequestedAt = new Date();
  event.postponeIsWeather = false;
  event.ctsvEditUnlocked = false;
  event.rejectionReason = '';
  event.lastModerationAction = '';
  event.lastModerationRejectedBy = '';

  if (action === 'postpone') {
    event.postponeReason = trimmedReason;
  }

  await event.save();

  const actionLabels = { cancel: 'hủy', hide: 'ẩn', postpone: 'hoãn', edit: 'chỉnh sửa' };
  return {
    message: `Đã gửi yêu cầu ${actionLabels[action]} — chờ Admin phê duyệt.`,
    event
  };
};

const requestClubModeration = async (
  eventId,
  { action, reasonCategory, content },
  authEmail,
  userId
) => {
  const allowedActions = [...CLUB_MODERATION_ACTIONS, 'hide', 'unhide'];
  if (!allowedActions.includes(action)) {
    throw new AppError('Hành động không hợp lệ.', 400);
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }
  if (event.source !== 'club') {
    throw new AppError('Chỉ áp dụng cho sự kiện CLB.', 400);
  }
  if (userId && String(event.createdBy) !== String(userId)) {
    throw new AppError('Bạn không có quyền quản lý sự kiện này.', 403);
  }

  if (action === 'unhide') {
    if (!canClubUnhide(event)) {
      throw new AppError('Sự kiện không ở trạng thái ẩn.', 400);
    }
    event.status = event.statusBeforeModeration || 'approved';
    event.statusBeforeModeration = '';
    event.isHidden = false;
    event.moderationReason = '';
    event.moderationReasonCategory = '';
    event.moderationRequestedByEmail = '';
    event.moderationRequestedAt = null;
    await event.save();
    return {
      message: 'Đã hiện sự kiện (không cần Admin duyệt).',
      event,
    };
  }

  const trimmedContent = String(content || '').trim();
  if (!trimmedContent) {
    throw new AppError('Vui lòng nhập nội dung chi tiết.', 400);
  }
  if (!reasonCategory) {
    throw new AppError('Vui lòng chọn lý do.', 400);
  }

  const fullReason = buildClubModerationReason(reasonCategory, trimmedContent);

  if (action === 'cancel' && canClubCancelPending(event)) {
    event.status = 'cancelled';
    event.eventState = 'expired';
    event.moderationReason = fullReason;
    event.moderationReasonCategory = reasonCategory;
    event.moderationRequestedByEmail = authEmail || '';
    event.moderationRequestedAt = new Date();
    await event.save();
    return {
      message: 'Đã hủy đề xuất sự kiện (không cần Admin duyệt).',
      event,
    };
  }

  if (action === 'hide') {
    if (!canClubRequestModeration(event)) {
      throw new AppError('Sự kiện không thể gửi yêu cầu ẩn ở trạng thái hiện tại.', 400);
    }
    captureStatusBeforeModeration(event);
    event.pendingEdit = null;
    event.rejectionReason = '';
    event.lastModerationAction = '';
    event.lastModerationRejectedBy = '';
    event.status = MODERATION_STATUS_BY_ACTION.hide;
    event.moderationReason = fullReason;
    event.moderationReasonCategory = reasonCategory;
    event.moderationRequestedByEmail = authEmail || '';
    event.moderationRequestedAt = new Date();
    await event.save();
    return {
      message: 'Đã gửi yêu cầu ẩn — chờ Admin phê duyệt.',
      event,
    };
  }

  if (action === 'delete' || action === 'edit') {
    const canSubmit =
      action === 'edit'
        ? canClubRequestModeration(event)
        : canClubRequestDeleteModeration(event);
    if (!canSubmit) {
      throw new AppError(
        `Sự kiện không thể gửi yêu cầu ${action === 'delete' ? 'xóa' : 'chỉnh sửa'} ở trạng thái hiện tại.`,
        400
      );
    }
    captureStatusBeforeModeration(event);
    // Yêu cầu xóa đè lên yêu cầu sửa trước đó (nếu có) -> bỏ qua nội dung sửa đang chờ.
    if (action !== 'edit') {
      event.pendingEdit = null;
    }
    event.rejectionReason = '';
    event.lastModerationAction = '';
    event.lastModerationRejectedBy = '';
    event.status = ICPDP_MODERATION_STATUS_BY_ACTION[action];
    event.moderationReason = fullReason;
    event.moderationReasonCategory = reasonCategory;
    event.moderationRequestedByEmail = authEmail || '';
    event.moderationRequestedAt = new Date();
    event.clubEditUnlocked = false;
    event.icpdpNote = '';
    await event.save();
    const actionLabels = { delete: 'xóa', edit: 'chỉnh sửa' };
    return {
      message: `Đã gửi yêu cầu ${actionLabels[action]} — chờ IC-PDP phê duyệt.`,
      event,
    };
  }

  if (!CLUB_MODERATION_ACTIONS.includes(action)) {
    throw new AppError('Hành động không hợp lệ. Chọn hoãn hoặc hủy sự kiện.', 400);
  }
  if (!canClubRequestModeration(event)) {
    throw new AppError('Sự kiện không thể gửi yêu cầu hoãn/hủy ở trạng thái hiện tại.', 400);
  }

  const isWeatherPostpone = action === 'postpone' && reasonCategory === 'weather';

  if (isWeatherPostpone) {
    applyWeatherPostpone(event, fullReason, authEmail);
    event.moderationReasonCategory = reasonCategory;
    await event.save();
    return {
      message: 'Đã hoãn sự kiện do thời tiết (không cần duyệt).',
      event
    };
  }

  captureStatusBeforeModeration(event);
  event.pendingEdit = null;
  event.rejectionReason = '';
  event.lastModerationAction = '';
  event.lastModerationRejectedBy = '';
  event.status = ICPDP_MODERATION_STATUS_BY_ACTION[action];
  event.moderationReason = fullReason;
  event.moderationReasonCategory = reasonCategory;
  event.moderationRequestedByEmail = authEmail || '';
  event.moderationRequestedAt = new Date();
  event.postponeIsWeather = false;
  event.icpdpNote = '';

  if (action === 'postpone') {
    event.postponeReason = fullReason;
  }

  await event.save();

  const actionLabels = { cancel: 'hủy', postpone: 'hoãn' };
  return {
    message: `Đã gửi yêu cầu ${actionLabels[action]} — chờ IC-PDP phê duyệt.`,
    event
  };
};

const approveIcpdpModeration = async (eventId, note, authEmail) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }
  if (event.source !== 'club') {
    throw new AppError('Chỉ áp dụng cho sự kiện CLB.', 400);
  }
  if (!isIcpdpModerationPendingStatus(event.status)) {
    throw new AppError('Sự kiện không có yêu cầu chờ IC-PDP.', 400);
  }

  const action = getModerationActionFromStatus(event.status);
  event.status = MODERATION_STATUS_BY_ACTION[action];
  event.icpdpNote = String(note || '').trim();
  event.moderationRequestedAt = new Date();

  await event.save();
  return {
    message: 'IC-PDP đã duyệt — yêu cầu chuyển sang Admin phê duyệt.',
    event
  };
};

const rejectIcpdpModeration = async (eventId, reason, authEmail) => {
  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) {
    throw new AppError('Vui lòng nhập lý do từ chối.', 400);
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }
  if (!isIcpdpModerationPendingStatus(event.status)) {
    throw new AppError('Sự kiện không có yêu cầu chờ IC-PDP.', 400);
  }

  const action = getModerationActionFromStatus(event.status);
  event.status = event.statusBeforeModeration || 'approved';
  event.statusBeforeModeration = '';
  event.rejectionReason = trimmedReason;
  event.icpdpNote = trimmedReason;
  event.moderationReason = '';
  event.moderationReasonCategory = '';
  event.moderationRequestedByEmail = '';
  event.moderationRequestedAt = null;
  // Lưu lại yêu cầu nào vừa bị từ chối để UI hiển thị rõ (không chỉ là "Đã duyệt").
  event.lastModerationAction = action || '';
  event.lastModerationRejectedBy = 'icpdp';

  if (action === 'postpone') {
    event.postponeReason = '';
    event.eventState = 'active';
  }
  if (action === 'edit') {
    event.clubEditUnlocked = false;
    event.ctsvEditUnlocked = false;
    event.pendingEdit = null;
  }

  await event.save();
  return { message: 'IC-PDP đã từ chối yêu cầu.', event };
};

const approveModeration = async (eventId, authEmail) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }
  if (!isModerationPendingStatus(event.status)) {
    throw new AppError('Sự kiện không có yêu cầu chờ Admin.', 400);
  }

  const action = getModerationActionFromStatus(event.status);
  const previous = event.statusBeforeModeration || 'approved';

  if (action === 'cancel') {
    event.status = 'cancelled';
    event.eventState = 'expired';
  } else if (action === 'hide') {
    event.status = 'hidden';
    event.isHidden = true;
  } else if (action === 'postpone') {
    event.status = previous;
    event.eventState = 'postponed';
    event.postponeIsWeather = false;
  } else if (action === 'edit') {
    event.status = previous;
    if (event.source === 'club' && event.pendingEdit?.payload) {
      // CLB đã gửi form sửa trước — áp dụng nội dung giữ chờ khi Admin duyệt.
      applyEditPayload(event, event.pendingEdit.payload);
      event.pendingEdit = null;
      event.clubEditUnlocked = false;
    } else if (event.source === 'club') {
      event.clubEditUnlocked = true;
    } else {
      event.ctsvEditUnlocked = true;
    }
  } else if (action === 'delete') {
    const proposalId = event.proposalId;
    await Event.findByIdAndDelete(eventId);
    if (proposalId) {
      await EventProposal.findByIdAndDelete(proposalId);
    }
    return { message: 'Đã phê duyệt xóa sự kiện CLB.', event: null };
  }

  event.statusBeforeModeration = '';
  event.moderationReason = '';
  event.moderationReasonCategory = '';
  event.moderationRequestedByEmail = '';
  event.moderationRequestedAt = null;
  event.rejectionReason = '';
  event.lastModerationAction = '';
  event.lastModerationRejectedBy = '';
  event.adminApprovedByEmail = authEmail || event.adminApprovedByEmail;
  event.adminApprovedAt = new Date();

  await event.save();
  return { message: 'Đã phê duyệt yêu cầu điều phối sự kiện.', event };
};

const rejectModeration = async (eventId, reason, authEmail) => {
  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) {
    throw new AppError('Vui lòng nhập lý do từ chối.', 400);
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }
  if (!isModerationPendingStatus(event.status)) {
    throw new AppError('Sự kiện không có yêu cầu chờ Admin.', 400);
  }

  const action = getModerationActionFromStatus(event.status);
  event.status = event.statusBeforeModeration || 'approved';
  event.statusBeforeModeration = '';
  event.moderationReason = '';
  event.moderationReasonCategory = '';
  event.moderationRequestedByEmail = '';
  event.moderationRequestedAt = null;
  event.rejectionReason = trimmedReason;
  event.adminApprovedByEmail = authEmail || '';
  // Lưu lại yêu cầu nào vừa bị từ chối để UI hiển thị rõ (không chỉ là "Đã duyệt").
  event.lastModerationAction = action || '';
  event.lastModerationRejectedBy = 'admin';

  if (action === 'postpone') {
    event.postponeReason = '';
    event.eventState = 'active';
  }
  if (action === 'edit') {
    event.clubEditUnlocked = false;
    event.ctsvEditUnlocked = false;
    event.pendingEdit = null;
  }

  await event.save();
  return { message: 'Đã từ chối yêu cầu điều phối.', event };
};

/** CLB tự hủy yêu cầu điều phối (sửa/xóa/hủy/hoãn/ẩn) đang chờ IC-PDP hoặc Admin. */
const cancelClubModeration = async (eventId, userId) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }
  if (event.source !== 'club') {
    throw new AppError('Chỉ áp dụng cho sự kiện CLB.', 400);
  }
  if (userId && String(event.createdBy) !== String(userId)) {
    throw new AppError('Bạn không có quyền quản lý sự kiện này.', 403);
  }
  if (!isModerationPendingStatus(event.status) && !isIcpdpModerationPendingStatus(event.status)) {
    throw new AppError('Sự kiện không có yêu cầu điều phối đang chờ.', 400);
  }

  const action = getModerationActionFromStatus(event.status);
  event.status = event.statusBeforeModeration || 'approved';
  event.statusBeforeModeration = '';
  event.moderationReason = '';
  event.moderationReasonCategory = '';
  event.moderationRequestedByEmail = '';
  event.moderationRequestedAt = null;
  event.icpdpNote = '';
  event.rejectionReason = '';
  event.lastModerationAction = '';
  event.lastModerationRejectedBy = '';

  if (action === 'postpone') {
    event.postponeReason = '';
    event.eventState = 'active';
  }
  if (action === 'edit') {
    event.clubEditUnlocked = false;
    event.pendingEdit = null;
  }

  await event.save();
  const actionLabels = { cancel: 'hủy', hide: 'ẩn', postpone: 'hoãn', edit: 'chỉnh sửa', delete: 'xóa' };
  return {
    message: `Đã hủy yêu cầu ${actionLabels[action] || 'điều phối'}.`,
    event,
  };
};

module.exports = {
  requestModeration,
  requestClubModeration,
  cancelClubModeration,
  approveIcpdpModeration,
  rejectIcpdpModeration,
  approveModeration,
  rejectModeration
};
