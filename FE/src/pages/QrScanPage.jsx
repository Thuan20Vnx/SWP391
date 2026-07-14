import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import QrCameraScanner from '../components/QrCameraScanner';
import { useClubParticipateLayout } from '../context/ClubParticipateLayoutContext';
import { selfScanByAttendanceCode, selfScanEvent } from '../services/scannerApi';
import './QrScanPage.css';

const ATTENDANCE_CODE_REGEX = /^[A-Za-z0-9]{6}$/;

const isDesktopDevice = () => {
  if (typeof window === 'undefined') return true;
  const ua = navigator.userAgent || '';
  const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return !mobileUa && window.innerWidth >= 768;
};

const sanitizeCodeInput = (value) => value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();

const QrScanPage = ({ showToast }) => {
  const inClubParticipateLayout = useClubParticipateLayout();
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [attendanceCode, setAttendanceCode] = useState('');
  const [scanAction, setScanAction] = useState('checkin');
  const [submittingCode, setSubmittingCode] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);

  const isDesktop = useMemo(() => isDesktopDevice(), []);

  const eventId = searchParams.get('eventId') || '';
  const action = searchParams.get('action') === 'checkout' ? 'checkout' : 'checkin';
  const token = searchParams.get('token') || '';
  const hasQrParams = Boolean(eventId && token);

  const runSelfScan = useCallback(async () => {
    if (!eventId || !token) return;
    setLoading(true);
    try {
      const data = await selfScanEvent(eventId, { token, action });
      if (data.success) {
        setResult(data);
        showToast?.(data.message, data.duplicate ? 'info' : 'success');
      } else {
        showToast?.(data.message || 'Check-in thất bại.', 'error');
        setResult({ error: data.message });
      }
    } catch {
      showToast?.('Lỗi kết nối máy chủ.', 'error');
      setResult({ error: 'Lỗi kết nối máy chủ.' });
    } finally {
      setLoading(false);
      setProcessed(true);
    }
  }, [eventId, token, action, showToast]);

  useEffect(() => {
    if (hasQrParams && !processed) {
      runSelfScan();
    }
  }, [hasQrParams, processed, runSelfScan]);

  const processCameraScan = useCallback(
    async (payload) => {
      setCameraPaused(true);
      setLoading(true);
      setResult(null);
      try {
        const data = await selfScanEvent(payload.eventId, {
          token: payload.token,
          action: payload.action,
        });
        if (data.success) {
          setResult(data);
          showToast?.(data.message, data.duplicate ? 'info' : 'success');
        } else {
          showToast?.(data.message || 'Check-in thất bại.', 'error');
          setResult({ error: data.message });
        }
      } catch {
        showToast?.('Lỗi kết nối máy chủ.', 'error');
        setResult({ error: 'Lỗi kết nối máy chủ.' });
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const handleCameraError = useCallback(
    (message) => {
      showToast?.(message, 'error');
    },
    [showToast]
  );

  const openCamera = () => {
    setResult(null);
    setCameraPaused(false);
    setCameraKey((key) => key + 1);
    setCameraOpen(true);
  };

  const closeCamera = () => {
    setCameraOpen(false);
    setCameraPaused(false);
    setResult(null);
  };

  const scanAgain = () => {
    setResult(null);
    setCameraPaused(false);
    setCameraKey((key) => key + 1);
  };

  const handleCodeChange = (e) => {
    setAttendanceCode(sanitizeCodeInput(e.target.value));
    setResult(null);
  };

  const handleSubmitCode = async (e) => {
    e.preventDefault();
    if (!ATTENDANCE_CODE_REGEX.test(attendanceCode)) {
      showToast?.('Mã điểm danh phải gồm 6 ký tự chữ và số.', 'error');
      return;
    }

    setSubmittingCode(true);
    setCameraOpen(false);
    setResult(null);
    try {
      const data = await selfScanByAttendanceCode({ code: attendanceCode, action: scanAction });
      if (data.success) {
        setResult(data);
        showToast?.(data.message, data.duplicate ? 'info' : 'success');
      } else {
        showToast?.(data.message || 'Điểm danh thất bại.', 'error');
        setResult({ error: data.message });
      }
    } catch {
      showToast?.('Lỗi kết nối máy chủ.', 'error');
      setResult({ error: 'Lỗi kết nối máy chủ.' });
    } finally {
      setSubmittingCode(false);
    }
  };

  const renderResultBody = (data) => {
    if (!data) return null;
    if (data.error) {
      return <p className="qr-scan-error">{data.error}</p>;
    }
    return (
      <>
        <p className="qr-scan-success">{data.message}</p>
        {data.event?.title && (
          <p className="qr-scan-event-name">
            Sự kiện:{' '}
            {data.event?.id ? (
              <Link to={`/events/${data.event.id}`} className="qr-scan-event-link">
                {data.event.title}
              </Link>
            ) : (
              <strong>{data.event.title}</strong>
            )}
          </p>
        )}
        {data.registration?.student && (
          <p>
            <strong>{data.registration.student.fullname}</strong>
            {data.registration.student.studentId ? ` · ${data.registration.student.studentId}` : ''}
          </p>
        )}
      </>
    );
  };

  return (
    <div className="qr-scan-page">
      {!inClubParticipateLayout && <SiteHeader activeNav="profile" />}
      <main className="qr-scan-main">
        <div className="qr-scan-header">
          <Link to="/profile" className="qr-scan-back">
            ← Hồ sơ
          </Link>
          <h1>Check-in / Check-out sự kiện</h1>
        </div>

        {hasQrParams ? (
          loading ? (
            <p className="qr-scan-status">
              Đang xử lý {action === 'checkout' ? 'check-out' : 'check-in'}…
            </p>
          ) : (
            <div className="qr-scan-result">{renderResultBody(result)}</div>
          )
        ) : (
          <>
            {isDesktop && (
              <div className="qr-scan-desktop-notice" role="note">
                <strong>Quét mã QR trên máy tính không khả dụng.</strong>
                <p>
                  Vui lòng dùng điện thoại để quét mã QR tại sự kiện. Nếu không quét được, bạn có thể
                  nhập mã điểm danh 6 ký tự do ban tổ chức cung cấp.
                </p>
              </div>
            )}

            {!isDesktop && (
              <div className="qr-scan-empty">
                <p>
                  Quét mã QR do ban tổ chức hiển thị tại sự kiện để check-in hoặc check-out.
                </p>
                <p className="qr-scan-hint">
                  Mở camera điện thoại và quét mã QR tại cửa vào hoặc cửa ra sự kiện.
                </p>

                {!cameraOpen ? (
                  <button type="button" className="qr-scan-camera-open-btn" onClick={openCamera}>
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                      <path
                        d="M4 7h2l1.5-2h9L18 7h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                        fill="currentColor"
                      />
                    </svg>
                    Quét bằng camera
                  </button>
                ) : (
                  <div className="qr-scan-camera-panel">
                    <div className="qr-scan-camera-panel__head">
                      <span>Camera quét QR</span>
                      <button type="button" className="qr-scan-camera-close" onClick={closeCamera}>
                        Đóng
                      </button>
                    </div>

                    {!cameraPaused && !loading && (
                      <QrCameraScanner
                        key={cameraKey}
                        onScan={processCameraScan}
                        onError={handleCameraError}
                        paused={cameraPaused || loading}
                      />
                    )}

                    {loading && <p className="qr-scan-status">Đang xử lý…</p>}

                    {result && !loading && (
                      <div className="qr-scan-result qr-scan-result--inline">
                        {renderResultBody(result)}
                        <button type="button" className="qr-scan-retry-btn" onClick={scanAgain}>
                          Quét lại
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <form className="qr-scan-code-form" onSubmit={handleSubmitCode}>
              <h2>Nhập mã điểm danh</h2>
              <p className="qr-scan-code-form__hint">
                Mỗi sự kiện có mã riêng — bạn không cần chọn sự kiện, chỉ cần nhập đúng 6 ký tự do ban
                tổ chức cung cấp.
              </p>

              <div className="qr-scan-action-toggle" role="group" aria-label="Loại điểm danh">
                <button
                  type="button"
                  className={`qr-scan-action-toggle__btn${scanAction === 'checkin' ? ' is-active' : ''}`}
                  onClick={() => setScanAction('checkin')}
                >
                  Check-in
                </button>
                <button
                  type="button"
                  className={`qr-scan-action-toggle__btn${scanAction === 'checkout' ? ' is-active' : ''}`}
                  onClick={() => setScanAction('checkout')}
                >
                  Check-out
                </button>
              </div>

              <label className="qr-scan-code-label" htmlFor="attendance-code">
                Mã điểm danh
              </label>
              <input
                id="attendance-code"
                type="text"
                className="qr-scan-code-input"
                value={attendanceCode}
                onChange={handleCodeChange}
                placeholder="VD: A1B2C3"
                maxLength={6}
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
              />

              <button
                type="submit"
                className="qr-scan-code-submit"
                disabled={submittingCode || attendanceCode.length !== 6}
              >
                {submittingCode
                  ? 'Đang xử lý…'
                  : scanAction === 'checkout'
                    ? 'Xác nhận check-out'
                    : 'Xác nhận check-in'}
              </button>
            </form>

            {result && !cameraOpen && (
              <div className="qr-scan-result">{renderResultBody(result)}</div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default QrScanPage;
