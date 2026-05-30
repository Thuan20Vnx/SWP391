const Event = require('../models/Event');
const AppError = require('../utils/AppError');
const {
  MODERATION_ACTIONS,
  MODERATION_STATUS_BY_ACTION,
  canCtsvRequestModeration,
  isModerationPendingStatus,
  getModerationActionFromStatus
} = require('../constants/eventModeration');

const applyWeatherPostpone = (event, reason, authEmail) => {
  event.eventState = 'postponed';
  event.postponeReason = reason;
  event.postponeIsWeather = true;
  event.moderationReason = '';
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

  event.statusBeforeModeration = event.status;
  event.status = MODERATION_STATUS_BY_ACTION[action];
  event.moderationReason = trimmedReason;
  event.moderationRequestedByEmail = authEmail || '';
  event.moderationRequestedAt = new Date();
  event.postponeIsWeather = false;
  event.ctsvEditUnlocked = false;

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
    event.ctsvEditUnlocked = true;
  }

  event.statusBeforeModeration = '';
  event.moderationReason = '';
  event.moderationRequestedByEmail = '';
  event.moderationRequestedAt = null;
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
  event.moderationRequestedByEmail = '';
  event.moderationRequestedAt = null;
  event.rejectionReason = trimmedReason;
  event.adminApprovedByEmail = authEmail || '';

  if (action === 'postpone') {
    event.postponeReason = '';
    event.eventState = 'active';
  }
  if (action === 'edit') {
    event.ctsvEditUnlocked = false;
  }

  await event.save();
  return { message: 'Đã từ chối yêu cầu điều phối.', event };
};

module.exports = {
  requestModeration,
  approveModeration,
  rejectModeration
};
