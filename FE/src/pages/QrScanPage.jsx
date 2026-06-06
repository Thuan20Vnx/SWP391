import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import { selfScanEvent } from '../services/scannerApi';

const QrScanPage = ({ showToast }) => {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(false);

  const eventId = searchParams.get('eventId') || '';
  const action = searchParams.get('action') === 'checkout' ? 'checkout' : 'checkin';
  const token = searchParams.get('token') || '';

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
    if (eventId && token && !processed) {
      runSelfScan();
    }
  }, [eventId, token, processed, runSelfScan]);

  return (
    <div className="qr-scan-page">
      <SiteHeader activeNav="profile" />
      <main className="qr-scan-main">
        <div className="qr-scan-header">
          <Link to="/profile" className="qr-scan-back">← Hồ sơ</Link>
          <h1>Check-in / Check-out sự kiện</h1>
        </div>

        {!eventId || !token ? (
          <div className="qr-scan-empty">
            <p>Quét mã QR do ban tổ chức hiển thị tại sự kiện để check-in hoặc check-out.</p>
            <p className="qr-scan-hint">Mở camera điện thoại và quét mã QR tại cửa vào hoặc cửa ra sự kiện.</p>
          </div>
        ) : loading ? (
          <p>Đang xử lý {action === 'checkout' ? 'check-out' : 'check-in'}…</p>
        ) : (
          <div className="qr-scan-result">
            {result?.error ? (
              <p className="qr-scan-error">{result.error}</p>
            ) : (
              <>
                <p className="qr-scan-success">{result?.message}</p>
                {result?.registration?.student && (
                  <p>
                    <strong>{result.registration.student.fullname}</strong>
                    {result.registration.student.studentId ? ` · ${result.registration.student.studentId}` : ''}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default QrScanPage;
