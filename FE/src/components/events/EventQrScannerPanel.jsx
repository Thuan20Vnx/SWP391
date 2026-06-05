import React, { useCallback, useEffect, useState } from 'react';
import { createScannerGrant, fetchScannerGrants, revokeScannerGrant } from '../../services/scannerApi';

const VALIDITY_OPTIONS = [
  { value: 'permanent', label: 'Vĩnh viễn (đến khi thu hồi)' },
  { value: 'duration', label: 'Đếm ngược theo phút' },
  { value: 'until', label: 'Đến ngày giờ cụ thể' },
];

const formatExpiry = (grant) => {
  if (!grant) return '—';
  if (grant.validityType === 'permanent') return 'Vĩnh viễn';
  if (grant.expiresAt) return new Date(grant.expiresAt).toLocaleString('vi-VN');
  return '—';
};

const EventQrScannerPanel = ({ eventId, showToast }) => {
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [validityType, setValidityType] = useState('permanent');
  const [durationMinutes, setDurationMinutes] = useState('120');
  const [validUntil, setValidUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadGrants = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const data = await fetchScannerGrants(eventId);
      if (data.success) setGrants(data.grants || data.allGrants || []);
      else showToast?.(data.message || 'Không tải được danh sách quyền quét.', 'error');
    } catch {
      showToast?.('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  }, [eventId, showToast]);

  useEffect(() => { loadGrants(); }, [loadGrants]);

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!email.trim() && !studentId.trim()) { showToast?.('Nhập email hoặc MSSV sinh viên.', 'error'); return; }
    setSubmitting(true);
    try {
      const body = { email: email.trim() || undefined, studentId: studentId.trim() || undefined, validityType };
      if (validityType === 'duration') body.durationMinutes = Number(durationMinutes) || 60;
      if (validityType === 'until' && validUntil) body.validUntil = new Date(validUntil).toISOString();
      const data = await createScannerGrant(eventId, body);
      if (data.success) { showToast?.(data.message || 'Đã cấp quyền.', 'success'); setEmail(''); setStudentId(''); loadGrants(); }
      else showToast?.(data.message || 'Cấp quyền thất bại.', 'error');
    } catch {
      showToast?.('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (grantId) => {
    try {
      const data = await revokeScannerGrant(eventId, grantId);
      if (data.success) { showToast?.(data.message || 'Đã thu hồi.', 'success'); loadGrants(); }
      else showToast?.(data.message || 'Thu hồi thất bại.', 'error');
    } catch {
      showToast?.('Lỗi kết nối máy chủ.', 'error');
    }
  };

  return (
    <div className="ev-qr-scanner-panel">
      <div className="ev-qr-scanner-panel__intro">
        <h3>Cấp quyền quét QR check-in / check-out</h3>
        <p>Sinh viên được cấp có thể dùng màn hình Quét QR. Sự kiện đối tác do CTSV phụ trách.</p>
      </div>
      <form className="ev-qr-scanner-form" onSubmit={handleGrant}>
        <div className="ev-qr-scanner-form__row">
          <div className="ev-qr-field"><label htmlFor="scanner-email">Email sinh viên</label><input id="scanner-email" type="email" className="clb-input" placeholder="sv@fpt.edu.vn" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="ev-qr-field"><label htmlFor="scanner-mssv">Hoặc MSSV</label><input id="scanner-mssv" type="text" className="clb-input" placeholder="SE123456" value={studentId} onChange={(e) => setStudentId(e.target.value)} /></div>
        </div>
        <div className="ev-qr-field">
          <label htmlFor="scanner-validity">Thời hạn hiệu lực</label>
          <select id="scanner-validity" className="clb-input" value={validityType} onChange={(e) => setValidityType(e.target.value)}>
            {VALIDITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {validityType === 'duration' && (
          <div className="ev-qr-field"><label htmlFor="scanner-duration">Số phút</label><input id="scanner-duration" type="number" min={5} className="clb-input" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} /></div>
        )}
        {validityType === 'until' && (
          <div className="ev-qr-field"><label htmlFor="scanner-until">Hết hiệu lực lúc</label><input id="scanner-until" type="datetime-local" className="clb-input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required /></div>
        )}
        <button type="submit" className="ev-btn-primary" disabled={submitting}>{submitting ? 'Đang cấp…' : 'Cấp quyền quét QR'}</button>
      </form>
      <div className="ev-qr-grants-list">
        <h4>Đang được cấp quyền</h4>
        {loading ? <p className="ev-qr-empty">Đang tải…</p> : grants.length === 0 ? <p className="ev-qr-empty">Chưa có sinh viên nào được cấp quyền.</p> : (
          <ul className="ev-qr-grants">
            {grants.map((g) => (
              <li key={g.id} className="ev-qr-grant-item">
                <div>
                  <strong>{g.scanner?.fullname || 'Sinh viên'}</strong>
                  <span className="ev-qr-grant-meta">{g.scanner?.email}{g.scanner?.studentId ? ` · ${g.scanner.studentId}` : ''}</span>
                  <span className="ev-qr-grant-expiry">Hết hạn: {formatExpiry(g)}</span>
                </div>
                <button type="button" className="ev-btn-outline ev-btn-sm" onClick={() => handleRevoke(g.id)}>Thu hồi</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default EventQrScannerPanel;
