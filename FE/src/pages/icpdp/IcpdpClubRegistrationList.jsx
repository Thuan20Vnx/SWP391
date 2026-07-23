import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { fetchClubRegistrations, createClubRegistration } from '../../services/adminApi';
import { fetchIcpdpClubs, updateIcpdpClub, deleteIcpdpClub } from '../../services/clubTimelineApi';
import {
  fetchClubTransferRequests,
  approveClubTransferRequest,
  rejectClubTransferRequest,
} from '../../services/scannerApi';
import { statusClass } from '../../utils/eventStatus';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const CLUB_CATEGORIES = ['Công nghệ', 'Nghệ thuật', 'Kinh doanh', 'Văn hóa', 'Thể thao', 'Tình nguyện', 'Âm nhạc'];

const EMPTY_FORM = {
  name: '',
  shortName: '',
  category: CLUB_CATEGORIES[0],
  president: '',
  presidentEmail: '',
  email: '',
  hotline: '',
  phone: '',
  description: '',
};

const STATUS_FILTERS = [
  { id: '', label: 'Chờ xử lý' },
  { id: 'pending_icpdp', label: 'Chờ IC-PDP' },
  { id: 'pending_admin', label: 'Chờ Admin' },
  { id: 'revision', label: 'Cần chỉnh sửa' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'rejected', label: 'Từ chối' },
  { id: 'all', label: 'Tất cả' },
];

const resolveBasePath = (pathname) =>
  pathname.startsWith('/admin') ? '/admin/icpdp/club-registrations' : '/icpdp/club-registrations';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

const clubInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'CLB';

const IcpdpClubRegistrationList = () => {
  const { showToast } = useOutletContext() || {};
  const { pathname } = useLocation();
  const basePath = resolveBasePath(pathname);
  const [view, setView] = useState('registrations');

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(true);

  // Yêu cầu chuyển nhượng chủ nhiệm — IC-PDP duyệt, Admin chỉ nhận thông báo.
  const [transfers, setTransfers] = useState([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [transferBusyId, setTransferBusyId] = useState('');

  // Modal state: { mode: 'create' | 'edit', club }
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingClub, setDeletingClub] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = useCallback(
    (overrideStatus) => {
      const status = overrideStatus ?? statusFilter;
      setLoading(true);
      const params = {};
      if (status) params.status = status;
      fetchClubRegistrations(params)
        .then((d) => setRegistrations(d.registrations || []))
        .catch(() => showToast?.('Không tải được danh sách đơn CLB.', 'error'))
        .finally(() => setLoading(false));
    },
    [statusFilter, showToast]
  );

  const loadClubs = useCallback(() => {
    setClubsLoading(true);
    fetchIcpdpClubs()
      .then((d) => setClubs(d.clubs || []))
      .catch(() => showToast?.('Không tải được danh sách CLB.', 'error'))
      .finally(() => setClubsLoading(false));
  }, [showToast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTransfers = useCallback(() => {
    setTransfersLoading(true);
    fetchClubTransferRequests('all')
      .then((d) => setTransfers(d.requests || []))
      .catch(() => showToast?.('Không tải được yêu cầu chuyển nhượng.', 'error'))
      .finally(() => setTransfersLoading(false));
  }, [showToast]);

  useEffect(() => {
    if (view === 'clubs') loadClubs();
    if (view === 'transfers') loadTransfers();
  }, [view, loadClubs, loadTransfers]);

  // Đếm chấm đỏ tab chuyển nhượng ngay khi vào trang.
  useEffect(() => {
    loadTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingTransferCount = useMemo(
    () => transfers.filter((r) => r.status === 'pending').length,
    [transfers]
  );

  const handleApproveTransfer = async (request) => {
    if (!window.confirm(`Duyệt chuyển chủ nhiệm CLB "${request.clubName}" sang ${request.targetName || request.targetEmail}?`)) return;
    setTransferBusyId(request.id);
    try {
      const res = await approveClubTransferRequest(request.id);
      showToast?.(res.message || 'Đã duyệt chuyển nhượng.', 'success');
      loadTransfers();
    } catch (err) {
      showToast?.(err.message || 'Duyệt chuyển nhượng thất bại.', 'error');
    } finally {
      setTransferBusyId('');
    }
  };

  const handleRejectTransfer = async (request) => {
    const reason = window.prompt(`Lý do từ chối chuyển nhượng CLB "${request.clubName}":`);
    if (reason === null) return;
    if (!reason.trim()) {
      showToast?.('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }
    setTransferBusyId(request.id);
    try {
      const res = await rejectClubTransferRequest(request.id, reason.trim());
      showToast?.(res.message || 'Đã từ chối yêu cầu.', 'success');
      loadTransfers();
    } catch (err) {
      showToast?.(err.message || 'Từ chối thất bại.', 'error');
    } finally {
      setTransferBusyId('');
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return registrations;
    return registrations.filter(
      (r) =>
        (r.clubName || '').toLowerCase().includes(q) ||
        (r.president || '').toLowerCase().includes(q) ||
        (r.presidentEmail || '').toLowerCase().includes(q)
    );
  }, [registrations, searchQuery]);

  const pendingCount = useMemo(
    () => registrations.filter((r) => r.statusKey === 'pending_icpdp').length,
    [registrations]
  );

  const handleStatusChange = (id) => {
    setStatusFilter(id);
    load(id);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ mode: 'create', club: null });
  };

  const openEdit = (club) => {
    setForm({
      ...EMPTY_FORM,
      name: club.name || '',
      shortName: club.shortName || '',
      category: club.category || CLUB_CATEGORIES[0],
      president: club.president || '',
      email: club.email || '',
      hotline: club.hotline || '',
      description: club.description || '',
    });
    setModal({ mode: 'edit', club });
  };

  const handleSave = async () => {
    if (modal?.mode === 'create') {
      if (!form.name.trim()) return showToast?.('Vui lòng nhập tên CLB.', 'error');
      if (!form.presidentEmail.trim()) return showToast?.('Vui lòng nhập email chủ nhiệm.', 'error');
      setSaving(true);
      try {
        await createClubRegistration({
          clubName: form.name.trim(),
          category: form.category,
          president: form.president.trim(),
          presidentEmail: form.presidentEmail.trim(),
          phone: form.phone.trim(),
          description: form.description.trim(),
        });
        showToast?.('Đã tạo CLB mới — CLB hoạt động ngay, Admin được thông báo.', 'success');
        setModal(null);
        setView('registrations');
        setStatusFilter('approved');
        load('approved');
      } catch (err) {
        showToast?.(err.message || 'Tạo CLB thất bại.', 'error');
      } finally {
        setSaving(false);
      }
      return;
    }

    // edit
    if (!form.name.trim()) return showToast?.('Vui lòng nhập tên CLB.', 'error');
    setSaving(true);
    try {
      await updateIcpdpClub(modal.club._id, {
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        category: form.category,
        president: form.president.trim(),
        email: form.email.trim(),
        hotline: form.hotline.trim(),
        description: form.description.trim(),
      });
      showToast?.('Đã cập nhật CLB.', 'success');
      setModal(null);
      loadClubs();
    } catch (err) {
      showToast?.(err.message || 'Cập nhật CLB thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClub = async () => {
    if (!deletingClub) return;
    setDeletingBusy(true);
    try {
      await deleteIcpdpClub(deletingClub._id);
      showToast?.('Đã xóa CLB.', 'success');
      setDeletingClub(null);
      loadClubs();
    } catch (err) {
      showToast?.(err.message || 'Xóa CLB thất bại.', 'error');
    } finally {
      setDeletingBusy(false);
    }
  };

  const pageClass = pathname.startsWith('/admin')
    ? 'ctsv-events-page admin-icpdp-club-reg-page'
    : 'ctsv-events-page';

  const isCreate = modal?.mode === 'create';

  return (
    <div className={pageClass}>
      <header className="ctsv-events-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">IC-PDP · Câu lạc bộ</span>
          <h1>Quản lý câu lạc bộ</h1>
          <p>
            Duyệt đơn thành lập CLB mới và quản lý (sửa/xóa) các CLB đang hoạt động. IC-PDP là cấp
            quyết định — CLB được tạo ngay khi duyệt, Admin chỉ nhận thông báo.
          </p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">
              {view === 'clubs' ? (clubsLoading ? '—' : clubs.length) : loading ? '—' : filtered.length}
            </span>
            <span className="ctsv-events-hero-stat-label">
              {view === 'clubs' ? 'CLB đang hoạt động' : 'Đơn đăng ký'}
            </span>
          </div>
          <button type="button" className="ctsv-events-hero-cta" onClick={openCreate}>
            + Tạo CLB mới
          </button>
        </div>
      </header>

      <div className="icpdp-status-filters" role="group" aria-label="Chế độ xem" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`icpdp-status-chip ${view === 'registrations' ? 'is-active' : ''}`}
          onClick={() => setView('registrations')}
        >
          Đơn đăng ký{pendingCount > 0 ? ` (${pendingCount})` : ''}
        </button>
        <button
          type="button"
          className={`icpdp-status-chip ${view === 'clubs' ? 'is-active' : ''}`}
          onClick={() => setView('clubs')}
        >
          CLB hiện có
        </button>
        <button
          type="button"
          className={`icpdp-status-chip ${view === 'transfers' ? 'is-active' : ''}`}
          onClick={() => setView('transfers')}
        >
          Chuyển nhượng chủ nhiệm{pendingTransferCount > 0 ? ` (${pendingTransferCount})` : ''}
        </button>
      </div>

      {view === 'transfers' ? (
        transfersLoading ? (
          <div className="icpdp-proposals-grid" aria-busy="true">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="icpdp-club-tile" style={{ minHeight: 120 }}>
                <div className="sk sk-line sk-line--lg" />
                <div className="sk sk-line" />
              </div>
            ))}
          </div>
        ) : transfers.length === 0 ? (
          <div className="ctsv-events-empty">
            <h2>Chưa có yêu cầu chuyển nhượng</h2>
            <p>Khi chủ nhiệm CLB gửi yêu cầu chuyển quyền, yêu cầu sẽ hiện ở đây để IC-PDP duyệt.</p>
          </div>
        ) : (
          <div className="icpdp-proposals-grid">
            {transfers.map((r) => (
              <article key={r.id} className="icpdp-club-tile">
                <div className="icpdp-club-tile__head">
                  <span className="icpdp-club-tile__avatar" aria-hidden>
                    {clubInitials(r.clubName)}
                  </span>
                  <div className="icpdp-club-tile__head-text">
                    <h3 className="icpdp-club-tile__name">{r.clubName || 'CLB'}</h3>
                    <span className={`clb-table-status clb-table-status--${r.status === 'approved' ? 'approved' : r.status === 'rejected' ? 'rejected' : 'pending'}`}>
                      {r.status === 'approved' ? 'Đã duyệt' : r.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                    </span>
                  </div>
                </div>
                <dl className="icpdp-club-tile__meta">
                  <div>
                    <dt>Chủ nhiệm hiện tại</dt>
                    <dd>{r.requestedByName || r.currentPresident || '—'}</dd>
                  </div>
                  <div>
                    <dt>Chuyển sang</dt>
                    <dd>{r.targetName || '—'} ({r.targetEmail || '—'})</dd>
                  </div>
                  <div>
                    <dt>Ngày gửi</dt>
                    <dd>{formatDate(r.createdAt)}</dd>
                  </div>
                </dl>
                {r.reason && <p className="icpdp-club-tile__desc">Lý do: {r.reason}</p>}
                {r.status === 'rejected' && r.adminNote && (
                  <p className="icpdp-club-tile__desc">Lý do từ chối: {r.adminNote}</p>
                )}
                {r.status === 'pending' && (
                  <div className="icpdp-club-tile__footer">
                    <button
                      type="button"
                      className="icpdp-club-tile__btn"
                      disabled={transferBusyId === r.id}
                      onClick={() => handleApproveTransfer(r)}
                    >
                      {transferBusyId === r.id ? 'Đang xử lý…' : 'Duyệt'}
                    </button>
                    <button
                      type="button"
                      className="icpdp-club-tile__btn icpdp-club-tile__btn--danger"
                      disabled={transferBusyId === r.id}
                      onClick={() => handleRejectTransfer(r)}
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )
      ) : view === 'clubs' ? (
        clubsLoading ? (
          <div className="icpdp-proposals-grid" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="icpdp-club-tile" style={{ minHeight: 150 }}>
                <div className="sk sk-line sk-line--lg" />
                <div className="sk sk-line" />
              </div>
            ))}
          </div>
        ) : clubs.length === 0 ? (
          <div className="ctsv-events-empty">
            <h2>Chưa có CLB nào</h2>
            <p>Các CLB sau khi được duyệt sẽ hiển thị ở đây. Bấm “Tạo CLB mới” để gửi đơn thành lập.</p>
          </div>
        ) : (
          <div className="icpdp-proposals-grid">
            {clubs.map((c) => (
              <article key={c._id} className="icpdp-club-tile">
                <div className="icpdp-club-tile__head">
                  <span className="icpdp-club-tile__avatar" aria-hidden>
                    {clubInitials(c.name)}
                  </span>
                  <div className="icpdp-club-tile__head-text">
                    <h3 className="icpdp-club-tile__name">{c.name}</h3>
                    <span className="icpdp-club-tile__cat">{c.category}</span>
                  </div>
                </div>
                <dl className="icpdp-club-tile__meta">
                  <div>
                    <dt>Chủ nhiệm</dt>
                    <dd>{c.president || '—'}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{c.email || '—'}</dd>
                  </div>
                  <div>
                    <dt>Hotline</dt>
                    <dd>{c.hotline || '—'}</dd>
                  </div>
                </dl>
                {c.description && <p className="icpdp-club-tile__desc">{c.description}</p>}
                <div className="icpdp-club-tile__footer">
                  <button type="button" className="icpdp-club-tile__btn" onClick={() => openEdit(c)}>
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="icpdp-club-tile__btn icpdp-club-tile__btn--danger"
                    onClick={() => setDeletingClub(c)}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      ) : (
        <>
          <section className="icpdp-proposals-toolbar">
            <div className="icpdp-proposals-search">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3-3" />
              </svg>
              <input
                type="search"
                placeholder="Tìm theo tên CLB, chủ nhiệm, email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Tìm đơn CLB"
              />
            </div>
            <div className="icpdp-proposals-status-select">
              <label htmlFor="club-reg-status">Trạng thái</label>
              <select
                id="club-reg-status"
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                aria-label="Lọc trạng thái"
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.id || 'default'} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {loading && registrations.length === 0 ? (
            <div className="icpdp-proposals-grid" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="icpdp-club-tile" style={{ minHeight: 150 }}>
                  <div className="sk sk-line sk-line--lg" />
                  <div className="sk sk-line" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="ctsv-events-empty">
              <h2>Không có đơn nào</h2>
              <p>
                {statusFilter === 'approved' || statusFilter === 'rejected'
                  ? 'Chưa có đơn ở trạng thái này — thử «Chờ xử lý» hoặc «Tất cả».'
                  : statusFilter === '' || statusFilter === 'pending_icpdp'
                    ? 'Không có đơn đăng ký CLB mới chờ xử lý. CLB đang hoạt động xem ở tab «CLB hiện có» hoặc chọn «Tất cả».'
                    : 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'}
              </p>
            </div>
          ) : (
            <div className="icpdp-proposals-grid" style={{ opacity: loading ? 0.55 : 1 }}>
              {filtered.map((r) => {
                const isPending = r.statusKey === 'pending_icpdp';
                return (
                  <article key={r.id} className="icpdp-club-tile">
                    <div className="icpdp-club-tile__head">
                      <span className="icpdp-club-tile__avatar" aria-hidden>
                        {clubInitials(r.clubName)}
                      </span>
                      <div className="icpdp-club-tile__head-text">
                        <h3 className="icpdp-club-tile__name">{r.clubName}</h3>
                        <span className="icpdp-club-tile__cat">{r.category}</span>
                      </div>
                      <span className={`status-pill ${statusClass(r.status, r.statusKey)}`}>{r.status}</span>
                    </div>
                    <dl className="icpdp-club-tile__meta">
                      <div>
                        <dt>Chủ nhiệm</dt>
                        <dd>{r.president || '—'}</dd>
                      </div>
                      <div>
                        <dt>Email</dt>
                        <dd>{r.presidentEmail || '—'}</dd>
                      </div>
                      <div>
                        <dt>Ngày gửi</dt>
                        <dd>{formatDate(r.createdAt)}</dd>
                      </div>
                    </dl>
                    {r.description && <p className="icpdp-club-tile__desc">{r.description}</p>}
                    <div className="icpdp-club-tile__footer">
                      <Link
                        to={`${basePath}/${r.id}`}
                        className={`icpdp-club-tile__btn ${isPending ? 'icpdp-club-tile__btn--primary' : ''}`}
                      >
                        {isPending ? 'Duyệt ngay' : 'Xem chi tiết'}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {modal && (
        <div className="icpdp-cm-backdrop" role="presentation" onClick={() => !saving && setModal(null)}>
          <div
            className="icpdp-cm-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={isCreate ? 'Tạo CLB mới' : 'Sửa thông tin CLB'}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="icpdp-cm-header">
              <h2>{isCreate ? 'Tạo CLB mới' : 'Sửa thông tin CLB'}</h2>
              <button type="button" className="icpdp-cm-close" aria-label="Đóng" onClick={() => !saving && setModal(null)}>
                ×
              </button>
            </header>

            <div className="icpdp-cm-body">
              {isCreate && (
                <p className="icpdp-cm-hint">
                  CLB được tạo và kích hoạt ngay khi bấm lưu — hệ thống gán quyền chủ nhiệm cho email đã nhập
                  (sinh viên hoặc chủ nhiệm CLB khác kiêm nhiệm). Admin sẽ nhận thông báo.
                </p>
              )}
              <div className="icpdp-cm-field">
                <label>Tên CLB <span>*</span></label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              {!isCreate && (
                <div className="icpdp-cm-field">
                  <label>Tên viết tắt</label>
                  <input value={form.shortName} onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))} />
                </div>
              )}
              <div className="icpdp-cm-field">
                <label>Lĩnh vực</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CLUB_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="icpdp-cm-field">
                <label>Chủ nhiệm</label>
                <input value={form.president} onChange={(e) => setForm((f) => ({ ...f, president: e.target.value }))} />
              </div>
              {isCreate ? (
                <>
                  <div className="icpdp-cm-field">
                    <label>Email chủ nhiệm <span>*</span></label>
                    <input
                      type="email"
                      value={form.presidentEmail}
                      onChange={(e) => setForm((f) => ({ ...f, presidentEmail: e.target.value }))}
                      placeholder="chunhiem@fpt.edu.vn"
                    />
                  </div>
                  <div className="icpdp-cm-field">
                    <label>Số điện thoại</label>
                    <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </div>
                </>
              ) : (
                <>
                  <div className="icpdp-cm-field">
                    <label>Email liên hệ</label>
                    <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="icpdp-cm-field">
                    <label>Hotline</label>
                    <input value={form.hotline} onChange={(e) => setForm((f) => ({ ...f, hotline: e.target.value }))} />
                  </div>
                </>
              )}
              <div className="icpdp-cm-field">
                <label>Mô tả</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <footer className="icpdp-cm-footer">
              <button type="button" className="icpdp-cm-btn" disabled={saving} onClick={() => setModal(null)}>
                Hủy
              </button>
              <button type="button" className="icpdp-cm-btn icpdp-cm-btn--primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Đang lưu…' : isCreate ? 'Gửi đơn' : 'Lưu thay đổi'}
              </button>
            </footer>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletingClub)}
        title="Xóa câu lạc bộ?"
        message={`CLB "${deletingClub?.name || ''}" sẽ bị gỡ khỏi hệ thống. Bạn có chắc muốn tiếp tục?`}
        confirmLabel="Xóa CLB"
        cancelLabel="Hủy"
        loading={deletingBusy}
        onCancel={() => !deletingBusy && setDeletingClub(null)}
        onConfirm={handleDeleteClub}
        danger
      />
    </div>
  );
};

export default IcpdpClubRegistrationList;
