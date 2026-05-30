const DRAFT_PREFIX = 'ctsv-announcement-draft';

const draftKey = () => {
  const email = localStorage.getItem('userEmail') || 'default';
  return `${DRAFT_PREFIX}:${email}`;
};

export const loadAnnouncementDraft = () => {
  try {
    const raw = localStorage.getItem(draftKey());
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return {
      title: String(data.title || ''),
      content: String(data.content || ''),
      eventId: String(data.eventId || ''),
      savedAt: data.savedAt || null
    };
  } catch {
    return null;
  }
};

export const saveAnnouncementDraft = (form) => {
  try {
    const payload = {
      title: form.title ?? '',
      content: form.content ?? '',
      eventId: form.eventId ?? '',
      savedAt: Date.now()
    };
    localStorage.setItem(draftKey(), JSON.stringify(payload));
    return payload.savedAt;
  } catch {
    return null;
  }
};

export const clearAnnouncementDraft = () => {
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
