import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../i18n/I18nContext';

/**
 * Dropdown chọn thay thế <select> native — dùng toàn hệ thống.
 * onChange tương thích: (e) => e.target.value / e.target.name
 */
const AppSelect = ({
  id: idProp,
  name,
  value = '',
  onChange,
  options = [],
  placeholder,
  disabled = false,
  className = '',
  variant = 'default',
  usePortal = false,
  'aria-label': ariaLabel,
  fullWidth = true
}) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('common.selectPlaceholder');
  const autoId = useId();
  const id = idProp || autoId;
  const listboxId = `${id}-listbox`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState(null);
  const useMenuPortal = variant === 'table' || usePortal;

  const normalized = useMemo(
    () =>
      options.map((opt) =>
        typeof opt === 'string' ? { value: opt, label: opt } : { value: String(opt.value), label: opt.label }
      ),
    [options]
  );

  const selected = useMemo(
    () => normalized.find((o) => o.value === String(value)),
    [normalized, value]
  );

  const displayLabel = selected?.label ?? resolvedPlaceholder;

  const emitChange = useCallback(
    (nextValue) => {
      onChange?.({
        target: { name: name || '', value: nextValue, id }
      });
    },
    [onChange, name, id]
  );

  const pick = (nextValue) => {
    emitChange(nextValue);
    setOpen(false);
  };

  const updateMenuPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const minW = variant === 'table' ? 220 : Math.max(rect.width, 160);
    setMenuRect({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, minW)
    });
  }, [variant]);

  useLayoutEffect(() => {
    if (!open || !useMenuPortal) {
      setMenuRect(null);
      return undefined;
    }
    updateMenuPosition();
    const onReflow = () => updateMenuPosition();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open, useMenuPortal, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const inRoot = rootRef.current?.contains(e.target);
      const menuEl = document.getElementById(listboxId);
      const inMenu = menuEl?.contains(e.target);
      if (!inRoot && !inMenu) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, listboxId]);

  const rootClass = [
    'app-select',
    `app-select--${variant}`,
    fullWidth ? 'app-select--full' : '',
    open ? 'is-open' : '',
    disabled ? 'is-disabled' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass} ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className="app-select__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel || undefined}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
      >
        <span className={`app-select__value${!selected ? ' is-placeholder' : ''}`}>{displayLabel}</span>
        <span className="app-select__chevron" aria-hidden>
          <svg viewBox="0 0 12 8" width="12" height="8" fill="none">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {open &&
        (() => {
          const menu = (
            <ul
              id={listboxId}
              className={`app-select__menu${useMenuPortal ? ' app-select__menu--portal' : ''}`}
              role="listbox"
              aria-labelledby={id}
              style={
                useMenuPortal && menuRect
                  ? {
                      position: 'fixed',
                      top: menuRect.top,
                      left: menuRect.left,
                      width: menuRect.width,
                      zIndex: 1400
                    }
                  : undefined
              }
            >
              {normalized.map((opt) => {
                const isActive = opt.value === String(value);
                return (
                  <li key={opt.value || '__empty'} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`app-select__option${isActive ? ' is-selected' : ''}`}
                      onClick={() => pick(opt.value)}
                    >
                      <span className="app-select__option-label">{opt.label}</span>
                      {isActive && (
                        <span className="app-select__check" aria-hidden>
                          <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                            <path
                              d="M3 8.5L6.5 12L13 4"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          );
          return useMenuPortal ? createPortal(menu, document.body) : menu;
        })()}

      {name ? (
        <input type="hidden" name={name} value={value} readOnly tabIndex={-1} aria-hidden />
      ) : null}
    </div>
  );
};

export default AppSelect;
