import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  approveClubRegistration,
  cancelClubRegistration,
  fetchClubRegistration,
  forwardClubRegistrationToAdmin,
  rejectClubRegistration,
  requestClubRegistrationRevision,
  resubmitClubRegistration,
} from '../../services/adminApi';
import { createClubChangeRequest, fetchClubChangeRequests } from '../../services/clubTimelineApi';
import { getUserRole, isAdminRole } from '../../utils/auth';
import { statusClass } from '../../utils/eventStatus';

const CLUB_CATEGORIES = ['Công nghệ', 'Nghệ thuật', 'Kinh doanh', 'Văn hóa', 'Thể thao', 'Tình nguyện', 'Âm nhạc'];

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
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [pendingChangeRequest, setPendingChangeRequest] = useState(null);
  const [changeRequestMode, setChangeRequestMode] = useState(null); // 'edit' | 'delete' | null
  const [changeReason, setChangeReason] = useState('');
  const [changeEditForm, setChangeEditForm] = useState(null);
  const [changeSubmitting, setChangeSubmitting] = useState(false);

  useEffect(() => {
    fetchClubRegistration(id)
      .then((d) => setRegistration(d.registration))
      .catch(() => {
        showToast?.('Không tải được đơn đăng ký.', 'error');
        navigate(basePath);
      });
  }, [id, navigate, showToast, basePath]);

  const refresh = () => fetchClubRegistration(id).then((d) => setRegistration(d.registration));

  const refreshChangeRequests = (clubId) =>
    fetchClubChangeRequests(clubId)
      .then((d) => {
        const pending = (d.requests || []).find((r) => r.status === 'pending');
        setPendingChangeRequest(pending || null);
      })
      .catch(() => setPendingChangeRequest(null));

  useEffect(() => {
    if (!isAdmin && registration?.statusKey === 'approved' && registration?.clubId) {
      refreshChangeRequests(registration.clubId);
    }
  }, [isAdmin, registration?.statusKey, registration?.clubId]);

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
  // IC-PDP: sửa lại & gửi lại đơn bị từ chối/đã hủy; hủy đơn đang chờ Admin.
  const canIcpdpResubmit = !isAdmin && ['rejected', 'cancelled'].includes(registration.statusKey);
  const canIcpdpCancel = !isAdmin && registration.statusKey === 'pending_admin';

  const startEdit = () => {
    setEditForm({
      clubName: registration.clubName || '',
      category: CLUB_CATEGORIES.includes(registration.category) ? registration.category : CLUB_CATEGORIES[0],
      president: registration.president || '',
      presidentEmail: registration.presidentEmail || '',
      phone: registration.phone || '',
      description: registration.description || '',
    });
    setEditMode(true);
  };

  const handleResubmit = async () => {
    if (!editForm?.clubName.trim()) {
      showToast?.('Vui lòng nhập tên CLB.', 'error');
      return;
    }
    if (!editForm?.presidentEmail.trim()) {
      showToast?.('Vui lòng nhập email chủ nhiệm.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await resubmitClubRegistration(id, {
        clubName: editForm.clubName.trim(),
        category: editForm.category,
        president: editForm.president.trim(),
        presidentEmail: editForm.presidentEmail.trim(),
        phone: editForm.phone.trim(),
        description: editForm.description.trim(),
      });
      showToast?.(res.message || 'Đã gửi lại đơn — chờ Admin phê duyệt.', 'success');
      setEditMode(false);
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    setSubmitting(true);
    try {
      const res = await cancelClubRegistration(id);
      showToast?.(res.message || 'Đã hủy gửi yêu cầu.', 'info');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

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

  const startChangeRequest = (mode) => {
    setChangeRequestMode(mode);
    setChangeReason('');
    if (mode === 'edit') {
      setChangeEditForm({
        name: registration.clubName || '',
        category: CLUB_CATEGORIES.includes(registration.category) ? registration.category : CLUB_CATEGORIES[0],
        president: registration.president || '',
        email: registration.presidentEmail || '',
        hotline: registration.phone || '',
        description: registration.description || '',
      });
    }
  };

  const cancelChangeRequest = () => {
    setChangeRequestMode(null);
    setChangeReason('');
    setChangeEditForm(null);
  };

  const handleSubmitChangeRequest = async () => {
    if (!changeReason.trim()) {
      showToast?.('Vui lòng nhập lý do yêu cầu.', 'error');
      return;
    }
    setChangeSubmitting(true);
    try {
      const body = {
        requestType: changeRequestMode,
        reason: changeReason.trim(),
        ...(changeRequestMode === 'edit' ? { payload: changeEditForm } : {}),
      };
      const res = await createClubChangeRequest(registration.clubId, body);
      showToast?.(res.message || 'Đã gửi yêu cầu tới Admin.', 'success');
      cancelChangeRequest();
      refreshChangeRequests(registration.clubId);
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setChangeSubmitting(false);
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

      {!isAdmin && registration.statusKey === 'approved' && registration.clubId && (
        <aside className="ctsv-ed-actions icpdp-club-reg-actions">
          <h2>Yêu cầu Admin sửa / xóa CLB</h2>

          {pendingChangeRequest ? (
            <p className="icpdp-club-reg-hint">
              Đang chờ Admin xử lý yêu cầu{' '}
              <strong>{pendingChangeRequest.requestType === 'delete' ? 'xóa CLB' : 'sửa CLB'}</strong>
              {pendingChangeRequest.reason ? ` — Lý do: ${pendingChangeRequest.reason}` : ''}
            </p>
          ) : changeRequestMode === null ? (
            <div className="icpdp-club-reg-actions__btns">
              <button
                type="button"
                className="ctsv-dash-btn ctsv-dash-btn--outline"
                onClick={() => startChangeRequest('edit')}
              >
                Yêu cầu sửa
              </button>
              <button
                type="button"
                className="ctsv-dash-btn ctsv-dash-btn--danger"
                onClick={() => startChangeRequest('delete')}
              >
                Yêu cầu xóa
              </button>
            </div>
          ) : (
            <>
              {changeRequestMode === 'edit' && changeEditForm && (
                <>
                  <label htmlFor="cr-name">Tên CLB</label>
                  <input
                    id="cr-name"
                    className="icpdp-club-reg-input"
                    value={changeEditForm.name}
                    onChange={(e) => setChangeEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <label htmlFor="cr-cat">Lĩnh vực</label>
                  <select
                    id="cr-cat"
                    className="icpdp-club-reg-input"
                    value={changeEditForm.category}
                    onChange={(e) => setChangeEditForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {CLUB_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <label htmlFor="cr-president">Chủ nhiệm</label>
                  <input
                    id="cr-president"
                    className="icpdp-club-reg-input"
                    value={changeEditForm.president}
                    onChange={(e) => setChangeEditForm((f) => ({ ...f, president: e.target.value }))}
                  />
                  <label htmlFor="cr-email">Email liên hệ</label>
                  <input
                    id="cr-email"
                    type="email"
                    className="icpdp-club-reg-input"
                    value={changeEditForm.email}
                    onChange={(e) => setChangeEditForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  <label htmlFor="cr-hotline">Hotline</label>
                  <input
                    id="cr-hotline"
                    className="icpdp-club-reg-input"
                    value={changeEditForm.hotline}
                    onChange={(e) => setChangeEditForm((f) => ({ ...f, hotline: e.target.value }))}
                  />
                  <label htmlFor="cr-desc">Mô tả</label>
                  <textarea
                    id="cr-desc"
                    rows={3}
                    value={changeEditForm.description}
                    onChange={(e) => setChangeEditForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </>
              )}

              <label htmlFor="cr-reason">
                Lý do yêu cầu {changeRequestMode === 'delete' ? 'xóa' : 'sửa'} CLB
              </label>
              <textarea
                id="cr-reason"
                rows={3}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Giải thích lý do để Admin xem xét…"
              />

              <div className="icpdp-club-reg-actions__btns">
                <button
                  type="button"
                  className="ctsv-dash-btn ctsv-dash-btn--primary"
                  disabled={changeSubmitting}
                  onClick={handleSubmitChangeRequest}
                >
                  {changeSubmitting ? 'Đang gửi…' : 'Gửi yêu cầu cho Admin'}
                </button>
                <button
                  type="button"
                  className="ctsv-dash-btn ctsv-dash-btn--outline"
                  disabled={changeSubmitting}
                  onClick={cancelChangeRequest}
                >
                  Hủy
                </button>
              </div>
            </>
          )}
        </aside>
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

        {canIcpdpResubmit && !editMode && (
          <aside className="ctsv-ed-actions icpdp-club-reg-actions">
            <h2>Đơn {registration.statusKey === 'cancelled' ? 'đã hủy' : 'bị từ chối'}</h2>
            {registration.rejectionReason && (
              <p className="icpdp-club-reg-reject-note">
                <strong>Lý do:</strong> {registration.rejectionReason}
              </p>
            )}
            <p className="icpdp-club-reg-hint">
              Bạn có thể sửa lại thông tin và gửi lại đơn cho Admin phê duyệt.
            </p>
            <div className="icpdp-club-reg-actions__btns">
              <button
                type="button"
                className="ctsv-dash-btn ctsv-dash-btn--primary"
                onClick={startEdit}
              >
                Sửa lại & gửi lại
              </button>
            </div>
          </aside>
        )}

        {canIcpdpResubmit && editMode && editForm && (
          <aside className="ctsv-ed-actions icpdp-club-reg-actions">
            <h2>Sửa & gửi lại đơn</h2>
            <label htmlFor="resub-name">Tên CLB</label>
            <input
              id="resub-name"
              className="icpdp-club-reg-input"
              value={editForm.clubName}
              onChange={(e) => setEditForm((f) => ({ ...f, clubName: e.target.value }))}
            />
            <label htmlFor="resub-cat">Lĩnh vực</label>
            <select
              id="resub-cat"
              className="icpdp-club-reg-input"
              value={editForm.category}
              onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CLUB_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label htmlFor="resub-president">Chủ nhiệm</label>
            <input
              id="resub-president"
              className="icpdp-club-reg-input"
              value={editForm.president}
              onChange={(e) => setEditForm((f) => ({ ...f, president: e.target.value }))}
            />
            <label htmlFor="resub-email">Email chủ nhiệm (tài khoản sinh viên)</label>
            <input
              id="resub-email"
              type="email"
              className="icpdp-club-reg-input"
              value={editForm.presidentEmail}
              onChange={(e) => setEditForm((f) => ({ ...f, presidentEmail: e.target.value }))}
            />
            <label htmlFor="resub-phone">Số điện thoại</label>
            <input
              id="resub-phone"
              className="icpdp-club-reg-input"
              value={editForm.phone}
              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <label htmlFor="resub-desc">Mô tả</label>
            <textarea
              id="resub-desc"
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="icpdp-club-reg-actions__btns">
              <button
                type="button"
                className="ctsv-dash-btn ctsv-dash-btn--primary"
                disabled={submitting}
                onClick={handleResubmit}
              >
                {submitting ? 'Đang gửi…' : 'Gửi lại cho Admin'}
              </button>
              <button
                type="button"
                className="ctsv-dash-btn ctsv-dash-btn--outline"
                disabled={submitting}
                onClick={() => setEditMode(false)}
              >
                Hủy sửa
              </button>
            </div>
          </aside>
        )}

        {canIcpdpCancel && (
          <aside className="ctsv-ed-actions icpdp-club-reg-actions">
            <h2>Đơn đang chờ Admin duyệt</h2>
            <p className="icpdp-club-reg-hint">
              Nếu chưa muốn duyệt, bạn có thể hủy gửi yêu cầu này. Có thể sửa lại và gửi lại sau.
            </p>
            <div className="icpdp-club-reg-actions__btns">
              <button
                type="button"
                className="ctsv-dash-btn ctsv-dash-btn--danger"
                disabled={submitting}
                onClick={handleCancelRequest}
              >
                {submitting ? 'Đang hủy…' : 'Hủy gửi yêu cầu'}
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default IcpdpClubRegistrationDetail;
