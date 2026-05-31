/**
 * Code First — nhãn trạng thái hiển thị trên danh sách / báo cáo CTSV (đồng bộ FE)
 */

const REPORT_PHASE = {
  LIVE: 'live',
  ENDED: 'ended',
  COMPLETED: 'completed'
};

const resolveReportPhase = (event) => {
  const status = event?.status;
  if (status === 'live') return REPORT_PHASE.LIVE;
  if (status === 'ended' || event?.eventState === 'expired') return REPORT_PHASE.ENDED;

  const now = new Date();
  const end = event?.endDate ? new Date(event.endDate) : null;
  if (end && !Number.isNaN(end.getTime()) && end <= now) return REPORT_PHASE.ENDED;

  const start = event?.startDate ? new Date(event.startDate) : null;
  if (!end && start && !Number.isNaN(start.getTime()) && start <= now) return REPORT_PHASE.ENDED;

  return REPORT_PHASE.COMPLETED;
};

/** Nhãn cột trạng thái — không dùng MỞ ĐĂNG KÝ khi sự kiện đã kết thúc / hết hạn */
const getReportDisplayStatus = (reportPhase, workflowStatusKey = '') => {
  if (reportPhase === REPORT_PHASE.LIVE) {
    return { label: 'ĐANG DIỄN RA', statusKey: 'live' };
  }
  if (
    reportPhase === REPORT_PHASE.ENDED ||
    reportPhase === REPORT_PHASE.COMPLETED
  ) {
    return { label: 'ĐÃ KẾT THÚC', statusKey: 'ended' };
  }
  if (workflowStatusKey === 'approved') {
    return { label: 'MỞ ĐĂNG KÝ', statusKey: 'approved' };
  }
  return { label: 'ĐÃ KẾT THÚC', statusKey: 'ended' };
};

module.exports = {
  REPORT_PHASE,
  resolveReportPhase,
  getReportDisplayStatus
};
