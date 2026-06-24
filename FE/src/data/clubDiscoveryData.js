export const HERO_TAGS = ['#Tình nguyện', '#Âm nhạc', '#Công nghệ'];

export const CATEGORY_COLORS = {
  'Công nghệ': '#f26f21',
  'Nghệ thuật': '#006494',
  'Kinh doanh': '#4caf50',
  'Văn hóa': '#9333ea',
  'Thể thao': '#16a34a',
  'Tình nguyện': '#e11d48',
  'Âm nhạc': '#009ee6',
};

export const getCategoryColor = (category) =>
  CATEGORY_COLORS[category] || '#f26f21';

export const CLUB_SAMPLE_DATA = [
  {
    id: 'f-soft-club',
    name: 'F-Soft Club',
    category: 'Công nghệ',
    logoText: 'F-Soft',
    logoColor: '#f26f21',
    coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa65?auto=format&fit=crop&w=800&q=80',
    memberCount: 350,
    description: 'Nơi hội tụ các tài năng lập trình trẻ, cùng nhau phát triển các dự án công nghệ thực tế.',
    featuredEvent: { monthShort: 'TH12', day: '25', title: 'Workshop: AI & Future Web' },
    tags: ['công nghệ', 'tech', 'lập trình'],
  },
  {
    id: 'f-art-music',
    name: 'F-Art Music',
    category: 'Nghệ thuật',
    logoText: '♪',
    logoColor: '#009ee6',
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    memberCount: 120,
    description: 'Kết nối những tâm hồn yêu âm nhạc, tổ chức các đêm nhạc Acoustic hàng tháng.',
    featuredEvent: { monthShort: 'TH12', day: '30', title: 'Minishow: Giai điệu mùa Đông' },
    tags: ['âm nhạc', 'nghệ thuật', 'acoustic'],
  },
  {
    id: 'f-biz-startup',
    name: 'F-Biz Startup',
    category: 'Kinh doanh',
    logoText: 'Biz',
    logoColor: '#4caf50',
    coverImage: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80',
    memberCount: 200,
    description: 'Thúc đẩy tinh thần khởi nghiệp và tư duy kinh doanh thông qua các dự án mô phỏng.',
    featuredEvent: { monthShort: 'TH01', day: '05', title: 'Pitching Day: Khởi tạo ước mơ' },
    tags: ['kinh doanh', 'startup', 'pitching'],
  },
  {
    id: 'fu-dever',
    name: 'FU-DEVER',
    category: 'Công nghệ',
    logoText: 'D',
    logoColor: '#f26f21',
    coverImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
    memberCount: 150,
    description: 'Cộng đồng developer đam mê công nghệ — chia sẻ kiến thức, pair programming và hackathon nội bộ.',
    featuredEvent: { monthShort: 'TH12', day: '15', title: 'Hackathon FPT 2024' },
    tags: ['công nghệ', 'dev', 'hackathon'],
  },
  {
    id: 'minori-japanese',
    name: 'Minori Japanese Club',
    category: 'Văn hóa',
    logoText: '日',
    logoColor: '#9333ea',
    coverImage: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=800&q=80',
    memberCount: 95,
    description: 'Khám phá văn hóa Nhật Bản qua lễ hội, workshop tiếng Nhật và các hoạt động giao lưu.',
    featuredEvent: { monthShort: 'TH06', day: '20', title: 'Omatsuri Mambo Night' },
    tags: ['văn hóa', 'nhật bản', 'tình nguyện'],
  },
  {
    id: 'dreamteam',
    name: 'DreamTeam',
    category: 'Thể thao',
    logoText: 'DT',
    logoColor: '#16a34a',
    coverImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
    memberCount: 160,
    description: 'CLB thể thao đa năng — bóng đá, cầu lông, esports và các giải đấu nội bộ hấp dẫn.',
    featuredEvent: { monthShort: 'TH05', day: '28', title: 'Career Fair: Kết nối doanh nghiệp' },
    tags: ['thể thao', 'esports', 'bóng đá'],
  },
  {
    id: 'f-volunteer',
    name: 'F-Volunteer',
    category: 'Tình nguyện',
    logoText: '♥',
    logoColor: '#e11d48',
    coverImage: 'https://images.unsplash.com/photo-1559027615-cd4628903324?auto=format&fit=crop&w=800&q=80',
    memberCount: 220,
    description: 'Lan tỏa yêu thương qua các chương trình tình nguyện tại địa phương và cộng đồng sinh viên.',
    featuredEvent: { monthShort: 'TH11', day: '15', title: 'Lễ hội Văn hóa FPT: Bản sắc Việt Nam' },
    tags: ['tình nguyện', 'cộng đồng'],
  },
  {
    id: 'f-shark',
    name: 'F-Shark',
    category: 'Kinh doanh',
    logoText: 'Shark',
    logoColor: '#4caf50',
    coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    memberCount: 140,
    description: 'Sân chơi pitching và đầu tư mô phỏng dành cho sinh viên đam mê khởi nghiệp.',
    featuredEvent: { monthShort: 'TH03', day: '12', title: 'F-Shark Pitching Day 2026' },
    tags: ['startup', 'kinh doanh', 'pitching'],
  },
  {
    id: 'icpc-fpt',
    name: 'ICPC FPT',
    category: 'Công nghệ',
    logoText: 'ICPC',
    logoColor: '#f26f21',
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    memberCount: 80,
    description: 'Đội tuyển lập trình thi đấu — luyện thuật toán và tham gia các kỳ thi ICPC khu vực.',
    featuredEvent: { monthShort: 'TH10', day: '25', title: 'FPT Techday 2024: Kiến tạo tương lai số' },
    tags: ['công nghệ', 'lập trình', 'thi đấu'],
  },
];

export const formatMemberCount = (count) => `${count}+`;

export const mapApiClubToListItem = (club) => ({
  id: club.slug,
  _id: club._id,
  name: club.name,
  category: club.category,
  logoText: club.logoText,
  logoColor: club.logoColor,
  logoImage: club.logoImage || null,
  coverImage: club.coverImage,
  memberCount: club.memberCount ?? 0,
  followerCount: club.followerCount ?? 0,
  description: club.description,
  featuredEvent: club.featuredEvent || null,
  tags: club.tags || [],
  isFollowing: club.isFollowing === true,
  fromApi: true,
});

export const filterClubsBySearch = (clubs, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return clubs;
  return clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(q) ||
      club.category.toLowerCase().includes(q) ||
      club.description.toLowerCase().includes(q) ||
      club.tags.some((tag) => tag.includes(q.replace('#', '')))
  );
};

export const filterClubsByTag = (clubs, tag) => {
  if (!tag) return clubs;
  const normalized = tag.replace('#', '').toLowerCase();
  return clubs.filter(
    (club) =>
      club.category.toLowerCase().includes(normalized) ||
      club.tags.some((t) => t.includes(normalized))
  );
};

export const CLUB_CATEGORY_KEYS = {
  'Công nghệ': 'clubs.cat.tech',
  'Nghệ thuật': 'clubs.cat.art',
  'Kinh doanh': 'clubs.cat.business',
  'Văn hóa': 'clubs.cat.culture',
  'Thể thao': 'clubs.cat.sport',
  'Tình nguyện': 'clubs.cat.volunteer',
  'Âm nhạc': 'clubs.cat.music',
};

export const getClubCategoryLabel = (category, t) => {
  const key = CLUB_CATEGORY_KEYS[category];
  return key && t ? t(key) : category;
};

export const localizeClubItem = (club, t) => {
  if (!club || !t) return club;
  return {
    ...club,
    category: getClubCategoryLabel(club.category, t),
    description: club.descriptionKey ? t(club.descriptionKey) : club.description,
  };
};
