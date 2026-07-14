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
const { isCloudinaryConfigured, uploadDataUri } = require('./cloudinary');

const THUMBS_ROOT = path.join(__dirname, '../../uploads/department-profiles');

const thumbPath = (type, ext) => path.join(THUMBS_ROOT, `${String(type)}.${ext}`);

const buildDepartmentThumbnailUrl = (type) => `/api/media/department-profiles/${String(type)}/thumbnail`;

const writeDepartmentThumbnailFromDataUri = async (type, dataUri) => {
  const { mime, buffer } = parseDataUri(dataUri);
  const ext = extensionFromMime(mime, '', 'jpg');
  const filePath = thumbPath(type, ext);
  const existing = findStoredFile(THUMBS_ROOT, String(type), '');
  if (existing && existing.filePath !== filePath) {
    deleteFileIfExists(existing.filePath);
  }
  await writeBufferToFile(filePath, buffer);
  return ext;
};

const persistDepartmentThumbnailOnDocument = async (doc) => {
  if (!doc?.type) return doc;
  const type = String(doc.type);
  const src = doc.thumbnail || '';
  if (isImageDataUri(src)) {
    if (isCloudinaryConfigured()) {
      const uploaded = await uploadDataUri(src, {
        folder: 'fevents/department-profiles',
        publicId: type,
      });
      if (uploaded?.url) {
        const existing = findStoredFile(THUMBS_ROOT, type, doc.thumbnailFileExt || '');
        if (existing) deleteFileIfExists(existing.filePath);
        doc.thumbnailFileExt = '';
        doc.thumbnail = uploaded.url;
        return doc;
      }
    }
    const ext = await writeDepartmentThumbnailFromDataUri(type, src);
    doc.thumbnailFileExt = ext;
    doc.thumbnail = '';
    return doc;
  }
  return doc;
};

const resolveDepartmentThumbnailResponse = async (doc) => {
  const type = String(doc?.type || '');
  const stored = findStoredFile(THUMBS_ROOT, type, doc?.thumbnailFileExt || '');
  if (stored) {
    const buffer = await readFileIfExists(stored.filePath);
    if (buffer) {
      const mime = stored.ext === 'jpg' ? 'image/jpeg' : `image/${stored.ext}`;
      return { buffer, mime };
    }
  }
  if (isHttpUrl(doc?.thumbnail)) {
    return { buffer: null, mime: null, redirectUrl: doc.thumbnail };
  }
  return null;
};

const sanitizeDepartmentProfileForApi = (doc) => {
  if (!doc) return null;
  const type = String(doc.type || '');
  const remote = isHttpUrl(doc.thumbnail) ? doc.thumbnail : '';
  const hasThumbnail =
    Boolean(remote) ||
    Boolean(doc.thumbnailFileExt) ||
    Boolean(findStoredFile(THUMBS_ROOT, type, doc.thumbnailFileExt || ''));
  return {
    type,
    description: doc.description || '',
    thumbnailUrl: remote || (hasThumbnail && type ? buildDepartmentThumbnailUrl(type) : ''),
    hasThumbnail,
    updatedAt: doc.updatedAt || null,
  };
};

module.exports = {
  buildDepartmentThumbnailUrl,
  persistDepartmentThumbnailOnDocument,
  resolveDepartmentThumbnailResponse,
  sanitizeDepartmentProfileForApi,
};
