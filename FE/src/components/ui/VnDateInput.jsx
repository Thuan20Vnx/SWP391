import { useRef, useState } from 'react';
import './VnDateInput.css';

/**
 * Ô nhập ngày hiển thị cố định dạng dd/mm/yyyy (chuẩn Việt Nam) thay cho
 * <input type="date"> native — native đổi thứ tự ngày/tháng theo locale trình
 * duyệt nên lúc hiện mm/dd, lúc dd/mm. Gõ tay tự chèn dấu "/", nút bên phải
 * mở lịch native để chọn nhanh.
 *
 * Giá trị vào/ra vẫn là ISO yyyy-mm-dd, onChange nhận { target: { value } }
 * nên thay thế drop-in cho input type="date".
 */

const isoToVn = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

const vnToIso = (text) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(text || '').trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/** Gom chữ số người gõ rồi dựng lại chuỗi dd/mm/yyyy dở dang. */
const formatTyping = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const VnDateInput = ({
  value = '',
  onChange,
  min,
  max,
  required,
  disabled,
  className = '',
  id,
  placeholder = 'dd/mm/yyyy',
}) => {
  const [text, setText] = useState(() => isoToVn(value));
  const [invalid, setInvalid] = useState(false);
  const [lastValue, setLastValue] = useState(value);
  const pickerRef = useRef(null);

  // Đồng bộ khi giá trị đổi từ ngoài (load draft, import từ file...) — pattern
  // "derived state" ngay trong render, tránh setState trong effect.
  if (value !== lastValue) {
    setLastValue(value);
    // Đang gõ dở (value rỗng vì chưa parse được) thì giữ nguyên chuỗi đang gõ.
    const typingDraft = !value && text && vnToIso(text) === null;
    if (!typingDraft) setText(isoToVn(value));
    if (value) setInvalid(false);
  }

  const emit = (iso) => onChange?.({ target: { value: iso, id } });

  const handleTextChange = (e) => {
    const next = formatTyping(e.target.value);
    setText(next);
    const iso = vnToIso(next);
    if (iso) {
      setInvalid(false);
      emit(iso);
    } else {
      // Gõ dở / xóa: báo rỗng để form không giữ ngày cũ lệch với ô hiển thị.
      if (value) emit('');
      if (!next) setInvalid(false);
    }
  };

  const handleBlur = () => {
    setInvalid(Boolean(text) && vnToIso(text) === null);
  };

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') {
      try {
        picker.showPicker();
        return;
      } catch {
        /* showPicker cần user gesture — fallback focus */
      }
    }
    picker.focus();
    picker.click();
  };

  const handlePicked = (e) => {
    const iso = e.target.value || '';
    setText(isoToVn(iso));
    setInvalid(false);
    emit(iso);
  };

  return (
    <div className={`vn-date${disabled ? ' is-disabled' : ''}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        className={`${className} vn-date__text`}
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={10}
        required={required}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        title="Nhập theo dạng ngày/tháng/năm"
      />
      <button
        type="button"
        className="vn-date__picker-btn"
        onClick={openPicker}
        disabled={disabled}
        aria-label="Mở lịch chọn ngày"
        tabIndex={-1}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 8h14v10H5V10z"
            fill="currentColor"
          />
        </svg>
      </button>
      {/* Input date native giấu đi, chỉ dùng làm lịch chọn ngày. */}
      <input
        ref={pickerRef}
        type="date"
        className="vn-date__native"
        value={value || ''}
        min={min}
        max={max}
        onChange={handlePicked}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
};

export default VnDateInput;
