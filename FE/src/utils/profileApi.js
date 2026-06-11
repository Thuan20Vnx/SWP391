import { API_BASE, getAuthHeaders, parseApiResponse } from './api';
import { isCustomUploadedAvatar } from './image';

/** Upload avatar as a single picture field (BE mirrors to avatar). */
export const updateUserAvatar = async (imageData) => {
  const res = await fetch(`${API_BASE}/api/user/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ picture: imageData })
  });
  const { ok, status, data } = await parseApiResponse(res);
  if (!ok || status !== 200 || data.success === false) {
    const err = new Error(
      data.message ||
        (status === 413
          ? 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn.'
          : status === 401
            ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!'
            : 'Lưu ảnh đại diện thất bại!')
    );
    err.status = status;
    throw err;
  }
  return data;
};

export const buildProfilePicturePayload = (avatar, displayAvatar) => {
  const value = avatar || displayAvatar;
  return isCustomUploadedAvatar(value) ? { picture: value } : {};
};
