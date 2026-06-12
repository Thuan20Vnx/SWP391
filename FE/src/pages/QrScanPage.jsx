import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
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
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [attendanceCode, setAttendanceCode] = useState('');
  const [scanAction, setScanAction] = useState('checkin');
  const [submittingCode, setSubmittingCode] = useState(false);

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

  return (
    <div className="qr-scan-page">
      <SiteHeader activeNav="profile" />
      <main className="qr-scan-main">
        <div className="qr-scan-header">
          <Link to="/profile" className="qr-scan-back">← Hồ sơ</Link>
          <h1>Check-in / Check-out sự kiện</h1>
        </div>

        {hasQrParams ? (
          loading ? (
            <p className="qr-scan-status">Đang xử lý {action === 'checkout' ? 'check-out' : 'check-in'}…</p>
          ) : (
            <div className="qr-scan-result">
              {result?.error ? (
                <p className="qr-scan-error">{result.error}</p>
              ) : (
              <>
                <p className="qr-scan-success">{result?.message}</p>
                {result?.event?.title && (
                  <p className="qr-scan-event-name">Sự kiện: <strong>{result.event.title}</strong></p>
                )}
                {result?.registration?.student && (
                    <p>
                      <strong>{result.registration.student.fullname}</strong>
                      {result.registration.student.studentId ? ` · ${result.registration.student.studentId}` : ''}
                    </p>
                  )}
                </>
              )}
            </div>
          )
        ) : (
          <>
            {isDesktop && (
              <div className="qr-scan-desktop-notice" role="note">
                <strong>Quét mã QR trên máy tính không khả dụng.</strong>
                <p>Vui lòng dùng điện thoại để quét mã QR tại sự kiện. Nếu không quét được, bạn có thể nhập mã điểm danh 6 ký tự do ban tổ chức cung cấp.</p>
              </div>
            )}

            {!isDesktop && (
              <div className="qr-scan-empty">
                <p>Quét mã QR do ban tổ chức hiển thị tại sự kiện để check-in hoặc check-out.</p>
                <p className="qr-scan-hint">Mở camera điện thoại và quét mã QR tại cửa vào hoặc cửa ra sự kiện.</p>
              </div>
            )}

            <form className="qr-scan-code-form" onSubmit={handleSubmitCode}>
              <h2>Nhập mã điểm danh</h2>
              <p className="qr-scan-code-form__hint">
                Mỗi sự kiện có mã riêng — bạn không cần chọn sự kiện, chỉ cần nhập đúng 6 ký tự do ban tổ chức cung cấp.
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
                {submittingCode ? 'Đang xử lý…' : scanAction === 'checkout' ? 'Xác nhận check-out' : 'Xác nhận check-in'}
              </button>
            </form>

            {result && (
              <div className="qr-scan-result">
                {result.error ? (
                  <p className="qr-scan-error">{result.error}</p>
                ) : (
                  <>
                    <p className="qr-scan-success">{result.message}</p>
                    {result.event?.title && (
                      <p className="qr-scan-event-name">Sự kiện: <strong>{result.event.title}</strong></p>
                    )}
                    {result.registration?.student && (
                      <p>
                        <strong>{result.registration.student.fullname}</strong>
                        {result.registration.student.studentId ? ` · ${result.registration.student.studentId}` : ''}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default QrScanPage;
