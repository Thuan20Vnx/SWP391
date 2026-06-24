import { DEFAULT_LEARNING_OUTCOME_ROWS, normalizeLearningOutcomesForSave } from './eventIntro';
import {
  DEFAULT_EVENT_TICKETS,
  deriveTicketPriceFromTypes,
  mapTicketTypesFromApi,
  normalizeFormTicketTypes,
  totalTicketQty,
  validateTicketTypesStep,
} from './eventTicketTypes';

export { validateTicketTypesStep };

export const VENUE_OPTIONS = [
  'Tầng 5 tòa Alpha',
  'Tầng 4 tòa Beta',
  'Sảnh tòa Beta',
  'Sảnh tòa Gamma',
];

export const EMPTY_EVENT_FORM = {
  title: '',
  category: '',
  description: '',
  maxSlots: 100,
  location: '',
  ticketTypes: DEFAULT_EVENT_TICKETS.map((t) => ({ ...t })),
  thumbnail: '',
  eventPlanFile: '',
  eventPlanFileName: '',
  eventPlanFileMime: '',
  eventPlanFileSizeLabel: '',
  regStartDate: '',
  regStartTime: '',
  regEndDate: '',
  regEndTime: '',
  eventStartDate: '',
  eventStartTime: '',
  eventEndDate: '',
  eventEndTime: '',
  speaker: '',
  agenda: '',
  learningOutcomes: [...DEFAULT_LEARNING_OUTCOME_ROWS],
};

const pad2 = (n) => String(n).padStart(2, '0');

export const splitDateTimeFields = (value) => {
  if (!value) return { date: '', time: '' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
};

export const buildDateTime = (date, time) => {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatScheduleLabel = (date, time) => (date && time ? `${time} · ${date}` : 'Chưa nhập');

export const mapApiEventToForm = (event, defaults = {}) => {
  const regStart = splitDateTimeFields(event?.registrationStartDate);
  const regEnd = splitDateTimeFields(event?.registrationEndDate);
  const evStart = splitDateTimeFields(event?.startDate);
  const evEnd = splitDateTimeFields(event?.endDate);
  const ticketPrice = Number(event?.ticketPrice) || 0;
  const capacity = event?.capacity || event?.totalTickets || defaults.maxSlots || 100;
  const ticketTypes = mapTicketTypesFromApi(event?.ticketTypes, capacity, ticketPrice);

  return {
    ...EMPTY_EVENT_FORM,
    title: event?.title || '',
    category: event?.category || '',
    description: event?.description || '',
    maxSlots: capacity,
    location: event?.location || defaults.location || EMPTY_EVENT_FORM.location,
    ticketTypes,
    thumbnail: event?.thumbnail || event?.image || '',
    eventPlanFile: event?.eventPlanFile || '',
    eventPlanFileName: event?.eventPlanFileName || '',
    eventPlanFileMime: event?.eventPlanFileMime || '',
    eventPlanFileSizeLabel: '',
    regStartDate: regStart.date,
    regStartTime: regStart.time,
    regEndDate: regEnd.date,
    regEndTime: regEnd.time,
    eventStartDate: evStart.date,
    eventStartTime: evStart.time,
    eventEndDate: evEnd.date,
    eventEndTime: evEnd.time,
    speaker: event?.speaker || event?.speakers?.[0]?.name || '',
    agenda: event?.agenda || '',
    learningOutcomes:
      Array.isArray(event?.learningOutcomes) && event.learningOutcomes.length
        ? event.learningOutcomes
        : [...DEFAULT_LEARNING_OUTCOME_ROWS],
  };
};

export const validateScheduleStep = (form) => {
  if (!form.regStartDate || !form.regStartTime) {
    return 'Vui lòng nhập ngày và giờ bắt đầu đăng ký.';
  }
  if (!form.eventStartDate || !form.eventStartTime) {
    return 'Vui lòng nhập ngày và giờ bắt đầu sự kiện.';
  }
  const regStartDt = buildDateTime(form.regStartDate, form.regStartTime);
  const regEndDt = buildDateTime(form.regEndDate, form.regEndTime);
  const eventStartDt = buildDateTime(form.eventStartDate, form.eventStartTime);
  const eventEndDt = buildDateTime(form.eventEndDate, form.eventEndTime);
  if (regEndDt && regEndDt <= regStartDt) {
    return 'Ngày kết thúc đăng ký phải sau ngày bắt đầu đăng ký.';
  }
  if (eventEndDt && eventEndDt <= eventStartDt) {
    return 'Ngày kết thúc sự kiện phải sau ngày bắt đầu sự kiện.';
  }
  if (regEndDt && eventStartDt && regEndDt > eventStartDt) {
    return 'Thời gian kết thúc đăng ký không thể sau khi sự kiện bắt đầu.';
  }
  return null;
};

export const buildCoreEventPayload = (form) => {
  const regStartDt = buildDateTime(form.regStartDate, form.regStartTime);
  const eventStartDt = buildDateTime(form.eventStartDate, form.eventStartTime);
  const regEndDt = buildDateTime(form.regEndDate, form.regEndTime);
  const eventEndDt = buildDateTime(form.eventEndDate, form.eventEndTime);
  const capacity = parseInt(form.maxSlots, 10) || 100;
  const ticketTypes = normalizeFormTicketTypes(form.ticketTypes);
  const totalTickets = totalTicketQty(ticketTypes) || capacity;
  const ticketPrice = deriveTicketPriceFromTypes(ticketTypes);

  return {
    title: form.title?.trim(),
    description: form.description?.trim() || 'Chưa có mô tả',
    category: form.category || 'Workshop',
    thumbnail: form.thumbnail,
    image: form.thumbnail,
    speaker: form.speaker || '',
    agenda: form.agenda || '',
    learningOutcomes: normalizeLearningOutcomesForSave(form.learningOutcomes),
    location: form.location,
    capacity,
    totalTickets,
    registrationStartDate: regStartDt?.toISOString(),
    registrationEndDate: regEndDt ? regEndDt.toISOString() : undefined,
    startDate: eventStartDt?.toISOString(),
    endDate: eventEndDt ? eventEndDt.toISOString() : undefined,
    ticketPrice,
    expectedAttendees: totalTickets || capacity,
    speakers: form.speaker
      ? [{ name: form.speaker, role: '', avatar: '' }]
      : [],
    ticketTypes,
    eventType: 'Hội thảo & Workshop',
    duration: '',
    format: 'campus',
  };
};

export const EVENT_FORM_ROLE_CONFIG = {
  club: {
    titleCreate: 'TẠO ĐỀ XUẤT SỰ KIỆN MỚI',
    requireEventPlan: true,
    titleEdit: 'CHỈNH SỬA ĐỀ XUẤT SỰ KIỆN',
    subtitleCreate: 'Vui lòng điền đầy đủ thông tin để gửi xét duyệt tới Ban cán bộ IC-PDP.',
    subtitleEdit: 'Cập nhật thông tin và gửi lại xét duyệt tới Ban cán bộ IC-PDP.',
    confirmNote: 'Sự kiện sẽ được gửi tới Ban cán bộ IC-PDP. Thời gian duyệt 1-3 ngày làm việc.',
    locationMode: 'text',
    defaultLocation: '',
    submitCreate: 'Gửi duyệt',
    submitEdit: 'Gửi duyệt',
  },
  ctsv: {
    titleCreate: 'TẠO ĐỀ XUẤT SỰ KIỆN CẤP TRƯỜNG',
    titleEdit: 'CHỈNH SỬA SỰ KIỆN CẤP TRƯỜNG',
    subtitleCreate: 'Gửi đơn tổ chức sự kiện tới Admin phê duyệt.',
    subtitleEdit: 'Cập nhật và gửi lại Admin phê duyệt.',
    confirmNote: 'Sự kiện sẽ được gửi tới Admin. Thời gian duyệt 1-3 ngày làm việc.',
    locationMode: 'text',
    defaultLocation: '',
    submitCreate: 'Gửi đơn tổ chức',
    submitEdit: 'Gửi lại Admin',
  },
  icpdp: {
    titleCreate: 'TẠO ĐỀ XUẤT SỰ KIỆN IC-PDP',
    titleEdit: 'CHỈNH SỬA SỰ KIỆN IC-PDP',
    subtitleCreate: 'Gửi đơn tổ chức sự kiện tới Admin phê duyệt.',
    subtitleEdit: 'Cập nhật và gửi lại Admin phê duyệt.',
    confirmNote: 'Sự kiện sẽ được gửi tới Admin. Thời gian duyệt 1-3 ngày làm việc.',
    locationMode: 'text',
    defaultLocation: '',
    submitCreate: 'Gửi đơn tổ chức',
    submitEdit: 'Gửi lại Admin',
  },
  partner: {
    titleCreate: 'THÔNG TIN SỰ KIỆN ĐỀ XUẤT',
    titleEdit: 'CẬP NHẬT THÔNG TIN SỰ KIỆN',
    subtitleCreate: 'Điền thông tin sự kiện đồng bộ với form CLB/CTSV.',
    subtitleEdit: 'Cập nhật thông tin sự kiện trong hồ sơ đối tác.',
    confirmNote: 'Thông tin sự kiện sẽ được gửi cùng hồ sơ đối tác tới CTSV xét duyệt.',
    locationMode: 'text',
    defaultLocation: '',
    submitCreate: 'Gửi yêu cầu',
    submitEdit: 'Cập nhật',
  },
};
