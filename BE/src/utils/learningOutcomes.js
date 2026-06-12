const normalizeLearningOutcomes = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((s) => String(s ?? '').trim()).filter(Boolean);
};

module.exports = { normalizeLearningOutcomes };
