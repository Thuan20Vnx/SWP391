import * as XLSX from 'xlsx';
import { formatAnalyticsDateTime } from './localizeAdminAnalytics';

const sanitizeFileName = (value) =>
  String(value || 'bao-cao-danh-gia')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'bao-cao-danh-gia';

const setSheetCols = (worksheet, widths) => {
  worksheet['!cols'] = widths.map((wch) => ({ wch }));
};

const appendTable = (sheetData, title, headers, rows) => {
  sheetData.push([]);
  sheetData.push([title]);
  sheetData.push(headers);
  rows.forEach((row) => sheetData.push(row));
};

export function downloadAdminAnalyticsReport(analytics, { periodLabel = 'Tháng này', language = 'vi' } = {}) {
  if (!analytics) return;

  const {
    overview = {},
    starDistribution = [],
    starDetailRows = [],
    categoryRatings = [],
    allEvents = [],
    allClubs = [],
    allReviews = [],
    checkedAt,
  } = analytics;

  const generatedAt = checkedAt
    ? formatAnalyticsDateTime(new Date(checkedAt), language)
    : formatAnalyticsDateTime(new Date(), language);

  const summaryRows = [
    ['F-EVENTS — BÁO CÁO ĐÁNH GIÁ & PHÂN TÍCH'],
    [],
    ['Kỳ báo cáo', periodLabel],
    ['Thời điểm xuất', generatedAt],
    [],
    ['CHỈ SỐ TỔNG QUAN'],
    ['Chỉ số', 'Giá trị', 'Xu hướng'],
    ['Điểm đánh giá trung bình', `${overview.avgRating ?? 0}/${overview.avgRatingMax ?? 5}`, overview.trendAvg ?? '—'],
    ['Tổng phản hồi', overview.totalReviews ?? 0, overview.trendReviews ?? '—'],
    ['Tỷ lệ hài lòng (4–5 sao)', `${overview.satisfactionRate ?? 0}%`, '—'],
    ['Sự kiện có đánh giá', overview.reviewedEvents ?? 0, '—'],
  ];

  appendTable(
    summaryRows,
    'PHÂN BỔ ĐIỂM SAO',
    ['Mức sao', 'Số đánh giá', 'Tỷ lệ (%)', 'Sự kiện liên quan'],
    starDetailRows.map((row) => [row.stars, row.count, row.percent, row.events ?? 0]),
  );

  appendTable(
    summaryRows,
    'ĐÁNH GIÁ THEO DANH MỤC',
    ['Danh mục', 'Điểm TB', 'Số phản hồi'],
    categoryRatings.map((row) => [row.label, row.avg, row.reviews]),
  );

  appendTable(
    summaryRows,
    'SỰ KIỆN THEO ĐIỂM TRUNG BÌNH',
    ['Sự kiện', 'Đơn vị tổ chức', 'Danh mục', 'Điểm TB', 'Phản hồi'],
    allEvents.map((row) => [row.name, row.org, row.category, row.rating, row.reviews]),
  );

  appendTable(
    summaryRows,
    'CÂU LẠC BỘ THEO PHẢN HỒI',
    ['Mã CLB', 'Tên CLB', 'Điểm TB', 'Phản hồi'],
    allClubs.map((row) => [row.code, row.name, row.avg, row.reviews]),
  );

  appendTable(
    summaryRows,
    'ĐÁNH GIÁ GẦN ĐÂY',
    ['Thời gian', 'Người đánh giá', 'Sự kiện', 'Sao', 'Nội dung'],
    allReviews.map((row) => [
      row.time || (row.createdAt ? formatAnalyticsDateTime(new Date(row.createdAt), language) : ''),
      row.user,
      row.event,
      row.stars,
      row.excerpt,
    ]),
  );

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  setSheetCols(summarySheet, [34, 22, 18, 18, 48]);

  const starsSheet = XLSX.utils.aoa_to_sheet([
    ['Mức sao', 'Số đánh giá', 'Tỷ lệ (%)'],
    ...starDistribution.map((row) => [row.stars, row.count, row.percent]),
  ]);
  setSheetCols(starsSheet, [12, 14, 12]);

  const categoriesSheet = XLSX.utils.aoa_to_sheet([
    ['Danh mục', 'Điểm TB', 'Số phản hồi'],
    ...categoryRatings.map((row) => [row.label, row.avg, row.reviews]),
  ]);
  setSheetCols(categoriesSheet, [28, 12, 14]);

  const eventsSheet = XLSX.utils.aoa_to_sheet([
    ['Sự kiện', 'Đơn vị tổ chức', 'Danh mục', 'Điểm TB', 'Phản hồi'],
    ...allEvents.map((row) => [row.name, row.org, row.category, row.rating, row.reviews]),
  ]);
  setSheetCols(eventsSheet, [36, 24, 20, 10, 12]);

  const clubsSheet = XLSX.utils.aoa_to_sheet([
    ['Mã CLB', 'Tên CLB', 'Điểm TB', 'Phản hồi'],
    ...allClubs.map((row) => [row.code, row.name, row.avg, row.reviews]),
  ]);
  setSheetCols(clubsSheet, [16, 32, 10, 12]);

  const reviewsSheet = XLSX.utils.aoa_to_sheet([
    ['Thời gian', 'Người đánh giá', 'Sự kiện', 'Sao', 'Nội dung'],
    ...allReviews.map((row) => [
      row.time || (row.createdAt ? formatAnalyticsDateTime(new Date(row.createdAt), language) : ''),
      row.user,
      row.event,
      row.stars,
      row.excerpt,
    ]),
  ]);
  setSheetCols(reviewsSheet, [20, 24, 32, 8, 48]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tong quan');
  XLSX.utils.book_append_sheet(workbook, starsSheet, 'Phan bo sao');
  XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Danh muc');
  XLSX.utils.book_append_sheet(workbook, eventsSheet, 'Su kien');
  XLSX.utils.book_append_sheet(workbook, clubsSheet, 'CLB');
  XLSX.utils.book_append_sheet(workbook, reviewsSheet, 'Danh gia');

  const fileName = `${sanitizeFileName(`F-Events-danh-gia-${periodLabel}`)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
