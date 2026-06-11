import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  clampCropState,
  cropBannerImage,
  cropBannerPreview,
  getInitialCropState,
  getMinScale,
  zoomCropState
} from '../../utils/cropImage';

const VIEW_W = 520;
const VIEW_H = Math.round((VIEW_W * 9) / 16);
const ZOOM_MAX_FACTOR = 3;
const PREVIEW_DEBOUNCE_MS = 120;

const BannerCropModal = ({ open, imageSrc, fileName, onConfirm, onCancel }) => {
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
  const rafRef = useRef(null);
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
          const url = await cropBannerPreview(imageSrc, state);
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
      const ms = getMinScale(nw, nh, VIEW_W, VIEW_H);
      const initial = getInitialCropState(nw, nh, VIEW_W, VIEW_H);

      setNaturalSize({ w: nw, h: nh });
      setMinScale(ms);
      setMaxScale(ms * ZOOM_MAX_FACTOR);
      cropRef.current = initial;
      setCrop(initial);
      setLoading(false);
      applyImageTransform(initial, nw, nh);
      schedulePreview(initial);
    };
    img.onerror = () => {
      setLoading(false);
      onCancel();
    };
    img.src = imageSrc;

    return () => clearTimeout(previewTimerRef.current);
  }, [open, imageSrc, applyImageTransform, schedulePreview, onCancel]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onCancel]);

  useEffect(() => {
    if (crop && !loading && !draggingRef.current) schedulePreview(crop);
  }, [crop, loading, schedulePreview]);

  const setZoom = useCallback(
    (newScale, anchorX = VIEW_W / 2, anchorY = VIEW_H / 2) => {
      const c = cropRef.current;
      if (!c || !naturalSize.w) return;
      const clampedScale = Math.min(maxScale, Math.max(minScale, newScale));
      const next = zoomCropState(c, naturalSize.w, naturalSize.h, clampedScale, anchorX, anchorY);
      commitCrop(next);
    },
    [naturalSize.w, naturalSize.h, minScale, maxScale, commitCrop]
  );

  const handleReset = () => {
    if (!naturalSize.w) return;
    commitCrop(getInitialCropState(naturalSize.w, naturalSize.h, VIEW_W, VIEW_H));
  };

  const handleFit = () => {
    if (!naturalSize.w || !cropRef.current) return;
    setZoom(minScale);
  };

  const onPointerDown = (e) => {
    if (!cropRef.current || loading) return;
    e.preventDefault();
    viewportRef.current?.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: cropRef.current.offsetX,
      oy: cropRef.current.offsetY
    };
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current || !cropRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const next = clampCropState(
      {
        ...cropRef.current,
        offsetX: dragStartRef.current.ox + dx,
        offsetY: dragStartRef.current.oy + dy
      },
      naturalSize.w,
      naturalSize.h
    );

    cropRef.current = next;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      applyImageTransform(next, naturalSize.w, naturalSize.h);
      rafRef.current = null;
    });
  };

  const onPointerUp = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      viewportRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (cropRef.current) commitCrop(cropRef.current);
  };

  const onWheel = (e) => {
    if (!cropRef.current || loading) return;
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    const anchorX = rect ? e.clientX - rect.left : VIEW_W / 2;
    const anchorY = rect ? e.clientY - rect.top : VIEW_H / 2;
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    const nextScale = cropRef.current.scale * (1 + delta);
    setZoom(nextScale, anchorX, anchorY);
  };

  const handleZoomSlider = (e) => {
    setZoom(Number(e.target.value));
  };

  const handleConfirm = async () => {
    const c = cropRef.current;
    if (!c) return;
    setProcessing(true);
    try {
      const dataUrl = await cropBannerImage(imageSrc, c);
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
        className="ctsv-crop-modal"
        role="dialog"
        aria-labelledby="crop-modal-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ctsv-crop-modal-header">
          <div>
            <h2 id="crop-modal-title">Chỉnh sửa ảnh bìa</h2>
            <p>Kéo để căn chỉnh · Cuộn chuột hoặc thanh trượt để zoom · Tỷ lệ 16:9</p>
          </div>
          <button type="button" className="ctsv-crop-close" onClick={onCancel} aria-label="Đóng">
            ×
          </button>
        </header>

        <div className="ctsv-crop-body">
          <div className="ctsv-crop-editor">
            <div
              ref={viewportRef}
              className={`ctsv-crop-viewport ${loading ? 'is-loading' : ''}`}
              style={{ width: VIEW_W, height: VIEW_H }}
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
                <img
                  ref={imageElRef}
                  src={imageSrc}
                  alt=""
                  className="ctsv-crop-image"
                  draggable={false}
                />
              )}

              <div className="ctsv-crop-grid" aria-hidden />
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
            <span className="ctsv-crop-preview-label">Xem trước banner</span>
            <div className="ctsv-crop-preview-box">
              {previewUrl ? (
                <img src={previewUrl} alt="Xem trước ảnh bìa sau khi cắt" />
              ) : (
                <div className="ctsv-crop-preview-placeholder">Đang tạo preview...</div>
              )}
            </div>
            <p className="ctsv-crop-preview-meta">Xuất: 1200 × 675 px · JPEG</p>
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
            {processing ? 'Đang xử lý...' : 'Áp dụng ảnh bìa'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default BannerCropModal;
