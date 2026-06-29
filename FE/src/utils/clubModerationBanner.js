import { CLUB_MODERATION_REASONS } from '../constants/clubEventModeration';
import { MODERATION_ACTION_LABELS } from '../constants/eventModeration';

const resolveStatusKey = (event) => event?.statusKey || event?.status || '';

export const resolveModerationActionLabel = (event) => {
  const statusKey = resolveStatusKey(event);
  if (MODERATION_ACTION_LABELS[event?.moderationAction]) {
    return MODERATION_ACTION_LABELS[event.moderationAction];
  }
  if (statusKey === 'pending_icpdp_postpone' || statusKey === 'pending_postpone') {
    return 'Hoãn sự kiện';
  }
  if (statusKey === 'pending_icpdp_delete' || statusKey === 'pending_delete') {
    return 'Xóa sự kiện';
  }
  if (statusKey === 'pending_icpdp_edit' || statusKey === 'pending_edit') {
    return 'Chỉnh sửa sự kiện';
  }
  if (statusKey === 'pending_hide') {
    return 'Ẩn sự kiện';
  }
  if (statusKey === 'pending_icpdp_cancel' || statusKey === 'pending_cancel') {
    return 'Hủy sự kiện';
  }
  return 'thay đổi sự kiện';
};

export const resolveModerationCategoryLabel = (event) => {
  const categoryKey = event?.moderationReasonCategory;
  if (!categoryKey) return '';
  return CLUB_MODERATION_REASONS.find((item) => item.value === categoryKey)?.label || categoryKey;
};

export const resolveModerationReasonDetail = (event) => {
  const raw = String(event?.moderationReason || '').trim();
  if (!raw) return '';

  const categoryLabel = resolveModerationCategoryLabel(event);
  if (categoryLabel) {
    const prefix = `${categoryLabel}:`;
    if (raw.startsWith(prefix)) {
      return raw.slice(prefix.length).trim();
    }
    const dashPrefix = `${categoryLabel} —`;
    if (raw.startsWith(dashPrefix)) {
      return raw.slice(dashPrefix.length).trim();
    }
  }

  const colonIndex = raw.indexOf(':');
  if (colonIndex > 0 && colonIndex < raw.length - 1) {
    return raw.slice(colonIndex + 1).trim();
  }

  return raw;
};

const isTrivialDetail = (detail, actionLabel) => {
  if (!detail) return true;
  const normalized = detail.toLowerCase().trim();
  const actionNormalized = actionLabel.toLowerCase().trim();
  if (normalized === actionNormalized) return true;
  const shortActionWords = ['xóa', 'hủy', 'hoãn', 'ẩn', 'sửa'];
  return shortActionWords.includes(normalized);
};

export const buildClubModerationBannerCopy = (event) => {
  const actionLabel = resolveModerationActionLabel(event);
  const categoryLabel = resolveModerationCategoryLabel(event);
  const detail = resolveModerationReasonDetail(event);
  const showDetail = !isTrivialDetail(detail, actionLabel);

  return {
    actionLabel,
    summary: `CLB đã gửi yêu cầu ${actionLabel.toLowerCase()}.`,
    reasonLine: categoryLabel ? `Lý do: ${categoryLabel}` : '',
    detailLine: showDetail ? `Nội dung chi tiết: ${detail}` : '',
  };
};
