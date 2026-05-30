export const dashboardStats = [
  { label: 'Sự kiện sắp tới', value: '03', trend: '+2 tuần này', trendUp: true },
  { label: 'Sự kiện đã tham gia', value: '12', trend: 'Hoàn thành 100%', trendUp: true },
  { label: 'Tỷ lệ tham gia', value: '85%', trend: 'Cao hơn 15%', trendUp: false },
];

export const todayTimeline = [
  {
    id: 'tl-1',
    time: '08:00',
    date: '28/05/2026',
    title: 'Workshop Lập trình Nhúng với ESP32-C6 & AI Camera',
    location: 'Tầng 4 tòa Beta',
    status: 'SẮP DIỄN RA',
    statusTone: 'primary',
  },
  {
    id: 'tl-2',
    time: '14:00',
    date: '28/05/2026',
    title: 'Seminar Prompt Engineering với Generative AI',
    location: 'Sảnh tòa Gamma',
    status: 'ĐANG DIỄN RA',
    statusTone: 'success',
  },
];

export const upcomingRecommendations = [
  {
    id: 'rec-1',
    title: 'F-Fest: Giai điệu mùa hè',
    category: 'Âm nhạc',
    date: '20/06/2026',
    image: 'https://images.unsplash.com/photo-1470229723673-7c0e2dbbafd3?w=600&h=340&fit=crop',
  },
  {
    id: 'rec-2',
    title: 'Hackathon FPT Techday 2026',
    category: 'Công nghệ',
    date: '15/07/2026',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=340&fit=crop',
  },
];

export const myEvents = {
  upcoming: [
    {
      id: 'me-1',
      title: 'Workshop Lập trình Nhúng với ESP32-C6 & AI Camera',
      date: '28/05/2026 • 08:00',
      location: 'Tầng 4 tòa Beta',
      status: 'Đã xác nhận',
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=240&fit=crop',
    },
    {
      id: 'me-2',
      title: 'Lễ hội Tsubasa Matsuri',
      date: '24/10/2026 • 18:00',
      location: 'Sảnh tòa Beta',
      status: 'Chờ check-in',
      image: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=400&h=240&fit=crop',
    },
  ],
  attended: [
    {
      id: 'me-3',
      title: 'F-Shark Pitching Day 2025',
      date: '12/03/2026 • 13:30',
      location: 'Tầng 5 tòa Alpha',
      status: 'Đã tham gia',
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=240&fit=crop',
    },
  ],
  cancelled: [
    {
      id: 'me-4',
      title: 'Omatsuri Mambo Night',
      date: '05/04/2026 • 19:00',
      location: 'Sảnh tòa Beta',
      status: 'Đã hủy',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=240&fit=crop',
    },
  ],
};

export const scheduleEvents = [
  { id: 'sch-1', day: 28, title: 'ESP32 Workshop', time: '08:00', color: '#f26f21' },
  { id: 'sch-2', day: 28, title: 'Prompt Engineering', time: '14:00', color: '#0ea5e9' },
  { id: 'sch-3', day: 30, title: 'CLB AI Meetup', time: '17:30', color: '#8b5cf6' },
  { id: 'sch-4', day: 5, title: 'F-Fest Rehearsal', time: '19:00', color: '#f59e0b' },
];

export const pendingReviews = [
  {
    id: 'rev-1',
    title: 'Lễ hội Tsubasa Matsuri',
    date: '24 Tháng 10, 2024',
    tags: ['#Cultural', '#Festival'],
    image: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=400&h=240&fit=crop',
  },
  {
    id: 'rev-2',
    title: 'F-Shark Pitching Day',
    date: '12 Tháng 3, 2026',
    tags: ['#Startup', '#Competition'],
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=240&fit=crop',
  },
];

export const completedReviews = [
  {
    id: 'rev-3',
    title: 'Workshop Prompt Engineering',
    date: '22 Tháng 5, 2026',
    rating: 5,
    comment: 'Nội dung thực tế, mentor nhiệt tình và có nhiều demo hay.',
  },
];

export const announcements = [
  {
    id: 'ann-1',
    title: 'Thay đổi phòng tổ chức Workshop ESP32-C6',
    excerpt: 'Workshop sẽ chuyển từ Tầng 4 tòa Beta sang Sảnh tòa Gamma do bảo trì thiết bị.',
    sender: 'CTSV',
    time: '2 giờ trước',
    unread: true,
    important: true,
    urgent: true,
    category: 'Sự kiện',
  },
  {
    id: 'ann-2',
    title: 'Thông báo hoãn sự kiện F-Shark do điều kiện thời tiết',
    excerpt: 'Ban tổ chức sẽ thông báo lịch dự phòng trong tuần tới.',
    sender: 'ICPDP',
    time: '1 ngày trước',
    unread: true,
    important: true,
    urgent: false,
    category: 'Khẩn cấp',
  },
  {
    id: 'ann-3',
    title: 'Thông báo mở cổng đăng ký Lễ hội Tsubasa Matsuri',
    excerpt: 'Sinh viên FPT có thể đăng ký tham gia từ 08:00 ngày 01/06/2026.',
    sender: 'CTSV',
    time: '3 ngày trước',
    unread: false,
    important: false,
    urgent: false,
    category: 'Sự kiện',
  },
  {
    id: 'ann-4',
    title: 'Thông báo mở cổng đăng ký sự kiện Omatsuri Mambo',
    excerpt: 'Cổng đăng ký chính thức mở cho sinh viên và khách mời campus.',
    sender: 'CTSV',
    time: '5 ngày trước',
    unread: false,
    important: false,
    urgent: false,
    category: 'Sự kiện',
    body: `Kính gửi toàn thể sinh viên FPT University Da Nang,

Phòng CTSV trân trọng thông báo mở cổng đăng ký tham dự sự kiện **Omatsuri Mambo** — lễ hội văn hóa Nhật Bản do CLB Japan FPT tổ chức.

**Thời gian đăng ký:** 08:00, 01/06/2026 – 23:59, 10/06/2026
**Thời gian sự kiện:** 19:00 – 22:00, 20/06/2026
**Địa điểm:** Sảnh tòa Beta

Sinh viên vui lòng đăng ký qua nền tảng F-Events và mang theo vé điện tử (QR) khi tham dự. Số lượng có hạn — ưu tiên đăng ký sớm.

Trân trọng,
Phòng Công tác Sinh viên`,
  },
];

export const getAnnouncementById = (id) => announcements.find((item) => item.id === id);

export const getGreeting = (name) => {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  return `${prefix}, ${name || 'bạn'}`;
};
