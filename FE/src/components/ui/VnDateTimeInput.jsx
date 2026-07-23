import { useState } from 'react';
import VnDateInput from './VnDateInput';
import './VnDateTimeInput.css';

/**
 * Thay cho <input type="datetime-local">: phần ngày dùng VnDateInput (hiển thị
 * cố định dd/mm/yyyy), phần giờ dùng input time native. Giá trị vào/ra giữ
 * nguyên định dạng "YYYY-MM-DDTHH:mm" — chỉ phát ra khi đủ cả ngày lẫn giờ,
 * thiếu một trong hai thì phát chuỗi rỗng để form validate như chưa nhập.
 */

const splitValue = (value) => {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(String(value || ''));
  return m ? { date: m[1], time: m[2] } : { date: '', time: '' };
};

const VnDateTimeInput = ({
  value = '',
  onChange,
  min,
  max,
  required,
  disabled,
  className = '',
  id,
}) => {
  const initial = splitValue(value);
  const [datePart, setDatePart] = useState(initial.date);
  const [timePart, setTimePart] = useState(initial.time);
  const [lastValue, setLastValue] = useState(value);

  // Đồng bộ khi value đổi từ ngoài (load bản nháp, import file...).
  // value rỗng thì bỏ qua — đó là chuỗi chính component phát khi nhập dở,
  // ghi đè sẽ xóa mất phần ngày/giờ người dùng vừa gõ.
  if (value !== lastValue) {
    setLastValue(value);
    if (value) {
      const next = splitValue(value);
      setDatePart(next.date);
      setTimePart(next.time);
    }
  }

  const emit = (d, t) => {
    onChange?.({ target: { value: d && t ? `${d}T${t}` : '', id } });
  };

  const handleDate = (e) => {
    const d = e.target.value;
    setDatePart(d);
    emit(d, timePart);
  };

  const handleTime = (e) => {
    const t = e.target.value;
    setTimePart(t);
    emit(datePart, t);
  };

  return (
    <div className={`vn-datetime${disabled ? ' is-disabled' : ''}`}>
      <VnDateInput
        id={id}
        value={datePart}
        onChange={handleDate}
        min={min ? String(min).slice(0, 10) : undefined}
        max={max ? String(max).slice(0, 10) : undefined}
        required={required}
        disabled={disabled}
        className={className}
      />
      <input
        type="time"
        className={`${className} vn-datetime__time`}
        value={timePart}
        onChange={handleTime}
        required={required}
        disabled={disabled}
        aria-label="Giờ"
      />
    </div>
  );
};

export default VnDateTimeInput;
