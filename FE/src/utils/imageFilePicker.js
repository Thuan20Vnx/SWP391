export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export const validateImageFile = (file) => {
  if (!file) return { ok: false, message: '' };
  if (!file.type.startsWith('image/')) {
    return { ok: false, message: 'Vui lòng chọn file ảnh (PNG, JPG, WebP).' };
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return { ok: false, message: 'Kích thước ảnh tối đa là 5MB.' };
  }
  return { ok: true, message: '' };
};

export const readImageFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Không đọc được file ảnh.'));
    reader.readAsDataURL(file);
  });

export const openImageFilePicker = async (file, { onError } = {}) => {
  const check = validateImageFile(file);
  if (!check.ok) {
    onError?.(check.message);
    return null;
  }
  try {
    return await readImageFileAsDataUrl(file);
  } catch {
    onError?.('Không đọc được file ảnh.');
    return null;
  }
};
