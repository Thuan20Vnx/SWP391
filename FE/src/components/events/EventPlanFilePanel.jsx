import React, { useEffect, useState } from 'react';
import './EventPlanFilePanel.css';
import {
  canPreviewEventPlan,
  downloadPlanFile,
  fetchPlanFileBlobUrl,
  formatFileSize,
  isValidEventPlanLink,
  resolveEventPlanFileUrl,
} from '../../utils/eventPlanFile';

const FileIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const EventPlanFilePanel = ({
  fileUrl,
  fileName = 'Bảng kế hoạch sự kiện',
  mimeType = '',
  sizeLabel = '',
  externalLink = '',
  className = '',
}) => {
  const [resolvedFileUrl, setResolvedFileUrl] = useState('');
  const planLink = isValidEventPlanLink(externalLink) ? externalLink.trim() : '';
  const hasFile = Boolean(fileUrl);
  const hasPlan = hasFile || Boolean(fileName) || Boolean(planLink);

  useEffect(() => {
    let objectUrl = '';
    let cancelled = false;

    const load = async () => {
      if (!fileUrl) {
        setResolvedFileUrl('');
        return;
      }
      const direct = resolveEventPlanFileUrl(fileUrl);
      if (direct.startsWith('data:') || /^https?:\/\//i.test(direct)) {
        if (!cancelled) setResolvedFileUrl(direct);
        return;
      }
      try {
        objectUrl = await fetchPlanFileBlobUrl(fileUrl);
        if (!cancelled) setResolvedFileUrl(objectUrl);
      } catch {
        if (!cancelled) setResolvedFileUrl('');
      }
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileUrl]);

  if (!hasPlan) return null;

  const displayName = fileName || 'Bảng kế hoạch sự kiện';
  const previewable = hasFile && canPreviewEventPlan(mimeType, displayName);

  return (
    <div className={`ev-plan-file-panel${className ? ` ${className}` : ''}`}>
      <p className="ev-plan-file-panel__label">Bảng kế hoạch sự kiện</p>

      {planLink && (
        <div className="ev-plan-file-panel__card ev-plan-file-panel__card--link">
          <span className="ev-plan-file-panel__icon ev-plan-file-panel__icon--link" aria-hidden>
            <LinkIcon />
          </span>
          <div className="ev-plan-file-panel__body">
            <span className="ev-plan-file-panel__name">Link tài liệu</span>
            <span className="ev-plan-file-panel__size ev-plan-file-panel__link-text">{planLink}</span>
          </div>
          <div className="ev-plan-file-panel__actions">
            <a
              href={planLink}
              target="_blank"
              rel="noreferrer"
              className="ev-plan-file-panel__btn ev-plan-file-panel__btn--view"
            >
              Mở link
            </a>
          </div>
        </div>
      )}

      {hasFile && (
        <div className={`ev-plan-file-panel__card${planLink ? ' ev-plan-file-panel__card--stacked' : ''}`}>
          <span className="ev-plan-file-panel__icon" aria-hidden>
            <FileIcon />
          </span>
          <div className="ev-plan-file-panel__body">
            <span className="ev-plan-file-panel__name">{displayName}</span>
            {sizeLabel ? <span className="ev-plan-file-panel__size">{sizeLabel}</span> : null}
          </div>
          <div className="ev-plan-file-panel__actions">
            {previewable && resolvedFileUrl && (
              <a
                href={resolvedFileUrl}
                target="_blank"
                rel="noreferrer"
                className="ev-plan-file-panel__btn ev-plan-file-panel__btn--view"
              >
                Xem
              </a>
            )}
            <button
              type="button"
              className="ev-plan-file-panel__btn ev-plan-file-panel__btn--download"
              onClick={() => downloadPlanFile(fileUrl, displayName)}
            >
              Tải xuống
            </button>
          </div>
        </div>
      )}

      {!hasFile && !planLink && fileName && (
        <p className="ev-plan-file-panel__missing">
          Không tải được nội dung tệp <strong>{displayName}</strong>. Thử tải lại trang hoặc liên hệ CLB tải file lên lại.
        </p>
      )}
    </div>
  );
};

export { formatFileSize };
export default EventPlanFilePanel;
