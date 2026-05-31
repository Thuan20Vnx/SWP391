/**
 * Code First — nhãn báo cáo CTSV (đồng bộ BE/src/constants/ctsvReportLabels.js)
 */

export const REPORT_FILL_RATE_LABEL = 'Tỷ lệ đăng ký';
export const REPORT_FILL_RATE_AVG_LABEL = 'TB tỷ lệ đăng ký';

const LEGACY_FILL_RATE_LABEL = 'Tỷ lệ lấp đầy';

export const normalizeReportHighlightText = (text) =>
  String(text || '').replace(new RegExp(LEGACY_FILL_RATE_LABEL, 'gi'), REPORT_FILL_RATE_LABEL);

export const buildFillRateHighlight = (fillRate, targetPercent = 85) =>
  `${REPORT_FILL_RATE_LABEL} ${fillRate}% — vượt mục tiêu ${targetPercent}%.`;
