const { v2: cloudinary } = require('cloudinary');

/**
 * Lớp lưu trữ ảnh/file dùng chung qua Cloudinary.
 *
 * Cấu hình bằng ENV (ưu tiên CLOUDINARY_URL, hoặc 3 biến rời):
 *   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
 *   -- hoặc --
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *
 * Khi CHƯA cấu hình, các hàm upload trả về null để nơi gọi tự fallback
 * về lưu file trên đĩa (phù hợp dev local không có key).
 */

let configured = false;

const configure = () => {
  if (configured) return true;

  const url = process.env.CLOUDINARY_URL;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (url) {
    // SDK tự đọc CLOUDINARY_URL từ process.env khi gọi config()
    cloudinary.config({ secure: true });
    configured = Boolean(cloudinary.config().cloud_name);
    return configured;
  }

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    configured = true;
    return true;
  }

  return false;
};

const isCloudinaryConfigured = () => configure();

const DATA_URI_RE = /^data:([^;]+);base64,(.+)$/i;

/**
 * Upload một data URI (image/... base64) lên Cloudinary.
 * @returns {Promise<{url:string, publicId:string}|null>} null nếu chưa cấu hình.
 */
const uploadDataUri = async (dataUri, { folder = 'fevents', publicId, resourceType = 'image' } = {}) => {
  if (!configure()) return null;
  if (!DATA_URI_RE.test(String(dataUri || ''))) {
    throw new Error('INVALID_DATA_URI');
  }
  const res = await cloudinary.uploader.upload(dataUri, {
    folder,
    public_id: publicId ? String(publicId) : undefined,
    resource_type: resourceType,
    overwrite: true,
    invalidate: true,
  });
  return { url: res.secure_url, publicId: res.public_id };
};

/**
 * Upload một Buffer lên Cloudinary (dùng cho file đã đọc từ multer/đĩa).
 * @returns {Promise<{url:string, publicId:string}|null>}
 */
const uploadBuffer = async (buffer, { folder = 'fevents', publicId, resourceType = 'image' } = {}) => {
  if (!configure()) return null;
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('INVALID_BUFFER');
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId ? String(publicId) : undefined,
        resource_type: resourceType,
        overwrite: true,
        invalidate: true,
      },
      (err, res) => {
        if (err) return reject(err);
        resolve({ url: res.secure_url, publicId: res.public_id });
      }
    );
    stream.end(buffer);
  });
};

/** Xóa asset theo publicId (best-effort, không throw). */
const destroy = async (publicId, { resourceType = 'image' } = {}) => {
  if (!configure() || !publicId) return;
  try {
    await cloudinary.uploader.destroy(String(publicId), { resource_type: resourceType, invalidate: true });
  } catch (err) {
    console.warn('[cloudinary] destroy failed:', publicId, err.message);
  }
};

/** Suy ra publicId từ một URL Cloudinary (để xóa/ghi đè), '' nếu không phải URL Cloudinary. */
const publicIdFromUrl = (url) => {
  const str = String(url || '');
  const match = str.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
  return match ? match[1] : '';
};

const isCloudinaryUrl = (url) =>
  typeof url === 'string' && /^https?:\/\/res\.cloudinary\.com\//i.test(url);

module.exports = {
  isCloudinaryConfigured,
  uploadDataUri,
  uploadBuffer,
  destroy,
  publicIdFromUrl,
  isCloudinaryUrl,
};
