import React, { useRef } from 'react';
import {
  EVENT_PLAN_ACCEPT,
  EVENT_PLAN_MAX_BYTES,
  formatFileSize,
  isAllowedEventPlanFile,
} from '../../utils/eventPlanFile';

const EventPlanUploadField = ({
  planFile = '',
  planFileName = '',
  planFileMime = '',
  planFileSizeLabel = '',
  planLink = '',
  onChange,
  disabled = false,
  required = true,
  showToast,
  linkInputId = 'event-plan-link',
}) => {
  const planFileInputRef = useRef(null);

  const patch = (next) => onChange?.(next);

  const handlePlanFile = (file) => {
    if (disabled || !file) return;
    if (!isAllowedEventPlanFile(file)) {
      showToast?.('Chỉ chấp nhận PDF, DOC, DOCX, XLS, XLSX hoặc ZIP.', 'error');
      return;
    }
    if (file.size > EVENT_PLAN_MAX_BYTES) {
      showToast?.('Tệp tối đa 10MB. Vui lòng chọn file nhỏ hơn.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      patch({
        eventPlanFile: reader.result,
        eventPlanFileName: file.name,
        eventPlanFileMime: file.type || 'application/octet-stream',
        eventPlanFileSizeLabel: formatFileSize(file.size),
      });
      showToast?.('Đã tải bảng kế hoạch sự kiện.', 'success');
    };
    reader.onerror = () => showToast?.('Không đọc được tệp kế hoạch.', 'error');
    reader.readAsDataURL(file);
  };

  const clearPlanFile = () => {
    patch({
      eventPlanFile: '',
      eventPlanFileName: '',
      eventPlanFileMime: '',
      eventPlanFileSizeLabel: '',
    });
    if (planFileInputRef.current) planFileInputRef.current.value = '';
  };

  return (
    <div className="clb-form-group clb-form-group--plan">
      <label>
        Bảng kế hoạch sự kiện {required ? <span className="clb-required">*</span> : null}
      </label>
      <p className="clb-banner-hint">PDF, DOC, DOCX, XLS, XLSX, ZIP — tối đa 10MB</p>
      <input
        ref={planFileInputRef}
        type="file"
        accept={EVENT_PLAN_ACCEPT}
        className="ctsv-file-input-hidden"
        onChange={(e) => {
          handlePlanFile(e.target.files?.[0]);
          e.target.value = '';
        }}
        disabled={disabled}
      />
      <div className="clb-plan-upload">
        <div
          className={`clb-plan-dropzone${planFile ? ' has-file' : ''}`}
          onClick={() => !disabled && planFileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              planFileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('is-dragover');
          }}
          onDragLeave={(e) => e.currentTarget.classList.remove('is-dragover')}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('is-dragover');
            if (!disabled) handlePlanFile(e.dataTransfer.files?.[0]);
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
              fill="currentColor"
              opacity="0.35"
            />
            <path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="clb-plan-dropzone__title">
            {planFileName || 'Tải bảng kế hoạch lên'}
          </span>
          <span className="clb-plan-dropzone__hint">Kéo thả hoặc bấm để chọn file</span>
        </div>
        {!disabled && (
          <div className="clb-plan-meta">
            <button
              type="button"
              className="ctsv-btn-banner-secondary"
              onClick={() => planFileInputRef.current?.click()}
            >
              Chọn file
            </button>
            {planFile && (
              <button type="button" className="ctsv-btn-banner-remove" onClick={clearPlanFile}>
                Xóa file
              </button>
            )}
          </div>
        )}
        {planFileSizeLabel && (
          <span className="ctsv-banner-filename">{planFileSizeLabel}</span>
        )}
      </div>
      <div className="clb-plan-link-field">
        <label className="clb-plan-link-field__label" htmlFor={linkInputId}>
          Hoặc dán link tài liệu
        </label>
        <input
          id={linkInputId}
          type="url"
          className="clb-input"
          placeholder="https://drive.google.com/..."
          value={planLink}
          onChange={(e) => patch({ eventPlanLink: e.target.value })}
          disabled={disabled}
        />
        <p className="clb-banner-hint">Dùng khi file quá lớn — Google Drive, OneDrive, v.v.</p>
      </div>
    </div>
  );
};

export default EventPlanUploadField;
