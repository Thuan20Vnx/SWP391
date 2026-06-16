import React, { useCallback, useLayoutEffect, useRef } from 'react';

/** Textarea tự giãn chiều cao theo nội dung — không dùng thanh cuộn bên trong. */
const AutoGrowTextarea = ({
  value,
  onChange,
  minRows = 2,
  className = '',
  spellCheck = false,
  ...rest
}) => {  const ref = useRef(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  const handleChange = (e) => {
    onChange?.(e);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onChange={handleChange}
      className={`auto-grow-textarea${className ? ` ${className}` : ''}`}
      spellCheck={spellCheck}
      autoCorrect="off"
      autoComplete="off"
      {...rest}
    />
  );
};
export default AutoGrowTextarea;
