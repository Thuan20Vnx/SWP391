const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/event-covers');
const COVER_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);
const isDataUri = (value) => typeof value === 'string' && /^data:image\//i.test(value);

const ensureUploadDir = () => {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
};

const coverPathForEvent = (eventId, ext) =>
  path.join(UPLOAD_DIR, `${String(eventId)}.${String(ext).replace(/^\./, '')}`);

const extensionFromMime = (mime) => MIME_TO_EXT[String(mime || '').toLowerCase()] || 'jpg';

const parseImageDataUri = (dataUri) => {
  const match = String(dataUri).match(/^data:(image\/[\w+.+-]+);base64,(.+)$/i);
  if (!match) {
    throw new Error('INVALID_IMAGE_DATA_URI');
  }
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
};

const removeOtherCoverVariants = (eventId, keepExt) => {
  for (const ext of COVER_EXTENSIONS) {
    if (ext === keepExt) continue;
    const candidate = coverPathForEvent(eventId, ext);
    if (fs.existsSync(candidate)) {
      fs.unlinkSync(candidate);
    }
  }
};

const writeCoverFromDataUri = async (eventId, dataUri) => {
  const { mime, buffer } = parseImageDataUri(dataUri);
  const ext = extensionFromMime(mime);
  ensureUploadDir();
  const filePath = coverPathForEvent(eventId, ext);
  await fs.promises.writeFile(filePath, buffer);
  removeOtherCoverVariants(eventId, ext);
  return ext;
};

const readCoverFile = (eventId) => {
  for (const ext of COVER_EXTENSIONS) {
    const filePath = coverPathForEvent(eventId, ext);
    if (fs.existsSync(filePath)) {
      return { filePath, ext, mime: ext === 'jpg' ? 'image/jpeg' : `image/${ext}` };
    }
  }
  return null;
};

const hasCoverFile = (eventId) => Boolean(readCoverFile(eventId));

const deleteCoverFile = (eventId) => {
  for (const ext of COVER_EXTENSIONS) {
    const filePath = coverPathForEvent(eventId, ext);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

const eventHasStoredCover = (event) =>
  Boolean(event?.coverFileExt) || hasCoverFile(String(event?._id || event?.id || ''));

const eventHasAnyCover = (event) => {
  const src = event?.thumbnail || event?.image || '';
  return eventHasStoredCover(event) || isHttpUrl(src) || isDataUri(src);
};

const buildCoverUrl = (eventId) => {
  const id = String(eventId || '').trim();
  return id ? `/api/events/${id}/cover` : '';
};

const sanitizeEventCoverForApi = (event) => {
  const id = String(event?._id || event?.id || '');
  const hasCover = eventHasAnyCover(event);
  const coverUrl = hasCover && id ? buildCoverUrl(id) : '';
  const remoteThumb = isHttpUrl(event?.thumbnail) ? event.thumbnail : isHttpUrl(event?.image) ? event.image : '';

  return {
    hasCover,
    coverUrl,
    thumbnail: remoteThumb || (hasCover && id ? coverUrl : ''),
    image: remoteThumb || (hasCover && id ? coverUrl : ''),
  };
};

/**
 * Ghi base64 ra disk, cập nhật document (không save).
 * URL ngoài giữ nguyên; base64 → file + xóa field.
 */
const persistEventCoverOnDocument = async (doc) => {
  if (!doc?._id) return doc;

  const eventId = String(doc._id);
  const src = doc.thumbnail || doc.image || '';

  if (isDataUri(src)) {
    const ext = await writeCoverFromDataUri(eventId, src);
    doc.coverFileExt = ext;
    doc.thumbnail = '';
    doc.image = '';
    return doc;
  }

  if (isHttpUrl(src)) {
    if (doc.coverFileExt || hasCoverFile(eventId)) {
      deleteCoverFile(eventId);
      doc.coverFileExt = '';
    }
    return doc;
  }

  return doc;
};

const resolveCoverInlineDataUri = async (event) => {
  const id = String(event?._id || event?.id || '');
  if (!id) return '';

  const resolved = await resolveCoverResponse({ ...event, _id: id });
  if (resolved?.buffer && resolved.mime) {
    return `data:${resolved.mime};base64,${resolved.buffer.toString('base64')}`;
  }
  if (resolved?.redirectUrl) return resolved.redirectUrl;

  const legacy = event?.thumbnail || event?.image || '';
  if (isDataUri(legacy)) return legacy;
  if (isHttpUrl(legacy)) return legacy;
  return '';
};

const attachInlineEventCover = async (formatted, eventDoc) => {
  const inline = await resolveCoverInlineDataUri(eventDoc);
  if (!inline) return formatted;
  return {
    ...formatted,
    coverInline: inline,
    image: inline,
    thumbnail: inline,
    hasCover: true,
  };
};

const resolveCoverResponse = async (event) => {
  const eventId = String(event?._id || '');
  const stored = readCoverFile(eventId);
  if (stored) {
    const buffer = await fs.promises.readFile(stored.filePath);
    return { buffer, mime: stored.mime, redirectUrl: null };
  }

  const src = event?.thumbnail || event?.image || '';
  if (isHttpUrl(src)) {
    return { buffer: null, mime: null, redirectUrl: src };
  }

  if (isDataUri(src)) {
    const { mime, buffer } = parseImageDataUri(src);
    return { buffer, mime, redirectUrl: null };
  }

  return null;
};

module.exports = {
  UPLOAD_DIR,
  isHttpUrl,
  isDataUri,
  writeCoverFromDataUri,
  readCoverFile,
  hasCoverFile,
  deleteCoverFile,
  eventHasStoredCover,
  eventHasAnyCover,
  buildCoverUrl,
  sanitizeEventCoverForApi,
  persistEventCoverOnDocument,
  resolveCoverResponse,
  resolveCoverInlineDataUri,
  attachInlineEventCover,
};
