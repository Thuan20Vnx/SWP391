const createImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });

export const getMinScale = (imgW, imgH, viewW, viewH) =>
  Math.max(viewW / imgW, viewH / imgH);

export const getInitialCropState = (imgW, imgH, viewW, viewH, coverBoost = 1) => {
  const minScale = getMinScale(imgW, imgH, viewW, viewH);
  const scale = minScale * Math.max(1, coverBoost);
  return clampCropState(
    {
      scale,
      offsetX: (viewW - imgW * scale) / 2,
      offsetY: (viewH - imgH * scale) / 2,
      viewW,
      viewH
    },
    imgW,
    imgH
  );
};

/** Giữ ảnh luôn phủ kín khung 16:9 — không kéo ra vùng trống. */
export const clampCropState = (state, imgW, imgH) => {
  const { scale, offsetX, offsetY, viewW, viewH } = state;
  const displayW = imgW * scale;
  const displayH = imgH * scale;

  let ox = offsetX;
  let oy = offsetY;

  if (displayW <= viewW) {
    ox = (viewW - displayW) / 2;
  } else {
    ox = Math.min(0, Math.max(viewW - displayW, ox));
  }

  if (displayH <= viewH) {
    oy = (viewH - displayH) / 2;
  } else {
    oy = Math.min(0, Math.max(viewH - displayH, oy));
  }

  return { ...state, offsetX: ox, offsetY: oy };
};

/** Zoom quanh một điểm (tâm khung hoặc vị trí chuột). */
export const zoomCropState = (state, imgW, imgH, newScale, anchorX, anchorY) => {
  const { scale, offsetX, offsetY, viewW, viewH } = state;
  const ratio = newScale / scale;
  const next = {
    ...state,
    scale: newScale,
    offsetX: anchorX - (anchorX - offsetX) * ratio,
    offsetY: anchorY - (anchorY - offsetY) * ratio,
    viewW,
    viewH
  };
  return clampCropState(next, imgW, imgH);
};

const drawCropped = (image, state, outputW, outputH) => {
  const { scale, offsetX, offsetY, viewW, viewH } = state;
  const sw = viewW / scale;
  const sh = viewH / scale;
  let sx = -offsetX / scale;
  let sy = -offsetY / scale;

  sx = Math.max(0, Math.min(sx, image.naturalWidth - sw));
  sy = Math.max(0, Math.min(sy, image.naturalHeight - sh));

  const canvas = document.createElement('canvas');
  canvas.width = outputW;
  canvas.height = outputH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputW, outputH);
  return canvas;
};

const MAX_DATA_URL_LEN = 2_800_000;

/**
 * Cắt ảnh 16:9, xuất JPEG — tự giảm quality nếu base64 quá lớn cho MongoDB.
 */
export async function cropBannerImage(
  imageSrc,
  cropState,
  outputW = 1200,
  outputH = 675,
  startQuality = 0.9
) {
  const image = await createImage(imageSrc);
  const canvas = drawCropped(image, cropState, outputW, outputH);

  let quality = startQuality;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);

  while (dataUrl.length > MAX_DATA_URL_LEN && quality > 0.52) {
    quality -= 0.07;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  return dataUrl;
}

/** Preview nhỏ (dùng trong modal, không nén lại). */
export async function cropBannerPreview(imageSrc, cropState, previewW = 320, previewH = 180) {
  const image = await createImage(imageSrc);
  const canvas = drawCropped(image, cropState, previewW, previewH);
  return canvas.toDataURL('image/jpeg', 0.82);
}

/** Cắt ảnh đại diện vuông 1:1. */
export async function cropAvatarImage(
  imageSrc,
  cropState,
  outputSize = 512,
  startQuality = 0.88
) {
  const image = await createImage(imageSrc);
  const canvas = drawCropped(image, cropState, outputSize, outputSize);

  let quality = startQuality;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);

  while (dataUrl.length > MAX_DATA_URL_LEN && quality > 0.52) {
    quality -= 0.07;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  return dataUrl;
}

export async function cropAvatarPreview(imageSrc, cropState, previewSize = 128) {
  const image = await createImage(imageSrc);
  const canvas = drawCropped(image, cropState, previewSize, previewSize);
  return canvas.toDataURL('image/jpeg', 0.82);
}
