/**
 * Code First — đồng bộ BE/src/constants/ctsvReportDisplay.js
 */

export const REPORT_PHASE = {
  LIVE: 'live',
  ENDED: 'ended',
  COMPLETED: 'completed'
};

export const resolveReportPhase = (event) => {
  const status = event?.statusKey || event?.status;
  if (status === 'live') return REPORT_PHASE.LIVE;
  if (status === 'ended' || event?.eventState === 'expired') return REPORT_PHASE.ENDED;

  const end = event?.endDate ? new Date(event.endDate) : null;
  const now = new Date();
  if (end && !Number.isNaN(end.getTime()) && end <= now) return REPORT_PHASE.ENDED;

  return REPORT_PHASE.COMPLETED;
};

export const getReportDisplayStatus = (reportPhase, workflowStatusKey = '') => {
  if (reportPhase === REPORT_PHASE.LIVE) {
    return { label: 'ĐANG DIỄN RA', statusKey: 'live' };
  }
  if (reportPhase === REPORT_PHASE.ENDED || reportPhase === REPORT_PHASE.COMPLETED) {
    return { label: 'ĐÃ KẾT THÚC', statusKey: 'ended' };
  }
  if (workflowStatusKey === 'approved') {
    return { label: 'MỞ ĐĂNG KÝ', statusKey: 'approved' };
  }
  return { label: 'ĐÃ KẾT THÚC', statusKey: 'ended' };
};

export const reportStatusClass = (statusKey) => {
  if (statusKey === 'live') return 'status-success';
  if (statusKey === 'ended') return 'status-neutral';
  if (statusKey === 'approved') return 'status-success';
  return 'status-neutral';
};
