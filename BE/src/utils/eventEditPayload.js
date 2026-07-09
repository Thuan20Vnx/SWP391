/**
 * Code First — payload chỉnh sửa sự kiện CLB giữ chờ (pending edit).
 * CLB gửi form sửa trước, nội dung lưu tạm ở event.pendingEdit và chỉ được
 * áp dụng lên sự kiện thật khi Admin duyệt (IC-PDP → Admin).
 *
 * Các giá trị lưu vào payload đã được chuẩn hoá tại thời điểm gửi, nên khi
 * áp dụng chỉ cần gán lại theo đúng guard "chỉ ghi khi có giá trị".
 */

/** Danh sách field CLB được chỉnh sửa qua form. */
const EDITABLE_FIELDS = [
  'title',
  'description',
  'thumbnail',
  'bannerFileName',
  'eventPlanFile',
  'eventPlanFileName',
  'eventPlanFileMime',
  'eventPlanLink',
  'category',
  'registrationStartDate',
  'registrationEndDate',
  'startDate',
  'endDate',
  'location',
  'capacity',
  'totalTickets',
  'ticketPrice',
  'ticketTypes',
  'speaker',
  'agenda',
  'learningOutcomes',
  'timelineSource',
];

/** Gom các giá trị (đã chuẩn hoá) thành payload chỉ chứa field hợp lệ. */
const buildEditPayload = (fields = {}) => {
  const payload = {};
  EDITABLE_FIELDS.forEach((key) => {
    if (fields[key] !== undefined) payload[key] = fields[key];
  });
  return payload;
};

/** Áp dụng payload đã duyệt lên document sự kiện (không tự save). */
const applyEditPayload = (event, payload) => {
  if (!event || !payload || typeof payload !== 'object') return;

  if (payload.title?.trim()) event.title = payload.title.trim();
  if (payload.description !== undefined) {
    event.description = payload.description || 'Chưa có mô tả';
  }
  if (payload.thumbnail) event.thumbnail = payload.thumbnail;
  if (payload.bannerFileName !== undefined) {
    event.bannerFileName = String(payload.bannerFileName || '').trim();
  }
  if (payload.eventPlanFile) {
    event.eventPlanFile = payload.eventPlanFile;
    event.eventPlanFileName =
      String(payload.eventPlanFileName || '').trim() || event.eventPlanFileName || '';
    event.eventPlanFileMime =
      String(payload.eventPlanFileMime || '').trim() || event.eventPlanFileMime || '';
  }
  if (payload.eventPlanLink !== undefined) {
    event.eventPlanLink = String(payload.eventPlanLink || '').trim();
  }
  if (payload.category) event.category = payload.category;
  if (payload.registrationStartDate !== undefined) {
    event.registrationStartDate = payload.registrationStartDate || null;
  }
  if (payload.registrationEndDate !== undefined) {
    event.registrationEndDate = payload.registrationEndDate || null;
  }
  if (payload.startDate) event.startDate = payload.startDate;
  if (payload.endDate !== undefined) event.endDate = payload.endDate;
  if (payload.location?.trim()) event.location = payload.location.trim();
  if (payload.capacity != null) event.capacity = payload.capacity;
  if (payload.totalTickets != null) event.totalTickets = payload.totalTickets;
  if (payload.ticketPrice != null) event.ticketPrice = payload.ticketPrice;
  if (Array.isArray(payload.ticketTypes) && payload.ticketTypes.length) {
    event.ticketTypes = payload.ticketTypes;
  }
  if (payload.speaker !== undefined) event.speaker = payload.speaker;
  if (payload.agenda !== undefined) event.agenda = payload.agenda;
  if (payload.learningOutcomes !== undefined) {
    event.learningOutcomes = payload.learningOutcomes;
  }
  if (payload.timelineSource) event.timelineSource = payload.timelineSource;
};

module.exports = { EDITABLE_FIELDS, buildEditPayload, applyEditPayload };
