import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import { fetchMyScannerEvents, scanEventRegistration } from '../services/scannerApi';

const QrScanPage = ({ showToast }) => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [scanMode, setScanMode] = useState('checkin');
  const [manualCode, setManualCode] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyScannerEvents();
      if (data.success) {
        const list = (data.events || []).map((row) => ({ id: String(row.event?._id || row.event?.id), title: row.event?.title }));
        setEvents(list);
        if (list.length) setSelectedEventId((prev) => prev || list[0].id);
      }
    } catch {
      showToast?.('Không tải được danh sách sự kiện.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const runScan = async (registrationId) => {
    if (!selectedEventId || !registrationId?.trim()) return;
    try {
      const data = await scanEventRegistration(selectedEventId, { registrationId: registrationId.trim(), action: scanMode });
      if (data.success) {
        setLastResult(data);
        showToast?.(data.message, data.duplicate ? 'info' : 'success');
        setManualCode('');
        inputRef.current?.focus();
      } else showToast?.(data.message || 'Quét thất bại.', 'error');
    } catch {
      showToast?.('Lỗi kết nối máy chủ.', 'error');
    }
  };

  return (
    <div className="qr-scan-page">
      <SiteHeader activeNav="profile" />
      <main className="qr-scan-main">
        <div className="qr-scan-header">
          <Link to="/profile" className="qr-scan-back">← Hồ sơ</Link>
          <h1>Quét QR check-in / check-out</h1>
        </div>
        {loading ? <p>Đang tải…</p> : events.length === 0 ? (
          <div className="qr-scan-empty"><p>Bạn chưa được cấp quyền quét QR cho sự kiện nào.</p></div>
        ) : (
          <>
            <div className="qr-scan-controls">
              <label>Sự kiện<select className="clb-input" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>{events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></label>
              <div className="qr-scan-mode">
                <button type="button" className={scanMode === 'checkin' ? 'qr-scan-mode-btn active' : 'qr-scan-mode-btn'} onClick={() => setScanMode('checkin')}>Check-in</button>
                <button type="button" className={scanMode === 'checkout' ? 'qr-scan-mode-btn active' : 'qr-scan-mode-btn'} onClick={() => setScanMode('checkout')}>Check-out</button>
              </div>
            </div>
            <form className="qr-scan-manual" onSubmit={(e) => { e.preventDefault(); runScan(manualCode); }}>
              <label htmlFor="qr-manual">Mã đăng ký / nội dung QR</label>
              <input id="qr-manual" ref={inputRef} type="text" className="clb-input" value={manualCode} onChange={(e) => setManualCode(e.target.value)} />
              <button type="submit" className="qr-scan-submit">Xác nhận {scanMode === 'checkout' ? 'check-out' : 'check-in'}</button>
            </form>
            {lastResult?.registration && (
              <div className="qr-scan-result">
                <strong>{lastResult.registration.student?.fullname}</strong>
                <span>{lastResult.registration.student?.studentId}</span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default QrScanPage;
