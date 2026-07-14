const path = require('path');
const {
  isHttpUrl,
  isImageDataUri,
  isDataUri,
  parseDataUri,
  extensionFromMime,
  writeBufferToFile,
  readFileIfExists,
  deleteFileIfExists,
  findStoredFile,
} = require('./dataUriStorage');
const { isCloudinaryConfigured, uploadDataUri } = require('./cloudinary');

const REQUESTS_ROOT = path.join(__dirname, '../../uploads/partner-requests');
const PARTNER_LOGOS_ROOT = path.join(__dirname, '../../uploads/partner-logos');

const requestDir = (requestId) => path.join(REQUESTS_ROOT, String(requestId));
const attachmentPath = (requestId, index, ext) =>
  path.join(requestDir(requestId), `attachment-${index}.${ext}`);
const speakerAvatarPath = (requestId, index, ext) =>
  path.join(requestDir(requestId), `speaker-${index}.${ext}`);
const coverPath = (requestId, ext) => path.join(requestDir(requestId), `cover.${ext}`);
const partnerLogoPath = (partnerId, ext) =>
  path.join(PARTNER_LOGOS_ROOT, `${String(partnerId)}.${ext}`);

const buildPartnerRequestCoverUrl = (requestId) =>
  `/api/media/partner-requests/${String(requestId)}/cover`;
const buildPartnerRequestAttachmentUrl = (requestId, index) =>
  `/api/media/partner-requests/${String(requestId)}/attachments/${index}`;
const buildPartnerRequestSpeakerAvatarUrl = (requestId, index) =>
  `/api/media/partner-requests/${String(requestId)}/speakers/${index}/avatar`;
const buildPartnerLogoUrl = (partnerId) => `/api/media/partners/${String(partnerId)}/logo`;

const writeCover = async (requestId, dataUri) => {
  const { mime, buffer } = parseDataUri(dataUri);
  const ext = extensionFromMime(mime, '', 'jpg');
  await writeBufferToFile(coverPath(requestId, ext), buffer);
  return ext;
};

const writeAttachment = async (requestId, index, dataUri, mimeHint = '', fileName = '') => {
  const { mime, buffer } = parseDataUri(dataUri);
  const ext = extensionFromMime(mimeHint || mime, fileName, 'bin');
  await writeBufferToFile(attachmentPath(requestId, index, ext), buffer);
  return ext;
};

const writeSpeakerAvatar = async (requestId, index, dataUri) => {
  const { mime, buffer } = parseDataUri(dataUri);
  const ext = extensionFromMime(mime, '', 'jpg');
  await writeBufferToFile(speakerAvatarPath(requestId, index, ext), buffer);
  return ext;
};

const writePartnerLogo = async (partnerId, dataUri) => {
  const { mime, buffer } = parseDataUri(dataUri);
  const ext = extensionFromMime(mime, '', 'jpg');
  const filePath = partnerLogoPath(partnerId, ext);
  const existing = findStoredFile(PARTNER_LOGOS_ROOT, String(partnerId), '');
  if (existing && existing.filePath !== filePath) deleteFileIfExists(existing.filePath);
  await writeBufferToFile(filePath, buffer);
  return ext;
};

const persistPartnerRequestMediaOnDocument = async (doc) => {
  if (!doc?._id) return doc;
  const id = String(doc._id);

  if (isImageDataUri(doc.image)) {
    let done = false;
    if (isCloudinaryConfigured()) {
      const uploaded = await uploadDataUri(doc.image, {
        folder: `fevents/partner-requests/${id}`,
        publicId: 'cover',
      });
      if (uploaded?.url) {
        doc.coverFileExt = '';
        doc.image = uploaded.url;
        done = true;
      }
    }
    if (!done) {
      doc.coverFileExt = await writeCover(id, doc.image);
      doc.image = '';
    }
  } else if (isHttpUrl(doc.image)) {
    doc.coverFileExt = '';
  }

  if (Array.isArray(doc.attachments)) {
    // Làm việc trên mảng PLAIN OBJECT cục bộ rồi gán 1 lần ở cuối. Lý do: spread
    // {...subdoc} không copy field dữ liệu (name/sizeLabel/mimeType) và gán vào
    // doc.attachments sẽ recast thành subdocument → mất tên tệp nếu xử lý tại chỗ.
    const toPlain = (a) => (a && typeof a.toObject === 'function' ? a.toObject() : { ...a });
    const atts = doc.attachments
      .map(toPlain)
      // Loại bỏ đính kèm rỗng (chỉ giữ khi có url hoặc file đã lưu; tên suông không tính).
      .filter((att) => att && (String(att.url || '').trim() || String(att.storedExt || '').trim()));
    for (let i = 0; i < atts.length; i += 1) {
      const att = atts[i];
      const url = String(att?.url || '').trim();
      if (isDataUri(url)) {
        let stored = false;
        if (isCloudinaryConfigured()) {
          const uploaded = await uploadDataUri(url, {
            folder: `fevents/partner-requests/${id}/attachments`,
            publicId: String(i),
            resourceType: 'auto',
          }).catch(() => null);
          if (uploaded?.url) {
            atts[i] = { ...att, url: uploaded.url, storedExt: '' };
            stored = true;
          }
        }
        if (!stored) {
          const ext = await writeAttachment(id, i, url, att.mimeType, att.name);
          atts[i] = { ...att, url: '', storedExt: ext };
        }
      } else if (!url) {
        atts[i] = { ...att, storedExt: att.storedExt || '' };
      } else {
        atts[i] = { ...att, storedExt: '' };
      }
    }
    doc.attachments = atts;
  }

  // toObject() để spread {...speaker} không mất name/role (xem lý do ở phần attachments).
  const speakers = Array.isArray(doc.speakers)
    ? doc.speakers.map((s) => (s && typeof s.toObject === 'function' ? s.toObject() : { ...s }))
    : [];
  const speakerAvatarExts = Array.isArray(doc.speakerAvatarExts) ? [...doc.speakerAvatarExts] : [];
  for (let i = 0; i < speakers.length; i += 1) {
    const avatar = speakers[i]?.avatar || '';
    if (isImageDataUri(avatar)) {
      let stored = false;
      if (isCloudinaryConfigured()) {
        const uploaded = await uploadDataUri(avatar, {
          folder: `fevents/partner-requests/${id}/speakers`,
          publicId: String(i),
        }).catch(() => null);
        if (uploaded?.url) {
          speakerAvatarExts[i] = '';
          speakers[i] = { ...speakers[i], avatar: uploaded.url };
          stored = true;
        }
      }
      if (!stored) {
        speakerAvatarExts[i] = await writeSpeakerAvatar(id, i, avatar);
        speakers[i] = { ...speakers[i], avatar: '' };
      }
    } else if (isHttpUrl(avatar)) {
      speakerAvatarExts[i] = '';
    }
  }
  doc.speakers = speakers;
  doc.speakerAvatarExts = speakerAvatarExts;

  return doc;
};

const persistPartnerLogoOnDocument = async (doc) => {
  if (!doc?._id) return doc;
  const id = String(doc._id);
  const logo = String(doc.logo || '').trim();
  if (isImageDataUri(logo)) {
    let stored = false;
    if (isCloudinaryConfigured()) {
      const uploaded = await uploadDataUri(logo, {
        folder: 'fevents/partner-logos',
        publicId: id,
      }).catch(() => null);
      if (uploaded?.url) {
        doc.logoFileExt = '';
        doc.logo = uploaded.url;
        stored = true;
      }
    }
    if (!stored) {
      doc.logoFileExt = await writePartnerLogo(id, logo);
      doc.logo = '';
    }
  } else if (isHttpUrl(logo)) {
    if (doc.logoFileExt) {
      const existing = findStoredFile(PARTNER_LOGOS_ROOT, id, doc.logoFileExt);
      if (existing) deleteFileIfExists(existing.filePath);
      doc.logoFileExt = '';
    }
  }
  return doc;
};

const attachmentHasFile = (requestId, index, storedExt = '') => {
  const file = findStoredFile(requestDir(requestId), `attachment-${index}`, storedExt);
  return Boolean(file);
};

const sanitizePartnerRequestForApi = (doc) => {
  const id = String(doc?._id || doc?.id || '');
  const hasCover =
    Boolean(doc?.coverFileExt) ||
    Boolean(findStoredFile(requestDir(id), 'cover', doc?.coverFileExt || '')) ||
    isImageDataUri(doc?.image) ||
    isHttpUrl(doc?.image);

  const attachments = (doc?.attachments || [])
    .map((att, index) => {
      const rawUrl = String(att?.url || '').trim();
      // Có file thật khi: đã lưu ext / có file trên đĩa / URL Cloudinary / data URI.
      const hasFile =
        Boolean(att?.storedExt) ||
        attachmentHasFile(id, index, att?.storedExt || '') ||
        isHttpUrl(rawUrl) ||
        isDataUri(rawUrl);
      // Luôn route qua endpoint media của BE → tải kèm tên tệp gốc, xử lý đồng nhất
      // cho cả Cloudinary/đĩa/data URI (tránh tải ra file tên "0" không đuôi).
      const mediaUrl = hasFile && id ? buildPartnerRequestAttachmentUrl(id, index) : '';
      return {
        name: att?.name || 'Tệp đính kèm',
        sizeLabel: att?.sizeLabel || '',
        mimeType: att?.mimeType || '',
        url: mediaUrl,
        attachmentUrl: mediaUrl,
        hasFile,
      };
    })
    // Bỏ các đính kèm rỗng (không có file lưu và không có link hợp lệ) để không hiện thẻ hỏng.
    .filter((a) => a.hasFile);

  const speakerAvatarExts = Array.isArray(doc?.speakerAvatarExts) ? doc.speakerAvatarExts : [];
  const speakers = (doc?.speakers || []).map((speaker, index) => {
    const hasAvatar =
      Boolean(speakerAvatarExts[index]) ||
      Boolean(findStoredFile(requestDir(id), `speaker-${index}`, speakerAvatarExts[index] || '')) ||
      isImageDataUri(speaker?.avatar) ||
      isHttpUrl(speaker?.avatar);
    const avatarUrl = hasAvatar && id ? buildPartnerRequestSpeakerAvatarUrl(id, index) : '';
    return {
      ...speaker,
      avatar: isHttpUrl(speaker?.avatar) ? speaker.avatar : avatarUrl,
      avatarUrl,
    };
  });

  const remoteCover = isHttpUrl(doc?.image) ? doc.image : '';
  return {
    image: remoteCover,
    coverUrl: remoteCover || (hasCover && id ? buildPartnerRequestCoverUrl(id) : ''),
    hasCover,
    attachments,
    speakers,
    speakerAvatarExts,
  };
};

const sanitizePartnerForApi = (doc) => {
  const id = String(doc?._id || doc?.id || '');
  const hasLogo =
    Boolean(doc?.logoFileExt) ||
    Boolean(findStoredFile(PARTNER_LOGOS_ROOT, id, doc?.logoFileExt || '')) ||
    isImageDataUri(doc?.logo) ||
    isHttpUrl(doc?.logo);
  return {
    logo: isHttpUrl(doc?.logo) ? doc.logo : hasLogo && id ? buildPartnerLogoUrl(id) : '',
    logoUrl: hasLogo && id ? buildPartnerLogoUrl(id) : '',
    hasLogo,
  };
};

const resolveCoverResponse = async (doc) => {
  const id = String(doc?._id || '');
  const stored = findStoredFile(requestDir(id), 'cover', doc?.coverFileExt || '');
  if (stored) {
    const buffer = await readFileIfExists(stored.filePath);
    if (buffer) return { buffer, mime: stored.ext === 'jpg' ? 'image/jpeg' : `image/${stored.ext}` };
  }
  if (isImageDataUri(doc?.image)) {
    const { mime, buffer } = parseDataUri(doc.image);
    return { buffer, mime };
  }
  return null;
};

const resolveAttachmentResponse = async (doc, index) => {
  const id = String(doc?._id || '');
  const att = (doc?.attachments || [])[index];
  if (!att) return null;
  const stored = findStoredFile(requestDir(id), `attachment-${index}`, att.storedExt || '');
  if (stored) {
    const buffer = await readFileIfExists(stored.filePath);
    if (buffer) {
      return {
        buffer,
        mime: att.mimeType || 'application/octet-stream',
        fileName: att.name || `attachment-${index}`,
      };
    }
  }
  if (isDataUri(att?.url)) {
    const { mime, buffer } = parseDataUri(att.url);
    return { buffer, mime, fileName: att.name || `attachment-${index}` };
  }
  // File lưu trên Cloudinary (URL http) → tải về buffer để phục vụ kèm tên tệp gốc.
  if (isHttpUrl(att?.url)) {
    try {
      const resp = await fetch(att.url);
      if (resp.ok) {
        const buffer = Buffer.from(await resp.arrayBuffer());
        const mime =
          att.mimeType || resp.headers.get('content-type') || 'application/octet-stream';
        return { buffer, mime, fileName: att.name || `attachment-${index}` };
      }
    } catch {
      /* fallback: không tải được thì trả null */
    }
  }
  return null;
};

const resolveSpeakerAvatarResponse = async (doc, index) => {
  const id = String(doc?._id || '');
  const exts = doc?.speakerAvatarExts || [];
  const stored = findStoredFile(requestDir(id), `speaker-${index}`, exts[index] || '');
  if (stored) {
    const buffer = await readFileIfExists(stored.filePath);
    if (buffer) return { buffer, mime: stored.ext === 'jpg' ? 'image/jpeg' : `image/${stored.ext}` };
  }
  const speaker = (doc?.speakers || [])[index];
  if (isImageDataUri(speaker?.avatar)) {
    const { mime, buffer } = parseDataUri(speaker.avatar);
    return { buffer, mime };
  }
  return null;
};

const resolvePartnerLogoResponse = async (doc) => {
  const id = String(doc?._id || '');
  const stored = findStoredFile(PARTNER_LOGOS_ROOT, id, doc?.logoFileExt || '');
  if (stored) {
    const buffer = await readFileIfExists(stored.filePath);
    if (buffer) return { buffer, mime: stored.ext === 'jpg' ? 'image/jpeg' : `image/${stored.ext}` };
  }
  if (isImageDataUri(doc?.logo)) {
    const { mime, buffer } = parseDataUri(doc.logo);
    return { buffer, mime };
  }
  return null;
};

module.exports = {
  buildPartnerRequestCoverUrl,
  buildPartnerRequestAttachmentUrl,
  buildPartnerRequestSpeakerAvatarUrl,
  buildPartnerLogoUrl,
  persistPartnerRequestMediaOnDocument,
  persistPartnerLogoOnDocument,
  sanitizePartnerRequestForApi,
  sanitizePartnerForApi,
  resolveCoverResponse,
  resolveAttachmentResponse,
  resolveSpeakerAvatarResponse,
  resolvePartnerLogoResponse,
  writeCover,
  writeAttachment,
  writePartnerLogo,
};
