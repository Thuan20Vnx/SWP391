/** Mặc định 3 dòng — khớp checklist trên trang chi tiết sự kiện */
export const DEFAULT_LEARNING_OUTCOME_ROWS = ['', '', ''];

export const normalizeLearningOutcomesForSave = (items) =>
  (Array.isArray(items) ? items : [])
    .map((s) => String(s ?? '').trim())
    .filter(Boolean);

export const learningOutcomesFromEvent = (event) => {
  const raw = event?.learningOutcomes;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  return [];
};

export const learningOutcomesToFormRows = (event) => {
  const saved = learningOutcomesFromEvent(event);
  if (saved.length > 0) {
    return saved.length >= 3 ? saved : [...saved, ...DEFAULT_LEARNING_OUTCOME_ROWS].slice(0, 3);
  }
  return [...DEFAULT_LEARNING_OUTCOME_ROWS];
};
