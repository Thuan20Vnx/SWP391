import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  approveClubRegistration,
  fetchClubRegistration,
  forwardClubRegistrationToAdmin,
  rejectClubRegistration,
  requestClubRegistrationRevision,
} from '../../services/adminApi';
import { getUserRole, isAdminRole } from '../../utils/auth';
import { statusClass } from '../../utils/eventStatus';

const resolveBasePath = (pathname) =>
  pathname.startsWith('/admin') ? '/admin/icpdp/club-registrations' : '/icpdp/club-registrations';

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};

const IcpdpClubRegistrationDetail = () => {
  const { showToast } = useOutletContext() || {};
  const { id } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const basePath = resolveBasePath(pathname);
  const isAdmin = isAdminRole(getUserRole());
  const [registration, setRegistration] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClubRegistration(id)
      .then((d) => setRegistration(d.registration))
      .catch(() => {
        showToast?.('Không tải được đơn đăng ký.', 'error');
        navigate(basePath);
      });
  }, [id, navigate, showToast, basePath]);

  const refresh = () => fetchClubRegistration(id).then((d) => setRegistration(d.registration));

  if (!registration) {
    return (
      <div className="ctsv-ed-page">
        <div className="ctsv-ed-skeleton-panel sk" style={{ minHeight: 200 }} />
      </div>
    );
  }

  const canIcpdpForward = !isAdmin && ['pending_icpdp', 'revision'].includes(registration.statusKey);
  const canAdminApprove = isAdmin && registration.statusKey === 'pending_admin';
  const canIcpdpReject = !isAdmin && ['pending_icpdp', 'revision'].includes(registration.statusKey);
  const canAdminReject = isAdmin && registration.statusKey === 'pending_admin';

  const handleForward = async () => {
    setSubmitting(true);
    try {
      const res = await forwardClubRegistrationToAdmin(id, note);
      showToast?.(res.message || 'Đã chuyển đơn lên Admin.', 'success');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminApprove = async () => {
    setSubmitting(true);
    try {
      const res = await approveClubRegistration(id, note);
      showToast?.(res.message || 'Đã phê duyệt CLB mới!', 'success');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!note.trim()) {
      showToast?.('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await rejectClubRegistration(id, note.trim());
      showToast?.('Đã từ chối đơn đăng ký.', 'info');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevision = async () => {
    if (!note.trim()) {
      showToast?.('Vui lòng nhập ghi chú yêu cầu chỉnh sửa.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await requestClubRegistrationRevision(id, note.trim());
      showToast?.('Đã gửi yêu cầu chỉnh sửa cho người đề xuất.', 'success');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pageClass = pathname.startsWith('/admin')
    ? 'ctsv-ed-page admin-icpdp-club-reg-page'
    : 'ctsv-ed-page';

  return (
    <div className={pageClass}>
      <Link to={basePath} className="ctsv-ed-back">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Danh sách đăng ký CLB mới
      </Link>

      <section className="ctsv-ed-hero icpdp-proposal-hero">
        <div className="ctsv-ed-hero-body" style={{ flex: 1 }}>
          <div className="ctsv-ed-hero-tags">
            <span className="ctsv-ed-source ctsv-ed-source--club">Thành lập CLB mới</span>
            <span className={`status-pill ${statusClass(registration.status, registration.statusKey)}`}>
              {registration.status}
            </span>
          </div>
          <h1>{registration.clubName}</h1>
          <ul className="ctsv-ed-meta">
            <li>{registration.category}</li>
            <li>Chủ nhiệm: {registration.president}</li>
            <li>{registration.presidentEmail}</li>
          </ul>
        </div>
      </section>

      {canIcpdpForward && (
        <div className="icpdp-view-banner" style={{ borderColor: 'rgba(124, 58, 237, 0.35)', background: '#fff' }}>
          <p>
            IC-PDP rà soát đơn, sau đó <strong>chuyển Admin phê duyệt cuối</strong> để tạo CLB trên hệ thống.
          </p>
        </div>
      )}

      {canAdminApprove && (
        <div className="icpdp-view-banner" style={{ borderColor: 'rgba(34, 197, 94, 0.3)', background: '#fff' }}>
          <p>
            Đơn đã qua IC-PDP. <strong>Admin phê duyệt cuối</strong> để tạo CLB và gán quyền Chủ nhiệm.
          </p>
        </div>
      )}

      {registration.statusKey === 'approved' && (registration.clubSlug || registration.clubId) && (
        <div className="icpdp-view-banner" style={{ borderColor: 'rgba(34, 197, 94, 0.3)', background: '#fff' }}>
          <p style={{ color: '#15803d' }}>
            CLB đã được tạo.{' '}
            <Link to={`/clubs/${registration.clubSlug || registration.clubId}`}>Xem trang CLB →</Link>
          </p>
        </div>
      )}

      <div className="ctsv-ed-content">
        <div className="ctsv-ed-panel">
          <h2 className="ctsv-ed-panel-title">Thông tin đề xuất</h2>
          <p className="ctsv-ed-description">{registration.description || '—'}</p>
          <div className="ctsv-ed-info-grid">
            <div className="ctsv-ed-info-card">
              <span className="ctsv-ed-info-label">Lĩnh vực hoạt động</span>
              <strong>{registration.activityField || '—'}</strong>
            </div>
            <div className="ctsv-ed-info-card">
              <span className="ctsv-ed-info-label">Quy mô dự kiến</span>
              <strong>{registration.scale || '—'}</strong>
            </div>
            <div className="ctsv-ed-info-card">
              <span className="ctsv-ed-info-label">Điện thoại</span>
              <strong>{registration.phone || '—'}</strong>
            </div>
            <div className="ctsv-ed-info-card">
              <span className="ctsv-ed-info-label">Ngày gửi</span>
              <strong>{formatDateTime(registration.createdAt)}</strong>
            </div>
          </div>
          {registration.rejectionReason && (
            <p className="ctsv-ed-reject-reason">
              <strong>Lý do từ chối:</strong> {registration.rejectionReason}
            </p>
          )}
          {registration.icpdpNote && (
            <p className="ctsv-ed-note">
              <strong>Ghi chú IC-PDP:</strong> {registration.icpdpNote}
            </p>
          )}
          {registration.adminNote && (
            <p className="ctsv-ed-note">
              <strong>Ghi chú Admin:</strong> {registration.adminNote}
            </p>
          )}
        </div>

        {(canIcpdpForward || canAdminApprove) && (
          <aside className="ctsv-ed-actions icpdp-club-reg-actions">
            <h2>{canAdminApprove ? 'Quyết định Admin' : 'Quyết định IC-PDP'}</h2>
            <label htmlFor="club-reg-note">Ghi chú / lý do</label>
            <textarea
              id="club-reg-note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú nội bộ hoặc hướng dẫn chỉnh sửa…"
            />
            <div className="icpdp-club-reg-actions__btns">
              {canIcpdpForward && (
                <>
                  <button
                    type="button"
                    className="ctsv-dash-btn ctsv-dash-btn--primary"
                    disabled={submitting}
                    onClick={handleForward}
                  >
                    Chuyển Admin duyệt
                  </button>
                  <button
                    type="button"
                    className="ctsv-dash-btn ctsv-dash-btn--outline"
                    disabled={submitting}
                    onClick={handleRevision}
                  >
                    Yêu cầu chỉnh sửa
                  </button>
                  <button
                    type="button"
                    className="ctsv-dash-btn ctsv-dash-btn--danger"
                    disabled={submitting}
                    onClick={handleReject}
                  >
                    Từ chối
                  </button>
                </>
              )}
              {canAdminApprove && (
                <>
                  <button
                    type="button"
                    className="ctsv-dash-btn ctsv-dash-btn--primary"
                    disabled={submitting}
                    onClick={handleAdminApprove}
                  >
                    Phê duyệt & tạo CLB
                  </button>
                  <button
                    type="button"
                    className="ctsv-dash-btn ctsv-dash-btn--danger"
                    disabled={submitting}
                    onClick={handleReject}
                  >
                    Từ chối
                  </button>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default IcpdpClubRegistrationDetail;
