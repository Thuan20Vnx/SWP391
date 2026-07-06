let XLSX;

const loadXlsx = async () => {
  if (!XLSX) {
    const mod = await import('xlsx-js-style');
    XLSX = mod.default || mod;
  }
  return XLSX;
};

const BRAND = {
  orange: 'F26F21',
  orangeDark: 'C2410C',
  orangeSoft: 'FFF7ED',
  slate: '0F172A',
  slateMuted: '64748B',
  line: 'E2E8F0',
  green: '15803D',
  greenSoft: 'DCFCE7',
  blue: '1D4ED8',
  blueSoft: 'DBEAFE',
  amber: 'B45309',
  amberSoft: 'FEF3C7',
  white: 'FFFFFF',
};

const thinBorder = {
  top: { style: 'thin', color: { rgb: BRAND.line } },
  bottom: { style: 'thin', color: { rgb: BRAND.line } },
  left: { style: 'thin', color: { rgb: BRAND.line } },
  right: { style: 'thin', color: { rgb: BRAND.line } },
};

const styles = {
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
  greenChip: {
    font: { bold: true, color: { rgb: BRAND.green } },
    fill: { patternType: 'solid', fgColor: { rgb: BRAND.greenSoft } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  },
  blueChip: {
    font: { bold: true, color: { rgb: BRAND.blue } },
    fill: { patternType: 'solid', fgColor: { rgb: BRAND.blueSoft } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  },
  amberChip: {
    font: { bold: true, color: { rgb: BRAND.amber } },
    fill: { patternType: 'solid', fgColor: { rgb: BRAND.amberSoft } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  },
};

const pad = (n) => String(n).padStart(2, '0');

const formatDateTime = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const sanitizeFileName = (value) =>
  String(value || 'bao-cao-ctsv')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .slice(0, 72) || 'bao-cao-ctsv';

const statusLabel = (value) => {
  if (value === 'attended') return 'Có mặt';
  if (value === 'cancelled') return 'Đã hủy';
  return 'Đã đăng ký';
};

const sourceLabel = (value) => {
  if (value === 'school') return 'Cấp trường';
  if (value === 'partner') return 'Đối tác';
  if (value === 'club') return 'CLB';
  return value || '';
};

const zebra = (worksheet, ref) => {
  const range = XLSX.utils.decode_range(ref);
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    if ((r - range.s.r) % 2 === 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[addr];
        if (cell?.s && !cell.s.fill) {
          cell.s = { ...cell.s, fill: { patternType: 'solid', fgColor: { rgb: 'FCFCFD' } } };
        }
      }
    }
  }
};

const statusStyle = (value) => {
  if (value === 'attended') return styles.greenChip;
  if (value === 'cancelled') return styles.amberChip;
  return styles.blueChip;
};

const setRows = (worksheet, heights) => {
  worksheet['!rows'] = heights.map((h) => (h ? { hpt: h } : {}));
};

const paintRange = (xlsx, worksheet, ref, style) => {
  const range = xlsx.utils.decode_range(ref);
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = xlsx.utils.encode_cell({ r, c });
      if (!worksheet[addr]) worksheet[addr] = { t: 's', v: '' };
      worksheet[addr].s = style;
    }
  }
};

const exportCtsvReportExcel = async (report) => {
  const xlsx = await loadXlsx();
  const workbook = xlsx.utils.book_new();
  const stats = report.stats || {};

  const summarySheet = xlsx.utils.aoa_to_sheet([
    ['F-EVENTS | BÁO CÁO SAU SỰ KIỆN'],
    [`Xuất lúc ${formatDateTime(new Date())}`],
    [],
    ['THÔNG TIN SỰ KIỆN', '', '', 'CHỈ SỐ TỔNG QUAN', '', '', ''],
    ['Tên sự kiện', report.title || '', '', 'Lượt đăng ký vé', stats.registeredCount ?? 0, 'Sức chứa', stats.totalCapacity ?? 0],
    ['Nguồn', sourceLabel(report.source), '', 'Đã check-in', stats.attendedCount ?? 0, 'Tỷ lệ tham dự', `${stats.attendanceRate ?? 0}%`],
    ['Thời gian', `${report.date || ''} ${report.time || ''}`.trim(), '', 'Đánh giá TB', stats.reviewCount ? `${stats.averageRating}/5` : 'Chưa có', 'Số đánh giá', stats.reviewCount ?? 0],
    ['Địa điểm', report.location || '', '', 'Tỷ lệ lấp đầy', `${stats.fillRate ?? 0}%`, 'Hủy / No-show', `${stats.cancelledCount ?? 0} / ${stats.noShowCount ?? 0}`],
    [],
    ['ĐIỂM NỔI BẬT'],
    ...((report.highlights || []).map((line) => [line])),
  ]);
  summarySheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 3, c: 3 }, e: { r: 3, c: 6 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: 6 } },
  ];
  summarySheet['!cols'] = [
    { wch: 18 },
    { wch: 34 },
    { wch: 3 },
    { wch: 16 },
    { wch: 15 },
    { wch: 16 },
    { wch: 18 },
  ];
  setRows(summarySheet, [30, 22, 8, 24, 26, 26, 26, 26, 8, 22, 24, 24, 24, 24]);
  paintRange(xlsx, summarySheet, 'A1:G1', styles.title);
  paintRange(xlsx, summarySheet, 'A2:G2', styles.subtitle);
  paintRange(xlsx, summarySheet, 'A4:B4', styles.section);
  paintRange(xlsx, summarySheet, 'D4:G4', styles.section);
  paintRange(xlsx, summarySheet, 'A10:G10', styles.section);
  paintRange(xlsx, summarySheet, 'A5:A8', styles.label);
  paintRange(xlsx, summarySheet, 'D5:D8', styles.label);
  paintRange(xlsx, summarySheet, 'F5:F8', styles.label);
  paintRange(xlsx, summarySheet, 'B5:B8', styles.value);
  paintRange(xlsx, summarySheet, 'E5:E8', styles.metricValue);
  paintRange(xlsx, summarySheet, 'G5:G8', styles.metricValue);
  for (let row = 10; row < 10 + (report.highlights || []).length; row += 1) {
    paintRange(xlsx, summarySheet, `A${row + 1}:G${row + 1}`, styles.value);
  }
  xlsx.utils.book_append_sheet(workbook, summarySheet, 'Tong quan');

  const registrationRows = (report.recentRegistrations || []).map((row, index) => [
    index + 1,
    row.name || '',
    row.email || '',
    statusLabel(row.status),
    row.registeredAt || '',
  ]);
  const regLastRow = Math.max(registrationRows.length + 4, 5);
  const registrationSheet = xlsx.utils.aoa_to_sheet([
    ['F-EVENTS | DANH SÁCH SINH VIÊN'],
    [report.title || ''],
    [],
    ['STT', 'Sinh viên', 'Email', 'Trạng thái', 'Ngày đăng ký'],
    ...registrationRows,
  ]);
  registrationSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ];
  registrationSheet['!cols'] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 32 },
    { wch: 16 },
    { wch: 16 },
  ];
  registrationSheet['!autofilter'] = { ref: `A4:E${regLastRow}` };
  registrationSheet['!freeze'] = { ySplit: 4, topLeftCell: 'A5', activePane: 'bottomLeft', state: 'frozen' };
  setRows(registrationSheet, [30, 24, 8, 24, ...registrationRows.map(() => 22)]);
  paintRange(xlsx, registrationSheet, 'A1:E1', styles.title);
  paintRange(xlsx, registrationSheet, 'A2:E2', styles.subtitle);
  paintRange(xlsx, registrationSheet, 'A4:E4', styles.tableHeader);
  if (registrationRows.length) {
    registrationRows.forEach((row, idx) => {
      const r = idx + 5;
      paintRange(xlsx, registrationSheet, `A${r}:A${r}`, styles.tableCenter);
      paintRange(xlsx, registrationSheet, `B${r}:C${r}`, styles.tableCell);
      paintRange(xlsx, registrationSheet, `D${r}:D${r}`, statusStyle(report.recentRegistrations[idx]?.status));
      paintRange(xlsx, registrationSheet, `E${r}:E${r}`, styles.tableCenter);
    });
    zebra(registrationSheet, `A5:C${regLastRow}`);
    zebra(registrationSheet, `E5:E${regLastRow}`);
  } else {
    registrationSheet.A5 = { t: 's', v: 'Chưa có sinh viên đăng ký.' };
    registrationSheet['!merges'].push({ s: { r: 4, c: 0 }, e: { r: 4, c: 4 } });
    paintRange(xlsx, registrationSheet, 'A5:E5', styles.value);
  }
  xlsx.utils.book_append_sheet(workbook, registrationSheet, 'Sinh vien');

  const reviewRows = (report.recentReviews || []).map((row, index) => [
    index + 1,
    row.authorName || '',
    row.rating || '',
    row.comment || '',
    formatDateTime(row.createdAt),
  ]);
  const avgLine = stats.reviewCount
    ? `Điểm trung bình: ${stats.averageRating}/5 · ${stats.reviewCount} lượt đánh giá`
    : 'Chưa có lượt đánh giá nào cho sự kiện này.';
  const reviewLastRow = Math.max(reviewRows.length + 4, 5);
  const reviewSheet = xlsx.utils.aoa_to_sheet([
    ['F-EVENTS | ĐÁNH GIÁ SỰ KIỆN'],
    [avgLine],
    [],
    ['STT', 'Người gửi', 'Điểm', 'Nội dung', 'Thời gian'],
    ...reviewRows,
  ]);
  reviewSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ];
  reviewSheet['!cols'] = [
    { wch: 8 },
    { wch: 24 },
    { wch: 10 },
    { wch: 56 },
    { wch: 18 },
  ];
  reviewSheet['!freeze'] = { ySplit: 4, topLeftCell: 'A5', activePane: 'bottomLeft', state: 'frozen' };
  setRows(reviewSheet, [30, 24, 8, 24, ...reviewRows.map(() => 34)]);
  paintRange(xlsx, reviewSheet, 'A1:E1', styles.title);
  paintRange(xlsx, reviewSheet, 'A2:E2', styles.subtitle);
  paintRange(xlsx, reviewSheet, 'A4:E4', styles.tableHeader);
  if (reviewRows.length) {
    reviewRows.forEach((row, idx) => {
      const r = idx + 5;
      paintRange(xlsx, reviewSheet, `A${r}:A${r}`, styles.tableCenter);
      paintRange(xlsx, reviewSheet, `B${r}:B${r}`, styles.tableCell);
      paintRange(xlsx, reviewSheet, `C${r}:C${r}`, styles.tableCenter);
      paintRange(xlsx, reviewSheet, `D${r}:D${r}`, styles.tableCell);
      paintRange(xlsx, reviewSheet, `E${r}:E${r}`, styles.tableCenter);
    });
    zebra(reviewSheet, `A5:B${reviewLastRow}`);
    zebra(reviewSheet, `D5:E${reviewLastRow}`);
  } else {
    reviewSheet.A5 = { t: 's', v: 'Chưa có lượt đánh giá nào.' };
    reviewSheet['!merges'].push({ s: { r: 4, c: 0 }, e: { r: 4, c: 4 } });
    paintRange(xlsx, reviewSheet, 'A5:E5', styles.value);
  }
  xlsx.utils.book_append_sheet(workbook, reviewSheet, 'Danh gia');

  xlsx.writeFile(workbook, `${sanitizeFileName(report.title)}-bao-cao-su-kien.xlsx`);
};

export default exportCtsvReportExcel;
