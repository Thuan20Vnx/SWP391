/** Hệ thống FPT — đơn vị điều phối + CLB */

import { localizeClubItem } from './clubDiscoveryData';

export const FPT_UNIT_TYPES = [
  { id: 'all', labelKey: 'admin.fpt.filter.all' },
  { id: 'clb', labelKey: 'admin.fpt.filter.clb' },
  { id: 'partner', labelKey: 'admin.fpt.filter.partner' },
  { id: 'ctsv', labelKey: 'admin.fpt.filter.ctsv' },
  { id: 'icpdp', labelKey: 'admin.fpt.filter.icpdp' },
];

export const FPT_SORT_OPTIONS = [
  { value: 'name_asc', labelKey: 'admin.fpt.sort.nameAsc' },
  { value: 'name_desc', labelKey: 'admin.fpt.sort.nameDesc' },
  { value: 'members_desc', labelKey: 'admin.fpt.sort.membersDesc' },
  { value: 'newest', labelKey: 'admin.fpt.sort.newest' },
];

export const FPT_TYPE_META = {
  clb: {
    labelKey: 'clubs.badge',
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
    labelKey: 'admin.fpt.type.partner',
    badgeClass: 'admin-fpt-unit-card__badge--partner',
    accent: '#059669',
  },
};

const DEPT_TEMPLATE = {
  ctsv: {
    id: 'dept-ctsv',
    type: 'ctsv',
    nameKey: 'admin.fpt.dept.ctsv.name',
    subtitleKey: 'admin.fpt.dept.ctsv.subtitle',
    descriptionKey: 'admin.fpt.dept.ctsv.desc',
    coverImage:
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
    tags: ['ctsv', 'công tác sinh viên', 'phê duyệt', 'đối tác'],
    manageLink: '/admin/events',
    manageLabelKey: 'admin.fpt.dept.ctsv.manage',
    detailLink: '/dept/ctsv',
    notifyLink: '/admin/announcements',
    accountsRole: 'ctsv',
    roleLabelKey: 'admin.fpt.dept.ctsv.roleLabel',
  },
  icpdp: {
    id: 'dept-icpdp',
    type: 'icpdp',
    nameKey: 'admin.fpt.dept.icpdp.name',
    subtitleKey: 'admin.fpt.dept.icpdp.subtitle',
    descriptionKey: 'admin.fpt.dept.icpdp.desc',
    coverImage:
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
    tags: ['icpdp', 'quốc tế', 'đề xuất', 'clb'],
    manageLink: '/admin/icpdp/club-registrations',
    manageLabelKey: 'admin.fpt.dept.icpdp.manage',
    clubRegistrationLink: '/admin/icpdp/club-registrations',
    detailLink: '/dept/icpdp',
    notifyLink: '/admin/announcements',
    accountsRole: 'icpdp',
    roleLabelKey: 'admin.fpt.dept.icpdp.roleLabel',
  },
};

export const localizeDepartmentUnit = (unit, t) => {
  if (!unit) return unit;
  return {
    ...unit,
    name: unit.nameKey ? t(unit.nameKey) : unit.name,
    subtitle: unit.subtitleKey ? t(unit.subtitleKey) : unit.subtitle,
    description: unit.descriptionOverride || (unit.descriptionKey ? t(unit.descriptionKey) : unit.description),
    manageLabel: unit.manageLabelKey ? t(unit.manageLabelKey) : unit.manageLabel,
    roleLabel: unit.roleLabelKey ? t(unit.roleLabelKey) : unit.roleLabel,
  };
};

export const resolveFptTypeLabel = (type, t) => {
  const meta = FPT_TYPE_META[type] || FPT_TYPE_META.clb;
  return meta.labelKey ? t(meta.labelKey) : meta.label;
};

export const buildDepartmentUnits = ({ ctsvStaff = 0, icpdpStaff = 0 } = {}) =>
  Object.entries(DEPT_TEMPLATE).map(([key, tpl]) => ({
    ...tpl,
    staffCount: key === 'ctsv' ? ctsvStaff : icpdpStaff,
    isDepartment: true,
  }));

export const mapPartnerToFptUnit = (partner, t) => ({
  id: `partner-${partner._id}`,
  partnerId: partner._id,
  type: 'partner',
  name: partner.name,
  subtitle:
    partner.category ||
    partner.proposedEventTitle ||
    (t ? t('admin.fpt.partner.fallbackSubtitle') : 'Doanh nghiệp đối tác'),
  description:
    partner.description?.trim() ||
    [partner.representative && t?.('admin.fpt.partner.representative', { name: partner.representative }), partner.email]
      .filter(Boolean)
      .join(' · ') ||
    (t ? t('admin.fpt.partner.fallbackDesc') : 'Đối tác trong hệ sinh thái F-Events'),
  status: partner.status,
  statusLabel: partner.statusLabel,
  coverImage: partner.logo || '',
  logoText: partner.logoText,
  logoColor: '#059669',
  detailLink: `/partners/${partner._id}`,
  manageLink:
    partner.status === 'pending_admin'
      ? `/partners/${partner._id}`
      : '/admin/partners',
  manageLabel:
    partner.status === 'pending_admin'
      ? t?.('admin.fpt.partner.approve') || 'Phê duyệt'
      : t?.('admin.fpt.partner.manage') || 'Quản lý đối tác',
  approveLink: `/admin/unit-events/partner/${partner._id}?name=${encodeURIComponent(partner.name || '')}`,
  notifyLink: `/admin/unit-notify/partner/${partner._id}?name=${encodeURIComponent(partner.name || '')}`,
  approvalLink: '/admin/partners/approvals',
  tags: [partner.category, partner.proposedEventTitle].filter(Boolean),
  createdAt: partner.createdAt,
});

export const mapClubToFptUnit = (club, t) => {
  const localized = t ? localizeClubItem(club, t) : club;
  return {
    id: `club-${club.id}`,
    type: 'clb',
    name: club.name,
    subtitle: localized.category,
    description: localized.description,
    memberCount: club.memberCount ?? 0,
    category: club.category,
    coverImage: club.coverImage,
    logoText: club.logoText,
    logoColor: club.logoColor,
    detailLink: `/clubs/${club.id}`,
    manageLink: `/clubs/${club.id}`,
    manageLabel: t?.('admin.fpt.club.view') || 'Xem CLB',
    approveLink: `/admin/unit-events/clb/${encodeURIComponent(club.id)}?name=${encodeURIComponent(club.name || '')}`,
    notifyLink: `/admin/unit-notify/clb/${encodeURIComponent(club.id)}?name=${encodeURIComponent(club.name || '')}`,
    link: `/clubs/${club.id}`,
    clubSlug: club.id,
    tags: [...(club.tags || []), club.category].filter(Boolean),
  };
};

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

export const sortFptUnits = (units, sortBy = 'name_asc') => {
  const list = [...units];
  const byName = (a, b, dir) => {
    const cmp = String(a.name || '').localeCompare(String(b.name || ''), 'vi');
    return dir === 'desc' ? -cmp : cmp;
  };
  const getMemberCount = (unit) => unit.memberCount ?? unit.staffCount ?? 0;

  list.sort((a, b) => {
    if (sortBy === 'name_desc') return byName(a, b, 'desc');
    if (sortBy === 'members_desc') {
      const diff = getMemberCount(b) - getMemberCount(a);
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

/** @deprecated use sortFptUnits */
export const sortClubs = sortFptUnits;

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
