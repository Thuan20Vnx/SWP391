import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  clampCropState,
  cropAvatarImage,
  cropAvatarPreview,
  getInitialCropState,
  getMinScale,
  zoomCropState
} from '../../utils/cropImage';

const VIEW_SIZE = 320;
const ZOOM_MAX_FACTOR = 3;
const PREVIEW_DEBOUNCE_MS = 120;

const AvatarCropModal = ({ open, imageSrc, fileName, onConfirm, onCancel }) => {
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [minScale, setMinScale] = useState(1);
  const [maxScale, setMaxScale] = useState(3);
  const [crop, setCrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const cropRef = useRef(null);
  const imageElRef = useRef(null);
  const viewportRef = useRef(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const previewTimerRef = useRef(null);

  const applyImageTransform = useCallback((c, nw, nh) => {
    const el = imageElRef.current;
    if (!el || !c) return;
    const dw = nw * c.scale;
    const dh = nh * c.scale;
    el.style.width = `${dw}px`;
    el.style.height = `${dh}px`;
    el.style.transform = `translate3d(${c.offsetX}px, ${c.offsetY}px, 0)`;
  }, []);

  const commitCrop = useCallback(
    (next) => {
      if (!naturalSize.w) return next;
      const clamped = clampCropState(next, naturalSize.w, naturalSize.h);
      cropRef.current = clamped;
      setCrop(clamped);
      applyImageTransform(clamped, naturalSize.w, naturalSize.h);
      return clamped;
    },
    [naturalSize.w, naturalSize.h, applyImageTransform]
  );

  const schedulePreview = useCallback(
    (state) => {
      if (!imageSrc || !state) return;
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(async () => {
        try {
          const url = await cropAvatarPreview(imageSrc, state);
          setPreviewUrl(url);
        } catch {
          setPreviewUrl('');
        }
      }, PREVIEW_DEBOUNCE_MS);
    },
    [imageSrc]
  );

  useEffect(() => {
    if (!open || !imageSrc) return undefined;

    setLoading(true);
    setPreviewUrl('');
    setCrop(null);
    cropRef.current = null;

    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const min = getMinScale(nw, nh, VIEW_SIZE, VIEW_SIZE);
      const max = min * ZOOM_MAX_FACTOR;
      const initial = getInitialCropState(nw, nh, VIEW_SIZE, VIEW_SIZE);
      setNaturalSize({ w: nw, h: nh });
      setMinScale(min);
      setMaxScale(max);
      cropRef.current = initial;
      setCrop(initial);
      setLoading(false);
      schedulePreview(initial);
    };
    img.onerror = () => setLoading(false);
    img.src = imageSrc;

    return () => clearTimeout(previewTimerRef.current);
  }, [open, imageSrc, schedulePreview]);

  const setZoom = (scale, anchorX = VIEW_SIZE / 2, anchorY = VIEW_SIZE / 2) => {
    if (!cropRef.current || !naturalSize.w) return;
    const clamped = Math.min(maxScale, Math.max(minScale, scale));
    const next = zoomCropState(cropRef.current, naturalSize.w, naturalSize.h, clamped, anchorX, anchorY);
    const committed = commitCrop(next);
    schedulePreview(committed);
  };

  const handleFit = () => {
    if (!naturalSize.w) return;
    const initial = getInitialCropState(naturalSize.w, naturalSize.h, VIEW_SIZE, VIEW_SIZE);
    const committed = commitCrop(initial);
    schedulePreview(committed);
  };

  const handleReset = handleFit;

  const onPointerDown = (e) => {
    if (loading || !cropRef.current) return;
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, ox: cropRef.current.offsetX, oy: cropRef.current.offsetY };
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current || !cropRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const next = {
      ...cropRef.current,
      offsetX: dragStartRef.current.ox + dx,
      offsetY: dragStartRef.current.oy + dy
    };
    commitCrop(next);
  };

  const onPointerUp = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      viewportRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (cropRef.current) {
      const committed = commitCrop(cropRef.current);
      schedulePreview(committed);
    }
  };

  const onWheel = (e) => {
    if (!cropRef.current || loading) return;
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    const anchorX = rect ? e.clientX - rect.left : VIEW_SIZE / 2;
    const anchorY = rect ? e.clientY - rect.top : VIEW_SIZE / 2;
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(cropRef.current.scale * (1 + delta), anchorX, anchorY);
  };

  const handleZoomSlider = (e) => {
    setZoom(Number(e.target.value));
  };

  const handleConfirm = async () => {
    const c = cropRef.current;
    if (!c) return;
    setProcessing(true);
    try {
      const dataUrl = await cropAvatarImage(imageSrc, c);
      onConfirm(dataUrl, fileName);
    } catch {
      onConfirm(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleBackdrop = useCallback(
    (e) => {
      if (e.target === e.currentTarget && !processing) onCancel();
    },
    [onCancel, processing]
  );

  if (!open || !imageSrc) return null;

  const zoomPercent = crop
    ? Math.round(((crop.scale - minScale) / (maxScale - minScale || 1)) * 100)
    : 0;

  return (
    <div className="ctsv-crop-modal-backdrop" onClick={handleBackdrop} role="presentation">
      <div
        className="ctsv-crop-modal ctsv-crop-modal--avatar"
        role="dialog"
        aria-labelledby="avatar-crop-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ctsv-crop-modal-header">
          <div>
            <h2 id="avatar-crop-title">Chỉnh sửa ảnh đại diện</h2>
            <p>Kéo để căn chỉnh · Cuộn chuột hoặc thanh trượt để zoom · Khung vuông 1:1</p>
          </div>
          <button type="button" className="ctsv-crop-close" onClick={onCancel} aria-label="Đóng">
            ×
          </button>
        </header>

        <div className="ctsv-crop-body">
          <div className="ctsv-crop-editor">
            <div
              ref={viewportRef}
              className={`ctsv-crop-viewport ctsv-crop-viewport--avatar ${loading ? 'is-loading' : ''}`}
              style={{ width: VIEW_SIZE, height: VIEW_SIZE }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
            >
              {loading ? (
                <div className="ctsv-crop-loading">
                  <span className="ctsv-crop-spinner" />
                  <span>Đang tải ảnh...</span>
                </div>
              ) : (
                <img ref={imageElRef} src={imageSrc} alt="" className="ctsv-crop-image" draggable={false} />
              )}
              <div className="ctsv-crop-grid ctsv-crop-grid--avatar" aria-hidden />
            </div>

            <div className="ctsv-crop-toolbar">
              <button type="button" className="ctsv-crop-tool-btn" onClick={handleFit} disabled={loading}>
                Vừa khung
              </button>
              <button type="button" className="ctsv-crop-tool-btn" onClick={handleReset} disabled={loading}>
                Đặt lại
              </button>
              <span className="ctsv-crop-zoom-badge">{zoomPercent}%</span>
            </div>

            <label className="ctsv-crop-zoom-label">
              Thu phóng
              <input
                type="range"
                min={minScale}
                max={maxScale}
                step="0.01"
                value={crop?.scale ?? minScale}
                onChange={handleZoomSlider}
                disabled={loading || processing}
              />
            </label>
          </div>

          <aside className="ctsv-crop-preview-panel">
            <span className="ctsv-crop-preview-label">Xem trước avatar</span>
            <div className="ctsv-crop-preview-box ctsv-crop-preview-box--avatar">
              {previewUrl ? (
                <img src={previewUrl} alt="Xem trước ảnh đại diện sau khi cắt" />
              ) : (
                <div className="ctsv-crop-preview-placeholder">Đang tạo preview...</div>
              )}
            </div>
            <p className="ctsv-crop-preview-meta">Xuất: 512 × 512 px · JPEG</p>
          </aside>
        </div>

        <footer className="ctsv-crop-footer">
          <button type="button" className="ctsv-btn-secondary" onClick={onCancel} disabled={processing}>
            Hủy
          </button>
          <button
            type="button"
            className="ctsv-btn-primary"
            onClick={handleConfirm}
            disabled={processing || loading || !crop}
          >
            {processing ? 'Đang xử lý...' : 'Áp dụng ảnh đại diện'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AvatarCropModal;
