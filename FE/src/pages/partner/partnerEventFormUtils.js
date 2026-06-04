import { createEmptySpeakerRow } from '../../constants/eventSpeaker';
import {
  DEFAULT_LEARNING_OUTCOME_ROWS,
  learningOutcomesToFormRows,
} from '../../utils/eventIntro';

export const TICKET_AUDIENCE_OPTIONS = ['SV FPT', 'Khách ngoài trường', 'Tất cả'];
export const BANNER_MAX_BYTES = 5 * 1024 * 1024;
export const BANNER_ACCEPT = 'image/jpeg,image/png,image/webp';
export const ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;

export const EVENT_TYPES = [
  'Hội thảo & Workshop',
  'Âm nhạc & Giải trí',
  'Thể thao',
  'Kết nối doanh nghiệp',
  'Khác'
];

export const TICKET_CAP_EXTRA = 10;

export const DEFAULT_TICKETS = [
  { id: 1, name: 'Vé sinh viên', priceType: 'free', priceAmount: '', qty: 50, audience: 'SV FPT' },
  { id: 2, name: 'Vé khách mời', priceType: 'free', priceAmount: '', qty: 10, audience: 'Khách ngoài trường' }
];

export const EMPTY_COMPANY = {
  companyName: '',
  partnerCode: '',
  representative: '',
  representativeTitle: '',
  phone: '',
  address: '',
  expectedSponsorAmount: ''
};

export const EMPTY_EVENT_FORM = {
  title: '',
  eventType: 'Hội thảo & Workshop',
  category: 'Công nghệ',
  description: '',
  eventDate: '',
  startTime: '14:00',
  duration: '3 tiếng',
  format: 'campus',
  location: '',
  campus: 'FPT University',
  expectedAttendees: '',
  agenda: '',
  image: '',
  learningOutcomes: [...DEFAULT_LEARNING_OUTCOME_ROWS],
};

export const parseExpectedAttendees = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
};

export const getMaxTicketTotal = (expectedAttendees) => {
  const parsed = parseExpectedAttendees(expectedAttendees);
  if (parsed == null) return TICKET_CAP_EXTRA;
  return parsed + TICKET_CAP_EXTRA;
};

export const clampTicketRows = (rows, maxTotal) => {
  let used = 0;
  return rows.map((row) => {
    const requested = Math.max(0, Number(row.qty) || 0);
    const allowed = Math.max(0, maxTotal - used);
    const qty = Math.min(requested, allowed);
    used += qty;
    return { ...row, qty };
  });
};

export const buildDateTime = (dateStr, timeStr) => {
  if (!dateStr) return '';
  return `${dateStr}T${timeStr || '09:00'}`;
};

export const toInputDate = (value) => {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const toInputTime = (value) => {
  if (!value) return '14:00';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '14:00';
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

export const mapRequestToState = (req) => ({
  company: {
    companyName: req.companyName || '',
    partnerCode: req.partnerCode || '',
    representative: req.representative || '',
    representativeTitle: req.representativeTitle || '',
    phone: req.phone || '',
    address: req.address || '',
    expectedSponsorAmount: String(req.expectedSponsorAmount || '')
  },
  form: {
    ...EMPTY_EVENT_FORM,
    title: req.title || '',
    eventType: req.eventType || EMPTY_EVENT_FORM.eventType,
    category: req.category || EMPTY_EVENT_FORM.category,
    description: req.description || '',
    eventDate: toInputDate(req.startDate),
    startTime: toInputTime(req.startDate),
    duration: req.duration || EMPTY_EVENT_FORM.duration,
    format: req.format || 'campus',
    location: req.location || '',
    campus: req.campus || 'FPT University',
    expectedAttendees: req.expectedAttendees ? String(req.expectedAttendees) : '',
    agenda: req.agenda || '',
    image: req.image || '',
    learningOutcomes: learningOutcomesToFormRows(req),
  },
  tickets:
    req.ticketTypes?.length > 0
      ? req.ticketTypes.map((t, i) => ({
          id: i + 1,
          name: t.name || '',
          priceType: t.priceType === 'paid' ? 'paid' : 'free',
          priceAmount: t.priceAmount ? String(t.priceAmount) : '',
          qty: Number(t.qty ?? t.quantity) || 0,
          audience: t.audience || 'SV FPT'
        }))
      : DEFAULT_TICKETS,
  speakers:
    req.speakers?.length > 0
      ? req.speakers.map((s, i) => ({
          id: i + 1,
          name: s.name || '',
          role: s.role || '',
          avatar: s.avatar || ''
        }))
      : [],
  benefits: req.benefits?.length ? req.benefits : [''],
  partnerMessage: req.partnerMessage || '',
  attachments: req.attachments || [],
  bannerFileName: req.bannerFileName || ''
});

export { createEmptySpeakerRow };
