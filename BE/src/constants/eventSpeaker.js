/**
 * Code First — cấu trúc diễn giả / khách mời (đồng bộ FE/src/constants/eventSpeaker.js)
 * Nguồn gốc: Event.speakers[] — các trường speaker/speakerRole/speakerAvatar là denormalized từ phần tử đầu.
 */

const SPEAKER_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const SPEAKER_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

const SPEAKER_FIELDS = ['name', 'role', 'avatar'];

const createEmptySpeaker = () => ({
  name: '',
  role: '',
  avatar: ''
});

const normalizeSpeaker = (raw) => ({
  name: String(raw?.name || '').trim(),
  role: String(raw?.role || '').trim(),
  avatar: raw?.avatar || ''
});

const normalizeSpeakers = (speakers) => {
  if (!Array.isArray(speakers)) return [];
  return speakers.map(normalizeSpeaker).filter((s) => s.name);
};

const resolveEventSpeakers = (doc) => {
  const list = normalizeSpeakers(doc?.speakers);
  if (list.length) return list;
  const legacyName = String(doc?.speaker || '').trim();
  if (!legacyName) return [];
  return [
    {
      name: legacyName,
      role: String(doc?.speakerRole || '').trim(),
      avatar: doc?.speakerAvatar || ''
    }
  ];
};

const syncPrimarySpeakerFields = (doc) => {
  const list = resolveEventSpeakers(doc);
  if (list.length) {
    doc.speakers = list;
    doc.speaker = list[0].name;
    doc.speakerRole = list[0].role;
    doc.speakerAvatar = list[0].avatar;
    return;
  }
  doc.speakers = [];
  doc.speaker = '';
  doc.speakerRole = '';
  doc.speakerAvatar = '';
};

module.exports = {
  SPEAKER_AVATAR_MAX_BYTES,
  SPEAKER_IMAGE_ACCEPT,
  SPEAKER_FIELDS,
  createEmptySpeaker,
  normalizeSpeaker,
  normalizeSpeakers,
  resolveEventSpeakers,
  syncPrimarySpeakerFields
};
