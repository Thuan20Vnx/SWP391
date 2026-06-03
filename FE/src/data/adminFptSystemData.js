/** Hệ thống FPT — đơn vị điều phối + CLB */

export const FPT_UNIT_TYPES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'clb', label: 'CLB' },
  { id: 'partner', label: 'Đối tác' },
  { id: 'ctsv', label: 'CTSV' },
  { id: 'icpdp', label: 'ICPDP' },
];

export const FPT_SORT_OPTIONS = [
  { value: 'name_asc', label: 'Tên A → Z' },
  { value: 'name_desc', label: 'Tên Z → A' },
  { value: 'members_desc', label: 'Nhiều thành viên' },
  { value: 'newest', label: 'Mới nhất' },
];

export const FPT_TYPE_META = {
  clb: {
    label: 'CLB',
    badgeClass: 'admin-fpt-unit-card__badge--clb',
    accent: '#f26f21',
  },
  ctsv: {
    label: 'CTSV',
    badgeClass: 'admin-fpt-unit-card__badge--ctsv',
    accent: '#006494',
  },
  icpdp: {
    label: 'ICPDP',
    badgeClass: 'admin-fpt-unit-card__badge--icpdp',
    accent: '#7c3aed',
  },
  partner: {
    label: 'Đối tác',
    badgeClass: 'admin-fpt-unit-card__badge--partner',
    accent: '#059669',
  },
};

const DEPT_TEMPLATE = {
  ctsv: {
    id: 'dept-ctsv',
    type: 'ctsv',
    name: 'Phòng Công tác Sinh viên',
    subtitle: 'CTSV · FPT University Đà Nẵng',
    description:
      'Phê duyệt sự kiện cấp trường, quản lý đối tác và điều phối hoạt động ngoại khóa toàn campus.',
    coverImage:
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
    tags: ['ctsv', 'công tác sinh viên', 'phê duyệt', 'đối tác'],
    manageLink: '/admin/events',
    manageLabel: 'Duyệt sự kiện',
    detailLink: '/admin/accounts?role=ctsv',
    accountsRole: 'ctsv',
  },
  icpdp: {
    id: 'dept-icpdp',
    type: 'icpdp',
    name: 'IC-PDP · Chương trình Quốc tế',
    subtitle: 'ICPDP · FPT University Đà Nẵng',
    description:
      'Tiếp nhận đề xuất sự kiện quốc tế, phối hợp CLB và sinh viên chương trình liên kết.',
    coverImage:
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
    tags: ['icpdp', 'quốc tế', 'đề xuất', 'clb'],
    manageLink: '/admin/event-requests',
    manageLabel: 'Yêu cầu sự kiện',
    detailLink: '/admin/accounts?role=icpdp',
    accountsRole: 'icpdp',
  },
};

export const buildDepartmentUnits = ({ ctsvStaff = 0, icpdpStaff = 0 } = {}) =>
  Object.entries(DEPT_TEMPLATE).map(([key, tpl]) => ({
    ...tpl,
    staffCount: key === 'ctsv' ? ctsvStaff : icpdpStaff,
    isDepartment: true,
  }));

export const mapPartnerToFptUnit = (partner) => ({
  id: `partner-${partner._id}`,
  partnerId: partner._id,
  type: 'partner',
  name: partner.name,
  subtitle: partner.category || partner.proposedEventTitle || 'Doanh nghiệp đối tác',
  description:
    partner.description?.trim() ||
    [partner.representative && `Đại diện: ${partner.representative}`, partner.email]
      .filter(Boolean)
      .join(' · ') ||
    'Đối tác trong hệ sinh thái F-Events',
  status: partner.status,
  statusLabel: partner.statusLabel,
  coverImage: partner.logo || '',
  logoText: partner.logoText,
  logoColor: '#059669',
  detailLink:
    partner.status === 'pending_admin'
      ? '/admin/partners/approvals'
      : '/admin/partners',
  manageLink: '/admin/partners',
  approvalLink: '/admin/partners/approvals',
  tags: [partner.category, partner.proposedEventTitle].filter(Boolean),
  createdAt: partner.createdAt,
});

export const mapClubToFptUnit = (club) => ({
  id: `club-${club.id}`,
  type: 'clb',
  name: club.name,
  subtitle: club.category,
  description: club.description,
  memberCount: club.memberCount ?? 0,
  category: club.category,
  coverImage: club.coverImage,
  logoText: club.logoText,
  logoColor: club.logoColor,
  detailLink: `/clubs/${club.id}`,
  manageLink: '/admin/data',
  link: `/clubs/${club.id}`,
  tags: [...(club.tags || []), club.category].filter(Boolean),
});

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const filterPartners = (partners, search = '') => {
  const q = normalize(search);
  if (!q) return partners;
  return partners.filter((partner) => {
    const haystack = [
      partner.name,
      partner.subtitle,
      partner.description,
      partner.statusLabel,
      ...(partner.tags || []),
    ].join(' ');
    return normalize(haystack).includes(q);
  });
};

export const filterClubs = (clubs, search = '') => {
  const q = normalize(search);
  if (!q) return clubs;
  return clubs.filter((club) => {
    const haystack = [club.name, club.subtitle, club.description, ...(club.tags || [])].join(' ');
    return normalize(haystack).includes(q);
  });
};

export const sortClubs = (clubs, sortBy = 'name_asc') => {
  const list = [...clubs];
  const byName = (a, b, dir) => {
    const cmp = a.name.localeCompare(b.name, 'vi');
    return dir === 'desc' ? -cmp : cmp;
  };

  list.sort((a, b) => {
    if (sortBy === 'name_desc') return byName(a, b, 'desc');
    if (sortBy === 'members_desc') {
      const diff = (b.memberCount ?? 0) - (a.memberCount ?? 0);
      return diff !== 0 ? diff : byName(a, b, 'asc');
    }
    if (sortBy === 'newest') {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db !== da ? db - da : byName(a, b, 'asc');
    }
    return byName(a, b, 'asc');
  });

  return list;
};

export const buildFptSummary = ({
  clubs = [],
  partners = [],
  pendingPartners = 0,
  ctsvStaff = 0,
  icpdpStaff = 0,
} = {}) => ({
  clb: clubs.length,
  partner: partners.length,
  pendingPartners,
  ctsv: 1,
  icpdp: 1,
  ctsvStaff,
  icpdpStaff,
  all: 2 + clubs.length + partners.length,
});
