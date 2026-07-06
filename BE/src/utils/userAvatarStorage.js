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

const AVATARS_ROOT = path.join(__dirname, '../../uploads/user-avatars');

const avatarPath = (userId, ext) =>
  path.join(AVATARS_ROOT, `${String(userId)}.${String(ext).replace(/^\./, '')}`);

const buildUserAvatarUrl = (userId) => {
  const id = String(userId || '').trim();
  return id ? `/api/user/avatar/${id}` : '';
};

const hasUserAvatarFile = (userId, knownExt = '') =>
  Boolean(findStoredFile(AVATARS_ROOT, String(userId), knownExt));

const writeUserAvatarFromDataUri = async (userId, dataUri) => {
  const { mime, buffer } = parseDataUri(dataUri);
  const ext = extensionFromMime(mime, '', 'jpg');
  const filePath = avatarPath(userId, ext);
  const existing = findStoredFile(AVATARS_ROOT, String(userId), '');
  if (existing && existing.filePath !== filePath) {
    deleteFileIfExists(existing.filePath);
  }
  await writeBufferToFile(filePath, buffer);
  return ext;
};

const deleteUserAvatarFile = (userId) => {
  const existing = findStoredFile(AVATARS_ROOT, String(userId), '');
  if (existing) deleteFileIfExists(existing.filePath);
};

const persistUserAvatarPayload = async (userId, picture) => {
  const src = String(picture || '').trim();
  if (!src) {
    deleteUserAvatarFile(userId);
    return { picture: '', avatar: '', avatarFileExt: '' };
  }
  if (isHttpUrl(src)) {
    deleteUserAvatarFile(userId);
    return { picture: src, avatar: src, avatarFileExt: '' };
  }
  if (isImageDataUri(src)) {
    if (isCloudinaryConfigured()) {
      const uploaded = await uploadDataUri(src, {
        folder: 'fevents/user-avatars',
        publicId: String(userId),
      });
      if (uploaded?.url) {
        deleteUserAvatarFile(userId);
        return { picture: uploaded.url, avatar: uploaded.url, avatarFileExt: '' };
      }
    }
    const ext = await writeUserAvatarFromDataUri(userId, src);
    return { picture: '', avatar: '', avatarFileExt: ext };
  }
  return { picture: src, avatar: src, avatarFileExt: '' };
};

const sanitizeUserAvatarForApi = (user) => {
  const id = String(user?._id || user?.id || '');
  const hasStored = Boolean(user?.avatarFileExt) || hasUserAvatarFile(id, user?.avatarFileExt || '');
  const remote =
    (isHttpUrl(user?.picture) && user.picture) ||
    (isHttpUrl(user?.avatar) && user.avatar) ||
    '';
  const avatarUrl = hasStored && id ? buildUserAvatarUrl(id) : '';
  return {
    picture: remote || avatarUrl,
    avatar: remote || avatarUrl,
    avatarUrl,
    hasStoredAvatar: hasStored,
  };
};

const resolveUserAvatarResponse = async (user) => {
  const id = String(user?._id || user?.id || '');
  const stored = findStoredFile(AVATARS_ROOT, id, user?.avatarFileExt || '');
  if (stored) {
    const buffer = await readFileIfExists(stored.filePath);
    if (buffer) {
      const mime = stored.ext === 'jpg' ? 'image/jpeg' : `image/${stored.ext}`;
      return { buffer, mime, redirectUrl: null };
    }
  }
  const src = user?.picture || user?.avatar || '';
  if (isHttpUrl(src)) return { buffer: null, mime: null, redirectUrl: src };
  if (isImageDataUri(src)) {
    const { mime, buffer } = parseDataUri(src);
    return { buffer, mime, redirectUrl: null };
  }
  return null;
};

module.exports = {
  buildUserAvatarUrl,
  hasUserAvatarFile,
  persistUserAvatarPayload,
  sanitizeUserAvatarForApi,
  resolveUserAvatarResponse,
  writeUserAvatarFromDataUri,
};
