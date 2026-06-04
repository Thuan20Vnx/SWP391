import { getCategoryColor, getFillPercent } from './eventDiscoveryData';
import { formatVnd } from '../utils/ticketPricing';
import { resolveEventSpeakers } from '../constants/eventSpeaker';
import { getCategoryDisplayLabel } from '../constants/eventCategories';
import { resolveEventDisplayImage } from '../utils/eventDisplay';
const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa65?auto=format&fit=crop&w=1600&q=80';

const mapSpeakersForDetail = (event) =>
  resolveEventSpeakers(event).map((speaker) => ({
    name: speaker.name,
    role: speaker.role,
    avatar: speaker.avatar || '',
    quote: speaker.quote || '',
  }));

const DEFAULT_LEARNING = [
  'Nắm vững kiến thức nền tảng và ứng dụng thực tế trong lĩnh vực sự kiện.',
  'Làm quen với quy trình tổ chức và trải nghiệm hoạt động chuyên sâu.',
  'Kết nối, trao đổi và học hỏi từ diễn giả cùng cộng đồng sinh viên.',
];

const CLUB_ORGANIZER = {
  kind: 'club',
  name: 'F-Soft Club',
  slug: 'f-soft-club',
  logo: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=200&q=80',
  memberCount: 150,
  eventsHeld: 45,
  description:
    'Cộng đồng sinh viên đam mê công nghệ tại FPT University. Chúng tôi thường xuyên tổ chức các buổi workshop, hackathon và chia sẻ kiến thức chuyên môn về phần mềm.',
};

const SCHOOL_ORGANIZER = {
  kind: 'school',
  name: 'Phòng Công tác Sinh viên',
  slug: null,
  logo: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=200&q=80',
  memberCount: null,
  eventsHeld: null,
  description:
    'Sự kiện cấp trường do Phòng Công tác Sinh viên (CTSV) FPT University tổ chức, phục vụ toàn thể sinh viên.',
};

const resolveEventOrganizer = (event) => {
  if (event?.source === 'school') return SCHOOL_ORGANIZER;
  if (event?.source === 'partner') {
    return {
      kind: 'partner',
      name: 'Đối tác FPT',
      slug: null,
      logo: CLUB_ORGANIZER.logo,
      memberCount: null,
      eventsHeld: null,
      description: 'Sự kiện hợp tác cùng đối tác, được CTSV và Admin phê duyệt.'
    };
  }
  return CLUB_ORGANIZER;
};

const formatShortDate = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const buildTimeRange = (startDate, endDate) => {
  const start = formatTime(startDate);
  const end = formatTime(endDate);
  if (!start || !end) return '';
  return `${start} - ${end}`;
};

const buildRegistrationDeadline = (startDate) => {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return '';
  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() - 2);
  return formatShortDate(deadline);
};

const splitDescription = (text) => {
  if (!text) return [];
  const byParagraph = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (byParagraph.length > 1) return byParagraph;
  return [text.trim()];
};

const buildAgenda = (startDate, endDate, title = '') => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [
      { title: 'Check-in & Warm-up', description: 'Đón khách và ổn định chỗ ngồi.' },
      { title: 'Nội dung chính', description: 'Phần trình bày và thực hành cốt lõi của sự kiện.' },
      { title: 'Q&A & Kết thúc', description: 'Hỏi đáp và tổng kết chương trình.' },
    ];
  }

  const durationMs = end.getTime() - start.getTime();
  const third = durationMs / 3;
  const t1 = new Date(start.getTime() + third);
  const t2 = new Date(start.getTime() + third * 2);

  const isWorkshop = /workshop/i.test(title);

  return [
    {
      title: `${formatTime(start)} - ${formatTime(t1)}: Check-in & Warm-up`,
      description: 'Đón khách, ổn định chỗ ngồi và giao lưu ngắn với các diễn giả.',
    },
    {
      title: `${formatTime(t1)} - ${formatTime(t2)}: ${isWorkshop ? 'Deep Dive & Thực hành' : 'Nội dung chính'}`,
      description: isWorkshop
        ? 'Phần chính về lý thuyết và hướng dẫn coding thực tế trên thiết bị.'
        : 'Trình bày nội dung cốt lõi và các hoạt động tương tác với người tham dự.',
    },
    {
      title: `${formatTime(t2)} - ${formatTime(end)}: Q&A & Showcase`,
      description: 'Hỏi đáp trực tiếp và trải nghiệm demo / tổng kết chương trình.',
    },
  ];
};

const getRegistrationStatus = (event) => {
  const eventState = event.eventState || 'active';
  if (eventState === 'expired') {
    return { label: 'Đã kết thúc', tone: 'muted' };
  }
  if (eventState === 'postponed') {
    return { label: 'Tạm hoãn', tone: 'warning' };
  }
  const capacity = event.capacity || 0;
  const registered = event.registeredCount ?? 0;
  if (capacity > 0 && registered >= capacity) {
    return { label: 'Hết chỗ', tone: 'danger' };
  }
  return { label: 'Mở đăng ký', tone: 'open' };
};

const getPrimaryActionLabel = (event, isRegistered, amountDue, listPrice) => {
  if (event.primaryActionLabel) return event.primaryActionLabel;
  const eventState = event.eventState || 'active';
  if (eventState === 'expired') return 'Đã hết hạn';
  if (eventState === 'postponed') return 'Xem thông tin';
  if (isRegistered) return 'Xem vé';
  const capacity = event.capacity || 0;
  const registered = event.registeredCount ?? 0;
  if (capacity > 0 && registered >= capacity) return 'Hết chỗ';
  if (amountDue > 0) return 'Mua vé';
  return 'Đăng ký ngay';
};

export const mapApiEventToDetail = (event) => {
  const eventState = event.eventState || 'active';
  const capacity = event.capacity || 100;
  const registeredCount = event.registeredCount ?? 0;
  const isRegistered = event.isRegistered === true;
  const fillPercent = getFillPercent(registeredCount, capacity);
  const registrationStatus = getRegistrationStatus(event);
  const listPrice = event.listPrice ?? Math.max(0, Number(event.ticketPrice) || 0);
  const amountDue = event.amountDue ?? listPrice;
  const priceLabel = event.priceLabel || (amountDue === 0 ? 'MIỄN PHÍ' : formatVnd(amountDue));
  const studentPrivilegeApplied = event.studentPrivilegeApplied === true;

  return {
    id: event._id,
    title: event.title,
    thumbnail: resolveEventDisplayImage(event, DEFAULT_HERO_IMAGE),
    category: event.category || 'Sự kiện',
    categoryLabel: getCategoryDisplayLabel(event.category || 'Sự kiện'),
    categoryColor: getCategoryColor(event.category),
    eventType: event.eventType || '',
    secondaryTag: event.eventType || '',
    dateShort: formatShortDate(event.startDate),
    timeRange: buildTimeRange(event.startDate, event.endDate),
    location: event.location,
    campus: event.campus,
    description: event.description,
    descriptionParagraphs: splitDescription(event.description),
    learningOutcomes:
      Array.isArray(event.learningOutcomes) && event.learningOutcomes.length > 0
        ? event.learningOutcomes
        : DEFAULT_LEARNING,
    agenda: buildAgenda(event.startDate, event.endDate, event.title),
    speakers: mapSpeakersForDetail(event),
    source: event.source || 'club',
    organizer: resolveEventOrganizer(event),
    capacity,
    registeredCount,
    fillPercent,
    isRegistered,
    eventState,
    postponeReason: event.postponeReason || '',
    averageRating: event.averageRating ?? 0,
    reviewCount: event.reviewCount ?? 0,
    listPrice,
    amountDue,
    priceLabel,
    studentPrivilegeApplied,
    registrationDeadline: buildRegistrationDeadline(event.startDate),
    registrationStatus,
    primaryActionLabel: getPrimaryActionLabel(event, isRegistered, amountDue, listPrice),
    primaryDisabled:
      eventState === 'expired' ||
      (eventState !== 'postponed' &&
        !isRegistered &&
        capacity > 0 &&
        registeredCount >= capacity),
    createdBy: event.createdBy,
  };
};

export const FIGMA_EVENT_DETAIL_FALLBACK = mapApiEventToDetail({
  _id: 'figma-workshop-ai',
  title: 'Workshop: Lập trình AI với Python',
  description:
    'Chào mừng bạn đến với workshop chuyên sâu về ứng dụng Python trong trí tuệ nhân tạo (AI). Trong buổi workshop này, chúng tôi sẽ dẫn dắt bạn đi từ những khái niệm cơ bản nhất đến việc triển khai một mô hình AI thực thụ trên các thiết bị nhúng.\n\nChúng ta sẽ cùng nhau khám phá thư viện Python mạnh mẽ, cách tối ưu hóa thuật toán và quy trình xử lý dữ liệu đầu vào từ các cảm biến thực tế. Đây không chỉ là một buổi học lý thuyết, mà là cơ hội để bạn thực hành ngay trên các thiết bị phần cứng hiện đại.',
  thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa65?auto=format&fit=crop&w=1600&q=80',
  category: 'Công nghệ',
  eventType: 'Hội thảo & Workshop',
  startDate: '2024-12-22T14:00:00+07:00',
  endDate: '2024-12-22T17:00:00+07:00',
  location: 'Tầng 4 tòa Beta',
  capacity: 30,
  registeredCount: 10,
  eventState: 'active',
  isRegistered: false,
});

FIGMA_EVENT_DETAIL_FALLBACK.learningOutcomes = [
  'Nắm vững cú pháp Python chuyên dụng cho xử lý dữ liệu và AI.',
  'Làm quen với hệ sinh thái TinyML và IoT.',
  'Thực hành huấn luyện và triển khai mô hình nhận diện vật thể đơn giản.',
];

FIGMA_EVENT_DETAIL_FALLBACK.agenda = [
  {
    title: '14:00 - 14:30: Check-in & Warm-up',
    description: 'Đón khách, ổn định chỗ ngồi và giao lưu ngắn với các diễn giả.',
  },
  {
    title: '14:30 - 15:45: Deep Dive into AI with Python',
    description: 'Phần chính về lý thuyết và hướng dẫn coding thực tế trên thiết bị.',
  },
  {
    title: '15:45 - 17:00: Q&A & Showcase',
    description: 'Hỏi đáp trực tiếp và trải nghiệm các sản phẩm AI demo.',
  },
];
