import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import QRCode from 'qrcode';

import AppSelect from '../ui/AppSelect';

import { fetchStationQr, generateStationQr } from '../../services/scannerApi';

const DURATION_OPTIONS = [
  { value: '15', label: '15 phút' },
  { value: '30', label: '30 phút' },
  { value: '60', label: '1 giờ' },
  { value: '120', label: '2 giờ' },
  { value: '240', label: '4 giờ' },
  { value: '720', label: '12 giờ' },
  { value: '1440', label: '24 giờ' },
];

/** Giới hạn chu kỳ tự động xoay mã QR (giây). */
const MIN_ROTATE_SECONDS = 5;
const MAX_ROTATE_SECONDS = 300;
const DEFAULT_ROTATE_SECONDS = 10;

const clampRotateSeconds = (raw) => {
  const value = Math.round(Number(raw));
  if (!Number.isFinite(value)) return DEFAULT_ROTATE_SECONDS;
  return Math.min(MAX_ROTATE_SECONDS, Math.max(MIN_ROTATE_SECONDS, value));
};

const toLocalDatetimeValue = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const buildScanUrl = (eventId, action, token) => {
  const params = new URLSearchParams({ eventId, action, token });
  return `${window.location.origin}/quet-qr?${params.toString()}`;
};

const buildExpiryPayload = ({ expiryMode, durationMinutes, expiresAtLocal }) => {
  if (expiryMode === 'datetime') {
    if (!expiresAtLocal) return { error: 'Vui lòng chọn thời gian hết hạn.' };
    const parsed = new Date(expiresAtLocal);
    if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {
      return { error: 'Thời gian hết hạn phải ở tương lai.' };
    }
    return {
      expiryMode: 'datetime',
      expiresAt: parsed.toISOString(),
    };
  }

  return {
    expiryMode: 'duration',
    durationMinutes: Number(durationMinutes) || 60,
  };
};

const QrExpiryForm = ({ expiryMode, onModeChange, durationMinutes, onDurationChange, expiresAtLocal, onExpiresAtChange }) => (
  <div className="ev-qr-expiry-form">
    <p className="ev-qr-expiry-form__label">Thời gian hiệu lực mã QR</p>
    <div className="ev-qr-expiry-mode" role="group" aria-label="Kiểu thời gian hiệu lực">
      <button
        type="button"
        className={`ev-qr-expiry-mode__btn${expiryMode === 'duration' ? ' is-active' : ''}`}
        onClick={() => onModeChange('duration')}
      >
        Đếm ngược
      </button>
      <button
        type="button"
        className={`ev-qr-expiry-mode__btn${expiryMode === 'datetime' ? ' is-active' : ''}`}
        onClick={() => onModeChange('datetime')}
      >
        Chọn giờ
      </button>
    </div>
    {expiryMode === 'duration' ? (
      <AppSelect
        value={String(durationMinutes)}
        onChange={(e) => onDurationChange(e.target.value)}
        options={DURATION_OPTIONS}
        placeholder="Chọn thời gian"
      />
    ) : (
      <input
        type="datetime-local"
        className="ev-qr-expiry-datetime"
        value={expiresAtLocal}
        min={toLocalDatetimeValue()}
        onChange={(e) => onExpiresAtChange(e.target.value)}
      />
    )}
  </div>
);

/**
 * Tự động xoay mã QR: mặc định 10 giây đổi mã một lần, BTC chỉnh được chu kỳ.
 * Mục đích là chặn sinh viên chụp màn hình mã QR rồi gửi cho bạn điểm danh hộ.
 */
const QrAutoRotateForm = ({ enabled, onToggle, seconds, onSecondsChange, secondsLeft, disabled }) => (
  <div className="ev-qr-rotate-form">
    <div className="ev-qr-rotate-form__head">
      <span className="ev-qr-rotate-form__label">Tự động đổi mã</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Tự động đổi mã QR"
        className={`ev-qr-rotate-switch${enabled ? ' is-on' : ''}`}
        onClick={() => onToggle(!enabled)}
        disabled={disabled}
      >
        <span className="ev-qr-rotate-switch__thumb" />
      </button>
    </div>
    <label className="ev-qr-rotate-form__field">
      <span>Chu kỳ (giây)</span>
      <input
        type="number"
        className="ev-qr-rotate-input"
        min={MIN_ROTATE_SECONDS}
        max={MAX_ROTATE_SECONDS}
        step="1"
        value={seconds}
        disabled={disabled}
        onChange={(e) => onSecondsChange(e.target.value)}
        onBlur={(e) => onSecondsChange(String(clampRotateSeconds(e.target.value)))}
      />
    </label>
    <p className="ev-qr-rotate-form__hint">
      {enabled && secondsLeft !== null
        ? `Mã mới sau ${secondsLeft}s. Mã cũ hết hiệu lực ngay khi đổi.`
        : `Từ ${MIN_ROTATE_SECONDS} đến ${MAX_ROTATE_SECONDS} giây. Mã điểm danh 6 ký tự giữ nguyên khi đổi.`}
    </p>
  </div>
);

const QrCard = ({ title, description, action, eventId, station, generating, onGenerate, onZoom, onQrUrlChange, showToast }) => {
  const [qrUrl, setQrUrl] = useState('');
  const [expiryMode, setExpiryMode] = useState('duration');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [expiresAtLocal, setExpiresAtLocal] = useState(() => {
    const next = new Date(Date.now() + 60 * 60 * 1000);
    return toLocalDatetimeValue(next);
  });
  const [hidden, setHidden] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotateSeconds, setRotateSeconds] = useState(String(DEFAULT_ROTATE_SECONDS));
  const [secondsLeft, setSecondsLeft] = useState(null);

  const isActive = Boolean(station?.active && station?.token);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!isActive) {
        setQrUrl('');
        return;
      }
      try {
        const url = await QRCode.toDataURL(buildScanUrl(eventId, action, station.token), {
          width: 220,
          margin: 1,
          color: { dark: '#1e293b', light: '#ffffff' },
        });
        if (!cancelled) setQrUrl(url);
      } catch {
        if (!cancelled) setQrUrl('');
      }
    };
    render();
    return () => { cancelled = true; };
  }, [isActive, station?.token, eventId, action]);

  useEffect(() => { onQrUrlChange?.(action, qrUrl); }, [qrUrl, action, onQrUrlChange]);

  const currentExpiry = useMemo(
    () => buildExpiryPayload({ expiryMode, durationMinutes, expiresAtLocal }),
    [expiryMode, durationMinutes, expiresAtLocal],
  );

  // Giữ payload mới nhất trong ref để interval không phải dựng lại mỗi lần đổi form.
  const rotateRef = useRef({ expiry: currentExpiry, onGenerate });
  useEffect(() => {
    rotateRef.current = { expiry: currentExpiry, onGenerate };
  }, [currentExpiry, onGenerate]);

  // Dừng xoay mã khi mã đang bị ẩn hoặc chưa có mã — tránh gọi API vô ích.
  const rotating = autoRotate && isActive && !hidden;

  useEffect(() => {
    if (!rotating) {
      setSecondsLeft(null);
      return undefined;
    }

    const period = clampRotateSeconds(rotateSeconds);
    setSecondsLeft(period);

    const tick = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev > 1) return prev - 1;
        const { expiry, onGenerate: generate } = rotateRef.current;
        if (!expiry.error) generate(action, expiry, null, { silent: true, keepAttendanceCode: true });
        return period;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [rotating, rotateSeconds, action]);

  const handleDownload = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qr-${action}-${eventId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateClick = () => {
    if (currentExpiry.error) return onGenerate(action, null, currentExpiry.error);
    setHidden(false);
    return onGenerate(action, currentExpiry);
  };

  const showQr = qrUrl && !hidden;

  return (
    <div className="ev-qr-generate-card">
      <div className="ev-qr-generate-card__head">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <div className="ev-qr-generate-card__body">
        {showQr ? (
          <button type="button" className="ev-qr-generate-card__zoom-btn" onClick={() => onZoom({ title, action })}>
            <img src={qrUrl} alt={`Mã QR ${title}`} className="ev-qr-generate-card__img" />
          </button>
        ) : (
          <div className="ev-qr-generate-card__placeholder">
            <span>{qrUrl && hidden ? 'Mã QR đang được ẩn' : 'Chưa có mã QR'}</span>
          </div>
        )}
      </div>

      {station?.expiresAt && isActive && (
        <p className="ev-qr-generate-card__expiry">
          Hết hạn: {new Date(station.expiresAt).toLocaleString('vi-VN')}
        </p>
      )}

      {isActive && station?.attendanceCode && (
        <div className="ev-qr-attendance-code">
          <span className="ev-qr-attendance-code__label">Mã điểm danh</span>
          <div className="ev-qr-attendance-code__row">
            <code className="ev-qr-attendance-code__value">{station.attendanceCode}</code>
            <button
              type="button"
              className="ev-btn-outline ev-btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(station.attendanceCode);
                showToast?.('Đã sao chép mã điểm danh.', 'success');
              }}
            >
              Sao chép
            </button>
          </div>
          <p className="ev-qr-attendance-code__hint">Sinh viên có thể nhập mã này trên máy tính nếu không quét được QR.</p>
        </div>
      )}

      <QrExpiryForm
        expiryMode={expiryMode}
        onModeChange={setExpiryMode}
        durationMinutes={durationMinutes}
        onDurationChange={setDurationMinutes}
        expiresAtLocal={expiresAtLocal}
        onExpiresAtChange={setExpiresAtLocal}
      />

      <QrAutoRotateForm
        enabled={autoRotate}
        onToggle={setAutoRotate}
        seconds={rotateSeconds}
        onSecondsChange={setRotateSeconds}
        secondsLeft={secondsLeft}
        disabled={!isActive}
      />

      <div className="ev-qr-generate-card__actions">
        <button
          type="button"
          className="ev-btn-primary ev-btn-sm"
          disabled={generating}
          onClick={handleGenerateClick}
        >
          {generating ? 'Đang tạo…' : isActive ? 'Tạo mã mới' : 'Tạo mã QR'}
        </button>
        {qrUrl && (
          <>
            <button type="button" className="ev-btn-outline ev-btn-sm" onClick={() => setHidden((prev) => !prev)}>
              {hidden ? 'Hiện mã' : 'Ẩn mã'}
            </button>
            <button type="button" className="ev-btn-outline ev-btn-sm" onClick={handleDownload} disabled={hidden}>
              Tải xuống
            </button>
            <button
              type="button"
              className="ev-btn-outline ev-btn-sm"
              onClick={() => onZoom({ title, action })}
              disabled={hidden}
            >
              Phóng to
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const EventQrGeneratePanel = ({ eventId, showToast }) => {
  const [checkin, setCheckin] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState('');
  const [zoomQr, setZoomQr] = useState(null);
  const [qrUrls, setQrUrls] = useState({ checkin: '', checkout: '' });

  const handleQrUrlChange = useCallback((action, url) => {
    setQrUrls((prev) => (prev[action] === url ? prev : { ...prev, [action]: url }));
  }, []);

  const loadQr = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const data = await fetchStationQr(eventId);
      if (data.success) {
        setCheckin(data.checkin || null);
        setCheckout(data.checkout || null);
      } else {
        showToast?.(data.message || 'Không tải được mã QR.', 'error');
      }
    } catch {
      showToast?.('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  }, [eventId, showToast]);

  useEffect(() => { loadQr(); }, [loadQr]);

  const applyStation = (action, station) => {
    const next = {
      action,
      active: station.active,
      token: station.token || '',
      attendanceCode: station.attendanceCode || '',
      expiresAt: station.expiresAt || null,
    };
    if (action === 'checkout') setCheckout(next);
    else setCheckin(next);
  };

  const handleGenerate = async (action, expiryPayload, validationError, options = {}) => {
    const { silent = false, keepAttendanceCode = false } = options;

    if (validationError) {
      showToast?.(validationError, 'error');
      return;
    }
    if (!silent) setGenerating(action);
    try {
      const data = await generateStationQr(eventId, {
        action,
        ...expiryPayload,
        ...(keepAttendanceCode ? { keepAttendanceCode: true } : {}),
      });
      if (data.success) {
        // Dùng thẳng mã vừa tạo, không tải lại cả panel — nếu không mỗi lần xoay
        // mã (10s/lần) màn hình sẽ nháy về trạng thái "Đang tải".
        applyStation(action, data);
        if (!silent) showToast?.(data.message || 'Đã tạo mã QR.', 'success');
      } else if (!silent) {
        showToast?.(data.message || 'Tạo mã QR thất bại.', 'error');
      }
    } catch {
      if (!silent) showToast?.('Lỗi kết nối máy chủ.', 'error');
    } finally {
      if (!silent) setGenerating('');
    }
  };

  const zoomTitle = zoomQr?.title || '';
  // Đọc mã đang hiển thị theo action để cửa sổ phóng to tự cập nhật khi mã xoay.
  const zoomUrl = zoomQr ? qrUrls[zoomQr.action] || '' : '';

  if (loading) return <p className="ev-qr-empty">Đang tải mã QR…</p>;

  return (
    <>
      <div className="ev-qr-generate-panel">
        <div className="ev-qr-generate-panel__intro">
          <h3>Mã QR check-in / check-out</h3>
          <p>
            Tạo mã QR và chiếu tại sự kiện. Sinh viên dùng điện thoại quét mã để tự check-in hoặc check-out.
            Mỗi lần tạo QR sẽ kèm mã điểm danh 6 ký tự để sinh viên nhập trên máy tính.
            Bật &quot;Tự động đổi mã&quot; để mã QR làm mới sau mỗi vài giây, tránh sinh viên chụp lại gửi cho người khác.
            CLB, CTSV và IC-PDP không cần quét mã thay sinh viên.
          </p>
        </div>
        <div className="ev-qr-generate-grid">
          <QrCard
            title="Check-in"
            description="Sinh viên quét khi đến sự kiện"
            action="checkin"
            eventId={eventId}
            station={checkin}
            generating={generating === 'checkin'}
            onGenerate={handleGenerate}
            onZoom={setZoomQr}
            onQrUrlChange={handleQrUrlChange}
            showToast={showToast}
          />
          <QrCard
            title="Check-out"
            description="Sinh viên quét khi rời sự kiện"
            action="checkout"
            eventId={eventId}
            station={checkout}
            generating={generating === 'checkout'}
            onGenerate={handleGenerate}
            onZoom={setZoomQr}
            onQrUrlChange={handleQrUrlChange}
            showToast={showToast}
          />
        </div>
      </div>

      {zoomQr && zoomUrl && (
        <div className="ev-qr-zoom-overlay" onClick={() => setZoomQr(null)} role="presentation">
          <div className="ev-qr-zoom-modal" onClick={(e) => e.stopPropagation()}>
            <h4>{zoomTitle}</h4>
            <img src={zoomUrl} alt={zoomTitle} className="ev-qr-zoom-modal__img" />
            <div className="ev-qr-zoom-modal__actions">
              <a
                href={zoomUrl}
                download={`qr-${zoomTitle}.png`}
                className="ev-btn-outline ev-btn-sm"
              >
                Tải xuống
              </a>
              <button type="button" className="ev-btn-primary ev-btn-sm" onClick={() => setZoomQr(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EventQrGeneratePanel;
