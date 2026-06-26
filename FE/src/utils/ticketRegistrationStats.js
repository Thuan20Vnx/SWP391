/** Gắn số đăng ký theo loại vé để hiển thị progress (ưu tiên registeredCount từ API, fallback tổng khi chỉ 1 loại). */
export const mapTicketTypesWithProgress = (ticketTypes = [], totalRegistered = 0) => {
  const list = (ticketTypes || []).filter((t) => t?.name || t?.qty || t?.quantity);
  if (!list.length) return [];

  if (list.length === 1) {
    const qty = Number(list[0].qty ?? list[0].quantity) || 0;
    const reg = Number(list[0].registeredCount ?? totalRegistered) || 0;
    return [{ ...list[0], qty, registeredCount: reg }];
  }

  return list.map((t) => {
    const qty = Number(t.qty ?? t.quantity) || 0;
    const reg = Number(t.registeredCount ?? 0) || 0;
    return { ...t, qty, registeredCount: reg };
  });
};

export const getTicketFillPct = (registered, qty) => {
  if (!qty || qty <= 0) return 0;
  return Math.min(100, Math.round((registered / qty) * 100));
};
