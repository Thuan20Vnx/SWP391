/**
 * Code First — cấu trúc diễn giả / khách mời (đồng bộ BE/src/constants/eventSpeaker.js)
 */

export const SPEAKER_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const SPEAKER_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

export const createEmptySpeakerRow = () => ({
  id: Date.now(),
  name: '',
  role: '',
  avatar: ''
});

export const normalizeSpeakerPayload = (row) => ({
  name: String(row?.name || '').trim(),
  role: String(row?.role || '').trim(),
  avatar: row?.avatar || ''
});

export const buildSpeakersPayload = (rows) =>
  (Array.isArray(rows) ? rows : []).map(normalizeSpeakerPayload).filter((s) => s.name);

export const resolveEventSpeakers = (event) => {
  const list = buildSpeakersPayload(event?.speakers);
  if (list.length) return list;
  const legacyName = String(event?.speaker || '').trim();
  if (!legacyName) return [];
  return [
    {
      name: legacyName,
      role: String(event?.speakerRole || '').trim(),
      avatar: event?.speakerAvatar || ''
    }
  ];
};
