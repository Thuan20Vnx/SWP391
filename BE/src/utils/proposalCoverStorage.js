const path = require('path');
const {
  isHttpUrl,
  isImageDataUri,
  parseDataUri,
  readFileIfExists,
  findStoredFile,
} = require('./dataUriStorage');

const PROPOSAL_COVERS_ROOT = path.join(__dirname, '../../uploads/proposal-covers');

const buildProposalCoverUrl = (proposalId) => {
  const id = String(proposalId || '').trim();
  return id ? `/api/ctsv/proposals/${id}/cover` : '';
};

const hasProposalCoverFile = (proposalId, knownExt = '') =>
  Boolean(findStoredFile(PROPOSAL_COVERS_ROOT, String(proposalId), knownExt));

const sanitizeProposalCoverForApi = (doc) => {
  const id = String(doc?._id || doc?.id || '');
  const hasCover =
    Boolean(doc?.coverFileExt) ||
    hasProposalCoverFile(id, doc?.coverFileExt || '') ||
    isImageDataUri(doc?.image) ||
    isHttpUrl(doc?.image);
  const coverUrl = hasCover && id ? buildProposalCoverUrl(id) : '';
  return {
    hasCover,
    coverUrl,
    image: isHttpUrl(doc?.image) ? doc.image : coverUrl,
  };
};

const resolveProposalCoverResponse = async (doc) => {
  const id = String(doc?._id || '');
  const stored = findStoredFile(PROPOSAL_COVERS_ROOT, id, doc?.coverFileExt || '');
  if (stored) {
    const buffer = await readFileIfExists(stored.filePath);
    if (buffer) {
      const mime = stored.ext === 'jpg' ? 'image/jpeg' : `image/${stored.ext}`;
      return { buffer, mime };
    }
  }
  if (isImageDataUri(doc?.image)) {
    const { mime, buffer } = parseDataUri(doc.image);
    return { buffer, mime };
  }
  return null;
};

module.exports = {
  buildProposalCoverUrl,
  sanitizeProposalCoverForApi,
  resolveProposalCoverResponse,
};
