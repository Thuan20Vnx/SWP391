import { formatAnalyticsDateTime } from './localizeAdminAnalytics';
import {
  loadXlsx,
  styles,
  paintRange,
  zebraRange,
  setNumberFormat,
  setRowHeights,
  setCols,
  sanitizeFileName,
} from './excelTheme';

const FALLBACK_NAME = 'Bao cao danh gia va phan tich';

/** Dựng một sheet dữ liệu: banner + hàng tiêu đề + bảng, có freeze và autofilter. */
const buildTableSheet = (xlsx, { title, caption, headers, rows, widths, centerFrom = 0 }) => {
  const sheet = xlsx.utils.aoa_to_sheet([[title], [caption], [], headers, ...rows]);
  const lastCol = headers.length - 1;
  const lastColLetter = xlsx.utils.encode_col(lastCol);
  const headerRow = 4;
  const firstDataRow = headerRow + 1;
  const lastDataRow = headerRow + rows.length;

  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
  ];
  setCols(sheet, widths);
  setRowHeights(sheet, [30, 22, 8, 24, ...rows.map(() => 20)]);
  // Chỉ đặt autofilter: xlsx-js-style không ghi được freeze pane (đã thử cả dạng
  // chuỗi lẫn object, file xuất ra không có thẻ <pane>), nên bỏ để khỏi hiểu nhầm.
  sheet['!autofilter'] = { ref: `A${headerRow}:${lastColLetter}${Math.max(lastDataRow, firstDataRow)}` };

  paintRange(xlsx, sheet, `A1:${lastColLetter}1`, styles.title);
  paintRange(xlsx, sheet, `A2:${lastColLetter}2`, styles.subtitle);
  paintRange(xlsx, sheet, `A${headerRow}:${lastColLetter}${headerRow}`, styles.tableHeader);

  if (rows.length) {
    const centerLetter = xlsx.utils.encode_col(centerFrom);
    paintRange(xlsx, sheet, `A${firstDataRow}:${lastColLetter}${lastDataRow}`, styles.tableCell);
    if (centerFrom <= lastCol) {
      paintRange(xlsx, sheet, `${centerLetter}${firstDataRow}:${lastColLetter}${lastDataRow}`, styles.tableCenter);
    }
    zebraRange(xlsx, sheet, `A${firstDataRow}:${lastColLetter}${lastDataRow}`);
  }

  return { sheet, firstDataRow, lastDataRow, lastColLetter };
};

export async function downloadAdminAnalyticsReport(
  analytics,
  { periodLabel = 'Tháng này', language = 'vi' } = {},
) {
  if (!analytics) return;
  const xlsx = await loadXlsx();

  const {
    overview = {},
    starDetailRows = [],
    categoryRatings = [],
    allEvents = [],
    allClubs = [],
    allReviews = [],
    checkedAt,
  } = analytics;

  const generatedAt = formatAnalyticsDateTime(checkedAt ? new Date(checkedAt) : new Date(), language);
  const caption = `Kỳ báo cáo: ${periodLabel} · Xuất lúc ${generatedAt}`;

  /* ── Sheet 1: Tổng quan ── */
  const starRows = starDetailRows.map((row) => [row.stars, row.count, row.percent, row.events ?? 0]);
  const categoryRows = categoryRatings.map((row) => [row.label, row.avg, row.reviews]);

  const kpiFirstRow = 6;
  const starTitleRow = kpiFirstRow + 5;
  const starHeaderRow = starTitleRow + 1;
  const categoryTitleRow = starHeaderRow + starRows.length + 2;
  const categoryHeaderRow = categoryTitleRow + 1;

  const summarySheet = xlsx.utils.aoa_to_sheet([
    ['F-EVENTS | BÁO CÁO ĐÁNH GIÁ & PHÂN TÍCH'],
    [caption],
    [],
    ['CHỈ SỐ TỔNG QUAN'],
    ['Chỉ số', 'Giá trị', 'Đơn vị', 'So với kỳ trước'],
    ['Điểm đánh giá trung bình', overview.avgRating ?? 0, `/ ${overview.avgRatingMax ?? 5}`, overview.trendAvg ?? '—'],
    ['Tổng phản hồi', overview.totalReviews ?? 0, 'phản hồi', overview.trendReviews ?? '—'],
    ['Tỷ lệ hài lòng (4–5 sao)', overview.satisfactionRate ?? 0, '%', '—'],
    ['Sự kiện có đánh giá', overview.reviewedEvents ?? 0, 'sự kiện', '—'],
    [],
    ['PHÂN BỔ ĐIỂM SAO'],
    ['Mức sao', 'Số đánh giá', 'Tỷ lệ (%)', 'Sự kiện liên quan'],
    ...starRows,
    [],
    ['ĐÁNH GIÁ THEO DANH MỤC'],
    ['Danh mục', 'Điểm TB', 'Số phản hồi'],
    ...categoryRows,
  ]);

  summarySheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
    { s: { r: starTitleRow - 1, c: 0 }, e: { r: starTitleRow - 1, c: 3 } },
    { s: { r: categoryTitleRow - 1, c: 0 }, e: { r: categoryTitleRow - 1, c: 3 } },
  ];
  setCols(summarySheet, [30, 16, 16, 22]);

  paintRange(xlsx, summarySheet, 'A1:D1', styles.title);
  paintRange(xlsx, summarySheet, 'A2:D2', styles.subtitle);
  paintRange(xlsx, summarySheet, 'A4:D4', styles.section);
  paintRange(xlsx, summarySheet, 'A5:D5', styles.tableHeader);
  paintRange(xlsx, summarySheet, `A${kpiFirstRow}:A${kpiFirstRow + 3}`, styles.label);
  paintRange(xlsx, summarySheet, `B${kpiFirstRow}:B${kpiFirstRow + 3}`, styles.metricValue);
  paintRange(xlsx, summarySheet, `C${kpiFirstRow}:D${kpiFirstRow + 3}`, styles.tableCenter);
  setNumberFormat(xlsx, summarySheet, `B${kpiFirstRow}:B${kpiFirstRow}`, '0.0');
  setNumberFormat(xlsx, summarySheet, `B${kpiFirstRow + 1}:B${kpiFirstRow + 3}`, '0');

  paintRange(xlsx, summarySheet, `A${starTitleRow}:D${starTitleRow}`, styles.section);
  paintRange(xlsx, summarySheet, `A${starHeaderRow}:D${starHeaderRow}`, styles.tableHeader);
  if (starRows.length) {
    const from = starHeaderRow + 1;
    const to = starHeaderRow + starRows.length;
    paintRange(xlsx, summarySheet, `A${from}:D${to}`, styles.tableCenter);
    setNumberFormat(xlsx, summarySheet, `A${from}:B${to}`, '0');
    setNumberFormat(xlsx, summarySheet, `C${from}:C${to}`, '0"%"');
    setNumberFormat(xlsx, summarySheet, `D${from}:D${to}`, '0');
    zebraRange(xlsx, summarySheet, `A${from}:D${to}`);
  }

  paintRange(xlsx, summarySheet, `A${categoryTitleRow}:D${categoryTitleRow}`, styles.section);
  paintRange(xlsx, summarySheet, `A${categoryHeaderRow}:C${categoryHeaderRow}`, styles.tableHeader);
  if (categoryRows.length) {
    const from = categoryHeaderRow + 1;
    const to = categoryHeaderRow + categoryRows.length;
    paintRange(xlsx, summarySheet, `A${from}:A${to}`, styles.tableCell);
    paintRange(xlsx, summarySheet, `B${from}:C${to}`, styles.tableCenter);
    setNumberFormat(xlsx, summarySheet, `B${from}:B${to}`, '0.0');
    setNumberFormat(xlsx, summarySheet, `C${from}:C${to}`, '0');
    zebraRange(xlsx, summarySheet, `A${from}:C${to}`);
  }
  setRowHeights(summarySheet, [30, 22, 8, 24, 22, 26, 26, 26, 26, 8, 24, 22]);

  /* ── Sheet 2–4: dữ liệu chi tiết, mỗi bảng một sheet (trước đây bị lặp lại y hệt ở sheet tổng quan) ── */
  const events = buildTableSheet(xlsx, {
    title: 'F-EVENTS | SỰ KIỆN THEO ĐIỂM TRUNG BÌNH',
    caption,
    headers: ['Sự kiện', 'Đơn vị tổ chức', 'Danh mục', 'Điểm TB', 'Phản hồi'],
    rows: allEvents.map((row) => [row.name, row.org, row.category, row.rating, row.reviews]),
    widths: [42, 26, 20, 10, 12],
    centerFrom: 3,
  });
  setNumberFormat(xlsx, events.sheet, `D${events.firstDataRow}:D${events.lastDataRow}`, '0.0');
  setNumberFormat(xlsx, events.sheet, `E${events.firstDataRow}:E${events.lastDataRow}`, '0');

  const clubs = buildTableSheet(xlsx, {
    title: 'F-EVENTS | CÂU LẠC BỘ THEO PHẢN HỒI',
    caption,
    headers: ['Mã CLB', 'Tên CLB', 'Điểm TB', 'Phản hồi'],
    rows: allClubs.map((row) => [row.code, row.name, row.avg, row.reviews]),
    widths: [18, 36, 10, 12],
    centerFrom: 2,
  });
  setNumberFormat(xlsx, clubs.sheet, `C${clubs.firstDataRow}:C${clubs.lastDataRow}`, '0.0');
  setNumberFormat(xlsx, clubs.sheet, `D${clubs.firstDataRow}:D${clubs.lastDataRow}`, '0');

  const reviews = buildTableSheet(xlsx, {
    title: 'F-EVENTS | CHI TIẾT ĐÁNH GIÁ',
    caption,
    headers: ['Thời gian', 'Người đánh giá', 'Sự kiện', 'Sao', 'Nội dung'],
    rows: allReviews.map((row) => [
      row.time || (row.createdAt ? formatAnalyticsDateTime(new Date(row.createdAt), language) : ''),
      row.user,
      row.event,
      row.stars,
      row.excerpt,
    ]),
    widths: [20, 26, 36, 8, 60],
    centerFrom: 3,
  });
  setNumberFormat(xlsx, reviews.sheet, `D${reviews.firstDataRow}:D${reviews.lastDataRow}`, '0');

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, summarySheet, 'Tổng quan');
  xlsx.utils.book_append_sheet(workbook, events.sheet, 'Sự kiện');
  xlsx.utils.book_append_sheet(workbook, clubs.sheet, 'Câu lạc bộ');
  xlsx.utils.book_append_sheet(workbook, reviews.sheet, 'Đánh giá');

  const fileName = `${sanitizeFileName(`F-Events - Đánh giá & phân tích - ${periodLabel}`, FALLBACK_NAME)}.xlsx`;
  xlsx.writeFile(workbook, fileName);
}
