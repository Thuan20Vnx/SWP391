export const buildTimelineSourceMessage = (source) => {
  const itemTitle = String(source?.itemTitle || '').trim();
  if (!itemTitle) return null;

  const semesterLabel = String(source?.semesterLabel || '').trim();
  if (semesterLabel) {
    return `Sự kiện này được chọn từ hoạt động «${itemTitle}» theo timeline ${semesterLabel}.`;
  }
  return `Sự kiện này được chọn từ hoạt động «${itemTitle}» theo timeline kỳ học.`;
};

/** Nhãn nguồn sự kiện trên header Admin (ngoài luồng / từ timeline). */
export const buildAdminEventOriginLabel = (event) => {
  if (!event) return null;

  const timeline = event.timelineSource;
  const itemTitle = String(timeline?.itemTitle || '').trim();
  if (itemTitle) {
    const semesterLabel = String(timeline?.semesterLabel || '').trim();
    if (semesterLabel) {
      return `Sự kiện được lấy trên sự kiện «${itemTitle}» theo timeline kì ${semesterLabel}`;
    }
    return `Sự kiện được lấy trên sự kiện «${itemTitle}» theo timeline kì học`;
  }

  if (event.source === 'school' || event.source === 'club') {
    return 'Sự kiện ngoài luồng';
  }

  return null;
};

export const hasTimelineSource = (sourceOrProposal) => {
  const source = sourceOrProposal?.timelineSource || sourceOrProposal;
  return Boolean(String(source?.itemTitle || '').trim());
};
