import { formatVnd, resolveEventPricing } from '../utils/ticketPricing';
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

/** Đơn vị tổ chức sự kiện (lọc trang Khám phá) */
export const ORGANIZER_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'ctsv', label: 'CTSV' },
  { id: 'club', label: 'CLB' },
  { id: 'icpdp', label: 'IC-PDP' },
  { id: 'partner', label: 'Đối tác' },
];

const ORGANIZER_LABELS = {
  ctsv: 'CTSV',
  club: 'CLB',
  icpdp: 'IC-PDP',
  partner: 'Đối tác',
};

/** Suy ra đơn vị tổ chức từ API (source + schoolOrganizerRole) */
export const resolveEventOrganizerType = (event) => {
  const source = event?.source || 'club';
  if (source === 'partner') return 'partner';
  if (source === 'club') return 'club';
  if (source === 'school') {
    return event?.schoolOrganizerRole === 'icpdp' ? 'icpdp' : 'ctsv';
  }
  return 'club';
};

export const getOrganizerLabel = (organizerType) =>
  ORGANIZER_LABELS[organizerType] || 'CLB';

export const filterEventsByOrganizer = (events, filterId) => {
  if (!filterId || filterId === 'all') return events;
  return events.filter((ev) => {
    const type = ev.organizerType || resolveEventOrganizerType(ev);
    return type === filterId;
  });
};

export const filterEventsByClub = (events, clubKey = '') => {
  const key = String(clubKey || '').trim().toLowerCase();
  if (!key) return events;
  return events.filter((ev) => {
    const type = ev.organizerType || resolveEventOrganizerType(ev);
    if (type !== 'club') return false;
    const slug = String(ev.clubSlug || '').trim().toLowerCase();
    const id = String(ev.clubId || '').trim().toLowerCase();
    return slug === key || id === key;
  });
};

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

export const markDiscoveryCardRegistered = (card) => ({
  ...card,
  cardState: 'registered',
  registered: true,
  primaryLabel: 'Đã đăng ký',
  filledSlots: Math.min((card.filledSlots ?? 0) + 1, card.totalSlots ?? Number.MAX_SAFE_INTEGER),
});

export const mapApiEventToCard = (event, { viewerRole = 'guest' } = {}) => {
  const eventState = event.eventState || 'active';
  const totalSlots = event.capacity || 100;
  const filledSlots = event.registeredCount ?? 0;
  const category = event.category || 'Sự kiện';
  const categoryLabel = getCategoryDisplayLabel(category);
  const isRegistered = event.isRegistered === true;
  const pricing = resolveEventPricing(event, viewerRole);
  const { listPrice, amountDue, priceLabel, studentPrivilegeApplied, primaryActionLabel } = pricing;
  const organizerType = resolveEventOrganizerType(event);
  const organizerLabel = getOrganizerLabel(organizerType);

  return {
    id: String(event._id || event.id || ''),
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    eventState,
    createdAt: event.createdAt,
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
    primaryLabel: isRegistered ? 'Đã đăng ký' : primaryActionLabel,
    registered: isRegistered,
    filterTags: [CATEGORY_TO_FILTER[category] || 'all'],
    listPrice,
    amountDue,
    priceLabel,
    studentPrivilegeApplied,
    source: event.source || 'club',
    schoolOrganizerRole: event.schoolOrganizerRole || 'ctsv',
    status: event.status || '',
    statusKey: event.statusKey || '',
    organizerType,
    organizerLabel,
    clubId: event.clubId ? String(event.clubId) : '',
    clubSlug: event.clubSlug || '',
    clubName: event.clubName || '',
    createdByEmail: event.createdBy?.email || event.createdByEmail || '',
    createdById: event.createdBy?._id || event.createdBy || '',
    partnerId: event.partnerId ? String(event.partnerId) : '',
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
    id: String(event._id || event.id || ''),
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

export const HOME_RECOMMEND_TABS = [
  { id: 'newest', label: 'Mới nhất' },
  { id: 'popular', label: 'Nhiều đăng ký nhất' },
  { id: 'potential', label: 'Tiềm năng nhất' },
  { id: 'forYou', label: 'Phù hợp với bạn' },
];

const eventTime = (value) => {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
};

export const sortEventsByNewest = (events) =>
  [...events].sort((a, b) => eventTime(b.startDate) - eventTime(a.startDate));

export const sortEventsByPopular = (events) =>
  [...events].sort((a, b) => (b.filledSlots ?? 0) - (a.filledSlots ?? 0));

const potentialScore = (event) => {
  const fill = getFillPercent(event.filledSlots, event.totalSlots);
  const remaining = Math.max(0, (event.totalSlots ?? 0) - (event.filledSlots ?? 0));
  const fillSweet = fill >= 15 && fill <= 80 ? 40 : 0;
  const slotScore = Math.min(remaining, 60);
  const freeBonus = (event.amountDue ?? 0) === 0 ? 15 : 0;
  const soonBonus = eventTime(event.startDate) > Date.now() ? 10 : 0;
  return fillSweet + slotScore + freeBonus + soonBonus;
};

export const sortEventsByPotential = (events) =>
  [...events].sort((a, b) => potentialScore(b) - potentialScore(a));

const categoryHintsFromProfile = (profile = {}) => {
  const course = String(profile.course || '').toLowerCase();
  const hints = new Set();
  if (/se|it|ai|gd|game|soft/.test(course)) {
    hints.add('công nghệ');
    hints.add('workshop');
  }
  if (/ba|biz|marketing|kinh/.test(course)) {
    hints.add('kinh tế');
  }
  if (/lang|anh|nhật|hàn/.test(course)) {
    hints.add('văn hóa');
  }
  if (/design|art|đồ họa/.test(course)) {
    hints.add('nghệ thuật');
  }
  return [...hints];
};

export const sortEventsForYou = (events, profile = {}, isLoggedIn = false) => {
  const hints = isLoggedIn ? categoryHintsFromProfile(profile) : [];
  const score = (event) => {
    const cat = (event.category || '').toLowerCase();
    const matchBoost = hints.some((h) => cat.includes(h)) ? 50 : 0;
    return matchBoost + potentialScore(event) + (event.filledSlots ?? 0) * 0.2;
  };
  return [...events].sort((a, b) => score(b) - score(a));
};

export const sortHomeEventsByRecommendTab = (events, tabId, profile, isLoggedIn) => {
  switch (tabId) {
    case 'popular':
      return sortEventsByPopular(events);
    case 'potential':
      return sortEventsByPotential(events);
    case 'forYou':
      return sortEventsForYou(events, profile, isLoggedIn);
    case 'newest':
    default:
      return sortEventsByNewest(events);
  }
};

export const HOME_DISPLAY_LIMIT = 6;
