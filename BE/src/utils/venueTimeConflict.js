const AppError = require('./AppError');
const { normalizeEventVenue } = require('./eventVenueNormalize');

// Trạng thái Event coi như KHÔNG còn giữ chỗ (đã hủy/từ chối) → bỏ qua khi đối chiếu.
const IGNORED_EVENT_STATUSES = ['rejected', 'cancelled'];

const toTime = (value) => {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
};

/**
 * Tìm sự kiện đầu tiên trùng địa điểm + khung giờ giao nhau.
 * Đối chiếu cả Event thật lẫn đơn đối tác đang chờ duyệt (chưa thành Event).
 * @returns {Promise<{type:'event'|'request', title:string, location:string}|null>}
 */
const findVenueTimeConflict = async ({
  location,
  startDate,
  endDate,
  excludeEventId,
  excludeRequestId,
}) => {
  const { canonicalVenue } = normalizeEventVenue(location);
  const start = toTime(startDate);
  if (!canonicalVenue || start == null) return null;
  const rawEnd = toTime(endDate);
  const end = rawEnd == null ? start : Math.max(rawEnd, start);

  const overlaps = (otherStart, otherEnd) => {
    if (otherStart == null) return false;
    const oEnd = otherEnd == null ? otherStart : Math.max(otherEnd, otherStart);
    // Giao nhau khi: bắt đầu-này < kết thúc-kia && bắt đầu-kia < kết thúc-này.
    return start < oEnd && otherStart < end;
  };

  // 1) Sự kiện thật (mọi nguồn: trường/CLB/đối tác) chưa xóa, chưa hủy/từ chối.
  const Event = require('../models/Event');
  const events = await Event.find({
    isDeleted: { $ne: true },
    status: { $nin: IGNORED_EVENT_STATUSES },
    startDate: { $lte: new Date(end) },
  })
    .select('title location startDate endDate')
    .limit(1000)
    .lean();
  for (const ev of events) {
    if (excludeEventId && String(ev._id) === String(excludeEventId)) continue;
    if (normalizeEventVenue(ev.location).canonicalVenue !== canonicalVenue) continue;
    if (overlaps(toTime(ev.startDate), toTime(ev.endDate))) {
      return { type: 'event', title: ev.title, location: ev.location };
    }
  }

  // 2) Đơn đối tác đang chờ duyệt (chưa materialize thành Event).
  const PartnerEventRequest = require('../models/PartnerEventRequest');
  const pendings = await PartnerEventRequest.find({
    status: { $in: ['pending', 'info_requested'] },
    eventId: null,
  })
    .select('title location startDate endDate')
    .limit(1000)
    .lean();
  for (const r of pendings) {
    if (excludeRequestId && String(r._id) === String(excludeRequestId)) continue;
    if (normalizeEventVenue(r.location).canonicalVenue !== canonicalVenue) continue;
    if (overlaps(toTime(r.startDate), toTime(r.endDate))) {
      return { type: 'request', title: r.title, location: r.location };
    }
  }

  return null;
};

// Ném lỗi 409 nếu trùng địa điểm + khung giờ.
const assertNoVenueTimeConflict = async (args) => {
  const hit = await findVenueTimeConflict(args);
  if (!hit) return;
  const suffix = hit.type === 'request' ? 'đang chờ duyệt ' : '';
  throw new AppError(
    `Địa điểm "${hit.location}" đã có sự kiện "${hit.title}" ${suffix}trùng khung giờ. Vui lòng chọn thời gian hoặc địa điểm khác.`,
    409
  );
};

module.exports = {
  findVenueTimeConflict,
  assertNoVenueTimeConflict,
};
