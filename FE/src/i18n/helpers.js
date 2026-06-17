/** Resolve label/description from i18n key or fallback string */
export const resolveLabel = (item, t) => (item.labelKey ? t(item.labelKey) : item.label);

export const resolveDescription = (item, t) => {
  if (item.descKey) return t(item.descKey);
  if (item.descriptionKey) return t(item.descriptionKey);
  return item.description;
};

export const mapSelectOptions = (options, t) =>
  options.map((opt) => ({
    ...opt,
    label: opt.labelKey ? t(opt.labelKey) : opt.label,
  }));

export const getSecurityDescKey = (role) => `settings.securityDesc.${role}`;
