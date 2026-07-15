import { useRef, useState } from 'react';
import { EVENT_DOC_ACCEPT, isSupportedEventDoc } from '../../utils/eventDocImport';
import { extractTimelineFromDocFile } from '../../utils/timelineDocImport';
import { formatFileSize, isAllowedEventPlanFile, EVENT_PLAN_MAX_BYTES } from '../../utils/eventPlanFile';
import { extractTimelineFromTextApi } from '../../services/aiApi';

/** File mẫu tĩnh trong /public (sinh bằng scripts/generate-timeline-template.mjs). */
const BASE = import.meta.env.BASE_URL || '/';
const TEMPLATE_FILES = [
  { url: `${BASE}mau-timeline-ky-hoc.docx`, name: 'mau-timeline-ky-hoc.docx' },
  { url: `${BASE}mau-timeline-ky-hoc-vi-du.docx`, name: 'mau-timeline-ky-hoc-vi-du.docx' },
];

/** Tải cả 2 file mẫu: bản trống để điền + bản ví dụ minh hoạ. */
const downloadTemplateFiles = () => {
  TEMPLATE_FILES.forEach((file, i) => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, i * 350);
  });
};

/** Nhãn hiển thị cho các trường được điền tự động (để báo cho người dùng). */
const FIELD_DISPLAY = {
  semesterTerm: 'Kỳ học',
  semesterYear: 'Năm',
  summary: 'Tóm tắt kế hoạch kỳ',
  objectives: 'Mục tiêu kỳ học',
  items: 'Danh sách hoạt động',
};

/**
 * Panel "Tạo nhanh từ file PDF / Word" cho timeline kỳ học.
 * Ưu tiên đọc OFFLINE theo mẫu (không tốn token). Nếu file không theo mẫu,
 * người dùng bấm "Nhờ AI đọc" để AI hỗ trợ trích xuất.
 */
const TimelineDocImportPanel = ({ onApply, onAttachPlanFile, disabled = false, showToast }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [filledFields, setFilledFields] = useState([]);
  const [lastText, setLastText] = useState('');
  const [lastFileName, setLastFileName] = useState('');

  const attachAsPlan = (file) => {
    if (!onAttachPlanFile || !file) return;
    if (!isAllowedEventPlanFile(file) || file.size > EVENT_PLAN_MAX_BYTES) return;
    const reader = new FileReader();
    reader.onload = () => {
      onAttachPlanFile({
        eventPlanFile: reader.result,
        eventPlanFileName: file.name,
        eventPlanFileMime: file.type || 'application/octet-stream',
        eventPlanFileSizeLabel: formatFileSize(file.size),
      });
    };
    reader.readAsDataURL(file);
  };

  const applyPatch = (patch, source) => {
    const keys = Object.keys(patch || {});
    if (keys.length === 0) return 0;
    onApply?.(patch);
    setFilledFields(keys.map((k) => FIELD_DISPLAY[k] || k));
    const itemCount = Array.isArray(patch.items) ? patch.items.length : 0;
    showToast?.(
      itemCount
        ? `Đã điền từ ${source} và tạo ${itemCount} mốc hoạt động. Vui lòng kiểm tra lại.`
        : `Đã điền ${keys.length} trường từ ${source}. Vui lòng kiểm tra lại.`,
      'success'
    );
    return keys.length;
  };

  const handleFile = async (file) => {
    if (!file || disabled) return;
    if (!isSupportedEventDoc(file)) {
      showToast?.('Chỉ hỗ trợ file PDF hoặc Word (.docx).', 'error');
      return;
    }
    setBusy(true);
    setFilledFields([]);
    try {
      const { patch, rawText } = await extractTimelineFromDocFile(file);
      setLastText(rawText || '');
      setLastFileName(file.name);
      attachAsPlan(file);
      const filled = applyPatch(patch, 'file');
      if (filled === 0) {
        showToast?.(
          'Chưa nhận ra trường nào theo mẫu. Bạn có thể bấm “Nhờ AI đọc” để AI hỗ trợ trích xuất.',
          'info'
        );
      }
    } catch (err) {
      console.error('Import timeline doc failed:', err);
      setLastText('');
      showToast?.('Không đọc được nội dung file. File có thể bị lỗi hoặc là ảnh scan.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAskAI = async () => {
    if (!lastText.trim() || aiBusy || disabled) return;
    setAiBusy(true);
    try {
      const patch = await extractTimelineFromTextApi(lastText);
      const filled = applyPatch(patch, 'AI');
      if (filled === 0) {
        showToast?.('AI cũng không tìm thấy thông tin kế hoạch trong file này.', 'error');
      }
    } catch (err) {
      console.error('AI timeline extract failed:', err);
      showToast?.(err.message || 'AI không trích xuất được. Vui lòng thử lại sau.', 'error');
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="event-doc-import">
      <div className="event-doc-import__head">
        <div className="event-doc-import__badge">TỰ ĐỘNG</div>
        <div>
          <h3 className="event-doc-import__title">Tạo nhanh từ file PDF / Word</h3>
          <p className="event-doc-import__desc">
            Tải lên bảng kế hoạch kỳ theo mẫu để tự động điền sẵn form (tóm tắt, mục tiêu, danh sách
            hoạt động) — không tốn token. File cũng được đính kèm làm bảng kế hoạch. Nếu file không
            theo mẫu, bấm “Nhờ AI đọc”. Bạn vẫn có thể chỉnh lại trước khi gửi.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={EVENT_DOC_ACCEPT}
        className="ctsv-file-input-hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
        disabled={disabled || busy}
      />

      <div
        className={`event-doc-import__dropzone${busy ? ' is-busy' : ''}`}
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled || busy) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
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
          if (!disabled && !busy) handleFile(e.dataTransfer.files?.[0]);
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden>
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
            fill="currentColor"
            opacity="0.35"
          />
          <path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
        <span className="event-doc-import__dropzone-title">
          {busy ? 'Đang đọc file…' : lastFileName || 'Kéo thả hoặc bấm để chọn file PDF / .docx'}
        </span>
        <span className="event-doc-import__dropzone-hint">Hệ thống sẽ tự điền các ô bên dưới</span>
      </div>

      <div className="event-doc-import__actions">
        <button
          type="button"
          className="event-doc-import__template-btn"
          onClick={downloadTemplateFiles}
        >
          Tải file mẫu (.docx)
        </button>
        {lastText.trim() && (
          <button
            type="button"
            className="event-doc-import__ai-btn"
            onClick={handleAskAI}
            disabled={aiBusy || disabled}
          >
            {aiBusy ? 'AI đang đọc…' : 'Nhờ AI đọc'}
          </button>
        )}
      </div>

      {filledFields.length > 0 && (
        <div className="event-doc-import__result">
          <strong>Đã điền:</strong> {filledFields.join(', ')}
        </div>
      )}
    </div>
  );
};

export default TimelineDocImportPanel;
