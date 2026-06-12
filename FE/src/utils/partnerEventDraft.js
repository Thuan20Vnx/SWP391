const DRAFT_PREFIX = 'partner-event-request-draft';

const draftKey = () => {
  const email = localStorage.getItem('userEmail') || 'default';
  return `${DRAFT_PREFIX}:${email}`;
};

export const loadPartnerEventDraft = () => {
  try {
    const raw = localStorage.getItem(draftKey());
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return {
      company: data.company || null,
      form: data.form || null,
      tickets: Array.isArray(data.tickets) ? data.tickets : null,
      speakers: Array.isArray(data.speakers) ? data.speakers : null,
      benefits: Array.isArray(data.benefits) ? data.benefits : null,
      attachments: Array.isArray(data.attachments) ? data.attachments : null,
      partnerMessage: data.partnerMessage || '',
      bannerFileName: String(data.bannerFileName || ''),
      savedAt: data.savedAt || null
    };
  } catch {
    return null;
  }
};

export const savePartnerEventDraft = (payload) => {
  const data = {
    company: payload.company ?? {},
    form: payload.form ?? {},
    tickets: payload.tickets ?? [],
    speakers: payload.speakers ?? [],
    benefits: payload.benefits ?? [''],
    attachments: payload.attachments ?? [],
    partnerMessage: payload.partnerMessage ?? '',
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
        JSON.stringify({
          ...data,
          form: { ...data.form, image: '' },
          attachments: [],
          speakers: data.speakers.map((s) => ({ ...s, avatar: '' }))
        })
      );
    } catch {
      return null;
    }
    return data.savedAt;
  }
};

export const clearPartnerEventDraft = () => {
  try {
    localStorage.removeItem(draftKey());
  } catch {
    /* ignore */
  }
};

export { formatDraftSavedLabel } from './schoolEventDraft';
