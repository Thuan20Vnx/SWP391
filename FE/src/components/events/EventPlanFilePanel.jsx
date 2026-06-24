import React from 'react';
import './EventPlanFilePanel.css';
import {
  canPreviewEventPlan,
  downloadDataUrlFile,
  formatFileSize,
} from '../../utils/eventPlanFile';

const FileIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const EventPlanFilePanel = ({
  fileUrl,
  fileName = 'Bảng kế hoạch sự kiện',
  mimeType = '',
  sizeLabel = '',
  className = '',
}) => {
  const hasFile = Boolean(fileUrl || fileName);
  if (!hasFile) return null;

  const displayName = fileName || 'Bảng kế hoạch sự kiện';
  const previewable = fileUrl && canPreviewEventPlan(mimeType, displayName);

  return (
    <div className={`ev-plan-file-panel${className ? ` ${className}` : ''}`}>
      <p className="ev-plan-file-panel__label">Bảng kế hoạch sự kiện</p>
      {fileUrl ? (
        <div className="ev-plan-file-panel__card">
          <span className="ev-plan-file-panel__icon" aria-hidden>
            <FileIcon />
          </span>
          <div className="ev-plan-file-panel__body">
            <span className="ev-plan-file-panel__name">{displayName}</span>
            {sizeLabel ? <span className="ev-plan-file-panel__size">{sizeLabel}</span> : null}
          </div>
          <div className="ev-plan-file-panel__actions">
            {previewable && (
              <a
                href={fileUrl}
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
              onClick={() => downloadDataUrlFile(fileUrl, displayName)}
            >
              Tải xuống
            </button>
          </div>
        </div>
      ) : (
        <p className="ev-plan-file-panel__missing">
          Có tệp <strong>{displayName}</strong> nhưng chưa tải được nội dung. Vui lòng mở lại trang chi tiết.
        </p>
      )}
    </div>
  );
};

export { formatFileSize };
export default EventPlanFilePanel;
