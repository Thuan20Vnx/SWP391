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
  lineSoft: 'F1F5F9',
  green: '16A34A',
  greenSoft: 'DCFCE7',
  amber: 'D97706',
  amberSoft: 'FEF3C7',
  red: 'DC2626',
  redSoft: 'FEE2E2',
  blue: '2563EB',
  blueSoft: 'DBEAFE',
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
    font: { bold: true, sz: 11, color: { rgb: BRAND.slateMuted } },
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
  kpiLabel: {
    font: { bold: true, sz: 10, color: { rgb: BRAND.slateMuted } },
    fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  },
  kpiValue: {
    font: { bold: true, sz: 18, color: { rgb: BRAND.orangeDark } },
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
  note: {
    font: { italic: true, color: { rgb: BRAND.slateMuted } },
    fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: thinBorder,
  },
};

const pad = (n) => String(n).padStart(2, '0');

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateTime = (value) => {
  const d = toDate(value);
  if (!d) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDate = (value) => {
  const d = toDate(value);
  if (!d) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const statusLabel = (status) => {
  if (status === 'checked-in' || status === 'attended') return 'Đã check-in';
  if (status === 'cancelled' || status === 'canceled') return 'Đã hủy';
  return 'Chưa check-in';
};

const statusStyle = (label) => {
  if (label === 'Đã check-in') {
    return {
      font: { bold: true, color: { rgb: BRAND.green } },
      fill: { patternType: 'solid', fgColor: { rgb: BRAND.greenSoft } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    };
  }
  if (label === 'Đã hủy') {
    return {
      font: { bold: true, color: { rgb: BRAND.red } },
      fill: { patternType: 'solid', fgColor: { rgb: BRAND.redSoft } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    };
  }
  return {
    font: { bold: true, color: { rgb: BRAND.amber } },
    fill: { patternType: 'solid', fgColor: { rgb: BRAND.amberSoft } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };
};

const sanitizeFileName = (value) =>
  String(value || 'danh-sach-sv')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .slice(0, 70) || 'danh-sach-sv';

const encodeCell = (row, col) => XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });

const ensureCell = (worksheet, row, col) => {
  const addr = encodeCell(row, col);
  if (!worksheet[addr]) worksheet[addr] = { t: 's', v: '' };
  return worksheet[addr];
};

const setCellStyle = (worksheet, row, col, style) => {
  ensureCell(worksheet, row, col).s = style;
};

const setRangeStyle = (worksheet, rangeRef, style) => {
  const range = XLSX.utils.decode_range(rangeRef);
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[addr]) worksheet[addr] = { t: 's', v: '' };
      worksheet[addr].s = style;
    }
  }
};

const setRows = (worksheet, heights) => {
  worksheet['!rows'] = heights.map((h) => (h ? { hpt: h } : {}));
};

const getStudentName = (student = {}) =>
  student.fullname || student.fullName || student.name || student.displayName || '';

const buildStudentRows = (students) =>
  students.map((row, index) => {
    const s = row.student || row.user || {};
    const registeredAt = row.createdAt || row.registeredAt || row.registrationTime;
    const checkinAt = row.checkinAt || row.checkInAt || row.checkedInAt || row.attendedAt;
    const checkoutAt = row.checkoutAt || row.checkOutAt || row.checkedOutAt;
    const status = statusLabel(row.status);
    return {
      no: index + 1,
      studentId: s.studentId || s.code || '',
      name: getStudentName(s),
      email: s.email || row.email || '',
      phone: s.phone || s.phoneNumber || row.phone || '',
      ticketType: row.ticketType || row.ticketName || row.ticket || '',
      registeredAt: formatDateTime(registeredAt),
      status,
      checkinAt: formatDateTime(checkinAt),
      checkoutAt: formatDateTime(checkoutAt),
      hasCheckin: Boolean(checkinAt),
      hasCheckout: Boolean(checkoutAt),
      note: row.note || row.cancelReason || '',
    };
  });

const getEventDateRange = (meta) => {
  const start = meta.startDate || meta.startTime || meta.eventStart || meta.startAt;
  const end = meta.endDate || meta.endTime || meta.eventEnd || meta.endAt;
  const startLabel = formatDate(start);
  const endLabel = formatDate(end);
  if (startLabel && endLabel && startLabel !== endLabel) return `${startLabel} - ${endLabel}`;
  return startLabel || endLabel || '';
};

const createSummarySheet = (workbook, meta, rows) => {
  const eventTitle = meta.eventTitle || meta.title || 'Sự kiện';
  const capacity = Number(meta.capacity || meta.totalTickets || 0);
  const registeredCount = Number(meta.registeredCount ?? rows.length);
  const checkinCount = Number(
    meta.checkinCount ?? rows.filter((r) => r.hasCheckin || r.status === 'Đã check-in').length
  );
  const checkoutCount = Number(meta.checkoutCount ?? rows.filter((r) => r.hasCheckout).length);
  const cancelledCount = rows.filter((r) => r.status === 'Đã hủy').length;
  const remainingCount = Math.max((capacity || registeredCount) - registeredCount, 0);
  const checkinRate = registeredCount ? `${Math.round((checkinCount / registeredCount) * 100)}%` : '0%';
  const checkoutRate = registeredCount ? `${Math.round((checkoutCount / registeredCount) * 100)}%` : '0%';
  const reviewCount = Number(meta.reviewCount ?? meta.ratingCount ?? 0);
  const avgRatingRaw = Number(meta.averageRating ?? meta.rating ?? 0) || 0;
  const avgRating = reviewCount ? `${Math.round(avgRatingRaw * 10) / 10}/5` : 'Chưa có';

  const data = [
    ['F-EVENTS | BÁO CÁO SAU SỰ KIỆN'],
    [`Xuất lúc ${formatDateTime(new Date())}`],
    [],
    ['THÔNG TIN SỰ KIỆN', '', '', 'TỔNG QUAN NHANH', '', '', ''],
    ['Tên sự kiện', eventTitle, '', 'Lượt đăng ký vé', registeredCount, 'Sức chứa', capacity || 'Không giới hạn'],
    ['Đơn vị phụ trách', meta.clubName || meta.organizer || 'CTSV', '', 'Đã check-in', checkinCount, 'Tỷ lệ check-in', checkinRate],
    ['Người phụ trách', meta.clubPresident || meta.president || '', '', 'Đã check-out', checkoutCount, 'Tỷ lệ check-out', checkoutRate],
    ['Thời gian', getEventDateRange(meta), '', 'Đã hủy', cancelledCount, 'Còn trống', remainingCount],
    ['Địa điểm', meta.location || meta.address || '', '', 'Đánh giá TB', avgRating, 'Số đánh giá', reviewCount],
    [],
    ['Ghi chú', 'File gồm sheet tổng quan và sheet danh sách sinh viên (kèm giờ check-in / check-out). Có thể lọc, sắp xếp và in trực tiếp từ Excel.', '', '', '', '', ''],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 3, c: 3 }, e: { r: 3, c: 6 } },
    { s: { r: 10, c: 1 }, e: { r: 10, c: 6 } },
  ];
  sheet['!cols'] = [
    { wch: 18 },
    { wch: 38 },
    { wch: 3 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
  ];
  setRows(sheet, [30, 22, 8, 24, 26, 26, 26, 26, 26, 8, 34]);

  setRangeStyle(sheet, 'A1:G1', styles.title);
  setRangeStyle(sheet, 'A2:G2', styles.subtitle);
  setRangeStyle(sheet, 'A4:B4', styles.section);
  setRangeStyle(sheet, 'D4:G4', styles.section);
  ['A5:A9', 'D5:D9', 'F5:F9'].forEach((range) => setRangeStyle(sheet, range, styles.label));
  ['B5:B9', 'E5:E9', 'G5:G9'].forEach((range) => setRangeStyle(sheet, range, styles.value));
  setRangeStyle(sheet, 'A11:A11', styles.label);
  setRangeStyle(sheet, 'B11:G11', styles.note);
  // KPI số liệu (đăng ký / check-in / check-out / hủy / đánh giá và các tỷ lệ) tô nổi bật.
  ['E5:E9', 'G5:G9'].forEach((range) => setRangeStyle(sheet, range, styles.kpiValue));

  sheet['!freeze'] = { ySplit: 4, topLeftCell: 'A5', activePane: 'bottomLeft', state: 'frozen' };
  XLSX.utils.book_append_sheet(workbook, sheet, 'Tong quan');
};

const createStudentSheet = (workbook, meta, rows) => {
  const eventTitle = meta.eventTitle || meta.title || 'Sự kiện';
  const header = [
    'STT',
    'MSSV',
    'Họ và tên',
    'Email',
    'Số điện thoại',
    'Loại vé',
    'Thời gian đăng ký',
    'Trạng thái vé',
    'Check-in lúc',
    'Check-out lúc',
    'Ghi chú',
  ];
  const body = rows.map((r) => [
    r.no,
    r.studentId,
    r.name,
    r.email,
    r.phone,
    r.ticketType,
    r.registeredAt,
    r.status,
    r.checkinAt,
    r.checkoutAt,
    r.note,
  ]);
  const data = [
    ['F-EVENTS | DANH SÁCH SINH VIÊN ĐĂNG KÝ'],
    [eventTitle],
    [`Đơn vị: ${meta.clubName || meta.organizer || 'CTSV'} | Xuất lúc: ${formatDateTime(new Date())}`],
    [],
    header,
    ...body,
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);
  const lastRow = Math.max(data.length, 5);
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
  ];
  sheet['!cols'] = [
    { wch: 7 },
    { wch: 16 },
    { wch: 30 },
    { wch: 34 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 28 },
  ];
  sheet['!autofilter'] = { ref: `A5:K${lastRow}` };
  sheet['!freeze'] = { ySplit: 5, topLeftCell: 'A6', activePane: 'bottomLeft', state: 'frozen' };
  setRows(sheet, [30, 24, 22, 8, 26, ...body.map(() => 24)]);

  setRangeStyle(sheet, 'A1:K1', styles.title);
  setRangeStyle(sheet, 'A2:K2', styles.subtitle);
  setRangeStyle(sheet, 'A3:K3', styles.note);
  setRangeStyle(sheet, 'A5:K5', styles.tableHeader);

  if (body.length) {
    setRangeStyle(sheet, `A6:K${lastRow}`, styles.tableCell);
    setRangeStyle(sheet, `A6:B${lastRow}`, styles.tableCenter);
    setRangeStyle(sheet, `F6:J${lastRow}`, styles.tableCenter);
    for (let i = 0; i < body.length; i += 1) {
      const rowNumber = 6 + i;
      // Cột 8 = "Trạng thái vé" tô màu theo trạng thái.
      setCellStyle(sheet, rowNumber, 8, statusStyle(rows[i].status));
      if (i % 2 === 1) {
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'J', 'K'].forEach((col) => {
          const cell = sheet[`${col}${rowNumber}`];
          if (cell?.s) {
            cell.s = {
              ...cell.s,
              fill: { patternType: 'solid', fgColor: { rgb: 'FCFCFD' } },
            };
          }
        });
      }
    }
  } else {
    sheet.A6 = { t: 's', v: 'Chưa có sinh viên đăng ký.' };
    sheet['!merges'].push({ s: { r: 5, c: 0 }, e: { r: 5, c: 10 } });
    setRangeStyle(sheet, 'A6:K6', styles.note);
  }

  XLSX.utils.book_append_sheet(workbook, sheet, 'Danh sach SV');
};

const ratingCellStyle = (rating) => {
  const score = Number(rating) || 0;
  if (score >= 4) {
    return {
      font: { bold: true, color: { rgb: BRAND.green } },
      fill: { patternType: 'solid', fgColor: { rgb: BRAND.greenSoft } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    };
  }
  if (score >= 3) {
    return {
      font: { bold: true, color: { rgb: BRAND.amber } },
      fill: { patternType: 'solid', fgColor: { rgb: BRAND.amberSoft } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    };
  }
  return {
    font: { bold: true, color: { rgb: BRAND.red } },
    fill: { patternType: 'solid', fgColor: { rgb: BRAND.redSoft } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };
};

const createReviewSheet = (workbook, meta) => {
  const reviews = Array.isArray(meta.reviews) ? meta.reviews : [];
  const reviewCount = Number(meta.reviewCount ?? reviews.length) || reviews.length;
  const avgRatingRaw = Number(meta.averageRating ?? meta.rating ?? 0) || 0;
  const avgLine = reviewCount
    ? `Điểm trung bình: ${Math.round(avgRatingRaw * 10) / 10}/5 · ${reviewCount} lượt đánh giá`
    : 'Chưa có lượt đánh giá nào cho sự kiện này.';

  // Phân bố sao (từ distribution nếu có, nếu không thì đếm từ danh sách review).
  const distMap = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (Array.isArray(meta.distribution) && meta.distribution.length) {
    meta.distribution.forEach((d) => {
      const stars = Number(d.stars ?? d.rating);
      if (distMap[stars] != null) distMap[stars] = Number(d.count) || 0;
    });
  } else {
    reviews.forEach((r) => {
      const stars = Math.round(Number(r.rating) || 0);
      if (distMap[stars] != null) distMap[stars] += 1;
    });
  }
  const distLine = `5 sao: ${distMap[5]}    4 sao: ${distMap[4]}    3 sao: ${distMap[3]}    2 sao: ${distMap[2]}    1 sao: ${distMap[1]}`;

  const header = ['STT', 'Người gửi', 'Email', 'MSSV', 'Điểm', 'Nội dung', 'Thời gian'];
  const body = reviews.map((r, index) => [
    index + 1,
    r.authorName || r.name || '',
    r.authorEmail || r.email || '',
    r.studentId || '',
    r.rating != null ? `${r.rating}/5` : '',
    r.comment?.trim() ? r.comment.trim() : 'Không có nhận xét.',
    formatDateTime(r.createdAt),
  ]);
  const data = [
    ['F-EVENTS | ĐÁNH GIÁ SỰ KIỆN'],
    [avgLine],
    [distLine],
    [],
    header,
    ...body,
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);
  const lastRow = Math.max(data.length, 5);
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
  ];
  sheet['!cols'] = [
    { wch: 7 },
    { wch: 24 },
    { wch: 32 },
    { wch: 16 },
    { wch: 10 },
    { wch: 56 },
    { wch: 20 },
  ];
  sheet['!autofilter'] = { ref: `A5:G${lastRow}` };
  sheet['!freeze'] = { ySplit: 5, topLeftCell: 'A6', activePane: 'bottomLeft', state: 'frozen' };
  setRows(sheet, [30, 24, 22, 8, 26, ...body.map(() => 32)]);

  setRangeStyle(sheet, 'A1:G1', styles.title);
  setRangeStyle(sheet, 'A2:G2', styles.subtitle);
  setRangeStyle(sheet, 'A3:G3', styles.note);
  setRangeStyle(sheet, 'A5:G5', styles.tableHeader);

  if (body.length) {
    setRangeStyle(sheet, `A6:G${lastRow}`, styles.tableCell);
    setRangeStyle(sheet, `A6:A${lastRow}`, styles.tableCenter);
    setRangeStyle(sheet, `D6:E${lastRow}`, styles.tableCenter);
    setRangeStyle(sheet, `G6:G${lastRow}`, styles.tableCenter);
    for (let i = 0; i < body.length; i += 1) {
      const rowNumber = 6 + i;
      setCellStyle(sheet, rowNumber, 5, ratingCellStyle(reviews[i].rating));
      if (i % 2 === 1) {
        ['A', 'B', 'C', 'D', 'F', 'G'].forEach((col) => {
          const cell = sheet[`${col}${rowNumber}`];
          if (cell?.s) {
            cell.s = { ...cell.s, fill: { patternType: 'solid', fgColor: { rgb: 'FCFCFD' } } };
          }
        });
      }
    }
  } else {
    sheet.A6 = { t: 's', v: 'Chưa có lượt đánh giá nào.' };
    sheet['!merges'].push({ s: { r: 5, c: 0 }, e: { r: 5, c: 6 } });
    setRangeStyle(sheet, 'A6:G6', styles.note);
  }

  XLSX.utils.book_append_sheet(workbook, sheet, 'Danh gia');
};

export async function downloadStudentsExcel(students, meta = {}) {
  await loadXlsx();
  const rows = buildStudentRows(Array.isArray(students) ? students : []);
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: `Báo cáo sau sự kiện - ${meta.eventTitle || meta.title || 'Sự kiện'}`,
    Subject: 'F-Events post-event report export',
    Author: 'F-Events',
    Company: 'FPT Event Platform',
    CreatedDate: new Date(),
  };
  workbook.Workbook = {
    Views: [{ RTL: false }],
  };

  createSummarySheet(workbook, meta, rows);
  createStudentSheet(workbook, meta, rows);
  createReviewSheet(workbook, meta);

  const filename = `${sanitizeFileName(meta.eventTitle || meta.title)}-bao-cao-su-kien.xlsx`;
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx', cellStyles: true });
}
