import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminFptCollapsible from '../../../components/admin/AdminFptCollapsible';
import PublicAdminShell from '../../../layouts/PublicAdminShell';
import SiteFooter from '../../../components/SiteFooter';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import PartnerAvatar from '../../../components/partner/PartnerAvatar';
import {
  addAdminPartnerMember,
  approveAdminPartner,
  fetchAdminPartner,
  rejectAdminPartner,
  removeAdminPartnerMember,
  requestAdminPartnerTermination,
} from '../../../services/adminApi';
import {
  PARTNER_STATUS_LABEL,
  PARTNER_STATUS_LABEL_DETAIL,
  PARTNER_STATUS_TONE,
  formatPartnerDate,
  formatVnd,
} from '../../../utils/partnerDisplay';

const resolvePartnerId = (raw) => String(raw || '').replace(/^partner-/, '').trim();

const EMPTY_MEMBER_FORM = {
  fullname: '',
  email: '',
  phone: '',
  title: '',
  activateNow: true,
};

const AdminPartnerDetail = ({ showToast }) => {
  const { partnerId: routePartnerId } = useParams();
  const partnerId = resolvePartnerId(routePartnerId);
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [members, setMembers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [eventRequest, setEventRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [terminationOpen, setTerminationOpen] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [terminationConfirm, setTerminationConfirm] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER_FORM);
  const [removeMemberTarget, setRemoveMemberTarget] = useState(null);

  const load = useCallback(async () => {
    if (!partnerId) {
      setLoadError('ID đối tác không hợp lệ.');
      return;
    }
    try {
      const d = await fetchAdminPartner(partnerId);
      setPartner(d.partner);
      setMembers(d.members || []);
      setContracts(d.contracts || []);
      setEventRequest(d.eventRequest || null);
      setLoadError('');
    } catch (e) {
      setLoadError(e.message || 'Không tải được thông tin đối tác.');
      setPartner(null);
      setMembers([]);
    }
  }, [partnerId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleApprove = async () => {
    setBusy(true);
    try {
      await approveAdminPartner(partnerId);
      showToast?.('Đã phê duyệt đối tác thành công.', 'success');
      setConfirmApprove(false);
      await load();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setBusy(true);
    try {
      await rejectAdminPartner(partnerId, rejectReason.trim());
      showToast?.('Đã từ chối đơn đối tác.', 'info');
      setRejectOpen(false);
      setRejectReason('');
      await load();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleTermination = async () => {
    if (!terminationReason.trim()) {
      showToast?.('Vui lòng nhập lý do yêu cầu hủy.', 'error');
      return;
    }
    setBusy(true);
    try {
      await requestAdminPartnerTermination(partnerId, terminationReason.trim());
      showToast?.('Đã gửi yêu cầu hủy tới đối tác (email + thông báo).', 'success');
      setTerminationConfirm(false);
      setTerminationOpen(false);
      setTerminationReason('');
      await load();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async () => {
    const { fullname, email, phone, title, activateNow } = memberForm;
    if (!fullname.trim() || !email.trim()) {
      showToast?.('Họ tên và email là bắt buộc.', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await addAdminPartnerMember(partnerId, {
        fullname: fullname.trim(),
        email: email.trim(),
        phone: phone.trim(),
        title: title.trim(),
        activateNow,
      });
      const pwdNote = res.defaultPassword
        ? ` Mật khẩu mặc định: ${res.defaultPassword}`
        : '';
      showToast?.(`${res.message || 'Đã thêm tài khoản.'}${pwdNote}`, 'success');
      setAddMemberOpen(false);
      setMemberForm(EMPTY_MEMBER_FORM);
      await load();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberTarget) return;
    setBusy(true);
    try {
      await removeAdminPartnerMember(partnerId, removeMemberTarget.id);
      showToast?.('Đã vô hiệu hóa tài khoản quản lý.', 'info');
      setRemoveMemberTarget(null);
      await load();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const pageContent = () => {
    if (loading) {
      return (
        <div className="admin-partner-detail">
          <p className="admin-partner-detail__muted">Đang tải...</p>
        </div>
      );
    }

    if (loadError || !partner) {
      return (
        <div className="admin-partner-detail">
          <Link to="/" className="admin-partner-detail__back">
            ← Quay lại Hệ thống FPT
          </Link>
          <p className="admin-partner-detail__muted">{loadError || 'Không tìm thấy đối tác.'}</p>
          <button
            type="button"
            className="admin-partner-detail__btn admin-partner-detail__btn--primary"
            onClick={() => load()}
          >
            Thử tải lại
          </button>
        </div>
      );
    }

    const tone = PARTNER_STATUS_TONE[partner.status] || 'slate';
    const statusLabel =
      PARTNER_STATUS_LABEL_DETAIL[partner.status] ||
      PARTNER_STATUS_LABEL[partner.status] ||
      partner.status;
    const mainContract = contracts[0];
    const eventTitle =
      eventRequest?.title || partner.proposedEventTitle || mainContract?.title || '—';
    const amount =
      eventRequest?.expectedSponsorAmount ?? partner.expectedSponsorAmount ?? mainContract?.amount;
    const canAdminAct = partner.status === 'pending_admin';
    const canManageMembers = partner.status !== 'rejected';
    const canTerminate =
      ['approved', 'pending_admin'].includes(partner.status) &&
      partner.terminationStatus !== 'pending';
    const activeMembers = members.filter((m) => m.isActive);
    const inactiveMembers = members.filter((m) => !m.isActive);
    const primaryMember =
      activeMembers.find((m) => m.isPrimary) ||
      members.find((m) => m.isPrimary) ||
      null;
    const otherActiveMembers = activeMembers.filter((m) => !m.isPrimary);
    const registrantName =
      primaryMember?.fullname || partner.representative || '—';
    const registrantTitle =
      primaryMember?.title || partner.representativeTitle || '—';
    const registrantEmail = primaryMember?.email || partner.email || '—';
    const registrantPhone = primaryMember?.phone || partner.phone || '—';

    return (
      <div className="admin-partner-detail">
        <Link to="/" className="admin-partner-detail__back">
          ← Quay lại Hệ thống FPT
        </Link>

        <header className="admin-partner-detail__header admin-partner-detail__header--company">
          <PartnerAvatar partner={partner} className="admin-partner-detail__avatar admin-partner-detail__avatar--lg" />
          <div className="admin-partner-detail__header-body">
            <div className="admin-partner-detail__title-row">
              <h1>{partner.name}</h1>
              <span className={`admin-partner-detail__status admin-partner-detail__status--${tone}`}>
                {statusLabel}
              </span>
            </div>
            {partner.category && (
              <p className="admin-partner-detail__meta">Lĩnh vực: {partner.category}</p>
            )}
            <p className="admin-partner-detail__meta">
              Ngày gửi đơn: {formatPartnerDate(partner.createdAt)}
              {partner.partnerCode ? ` · Mã: ${partner.partnerCode}` : ''}
            </p>
          </div>
        </header>

        {canAdminAct && (
          <div className="admin-partner-detail__banner">
            Đơn đã được CTSV phê duyệt
            {partner.ctsvApprovedByEmail ? ` (${partner.ctsvApprovedByEmail})` : ''}. Admin xác nhận
            lần cuối để hoàn tất.
          </div>
        )}

        {partner.terminationStatus === 'pending' && (
          <div className="admin-partner-detail__banner admin-partner-detail__banner--warn">
            Đã gửi yêu cầu hủy
            {partner.terminationRequestedAt
              ? ` · ${formatPartnerDate(partner.terminationRequestedAt)}`
              : ''}
            {partner.terminationReason ? ` — ${partner.terminationReason}` : ''}
          </div>
        )}

        <div className="admin-partner-detail__sections">
          <section className="admin-partner-detail__panel admin-partner-detail__panel--company">
            <h2>Thông tin công ty đối tác</h2>
            <dl className="admin-partner-detail__dl">
              <div>
                <dt>Tên doanh nghiệp</dt>
                <dd>{partner.name}</dd>
              </div>
              <div>
                <dt>Mã / Mã số đối tác</dt>
                <dd>{partner.partnerCode || '—'}</dd>
              </div>
              <div>
                <dt>Lĩnh vực</dt>
                <dd>{partner.category || '—'}</dd>
              </div>
              <div>
                <dt>Địa chỉ</dt>
                <dd>{partner.address || '—'}</dd>
              </div>
              <div>
                <dt>Điện thoại công ty</dt>
                <dd>{partner.phone || '—'}</dd>
              </div>
              <div>
                <dt>Mô tả công ty</dt>
                <dd>{partner.description || '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-partner-detail__panel admin-partner-detail__panel--registrant">
            <h2>Thông tin người đăng ký đối tác</h2>
            <div className="admin-partner-detail__registrant-row">
              <PartnerAvatar
                partner={{
                  name: registrantName,
                  logo: primaryMember?.avatar,
                  avatar: primaryMember?.avatar,
                }}
                className="admin-partner-detail__avatar admin-partner-detail__avatar--member"
              />
              <dl className="admin-partner-detail__dl admin-partner-detail__dl--inline">
                <div>
                  <dt>Họ tên</dt>
                  <dd>{registrantName}</dd>
                </div>
                <div>
                  <dt>Chức danh</dt>
                  <dd>{registrantTitle}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{registrantEmail}</dd>
                </div>
                <div>
                  <dt>Điện thoại</dt>
                  <dd>{registrantPhone}</dd>
                </div>
                {primaryMember?.hasAccount && (
                  <div>
                    <dt>Trạng thái tài khoản</dt>
                    <dd>
                      <span
                        className={`admin-partner-detail__badge ${
                          primaryMember.accountActive
                            ? 'admin-partner-detail__badge--active'
                            : 'admin-partner-detail__badge--inactive'
                        }`}
                      >
                        {primaryMember.accountActive ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </section>

          <section className="admin-partner-detail__panel admin-partner-detail__panel--members">
            <div className="admin-partner-detail__panel-head">
              <div>
                <h2>Tài khoản quản lý bổ sung</h2>
                <p className="admin-partner-detail__panel-desc">
                  Admin có thể tạo thêm nhiều tài khoản cùng quản lý một công ty đối tác.
                </p>
              </div>
              {canManageMembers && (
                <button
                  type="button"
                  className="admin-partner-detail__btn admin-partner-detail__btn--primary admin-partner-detail__btn--sm"
                  disabled={busy}
                  onClick={() => setAddMemberOpen(true)}
                >
                  + Thêm tài khoản
                </button>
              )}
            </div>

            {otherActiveMembers.length === 0 ? (
              <p className="admin-partner-detail__muted-inline">
                Chưa có tài khoản quản lý bổ sung.
              </p>
            ) : (
              <ul className="admin-partner-detail__member-list">
                {otherActiveMembers.map((m) => (
                  <li key={m.id} className="admin-partner-detail__member-card">
                    <PartnerAvatar
                      partner={{ name: m.fullname, logo: m.avatar, avatar: m.avatar }}
                      className="admin-partner-detail__avatar admin-partner-detail__avatar--member"
                    />
                    <div className="admin-partner-detail__member-info">
                      <div className="admin-partner-detail__member-name-row">
                        <strong>{m.fullname || m.email}</strong>
                        {m.hasAccount && (
                          <span
                            className={`admin-partner-detail__badge ${
                              m.accountActive
                                ? 'admin-partner-detail__badge--active'
                                : 'admin-partner-detail__badge--inactive'
                            }`}
                          >
                            {m.accountActive ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                          </span>
                        )}
                      </div>
                      {m.title && <span className="admin-partner-detail__member-meta">{m.title}</span>}
                      <span className="admin-partner-detail__member-meta">
                        {[m.email, m.phone].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    {canManageMembers && (
                      <button
                        type="button"
                        className="admin-partner-detail__btn admin-partner-detail__btn--ghost admin-partner-detail__btn--sm"
                        disabled={busy}
                        onClick={() => setRemoveMemberTarget(m)}
                      >
                        Gỡ quyền
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {inactiveMembers.length > 0 && (
              <div className="admin-partner-detail__member-inactive">
                <h3>Đã vô hiệu hóa</h3>
                <ul className="admin-partner-detail__member-list admin-partner-detail__member-list--inactive">
                  {inactiveMembers.map((m) => (
                    <li key={m.id} className="admin-partner-detail__member-card">
                      <span>{m.fullname || m.email}</span>
                      <span className="admin-partner-detail__member-meta">{m.email}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="admin-partner-detail__panel">
            <h2>Đề xuất & hợp đồng</h2>
            <dl className="admin-partner-detail__dl">
              <div>
                <dt>Chương trình đề xuất</dt>
                <dd>{eventTitle}</dd>
              </div>
              <div>
                <dt>Mô tả sự kiện</dt>
                <dd>{eventRequest?.description || partner.description || '—'}</dd>
              </div>
              <div>
                <dt>Giá trị tài trợ dự kiến</dt>
                <dd>{formatVnd(amount)}</dd>
              </div>
              {eventRequest?.location && (
                <div>
                  <dt>Địa điểm / Hình thức</dt>
                  <dd>
                    {eventRequest.location}
                    {eventRequest.format ? ` · ${eventRequest.format}` : ''}
                  </dd>
                </div>
              )}
              <div>
                <dt>Hợp đồng</dt>
                <dd>
                  {contracts.length
                    ? contracts.map((c) => c.title || 'Hợp đồng tài trợ').join(', ')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Thông báo</dt>
                <dd>
                  <button
                    type="button"
                    className="admin-partner-detail__inline-link"
                    onClick={() =>
                      navigate(
                        `/admin/unit-notify/partner/${partnerId}?name=${encodeURIComponent(partner.name)}`,
                      )
                    }
                  >
                    Xem & gửi thông báo cho đối tác này
                  </button>
                </dd>
              </div>
            </dl>
          </section>
        </div>

        {canTerminate && (
          <AdminFptCollapsible
            title="Yêu cầu hủy"
            subtitle="Gửi email và thông báo tới đối tác — cần xác nhận 2 lần"
            tone="danger"
            open={terminationOpen}
            onToggle={() => setTerminationOpen((v) => !v)}
            panelId="partner-termination-panel"
          >
            <p className="admin-partner-detail__hint">
              Hành động này thông báo cho <strong>{partner.name}</strong> về yêu cầu chấm dứt hợp
              tác trên F-Events. Đối tác sẽ nhận email và thông báo trên cổng đối tác.
            </p>
            <label className="admin-partner-detail__field">
              <span>Lý do yêu cầu hủy</span>
              <textarea
                rows={4}
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                placeholder="Nhập lý do cụ thể..."
                disabled={busy}
              />
            </label>
            <button
              type="button"
              className="admin-partner-detail__btn admin-partner-detail__btn--danger"
              disabled={busy || !terminationReason.trim()}
              onClick={() => setTerminationConfirm(true)}
            >
              Gửi yêu cầu hủy
            </button>
          </AdminFptCollapsible>
        )}

        {canAdminAct && (
          <div className="admin-partner-detail__actions">
            <button
              type="button"
              className="admin-partner-detail__btn admin-partner-detail__btn--ghost"
              disabled={busy}
              onClick={() => setRejectOpen(true)}
            >
              Từ chối
            </button>
            <button
              type="button"
              className="admin-partner-detail__btn admin-partner-detail__btn--primary"
              disabled={busy}
              onClick={() => setConfirmApprove(true)}
            >
              Phê duyệt đối tác
            </button>
          </div>
        )}

        <ConfirmDialog
          open={confirmApprove}
          title="Phê duyệt đối tác"
          message="Xác nhận phê duyệt đối tác này? Đối tác sẽ được kích hoạt trên hệ thống."
          confirmLabel="Phê duyệt"
          cancelLabel="Hủy"
          loading={busy}
          onCancel={() => !busy && setConfirmApprove(false)}
          onConfirm={handleApprove}
        />

        <ConfirmDialog
          open={terminationConfirm}
          title="Xác nhận lần 2 — Yêu cầu hủy"
          message={`Bạn chắc chắn muốn gửi yêu cầu hủy hợp tác tới "${partner.name}"? Email và thông báo sẽ được gửi ngay.`}
          confirmLabel="Xác nhận gửi"
          cancelLabel="Quay lại"
          loading={busy}
          onCancel={() => !busy && setTerminationConfirm(false)}
          onConfirm={handleTermination}
        />

        <ConfirmDialog
          open={Boolean(removeMemberTarget)}
          title="Gỡ quyền quản lý"
          message={`Vô hiệu hóa tài khoản "${removeMemberTarget?.fullname || removeMemberTarget?.email}" khỏi công ty ${partner.name}?`}
          confirmLabel="Gỡ quyền"
          cancelLabel="Hủy"
          loading={busy}
          onCancel={() => !busy && setRemoveMemberTarget(null)}
          onConfirm={handleRemoveMember}
        />

        {rejectOpen && (
          <div className="admin-partner-detail__modal" role="dialog" aria-modal="true">
            <div className="admin-partner-detail__modal-card">
              <h3>Từ chối đối tác</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                rows={4}
              />
              <div className="admin-partner-detail__modal-actions">
                <button type="button" disabled={busy} onClick={() => setRejectOpen(false)}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="admin-partner-detail__btn admin-partner-detail__btn--danger"
                  disabled={busy || !rejectReason.trim()}
                  onClick={handleReject}
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        )}

        {addMemberOpen && (
          <div className="admin-partner-detail__modal" role="dialog" aria-modal="true">
            <div className="admin-partner-detail__modal-card admin-partner-detail__modal-card--wide">
              <h3>Thêm tài khoản quản lý</h3>
              <p className="admin-partner-detail__hint">
                Tài khoản mới được gắn với công ty <strong>{partner.name}</strong> và có quyền truy
                cập cổng đối tác.
              </p>
              <label className="admin-partner-detail__field">
                <span>Họ tên</span>
                <input
                  type="text"
                  value={memberForm.fullname}
                  onChange={(e) => setMemberForm((f) => ({ ...f, fullname: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                  disabled={busy}
                />
              </label>
              <label className="admin-partner-detail__field">
                <span>Email đăng nhập</span>
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="manager@company.com"
                  disabled={busy}
                />
              </label>
              <label className="admin-partner-detail__field">
                <span>Chức danh</span>
                <input
                  type="text"
                  value={memberForm.title}
                  onChange={(e) => setMemberForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Trưởng phòng Marketing"
                  disabled={busy}
                />
              </label>
              <label className="admin-partner-detail__field">
                <span>Số điện thoại</span>
                <input
                  type="tel"
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm((f) => ({ ...f, phone: e.target.value }))}
                  disabled={busy}
                />
              </label>
              <label className="admin-partner-detail__checkbox">
                <input
                  type="checkbox"
                  checked={memberForm.activateNow}
                  onChange={(e) =>
                    setMemberForm((f) => ({ ...f, activateNow: e.target.checked }))
                  }
                  disabled={busy}
                />
                <span>Kích hoạt ngay và gửi mật khẩu mặc định qua email</span>
              </label>
              <div className="admin-partner-detail__modal-actions">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAddMemberOpen(false);
                    setMemberForm(EMPTY_MEMBER_FORM);
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="admin-partner-detail__btn admin-partner-detail__btn--primary"
                  disabled={busy}
                  onClick={handleAddMember}
                >
                  Tạo tài khoản
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <PublicAdminShell activeNav="home">
      <div className="admin-fpt-system home-layout">
        <main className="admin-fpt-system__main">{pageContent()}</main>
        <SiteFooter />
      </div>
    </PublicAdminShell>
  );
};

export default AdminPartnerDetail;
