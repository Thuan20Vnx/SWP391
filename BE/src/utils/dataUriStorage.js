const fs = require('fs');
const path = require('path');

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);
const isDataUri = (value) => typeof value === 'string' && /^data:[^;]+;base64,/i.test(value);
const isImageDataUri = (value) => typeof value === 'string' && /^data:image\//i.test(value);

const parseDataUri = (dataUri) => {
  const match = String(dataUri).match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) {
    throw new Error('INVALID_DATA_URI');
  }
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
};

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const extensionFromMime = (mime, fileName = '', fallback = 'bin') => {
  const fromName = path.extname(String(fileName || '')).replace(/^\./, '').toLowerCase();
  if (fromName) return fromName === 'jpeg' ? 'jpg' : fromName;

  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
  };

  const key = String(mime || '').toLowerCase();
  if (map[key]) return map[key];
  if (key.startsWith('image/')) return key.split('/')[1] || fallback;
  return fallback;
};

const writeBufferToFile = async (filePath, buffer) => {
  ensureDir(path.dirname(filePath));
  await fs.promises.writeFile(filePath, buffer);
};

const readFileIfExists = async (filePath) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return buffer;
  } catch {
    return null;
  }
};

const deleteFileIfExists = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const findStoredFile = (dirPath, id, knownExt = '') => {
  const base = String(id);
  if (knownExt) {
    const filePath = path.join(dirPath, `${base}.${knownExt.replace(/^\./, '')}`);
    if (fs.existsSync(filePath)) {
      return { filePath, ext: knownExt.replace(/^\./, '') };
    }
  }
  if (!fs.existsSync(dirPath)) return null;
  const entries = fs.readdirSync(dirPath);
  const prefix = `${base}.`;
  const hit = entries.find((name) => name.startsWith(prefix));
  if (!hit) return null;
  const ext = hit.slice(prefix.length);
  return { filePath: path.join(dirPath, hit), ext };
};

module.exports = {
  isHttpUrl,
  isDataUri,
  isImageDataUri,
  parseDataUri,
  ensureDir,
  extensionFromMime,
  writeBufferToFile,
  readFileIfExists,
  deleteFileIfExists,
  findStoredFile,
};
