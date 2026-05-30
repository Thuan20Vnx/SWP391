/** Quản lý cơ sở & danh mục — Figma SWP391_2 */

export const ADMIN_DATA_TABS = [
  { id: 'facilities', label: 'Cơ sở vật chất' },
  { id: 'categories', label: 'Danh mục sự kiện' },
  { id: 'clubs', label: 'Danh sách CLB' },
];

export const ADMIN_DATA_PAGE_SIZE = 6;

export const FACILITY_STATUS = {
  ready: { key: 'ready', label: 'SẴN SÀNG', tone: 'ready' },
  maintenance: { key: 'maintenance', label: 'ĐANG BẢO TRÌ', tone: 'maintenance' },
};

export const RESOURCE_TYPES = [
  { value: 'hall', label: 'Hội trường' },
  { value: 'meeting', label: 'Phòng họp' },
  { value: 'field', label: 'Sân bãi' },
];

export const FACILITY_EQUIPMENT_OPTIONS = [
  { key: 'speakers', label: 'Hệ thống Loa' },
  { key: 'projector', label: 'Máy chiếu / Màn LED' },
  { key: 'ac', label: 'Thiết bị Điều hòa' },
];

export const emptyFacilityForm = () => ({
  resourceType: 'hall',
  name: '',
  capacity: '',
  building: '',
  equipment: { speakers: false, projector: false, ac: false },
  isActive: true,
});

export const facilityToForm = (item) => ({
  resourceType: item?.resourceType || 'hall',
  name: item?.name || '',
  capacity: item?.capacity ?? '',
  building: item?.building || '',
  equipment: {
    speakers: !!item?.equipment?.speakers,
    projector: !!item?.equipment?.projector,
    ac: !!item?.equipment?.ac,
  },
  isActive: item?.isActive !== false && item?.status !== 'maintenance',
});

export const getResourceTypeLabel = (value) =>
  RESOURCE_TYPES.find((t) => t.value === value)?.label || 'Hội trường';

export const getFacilityEquipmentLabels = (equipment) => {
  if (!equipment) return [];
  return FACILITY_EQUIPMENT_OPTIONS.filter((opt) => equipment[opt.key]).map((opt) => opt.label);
};

export const formToFacility = (values, existingId) => ({
  id: existingId || `fac_${Date.now()}`,
  resourceType: values.resourceType || 'hall',
  name: String(values.name || '').trim(),
  capacity: Number(values.capacity) || 0,
  building: String(values.building || '').trim(),
  equipment: values.equipment || { speakers: false, projector: false, ac: false },
  isActive: !!values.isActive,
  status: values.isActive ? 'ready' : 'maintenance',
});

const BUILDINGS = ['Tòa Alpha', 'Tòa Beta', 'Tòa Gamma', 'Tòa Delta'];

const FACILITY_NAMES = [
  'Hội trường Alpha',
  'Hội trường Delta',
  'Phòng Studio 102',
  'Hội trường Beta',
  'Phòng họp 201',
  'Phòng họp 305',
  'Sảnh tòa Gamma',
  'Sảnh tòa Beta',
  'Tầng 4 tòa Beta',
  'Tầng 5 tòa Alpha',
  'Lab đa phương tiện 01',
  'Lab đa phương tiện 02',
  'Phòng thực hành 110',
  'Phòng thực hành 112',
  'Studio ghi hình 01',
  'Studio ghi hình 02',
  'Hội trường Gamma',
  'Phòng seminar 401',
  'Phòng seminar 402',
  'Không gian sự kiện ngoài trời',
  'Phòng workshop 203',
  'Phòng workshop 204',
  'Phòng luyện tập CLB',
  'Phòng họp CTSV',
];

export const DEFAULT_FACILITIES = FACILITY_NAMES.map((name, i) => ({
  id: `fac_${i + 1}`,
  name,
  capacity: [500, 300, 30, 400, 40, 60, 200, 180, 120, 150, 45, 50, 35, 38, 25, 28, 350, 55, 55, 800, 42, 44, 70, 25][i] || 50,
  building: BUILDINGS[i % BUILDINGS.length],
  status: i === 2 || i === 10 ? 'maintenance' : 'ready',
}));

export const DEFAULT_CATEGORIES = [
  {
    id: 'cat_1',
    code: 'CAT_TECH',
    name: 'Học thuật & Công nghệ',
    description: 'Các cuộc thi Hackathon, Workshop lập trình, Seminar công nghệ và nghiên cứu khoa học.',
    eventCount: 45,
    active: true,
  },
  {
    id: 'cat_2',
    code: 'CAT_ARTS',
    name: 'Nghệ thuật & Sáng tạo',
    description: 'Triển lãm, biểu diễn nghệ thuật, workshop thiết kế và sáng tạo nội dung.',
    eventCount: 32,
    active: true,
  },
  {
    id: 'cat_3',
    code: 'CAT_CULT',
    name: 'Văn hóa & Giao lưu',
    description: 'Lễ hội, giao lưu văn hóa và hoạt động cộng đồng sinh viên.',
    eventCount: 28,
    active: true,
  },
  {
    id: 'cat_4',
    code: 'CAT_SPORT',
    name: 'Thể thao & Sức khỏe',
    description: 'Giải đấu thể thao, chạy bộ, yoga và hoạt động rèn luyện thể chất.',
    eventCount: 21,
    active: true,
  },
  {
    id: 'cat_5',
    code: 'CAT_BUSI',
    name: 'Kinh tế & Khởi nghiệp',
    description: 'Career fair, pitching, hội thảo kinh doanh và fintech cho sinh viên.',
    eventCount: 19,
    active: true,
  },
  {
    id: 'cat_6',
    code: 'CAT_MUSIC',
    name: 'Âm nhạc & Giải trí',
    description: 'Concert, acoustic, battle of bands và các sự kiện âm nhạc campus.',
    eventCount: 17,
    active: true,
  },
  {
    id: 'cat_7',
    code: 'CAT_VOL',
    name: 'Tình nguyện & Xã hội',
    description: 'Hoạt động thiện nguyện, bảo vệ môi trường và trách nhiệm xã hội.',
    eventCount: 14,
    active: true,
  },
  {
    id: 'cat_8',
    code: 'CAT_WORK',
    name: 'Kỹ năng & Workshop',
    description: 'Đào tạo kỹ năng mềm, viết CV, phỏng vấn và workshop chuyên môn.',
    eventCount: 38,
    active: true,
  },
  {
    id: 'cat_9',
    code: 'CAT_GAME',
    name: 'Game & Esports',
    description: 'Giải đấu esports, game jam và sự kiện cộng đồng game thủ FPT.',
    eventCount: 12,
    active: true,
  },
  {
    id: 'cat_10',
    code: 'CAT_NET',
    name: 'Kết nối & Alumni',
    description: 'Networking, gặp gỡ cựu sinh viên và chương trình mentor.',
    eventCount: 9,
    active: true,
  },
  {
    id: 'cat_11',
    code: 'CAT_ACAD',
    name: 'Học thuật chuyên ngành',
    description: 'Báo cáo khoa, seminar chuyên đề theo từng ngành đào tạo.',
    eventCount: 26,
    active: true,
  },
  {
    id: 'cat_12',
    code: 'CAT_OTHER',
    name: 'Khác',
    description: 'Danh mục dự phòng cho các sự kiện đặc thù không thuộc nhóm trên.',
    eventCount: 5,
    active: false,
  },
];

const MASTER_CLUB_SEEDS = [
  ['CLB_FCODE', 'F-Code Team', 'Công nghệ thông tin', 'Lê Minh Khôi'],
  ['CLB_GUITAR', 'Guitar Club DN', 'Âm nhạc & Nghệ thuật', 'Trần Thu Hà'],
  ['CLB_BASKET', 'FPT Basketball', 'Thể thao', 'Phạm Quốc Bảo'],
  ['CLB_AI', 'FPT AI Club', 'Trí tuệ nhân tạo', 'Nguyễn Hoàng Nam'],
  ['CLB_ENG', 'FPT English Club', 'Ngoại ngữ', 'Võ Thị Mai Anh'],
  ['CLB_MKT', 'FPT Marketing', 'Kinh doanh & Truyền thông', 'Đặng Thanh Tùng'],
  ['CLB_FIN', 'FPT Fintech', 'Tài chính số', 'Bùi Hữu Phúc'],
  ['CLB_DEV', 'FPT Dev Club', 'Lập trình & Phát triển phần mềm', 'Trịnh Văn Đức'],
  ['CLB_DANCE', 'FPT Dance', 'Nghệ thuật biểu diễn', 'Lý Ngọc Linh'],
  ['CLB_VOL', 'Green Heart FPT', 'Tình nguyện & Cộng đồng', 'Hoàng Yến Nhi'],
  ['CLB_ESPORT', 'FPT Esports', 'Thể thao điện tử', 'Mai Công Danh'],
  ['CLB_PHOTO', 'FPT Photography', 'Nhiếp ảnh & Sáng tạo', 'Đỗ Minh Quân'],
];

const MASTER_CLUB_EXTRA_NAMES = [
  'FPT Event Hub', 'FPT Robotics', 'FPT Business', 'FPT Design', 'FPT Cinema',
  'FPT Chess', 'FPT Running', 'FPT Yoga', 'FPT Debate', 'FPT Startup',
  'FPT IoT', 'FPT Cyber Sec', 'FPT Data Science', 'FPT Japanese', 'FPT Korean',
  'FPT Chinese', 'FPT French', 'FPT Biology', 'FPT Chemistry', 'FPT Physics',
  'FPT Math', 'FPT Literature', 'FPT History', 'FPT Psychology', 'FPT Hospitality',
  'FPT Tourism', 'FPT Law', 'FPT Accounting', 'FPT HR', 'FPT Logistics',
  'FPT Agriculture', 'FPT Environment', 'FPT Architecture',
];

export const CLUB_ACTIVITY_FIELDS = [
  'Công nghệ thông tin',
  'Học thuật',
  'Âm nhạc & Nghệ thuật',
  'Thể thao',
  'Kinh doanh & Truyền thông',
  'Ngoại ngữ',
  'Kỹ năng mềm',
  'Tình nguyện & Cộng đồng',
  'Thiết kế',
  'Khoa học',
  'Giải trí',
  'Trí tuệ nhân tạo',
  'Tài chính số',
];

const MASTER_CLUB_FIELDS = CLUB_ACTIVITY_FIELDS;

const MASTER_CLUB_PRESIDENTS = [
  'Lê Minh Khôi',
  'Trần Thu Hà',
  'Phạm Quốc Bảo',
  'Nguyễn Hoàng Nam',
  'Võ Thị Mai Anh',
  'Đặng Thanh Tùng',
  'Bùi Hữu Phúc',
  'Trịnh Văn Đức',
  'Lý Ngọc Linh',
  'Hoàng Yến Nhi',
];

const buildExtraClubCode = (name, index) => {
  const slug = name
    .replace(/^FPT\s+/i, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
    .toUpperCase();
  return `CLB_${slug || 'CLUB'}${index > 0 ? index : ''}`;
};

export const DEFAULT_MASTER_CLUBS = [
  ...MASTER_CLUB_SEEDS.map(([code, name, field, president], i) => ({
    id: `mclub_${i + 1}`,
    code,
    name,
    field,
    president,
    status: i === 7 ? 'inactive' : 'active',
  })),
  ...MASTER_CLUB_EXTRA_NAMES.slice(0, 45 - MASTER_CLUB_SEEDS.length).map((name, i) => {
    const idx = MASTER_CLUB_SEEDS.length + i + 1;
    return {
      id: `mclub_${idx}`,
      code: buildExtraClubCode(name, i),
      name,
      field: MASTER_CLUB_FIELDS[i % MASTER_CLUB_FIELDS.length],
      president: MASTER_CLUB_PRESIDENTS[i % MASTER_CLUB_PRESIDENTS.length],
      status: i % 11 === 0 ? 'inactive' : 'active',
    };
  }),
];

export const STORAGE_KEYS = {
  facilities: 'fe_core_facilities_v1',
  categories: 'fe_core_categories_v3',
  clubs: 'fe_core_master_clubs_v3',
};

const LEGACY_CLUB_STORAGE_KEYS = ['fe_core_master_clubs_v2', 'fe_core_master_clubs_v1'];

const isLegacyCampusField = (value) =>
  typeof value === 'string' && /^FPT(\s|$)/i.test(value.trim());

const normalizeMasterClub = (club, index) => {
  const field = typeof club?.field === 'string' ? club.field.trim() : '';
  const campus = typeof club?.campus === 'string' ? club.campus.trim() : '';
  const fieldLooksLikeCampus = !field || isLegacyCampusField(field) || field === campus;

  if (!fieldLooksLikeCampus) {
    return {
      id: club.id,
      code: club.code,
      name: club.name,
      field,
      president: club.president || '—',
      status: club.status === 'inactive' ? 'inactive' : 'active',
    };
  }

  const matchedDefault = DEFAULT_MASTER_CLUBS.find(
    (item) => item.id === club.id || item.code === club.code,
  );

  if (matchedDefault) {
    return {
      id: club.id || matchedDefault.id,
      code: club.code || matchedDefault.code,
      name: club.name || matchedDefault.name,
      field: matchedDefault.field,
      president: club.president || matchedDefault.president,
      status: club.status === 'inactive' ? 'inactive' : matchedDefault.status,
    };
  }

  return {
    id: club.id || `mclub_${index + 1}`,
    code: club.code || `CLB_${index + 1}`,
    name: club.name || 'Câu lạc bộ',
    field: MASTER_CLUB_FIELDS[index % MASTER_CLUB_FIELDS.length],
    president: club.president || MASTER_CLUB_PRESIDENTS[index % MASTER_CLUB_PRESIDENTS.length],
    status: club.status === 'inactive' ? 'inactive' : 'active',
  };
};

const readLegacyClubLists = () => {
  for (const key of LEGACY_CLUB_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      /* ignore */
    }
  }
  return null;
};

export const loadMasterClubs = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.clubs);
    let parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed) || !parsed.length) {
      parsed = readLegacyClubLists();
    }
    if (!Array.isArray(parsed) || !parsed.length) {
      return DEFAULT_MASTER_CLUBS;
    }

    const normalized = parsed.map((club, index) => normalizeMasterClub(club, index));
    const needsSave = normalized.some((club, index) => {
      const prev = parsed[index];
      return club.field !== prev?.field || club.president !== prev?.president;
    });

    if (needsSave || raw === null) {
      saveStoredList(STORAGE_KEYS.clubs, normalized);
    }

    return normalized;
  } catch {
    return DEFAULT_MASTER_CLUBS;
  }
};

export const loadStoredList = (key, defaults) => {
  if (key === STORAGE_KEYS.clubs) {
    return loadMasterClubs();
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : defaults;
  } catch {
    return defaults;
  }
};

export const saveStoredList = (key, list) => {
  localStorage.setItem(key, JSON.stringify(list));
};
