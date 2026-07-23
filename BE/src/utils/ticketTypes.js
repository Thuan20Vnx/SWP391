const normalizeTicketTypes = (ticketTypes) => {
  if (!Array.isArray(ticketTypes)) return [];
  return ticketTypes.map((t) => ({
    name: String(t.name || '').trim(),
    priceType: t.priceType === 'paid' ? 'paid' : 'free',
    priceAmount: t.priceType === 'paid' ? Math.max(0, Number(t.priceAmount) || 0) : 0,
    qty: Math.max(0, Number(t.qty) || 0),
    audience: t.audience || 'SV FPT'
  }));
};

/** Giá niêm yết chính — lấy mức cao nhất trong các loại vé có phí. */
const deriveTicketPriceFromTypes = (ticketTypes) => {
  const paid = normalizeTicketTypes(ticketTypes).filter(
    (t) => t.priceType === 'paid' && t.priceAmount > 0
  );
  if (paid.length === 0) return 0;
  return Math.max(...paid.map((t) => t.priceAmount));
};

const totalQtyFromTypes = (ticketTypes) =>
  normalizeTicketTypes(ticketTypes).reduce((sum, t) => sum + (t.qty || 0), 0);

/**
 * Gắn số chỗ đã dùng cho từng loại vé để FE vẽ thanh "x/50 đã đăng ký".
 * Event không lưu counter theo từng loại vé — chỉ có registeredCount tổng và
 * studentRegisteredCount (phần nhóm SV/nội bộ) — nên chia số của mỗi nhóm cho
 * các loại vé thuộc nhóm đó theo thứ tự khai báo, cắt theo qty từng loại.
 */
const attachTicketRegistrationCounts = (ticketTypes, counts = {}) => {
  if (!Array.isArray(ticketTypes) || !ticketTypes.length) return ticketTypes || [];
  const total = Math.max(0, Number(counts.registeredCount) || 0);
  let remainStudent = Math.min(total, Math.max(0, Number(counts.studentRegisteredCount) || 0));
  let remainGuest = total - remainStudent;
  return ticketTypes.map((t) => {
    const plain = typeof t.toObject === 'function' ? t.toObject() : { ...t };
    const qty = Math.max(0, Number(plain.qty) || 0);
    const cap = qty > 0 ? qty : Infinity;
    const audience = plain.audience || 'SV FPT';
    let used;
    if (audience === 'Khách ngoài trường') {
      used = Math.min(cap, remainGuest);
      remainGuest -= used;
    } else if (audience === 'Tất cả') {
      used = Math.min(cap, remainStudent + remainGuest);
      const fromStudent = Math.min(remainStudent, used);
      remainStudent -= fromStudent;
      remainGuest -= used - fromStudent;
    } else {
      used = Math.min(cap, remainStudent);
      remainStudent -= used;
    }
    return { ...plain, registeredCount: used };
  });
};

module.exports = {
  normalizeTicketTypes,
  deriveTicketPriceFromTypes,
  totalQtyFromTypes,
  attachTicketRegistrationCounts
};
