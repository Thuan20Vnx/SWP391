const DRAFT_PREFIX = 'ctsv-school-event-draft';

const draftKey = () => {
  const email = localStorage.getItem('userEmail') || 'default';
  return `${DRAFT_PREFIX}:${email}`;
};

export const loadSchoolEventDraft = () => {
  try {
    const raw = localStorage.getItem(draftKey());
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return {
      form: data.form || null,
      tickets: Array.isArray(data.tickets) ? data.tickets : null,
      bannerFileName: String(data.bannerFileName || ''),
      savedAt: data.savedAt || null
    };
  } catch {
    return null;
  }
};

export const saveSchoolEventDraft = (payload) => {
  const data = {
    form: payload.form ?? {},
    tickets: payload.tickets ?? [],
    bannerFileName: payload.bannerFileName ?? '',
    savedAt: Date.now()
  };
  try {
    localStorage.setItem(draftKey(), JSON.stringify(data));
    return data.savedAt;
  } catch {
    try {
      localStorage.setItem(
        draftKey(),
        JSON.stringify({ ...data, form: { ...data.form, image: '' }, bannerFileName: '' })
      );
    } catch {
      return null;
    }
    return data.savedAt;
  }
};

export const clearSchoolEventDraft = () => {
  try {
    localStorage.removeItem(draftKey());
  } catch {
    /* ignore */
  }
};

export const formatDraftSavedLabel = (savedAt) => {
  if (!savedAt) return '';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(savedAt));
  } catch {
    return '';
  }
};
