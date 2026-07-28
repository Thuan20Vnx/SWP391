export const TICKET_AUDIENCE_VALUES = ['SV FPT', 'Khách ngoài trường', 'Tất cả'];

export const TICKET_AUDIENCE_OPTIONS = [
  { value: 'SV FPT', label: 'Sinh viên' },
  { value: 'Khách ngoài trường', label: 'Khách' },
  { value: 'Tất cả', label: 'Tất cả' },
];

export const DEFAULT_EVENT_TICKETS = [
  { id: 1, name: 'Vé sinh viên', audience: 'SV FPT', qty: 50, priceAmount: 0 },
  { id: 2, name: 'Vé khách mời', audience: 'Khách ngoài trường', qty: 10, priceAmount: 0 },
];

let _ticketRowSeq = 100;

export const createEmptyTicketRow = (overrides = {}) => ({
  id: ++_ticketRowSeq,
  name: '',
  audience: 'SV FPT',
  qty: 0,
  priceAmount: 0,
  ...overrides,
});

export const formatTicketPriceLabel = (priceAmount) => {
  const n = Math.max(0, Number(priceAmount) || 0);
  return n > 0 ? `${n.toLocaleString('vi-VN')} VNĐ` : 'Miễn phí';
};

export const audienceLabel = (audience) => {
  const opt = TICKET_AUDIENCE_OPTIONS.find((o) => o.value === audience);
  return opt?.label || audience || '—';
};

// Nhóm vai trò được coi là "nội bộ FPT" cho mục đích khớp vé (đồng bộ BE eventPricing).
const STUDENT_SIDE_ROLES = new Set(['student', 'staff', 'partner']);

/**
 * Sự kiện đang mở cho nhóm đối tượng nào, suy từ các loại vé còn mở (qty > 0).
 * Không khai báo ticketTypes (dữ liệu cũ) → không ràng buộc.
 */
export const resolveEventAudiences = (ticketTypes = []) => {
  const open = (Array.isArray(ticketTypes) ? ticketTypes : []).filter(
    (t) => (Number(t.qty) || 0) > 0
  );
  if (!open.length) return { allowsStudent: true, allowsGuest: true, restricted: false };
  const set = new Set(open.map((t) => t.audience || 'SV FPT'));
  const allowsStudent = set.has('SV FPT') || set.has('Tất cả');
  const allowsGuest = set.has('Khách ngoài trường') || set.has('Tất cả');
  return { allowsStudent, allowsGuest, restricted: true };
};

/**
 * Vai trò người xem có được phép đăng ký sự kiện theo đối tượng vé không.
 * Chỉ kết luận cho khách và nhóm nội bộ FPT; vai trò quản lý để BE quyết định (không chặn nút).
 */
export const isRoleAudienceAllowed = (role, ticketTypes = []) => {
  const { allowsStudent, allowsGuest, restricted } = resolveEventAudiences(ticketTypes);
  if (!restricted) return true;
  const r = String(role || 'guest').toLowerCase();
  if (r === 'guest') return allowsGuest;
  if (STUDENT_SIDE_ROLES.has(r)) return allowsStudent;
  return true;
};

/**
 * Nhãn ngắn cho thẻ sự kiện: vé mở cho sinh viên, khách, hay cả hai.
 * Trả về '' khi sự kiện không khai báo loại vé (dữ liệu cũ) — không hiển thị gì.
 */
export const ticketAudienceSummaryLabel = (ticketTypes = []) => {
  const { allowsStudent, allowsGuest, restricted } = resolveEventAudiences(ticketTypes);
  if (!restricted) return '';
  if (allowsStudent && allowsGuest) return 'Vé sinh viên và khách';
  if (allowsStudent) return 'Vé sinh viên';
  if (allowsGuest) return 'Vé khách';
  return '';
};

const clampPercent = (filled, total) => {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((Math.max(0, filled) / total) * 100));
};

/**
 * Tách tiến độ đăng ký theo nhóm vé để thẻ sự kiện không gộp chung một thanh —
 * gộp chung thì không biết hết chỗ là hết vé sinh viên hay vé khách.
 *
 * Trả về mode:
 *   'split'  — có cả vé sinh viên lẫn vé khách, hiển thị hai thanh
 *   'student'/'guest' — chỉ mở cho một nhóm, ghi rõ nhóm đó
 *   'shared' — loại vé dùng chung ('Tất cả')
 *   'legacy' — sự kiện cũ không khai báo loại vé, giữ thanh tổng như trước
 */
export const resolveTicketAudienceProgress = ({
  ticketTypes = [],
  capacity = 0,
  registeredCount = 0,
  studentRegisteredCount = 0,
} = {}) => {
  const rows = Array.isArray(ticketTypes) ? ticketTypes : [];
  const qtyOf = (audience) =>
    rows
      .filter((t) => (t.audience || 'SV FPT') === audience)
      .reduce((sum, t) => sum + Math.max(0, Number(t.qty) || 0), 0);

  const studentTotal = qtyOf('SV FPT');
  const guestTotal = qtyOf('Khách ngoài trường');
  const sharedTotal = qtyOf('Tất cả');

  const total = Math.max(0, Number(capacity) || 0);
  const filled = Math.max(0, Number(registeredCount) || 0);
  const studentFilled = Math.min(filled, Math.max(0, Number(studentRegisteredCount) || 0));
  const guestFilled = Math.max(0, filled - studentFilled);

  if (!rows.length) {
    return { mode: 'legacy', groups: [] };
  }
  if (sharedTotal > 0 && studentTotal === 0 && guestTotal === 0) {
    return {
      mode: 'shared',
      groups: [
        { key: 'shared', label: 'Sinh viên và khách', filled, total: sharedTotal || total, percent: clampPercent(filled, sharedTotal || total) },
      ],
    };
  }

  const groups = [];
  if (studentTotal > 0) {
    groups.push({ key: 'student', label: 'Sinh viên', filled: studentFilled, total: studentTotal, percent: clampPercent(studentFilled, studentTotal) });
  }
  if (guestTotal > 0) {
    groups.push({ key: 'guest', label: 'Khách ngoài trường', filled: guestFilled, total: guestTotal, percent: clampPercent(guestFilled, guestTotal) });
  }

  if (!groups.length) return { mode: 'legacy', groups: [] };
  if (groups.length === 1) return { mode: groups[0].key, groups };
  return { mode: 'split', groups };
};

export const totalTicketQty = (tickets = []) =>
  (tickets || []).reduce((sum, t) => sum + Math.max(0, Number(t.qty) || 0), 0);

export const deriveTicketPriceFromTypes = (tickets = []) => {
  const paid = (tickets || []).filter((t) => (Number(t.priceAmount) || 0) > 0);
  if (!paid.length) return 0;
  return Math.max(...paid.map((t) => Number(t.priceAmount) || 0));
};

export const mapTicketTypesFromApi = (ticketTypes, fallbackCapacity = 100, legacyTicketPrice = 0) => {
  if (Array.isArray(ticketTypes) && ticketTypes.length) {
    return ticketTypes.map((t, i) => ({
      id: i + 1,
      name: t.name || '',
      audience: TICKET_AUDIENCE_VALUES.includes(t.audience) ? t.audience : 'SV FPT',
      qty: Number(t.qty ?? t.quantity) || 0,
      priceAmount:
        t.priceType === 'paid' ? Math.max(0, Number(t.priceAmount) || 0) : 0,
    }));
  }
  const cap = Math.max(1, Number(fallbackCapacity) || 100);
  const price = Math.max(0, Number(legacyTicketPrice) || 0);
  return [
    {
      id: 1,
      name: price > 0 ? 'Vé tham dự' : 'Vé miễn phí',
      audience: 'SV FPT',
      qty: cap,
      priceAmount: price,
    },
  ];
};

export const normalizeFormTicketTypes = (tickets = []) =>
  (tickets || []).map((t) => {
    const priceAmount = Math.max(0, Number(t.priceAmount) || 0);
    return {
      name: String(t.name || '').trim() || 'Vé tham dự',
      priceType: priceAmount > 0 ? 'paid' : 'free',
      priceAmount,
      qty: Math.max(0, Number(t.qty) || 0),
      audience: t.audience || 'SV FPT',
    };
  });

export const formatTicketTypesSummary = (tickets = []) => {
  const rows = tickets || [];
  if (!rows.length) return 'Chưa có loại vé';
  return rows
    .map((t) => {
      const qty = Number(t.qty) || 0;
      const price = formatTicketPriceLabel(t.priceAmount);
      const who = audienceLabel(t.audience);
      const name = t.name?.trim() || 'Vé';
      return `${name} (${who}): ${qty} × ${price}`;
    })
    .join(' · ');
};

export const validateTicketTypesStep = (form) => {
  const tickets = form.ticketTypes || [];
  if (!tickets.length) {
    return 'Vui lòng thêm ít nhất một loại vé.';
  }
  const invalid = tickets.find((t) => !String(t.name || '').trim() || !(Number(t.qty) > 0));
  if (invalid) {
    return 'Mỗi loại vé cần tên và số lượng lớn hơn 0.';
  }
  const total = totalTicketQty(tickets);
  const max = parseInt(form.maxSlots, 10) || 0;
  if (max > 0 && total > max) {
    return `Tổng số vé (${total}) vượt quá số lượng tối đa (${max}).`;
  }
  return null;
};
