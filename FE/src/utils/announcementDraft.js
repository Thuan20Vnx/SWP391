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
      image: String(data.image || ''),
      imageFileName: String(data.imageFileName || ''),
      savedAt: data.savedAt || null
    };
  } catch {
    return null;
  }
};

export const saveAnnouncementDraft = (form) => {
  const payload = {
    title: form.title ?? '',
    content: form.content ?? '',
    eventId: form.eventId ?? '',
    image: form.image ?? '',
    imageFileName: form.imageFileName ?? '',
    savedAt: Date.now()
  };
  try {
    localStorage.setItem(draftKey(), JSON.stringify(payload));
    return payload.savedAt;
  } catch {
    try {
      localStorage.setItem(
        draftKey(),
        JSON.stringify({ ...payload, image: '', imageFileName: '' })
      );
    } catch {
      return null;
    }
    return payload.savedAt;
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
