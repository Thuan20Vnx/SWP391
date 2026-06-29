export const buildTimelineSourceMessage = (source) => {
  const itemTitle = String(source?.itemTitle || '').trim();
  if (!itemTitle) return null;

  const semesterLabel = String(source?.semesterLabel || '').trim();
  if (semesterLabel) {
    return `Sự kiện này được chọn từ hoạt động «${itemTitle}» theo timeline ${semesterLabel}.`;
  }
  return `Sự kiện này được chọn từ hoạt động «${itemTitle}» theo timeline kỳ học.`;
};

export const hasTimelineSource = (sourceOrProposal) => {
  const source = sourceOrProposal?.timelineSource || sourceOrProposal;
  return Boolean(String(source?.itemTitle || '').trim());
};
