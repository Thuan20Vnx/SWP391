import { formatVnd } from '../utils/ticketPricing';
import { resolveEventDisplayImage } from '../utils/eventDisplay';
import { getCategoryDisplayLabel } from '../constants/eventCategories';

const formatEventDate = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const CATEGORY_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'music', label: 'Âm nhạc', categories: ['Âm nhạc'] },
  { id: 'tech', label: 'Công nghệ', categories: ['Công nghệ', 'CÔNG NGHỆ'] },
  { id: 'workshop', label: 'Workshop', categories: ['Workshop', 'HỌC THUẬT'] },
  { id: 'sport', label: 'Thể thao', categories: ['Thể thao'] },
  { id: 'art', label: 'Nghệ thuật', categories: ['Nghệ thuật', 'NGHỆ THUẬT', 'VĂN HÓA'] },
];

export const STATE_FILTERS = [
  { id: 'open', label: 'Đang mở' },
  { id: 'expired', label: 'Đã kết thúc' },
  { id: 'postponed', label: 'Bị hoãn' },
];

export const CATEGORY_COLORS = {
  'Công nghệ': '#f26f21',
  'CÔNG NGHỆ': '#f26f21',
  'Văn hóa': '#2563eb',
  'VĂN HÓA': '#2563eb',
  'Kinh tế': '#16a34a',
  'KINH TẾ': '#16a34a',
  'Học thuật': '#4b5563',
  'HỌC THUẬT': '#4b5563',
  'Nghệ thuật': '#9333ea',
  'NGHỆ THUẬT': '#9333ea',
  'Âm nhạc': '#f26f21',
  'Workshop': '#f26f21',
  'Thể thao': '#16a34a',
  'Sự kiện': '#f26f21',
};

export const getCategoryColor = (category) =>
  CATEGORY_COLORS[category] || CATEGORY_COLORS['Sự kiện'];

/** Sample events from Figma SWP391_2 node 189:2 */
export const FIGMA_SAMPLE_EVENTS = [
  {
    id: 'figma-techday',
    title: 'FPT Techday 2024: Kiến tạo tương lai số',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    category: 'Công nghệ',
    dateLabel: '25 Tháng 10, 2024',
    location: 'Sảnh tòa Gamma',
    filledSlots: 180,
    totalSlots: 200,
    cardState: 'active',
    primaryLabel: 'Đăng ký ngay',
    registered: false,
    filterTags: ['tech'],
  },
  {
    id: 'figma-culture',
    title: 'Lễ hội Văn hóa FPT: Bản sắc Việt Nam',
    thumbnail: 'https://images.unsplash.com/photo-1533174072545-7a4b6bd7d6b3?auto=format&fit=crop&w=800&q=80',
    category: 'Văn hóa',
    dateLabel: '15 Tháng 11, 2024',
    location: 'Sảnh tòa Beta',
    filledSlots: 450,
    totalSlots: 500,
    cardState: 'active',
    primaryLabel: 'Mua vé',
    registered: false,
    filterTags: ['art'],
  },
  {
    id: 'figma-economy',
    title: 'Diễn đàn Kinh tế Trẻ 4.0',
    thumbnail: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    category: 'Kinh tế',
    dateLabel: '02 Tháng 12, 2024',
    location: 'Tầng 5 tòa Alpha',
    filledSlots: 85,
    totalSlots: 100,
    cardState: 'active',
    primaryLabel: 'Đăng ký ngay',
    registered: false,
    filterTags: ['tech'],
  },
  {
    id: 'figma-debate',
    title: 'Workshop: Kỹ năng tranh biện (Debate)',
    thumbnail: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
    category: 'Học thuật',
    dateLabel: '10 Tháng 05, 2024',
    location: 'Tầng 5 tòa Alpha',
    filledSlots: 50,
    totalSlots: 50,
    cardState: 'expired',
    primaryLabel: 'Đã hết hạn',
    registered: false,
    filterTags: ['workshop'],
  },
  {
    id: 'figma-embedded',
    title: 'Workshop Lập trình Nhúng',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa65?auto=format&fit=crop&w=800&q=80',
    category: 'Workshop',
    dateLabel: 'TBA (Sẽ thông báo sau)',
    location: 'Tầng 4 tòa Beta',
    filledSlots: 0,
    totalSlots: 40,
    cardState: 'postponed',
    postponeReason: 'Lý do: Do điều kiện thời tiết',
    primaryLabel: 'Xem chi tiết',
    registered: false,
    filterTags: ['workshop', 'tech'],
  },
  {
    id: 'figma-art',
    title: 'Triển lãm Nghệ thuật Đương đại F-Art',
    thumbnail: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a2b?auto=format&fit=crop&w=800&q=80',
    category: 'Nghệ thuật',
    dateLabel: '20 Tháng 12, 2024',
    location: 'Sảnh tòa Gamma',
    filledSlots: 120,
    totalSlots: 150,
    cardState: 'registered',
    primaryLabel: 'Xem vé',
    registered: true,
    filterTags: ['art'],
  },
];

const CATEGORY_TO_FILTER = {
  'Âm nhạc': 'music',
  'Công nghệ': 'tech',
  'Workshop': 'workshop',
  'Học thuật': 'workshop',
  'Thể thao': 'sport',
  'Nghệ thuật': 'art',
  'Văn hóa': 'art',
  'Kinh tế': 'tech',
};

const getPrimaryLabel = (eventState) => {
  if (eventState === 'expired') return 'Đã hết hạn';
  if (eventState === 'postponed') return 'Xem chi tiết';
  return 'Đăng ký ngay';
};

/** Sự kiện hiển thị trên trang khám phá: active, còn slot, chưa kết thúc */
export const isEventActiveForDiscovery = (event) => {
  if (event.eventState !== 'active') return false;

  const end = new Date(event.endDate);
  if (!Number.isNaN(end.getTime()) && end < new Date()) return false;

  const capacity = event.capacity ?? 0;
  const registered = event.registeredCount ?? 0;
  if (capacity > 0 && registered >= capacity) return false;

  return true;
};

export const filterActiveDiscoveryEvents = (events) =>
  events.filter(isEventActiveForDiscovery);

/** Nhóm trạng thái hiển thị trên card (sau mapApiEventToCard) */
export const getEventCardStateGroup = (event) => {
  if (event.cardState === 'postponed') return 'postponed';
  if (event.cardState === 'expired') return 'expired';
  return 'open';
};

export const filterEventsByState = (events, stateId) => {
  if (!stateId) return events;
  return events.filter((ev) => getEventCardStateGroup(ev) === stateId);
};

const STATE_SORT_ORDER = { open: 0, postponed: 1, expired: 2 };

export const sortEventsByStatePriority = (events) =>
  [...events].sort(
    (a, b) =>
      (STATE_SORT_ORDER[getEventCardStateGroup(a)] ?? 0) -
      (STATE_SORT_ORDER[getEventCardStateGroup(b)] ?? 0)
  );

export const mapApiEventToCard = (event) => {
  const eventState = event.eventState || 'active';
  const totalSlots = event.capacity || 100;
  const filledSlots = event.registeredCount ?? 0;
  const category = event.category || 'Sự kiện';
  const categoryLabel = getCategoryDisplayLabel(category);
  const isRegistered = event.isRegistered === true;
  const listPrice = event.listPrice ?? Math.max(0, Number(event.ticketPrice) || 0);
  const amountDue = event.amountDue ?? listPrice;
  const priceLabel = event.priceLabel || (amountDue === 0 ? 'MIỄN PHÍ' : formatVnd(amountDue));

  return {
    id: event._id,
    title: event.title,
    thumbnail: resolveEventDisplayImage(
      event,
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'
    ),
    category,
    categoryLabel,
    eventType: event.eventType || '',
    dateLabel: eventState === 'postponed'
      ? 'TBA (Sẽ thông báo sau)'
      : formatEventDate(event.startDate),
    location: event.location,
    filledSlots,
    totalSlots,
    cardState: isRegistered ? 'registered' : eventState,
    postponeReason: event.postponeReason || '',
    primaryLabel: isRegistered
      ? 'Xem vé'
      : (event.primaryActionLabel || getPrimaryLabel(eventState)),
    registered: isRegistered,
    filterTags: [CATEGORY_TO_FILTER[category] || 'all'],
    listPrice,
    amountDue,
    priceLabel,
    studentPrivilegeApplied: event.studentPrivilegeApplied === true,
    fromApi: true,
  };
};

export const mapApiEventToHomeCard = (event) => {
  const start = new Date(event.startDate);
  const totalTickets = event.capacity || 100;
  const filled = event.registeredCount ?? 0;
  const remainingTickets = Math.max(0, totalTickets - filled);
  const isRegistered = event.isRegistered === true;
  const fillPercent = totalTickets ? (filled / totalTickets) * 100 : 0;

  let status = 'MỞ ĐĂNG KÝ';
  if (event.eventState === 'expired') status = 'ĐÃ KẾT THÚC';
  else if (event.eventState === 'postponed') status = 'HOÃN';
  else if (remainingTickets === 0) status = 'HẾT CHỖ';
  else if (fillPercent >= 85) status = 'SẮP HẾT CHỖ';

  return {
    id: event._id,
    title: event.title,
    category: event.category || 'Sự kiện',
    categoryLabel: getCategoryDisplayLabel(event.category || 'Sự kiện'),
    eventType: event.eventType || '',
    date: Number.isNaN(start.getTime())
      ? ''
      : start.toLocaleDateString('vi-VN'),
    time: Number.isNaN(start.getTime())
      ? ''
      : start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    location: event.location,
    remainingTickets,
    totalTickets,
    status,
    image: resolveEventDisplayImage(event),
    registered: isRegistered,
    eventState: event.eventState || 'active',
    listPrice: event.listPrice ?? Math.max(0, Number(event.ticketPrice) || 0),
    amountDue: event.amountDue ?? Math.max(0, Number(event.ticketPrice) || 0),
    priceLabel: event.priceLabel || 'MIỄN PHÍ',
    studentPrivilegeApplied: event.studentPrivilegeApplied === true,
  };
};

export const getFillPercent = (filled, total) => {
  if (!total) return 0;
  return Math.min(100, Math.round((filled / total) * 100));
};

export const filterEventsByCategory = (events, filterId) => {
  if (filterId === 'all') return events;
  const filter = CATEGORY_FILTERS.find((f) => f.id === filterId);
  if (!filter?.categories) return events;

  return events.filter((ev) => {
    if (ev.filterTags?.includes(filterId)) return true;
    return filter.categories.some(
      (cat) => ev.category?.toLowerCase() === cat.toLowerCase()
    );
  });
};

export const filterEventsBySearch = (events, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return events;
  return events.filter(
    (ev) =>
      ev.title.toLowerCase().includes(q) ||
      ev.location.toLowerCase().includes(q) ||
      ev.category.toLowerCase().includes(q)
  );
};
