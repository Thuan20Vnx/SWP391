const draftKey = (portalRole = 'ctsv') => {
  const email = localStorage.getItem('userEmail') || 'default';
  return `${portalRole}-announcement-draft:${email}`;
};

export const loadAnnouncementDraft = (portalRole = 'ctsv') => {
  try {
    const raw = localStorage.getItem(draftKey(portalRole));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return {
      title: String(data.title || ''),
      content: String(data.content || ''),
      eventId: String(data.eventId || ''),
      image: String(data.image || ''),
      imageFileName: String(data.imageFileName || ''),
      targetRoles: Array.isArray(data.targetRoles) ? data.targetRoles : ['all'],
      savedAt: data.savedAt || null
    };
  } catch {
    return null;
  }
};

export const saveAnnouncementDraft = (form, portalRole = 'ctsv') => {
  const payload = {
    title: form.title ?? '',
    content: form.content ?? '',
    eventId: form.eventId ?? '',
    image: form.image ?? '',
    imageFileName: form.imageFileName ?? '',
    targetRoles: form.targetRoles ?? ['all'],
    savedAt: Date.now()
  };
  try {
    localStorage.setItem(draftKey(portalRole), JSON.stringify(payload));
    return payload.savedAt;
  } catch {
    try {
      localStorage.setItem(
        draftKey(portalRole),
        JSON.stringify({ ...payload, image: '', imageFileName: '' })
      );
    } catch {
      return null;
    }
    return payload.savedAt;
  }
};

export const clearAnnouncementDraft = (portalRole = 'ctsv') => {
  try {
    localStorage.removeItem(draftKey(portalRole));
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
