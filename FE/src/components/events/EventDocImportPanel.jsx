import { useRef, useState } from 'react';
import {
  EVENT_DOC_ACCEPT,
  extractEventFromDocFile,
  isSupportedEventDoc,
} from '../../utils/eventDocImport';
import { extractEventFromTextApi } from '../../services/aiApi';

/** Nhãn hiển thị cho từng trường được điền tự động (để báo cho người dùng). */
const FIELD_DISPLAY = {
  title: 'Tên sự kiện',
  category: 'Thể loại',
  speaker: 'Diễn giả',
  description: 'Mô tả',
  agenda: 'Chương trình',
  location: 'Địa điểm',
  maxSlots: 'Số lượng vé',
  learningOutcomes: 'Bạn sẽ học được gì',
  regStartDate: 'Ngày mở đăng ký',
  regStartTime: 'Giờ mở đăng ký',
  regEndDate: 'Ngày đóng đăng ký',
  regEndTime: 'Giờ đóng đăng ký',
  eventStartDate: 'Ngày bắt đầu',
  eventStartTime: 'Giờ bắt đầu',
  eventEndDate: 'Ngày kết thúc',
  eventEndTime: 'Giờ kết thúc',
};

/** File mẫu tĩnh trong /public (sinh bằng scripts/generate-event-template.mjs). */
const TEMPLATE_URL = `${import.meta.env.BASE_URL || '/'}mau-tao-su-kien.docx`;

const EventDocImportPanel = ({ onApply, onAttachFile, disabled = false, showToast }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [filledFields, setFilledFields] = useState([]);
  const [lastText, setLastText] = useState('');
  const [lastFile, setLastFile] = useState(null);

  const applyPatch = (patch, source) => {
    const keys = Object.keys(patch || {});
    if (keys.length === 0) return 0;
    onApply?.(patch);
    if (lastFile) onAttachFile?.(lastFile);
    setFilledFields(keys.map((k) => FIELD_DISPLAY[k] || k));
    showToast?.(`Đã điền ${keys.length} trường từ ${source}. Vui lòng kiểm tra lại.`, 'success');
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
      const { patch, rawText } = await extractEventFromDocFile(file);
      setLastText(rawText || '');
      setLastFile(file);
      const filled = applyPatch(patch, 'file');
      if (filled === 0) {
        showToast?.(
          'Chưa nhận ra trường nào theo mẫu. Bạn có thể bấm “Nhờ AI đọc” để AI hỗ trợ trích xuất.',
          'info'
        );
      }
    } catch (err) {
      console.error('Import event doc failed:', err);
      setLastText('');
      setLastFile(null);
      showToast?.('Không đọc được nội dung file. File có thể bị lỗi hoặc là ảnh scan.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAskAI = async () => {
    if (!lastText.trim() || aiBusy || disabled) return;
    setAiBusy(true);
    try {
      const patch = await extractEventFromTextApi(lastText);
      const filled = applyPatch(patch, 'AI');
      if (filled === 0) {
        showToast?.('AI cũng không tìm thấy thông tin sự kiện trong file này.', 'error');
      }
    } catch (err) {
      console.error('AI extract failed:', err);
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
            Tải lên file kế hoạch theo mẫu để tự động điền sẵn form. Nếu file không theo mẫu, dùng nút
            “Nhờ AI đọc”. Bạn vẫn có thể chỉnh lại trước khi gửi.
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
          {busy ? 'Đang đọc file…' : lastFile?.name || 'Kéo thả hoặc bấm để chọn file PDF / .docx'}
        </span>
        <span className="event-doc-import__dropzone-hint">Hệ thống sẽ tự điền các ô bên dưới</span>
      </div>

      <div className="event-doc-import__actions">
        <a className="event-doc-import__template-btn" href={TEMPLATE_URL} download>
          Tải file mẫu (.docx)
        </a>
        {lastText.trim() && (
          <button
            type="button"
            className="event-doc-import__ai-btn"
            onClick={handleAskAI}
            disabled={aiBusy || disabled}
          >
            {aiBusy ? 'AI đang đọc…' : 'Nhờ AI đọc (Gemini)'}
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

export default EventDocImportPanel;
