const path = require('path');
const {
  isDataUri,
  isImageDataUri,
  parseDataUri,
  extensionFromMime,
  writeBufferToFile,
  readFileIfExists,
  deleteFileIfExists,
  findStoredFile,
} = require('./dataUriStorage');

const IMAGES_ROOT = path.join(__dirname, '../../uploads/announcement-images');

const imagePath = (id, ext) =>
  path.join(IMAGES_ROOT, `${String(id)}.${String(ext).replace(/^\./, '')}`);

const buildAnnouncementImageUrl = (id) => {
  const sid = String(id || '').trim();
  return sid ? `/api/announcements/${sid}/image` : '';
};

const hasAnnouncementImageFile = (id, knownExt = '') =>
  Boolean(findStoredFile(IMAGES_ROOT, String(id), knownExt));

const writeAnnouncementImageFromDataUri = async (id, dataUri) => {
  const { mime, buffer } = parseDataUri(dataUri);
  const ext = extensionFromMime(mime, '', 'jpg');
  const filePath = imagePath(id, ext);
  const existing = findStoredFile(IMAGES_ROOT, String(id), '');
  if (existing && existing.filePath !== filePath) {
    deleteFileIfExists(existing.filePath);
  }
  await writeBufferToFile(filePath, buffer);
  return ext;
};

const persistAnnouncementImageOnDocument = async (doc) => {
  if (!doc?._id) return doc;
  const id = String(doc._id);
  const src = doc.image || '';
  if (isImageDataUri(src) || (isDataUri(src) && src.startsWith('data:image'))) {
    const ext = await writeAnnouncementImageFromDataUri(id, src);
    doc.imageFileExt = ext;
    doc.image = '';
    return doc;
  }
  if (src === '' && (doc.imageFileExt || hasAnnouncementImageFile(id))) {
    const existing = findStoredFile(IMAGES_ROOT, id, doc.imageFileExt || '');
    if (existing) deleteFileIfExists(existing.filePath);
    doc.imageFileExt = '';
  }
  return doc;
};

const resolveAnnouncementImageResponse = async (doc) => {
  const id = String(doc?._id || '');
  const stored = findStoredFile(IMAGES_ROOT, id, doc?.imageFileExt || '');
  if (stored) {
    const buffer = await readFileIfExists(stored.filePath);
    if (buffer) {
      const mime = doc?.imageFileMime || (stored.ext === 'jpg' ? 'image/jpeg' : `image/${stored.ext}`);
      return { buffer, mime };
    }
  }
  if (isDataUri(doc?.image)) {
    const { mime, buffer } = parseDataUri(doc.image);
    return { buffer, mime };
  }
  return null;
};

const sanitizeAnnouncementImageForApi = (doc) => {
  const id = String(doc?._id || doc?.id || '');
  const hasImage =
    Boolean(doc?.imageFileExt) ||
    hasAnnouncementImageFile(id, doc?.imageFileExt || '') ||
    isDataUri(doc?.image);
  return {
    hasImage,
    imageUrl: hasImage && id ? buildAnnouncementImageUrl(id) : '',
    image: '',
  };
};

module.exports = {
  buildAnnouncementImageUrl,
  persistAnnouncementImageOnDocument,
  resolveAnnouncementImageResponse,
  sanitizeAnnouncementImageForApi,
  writeAnnouncementImageFromDataUri,
};
