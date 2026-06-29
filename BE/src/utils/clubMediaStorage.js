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

const CLUB_MEDIA_ROOT = path.join(__dirname, '../../uploads/club-media');

const clubMediaDir = (clubId) => path.join(CLUB_MEDIA_ROOT, String(clubId));

const clubMediaPath = (clubId, kind, ext) =>
  path.join(clubMediaDir(clubId), `${kind}.${String(ext).replace(/^\./, '')}`);

const buildClubCoverUrl = (clubId) => `/api/clubs/${String(clubId)}/cover`;
const buildClubLogoUrl = (clubId) => `/api/clubs/${String(clubId)}/logo`;

const hasClubMediaFile = (clubId, kind, knownExt = '') =>
  Boolean(findStoredFile(clubMediaDir(clubId), kind, knownExt));

const writeClubMediaFromDataUri = async (clubId, kind, dataUri) => {
  const { mime, buffer } = parseDataUri(dataUri);
  const ext = extensionFromMime(mime, '', 'jpg');
  const filePath = clubMediaPath(clubId, kind, ext);
  const existing = findStoredFile(clubMediaDir(clubId), kind, '');
  if (existing && existing.filePath !== filePath) {
    deleteFileIfExists(existing.filePath);
  }
  await writeBufferToFile(filePath, buffer);
  return ext;
};

const persistClubMediaOnDocument = async (doc) => {
  if (!doc?._id) return doc;
  const id = String(doc._id);

  for (const [field, kind, extField] of [
    ['coverImage', 'cover', 'coverFileExt'],
    ['logoImage', 'logo', 'logoFileExt'],
  ]) {
    const src = doc[field] || '';
    if (isImageDataUri(src) || (isHttpUrl(src) === false && isDataUri(src))) {
      if (isImageDataUri(src)) {
        const ext = await writeClubMediaFromDataUri(id, kind, src);
        doc[extField] = ext;
        doc[field] = '';
      }
      continue;
    }
    if (isHttpUrl(src)) {
      if (doc[extField] || hasClubMediaFile(id, kind)) {
        const existing = findStoredFile(clubMediaDir(id), kind, doc[extField] || '');
        if (existing) deleteFileIfExists(existing.filePath);
        doc[extField] = '';
      }
      continue;
    }
    if (!src && (doc[extField] || hasClubMediaFile(id, kind))) {
      const existing = findStoredFile(clubMediaDir(id), kind, doc[extField] || '');
      if (existing) deleteFileIfExists(existing.filePath);
      doc[extField] = '';
    }
  }

  return doc;
};

const resolveClubMediaResponse = async (club, kind) => {
  const id = String(club?._id || '');
  const extField = kind === 'cover' ? 'coverFileExt' : 'logoFileExt';
  const field = kind === 'cover' ? 'coverImage' : 'logoImage';
  const stored = findStoredFile(clubMediaDir(id), kind, club?.[extField] || '');
  if (stored) {
    const buffer = await readFileIfExists(stored.filePath);
    if (buffer) {
      const mime = stored.ext === 'jpg' ? 'image/jpeg' : `image/${stored.ext}`;
      return { buffer, mime, redirectUrl: null };
    }
  }
  const src = club?.[field] || '';
  if (isHttpUrl(src)) return { buffer: null, mime: null, redirectUrl: src };
  if (isImageDataUri(src)) {
    const { mime, buffer } = parseDataUri(src);
    return { buffer, mime, redirectUrl: null };
  }
  return null;
};

const sanitizeClubMediaForApi = (club) => {
  const id = String(club?._id || club?.id || '');
  const hasCover =
    Boolean(club?.coverFileExt) ||
    hasClubMediaFile(id, 'cover', club?.coverFileExt || '') ||
    isHttpUrl(club?.coverImage) ||
    isImageDataUri(club?.coverImage);
  const hasLogo =
    Boolean(club?.logoFileExt) ||
    hasClubMediaFile(id, 'logo', club?.logoFileExt || '') ||
    isHttpUrl(club?.logoImage) ||
    isImageDataUri(club?.logoImage);

  return {
    coverImage: isHttpUrl(club?.coverImage)
      ? club.coverImage
      : hasCover && id
        ? buildClubCoverUrl(id)
        : '',
    logoImage: isHttpUrl(club?.logoImage)
      ? club.logoImage
      : hasLogo && id
        ? buildClubLogoUrl(id)
        : '',
    coverUrl: hasCover && id ? buildClubCoverUrl(id) : '',
    logoUrl: hasLogo && id ? buildClubLogoUrl(id) : '',
    hasCover,
    hasLogo,
  };
};

module.exports = {
  buildClubCoverUrl,
  buildClubLogoUrl,
  persistClubMediaOnDocument,
  resolveClubMediaResponse,
  sanitizeClubMediaForApi,
  writeClubMediaFromDataUri,
};
