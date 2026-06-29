const path = require('path');
const {
  isHttpUrl,
  isImageDataUri,
  parseDataUri,
  extensionFromMime,
  writeBufferToFile,
  readFileIfExists,
  deleteFileIfExists,
  findStoredFile,
} = require('./dataUriStorage');
const { resolveEventSpeakers } = require('../constants/eventSpeaker');

const AVATARS_ROOT = path.join(__dirname, '../../uploads/speaker-avatars');

const avatarDirForEvent = (eventId) => path.join(AVATARS_ROOT, String(eventId));

const avatarFilePath = (eventId, index, ext) =>
  path.join(avatarDirForEvent(eventId), `${Number(index)}.${String(ext).replace(/^\./, '')}`);

const buildSpeakerAvatarUrl = (eventId, index) => {
  const id = String(eventId || '').trim();
  if (!id) return '';
  return `/api/events/${id}/speakers/${Number(index)}/avatar`;
};

const hasStoredSpeakerAvatar = (eventId, index, knownExt = '') =>
  Boolean(findStoredFile(avatarDirForEvent(eventId), String(index), knownExt));

const writeSpeakerAvatarFromDataUri = async (eventId, index, dataUri) => {
  const { mime, buffer } = parseDataUri(dataUri);
  const ext = extensionFromMime(mime, '', 'jpg');
  const filePath = avatarFilePath(eventId, index, ext);
  const existing = findStoredFile(avatarDirForEvent(eventId), String(index), '');
  if (existing && existing.filePath !== filePath) {
    deleteFileIfExists(existing.filePath);
  }
  await writeBufferToFile(filePath, buffer);
  return ext;
};

const deleteSpeakerAvatar = (eventId, index) => {
  const dir = avatarDirForEvent(eventId);
  const existing = findStoredFile(dir, String(index), '');
  if (existing) deleteFileIfExists(existing.filePath);
};

const deleteAllSpeakerAvatars = (eventId) => {
  const dir = avatarDirForEvent(eventId);
  if (!require('fs').existsSync(dir)) return;
  for (const name of require('fs').readdirSync(dir)) {
    deleteFileIfExists(path.join(dir, name));
  }
};

const persistSpeakersOnDocument = async (doc) => {
  if (!doc?._id) return doc;

  const eventId = String(doc._id);
  const speakers = resolveEventSpeakers(doc);
  if (!Array.isArray(doc.speakers)) {
    doc.speakers = speakers;
  }

  const storedExts = Array.isArray(doc.speakerAvatarExts) ? [...doc.speakerAvatarExts] : [];

  for (let i = 0; i < speakers.length; i += 1) {
    const avatar = speakers[i]?.avatar || '';

    if (isImageDataUri(avatar)) {
      const ext = await writeSpeakerAvatarFromDataUri(eventId, i, avatar);
      storedExts[i] = ext;
      speakers[i].avatar = '';
      continue;
    }

    if (isHttpUrl(avatar)) {
      if (storedExts[i] || hasStoredSpeakerAvatar(eventId, i)) {
        deleteSpeakerAvatar(eventId, i);
      }
      storedExts[i] = '';
      continue;
    }

    if (!avatar && (storedExts[i] || hasStoredSpeakerAvatar(eventId, i, storedExts[i] || ''))) {
      // keep stored file
      speakers[i].avatar = '';
      continue;
    }

    if (!avatar) {
      if (storedExts[i]) {
        deleteSpeakerAvatar(eventId, i);
        storedExts[i] = '';
      }
    }
  }

  // trim trailing empty ext entries
  while (storedExts.length > speakers.length) storedExts.pop();

  doc.speakers = speakers;
  doc.speakerAvatarExts = storedExts;
  if (speakers[0]) {
    doc.speaker = speakers[0].name;
    doc.speakerRole = speakers[0].role;
    doc.speakerAvatar = speakers[0].avatar || '';
  }

  return doc;
};

const sanitizeSpeakersForApi = (event) => {
  const id = String(event?._id || event?.id || '');
  const storedExts = Array.isArray(event?.speakerAvatarExts) ? event.speakerAvatarExts : [];
  const speakers = resolveEventSpeakers(event).map((speaker, index) => {
    const hasStored = Boolean(storedExts[index]) || hasStoredSpeakerAvatar(id, index, storedExts[index] || '');
    const avatarUrl = hasStored && id ? buildSpeakerAvatarUrl(id, index) : speaker.avatar || '';
    return {
      ...speaker,
      avatar: isHttpUrl(avatarUrl) ? avatarUrl : avatarUrl,
      avatarUrl: hasStored && id ? buildSpeakerAvatarUrl(id, index) : '',
    };
  });

  const primary = speakers[0];
  return {
    speakers,
    speaker: primary?.name || '',
    speakerRole: primary?.role || '',
    speakerAvatar: primary?.avatar || primary?.avatarUrl || '',
  };
};

const resolveSpeakerAvatarResponse = async (event, index) => {
  const eventId = String(event?._id || event?.id || '');
  const storedExts = Array.isArray(event?.speakerAvatarExts) ? event.speakerAvatarExts : [];
  const knownExt = storedExts[index] || '';
  const stored = findStoredFile(avatarDirForEvent(eventId), String(index), knownExt);
  if (stored) {
    const buffer = await readFileIfExists(stored.filePath);
    if (buffer) {
      const mime = stored.ext === 'jpg' ? 'image/jpeg' : `image/${stored.ext}`;
      return { buffer, mime, redirectUrl: null };
    }
  }

  const speakers = resolveEventSpeakers(event);
  const avatar = speakers[index]?.avatar || '';
  if (isHttpUrl(avatar)) {
    return { buffer: null, mime: null, redirectUrl: avatar };
  }
  if (isImageDataUri(avatar)) {
    const { mime, buffer } = parseDataUri(avatar);
    return { buffer, mime, redirectUrl: null };
  }
  return null;
};

module.exports = {
  buildSpeakerAvatarUrl,
  hasStoredSpeakerAvatar,
  persistSpeakersOnDocument,
  sanitizeSpeakersForApi,
  resolveSpeakerAvatarResponse,
  writeSpeakerAvatarFromDataUri,
  deleteAllSpeakerAvatars,
};
