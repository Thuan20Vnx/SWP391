/**
 * Bảng màu + style dùng chung cho các file Excel xuất ra từ hệ thống, để mọi báo cáo
 * nhìn giống nhau thay vì mỗi file một kiểu.
 */
let XLSX;

export const loadXlsx = async () => {
  if (!XLSX) {
    const mod = await import('xlsx-js-style');
    XLSX = mod.default || mod;
  }
  return XLSX;
};

export const BRAND = {
  orange: 'F26F21',
  orangeDark: 'C2410C',
  orangeSoft: 'FFF7ED',
  slate: '0F172A',
  slateMuted: '64748B',
  line: 'E2E8F0',
  zebra: 'FCFCFD',
  white: 'FFFFFF',
};

export const thinBorder = {
  top: { style: 'thin', color: { rgb: BRAND.line } },
  bottom: { style: 'thin', color: { rgb: BRAND.line } },
  left: { style: 'thin', color: { rgb: BRAND.line } },
  right: { style: 'thin', color: { rgb: BRAND.line } },
};

export const styles = {
  title: {
    font: { bold: true, sz: 18, color: { rgb: BRAND.white } },
    fill: { patternType: 'solid', fgColor: { rgb: BRAND.orange } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  subtitle: {
    font: { sz: 11, color: { rgb: BRAND.slateMuted } },
    fill: { patternType: 'solid', fgColor: { rgb: BRAND.orangeSoft } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  section: {
    font: { bold: true, sz: 12, color: { rgb: BRAND.orangeDark } },
    fill: { patternType: 'solid', fgColor: { rgb: BRAND.orangeSoft } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder,
  },
  label: {
    font: { bold: true, color: { rgb: BRAND.slateMuted } },
    fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: thinBorder,
  },
  value: {
    font: { color: { rgb: BRAND.slate } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: thinBorder,
  },
  metricValue: {
    font: { bold: true, sz: 16, color: { rgb: BRAND.orangeDark } },
    fill: { patternType: 'solid', fgColor: { rgb: BRAND.orangeSoft } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  },
  tableHeader: {
    font: { bold: true, color: { rgb: BRAND.white } },
    fill: { patternType: 'solid', fgColor: { rgb: BRAND.slate } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: thinBorder,
  },
  tableCell: {
    font: { color: { rgb: BRAND.slate } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: thinBorder,
  },
  tableCenter: {
    font: { color: { rgb: BRAND.slate } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: thinBorder,
  },
};

/** Tô style cho một vùng ô ("A1:G1"), tạo ô rỗng nếu chưa có. */
export const paintRange = (xlsx, worksheet, ref, style) => {
  const range = xlsx.utils.decode_range(ref);
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = xlsx.utils.encode_cell({ r, c });
      if (!worksheet[addr]) worksheet[addr] = { t: 's', v: '' };
      worksheet[addr].s = style;
    }
  }
};

/** Kẻ nền xen kẽ cho vùng dữ liệu để bảng dài dễ đọc. */
export const zebraRange = (xlsx, worksheet, ref) => {
  const range = xlsx.utils.decode_range(ref);
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    if ((r - range.s.r) % 2 === 0) continue;
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cell = worksheet[xlsx.utils.encode_cell({ r, c })];
      if (cell?.s && !cell.s.fill) {
        cell.s = { ...cell.s, fill: { patternType: 'solid', fgColor: { rgb: BRAND.zebra } } };
      }
    }
  }
};

/**
 * Ép ô về kiểu số để Excel sort/sum/vẽ biểu đồ được, kèm định dạng hiển thị
 * (ví dụ '0"%"' vẫn ra "80%" nhưng giá trị thật là số 80).
 */
export const setNumberFormat = (xlsx, worksheet, ref, numFmt) => {
  const range = xlsx.utils.decode_range(ref);
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cell = worksheet[xlsx.utils.encode_cell({ r, c })];
      if (!cell || cell.v === '' || cell.v === null || cell.v === undefined) continue;
      const num = Number(cell.v);
      if (Number.isNaN(num)) continue;
      cell.t = 'n';
      cell.v = num;
      if (numFmt) cell.z = numFmt;
    }
  }
};

export const setRowHeights = (worksheet, heights) => {
  worksheet['!rows'] = heights.map((h) => (h ? { hpt: h } : {}));
};

export const setCols = (worksheet, widths) => {
  worksheet['!cols'] = widths.map((wch) => ({ wch }));
};

/**
 * Giữ nguyên dấu tiếng Việt trong tên file, chỉ bỏ ký tự Windows/macOS không cho phép
 * và đổi '/' thành '-' (kỳ báo cáo dạng "Tháng 07/2026").
 */
export const sanitizeFileName = (value, fallback = 'bao-cao') =>
  String(value || fallback)
    .replace(/[\\/]/g, '-')
    .replace(/[:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90) || fallback;
