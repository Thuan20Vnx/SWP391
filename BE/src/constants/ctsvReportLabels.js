/**
 * Code First — nhãn báo cáo CTSV (đồng bộ FE/src/constants/ctsvReportLabels.js)
 */

const REPORT_FILL_RATE_LABEL = 'Tỷ lệ đăng ký';
const LEGACY_FILL_RATE_LABEL = 'Tỷ lệ lấp đầy';

const normalizeReportHighlightText = (text) =>
  String(text || '').replace(new RegExp(LEGACY_FILL_RATE_LABEL, 'gi'), REPORT_FILL_RATE_LABEL);

const buildFillRateHighlight = (fillRate, targetPercent = 85) =>
  `${REPORT_FILL_RATE_LABEL} ${fillRate}% — vượt mục tiêu ${targetPercent}%.`;

module.exports = {
  REPORT_FILL_RATE_LABEL,
  normalizeReportHighlightText,
  buildFillRateHighlight
};
