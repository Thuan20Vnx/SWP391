import React, { useEffect, useRef } from 'react';

const OTP_LENGTH = 6;

const OtpInput = ({
  value = '',
  onChange,
  disabled = false,
  invalid = false,
  valid = false,
  autoFocus = false,
  idPrefix = 'otp',
  onComplete,
}) => {
  const inputsRef = useRef([]);

  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] || '');

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputsRef.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  const focusInput = (index) => {
    if (index >= 0 && index < OTP_LENGTH) {
      inputsRef.current[index]?.focus();
    }
  };

  const emitValue = (nextDigits) => {
    const nextValue = nextDigits.join('').slice(0, OTP_LENGTH);
    onChange?.(nextValue);
    if (nextValue.length === OTP_LENGTH) {
      onComplete?.(nextValue);
    }
  };

  const handleChange = (index, rawValue) => {
    const digit = rawValue.replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    emitValue(nextDigits);

    if (digit && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const nextDigits = [...digits];

      if (digits[index]) {
        nextDigits[index] = '';
        emitValue(nextDigits);
        return;
      }

      if (index > 0) {
        nextDigits[index - 1] = '';
        emitValue(nextDigits);
        focusInput(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!padded) return;

    const nextDigits = Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] || '');
    emitValue(nextDigits);
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  return (
    <div
      className={`otp-input ${invalid ? 'is-invalid' : ''} ${valid ? 'is-valid' : ''} ${disabled ? 'is-disabled' : ''}`}
      onPaste={handlePaste}
    >
      {digits.map((digit, index) => (
        <input
          key={`${idPrefix}-${index}`}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          id={`${idPrefix}-${index}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`OTP số ${index + 1}`}
          className="otp-input__box"
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
        />
      ))}
    </div>
  );
};

export default OtpInput;
