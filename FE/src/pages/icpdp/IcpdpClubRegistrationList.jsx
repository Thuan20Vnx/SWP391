import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { fetchClubRegistrations } from '../../services/adminApi';
import { fetchIcpdpClubs, updateIcpdpClub, deleteIcpdpClub } from '../../services/clubTimelineApi';
import { statusClass } from '../../utils/eventStatus';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const CLUB_CATEGORIES = ['Công nghệ', 'Nghệ thuật', 'Kinh doanh', 'Văn hóa', 'Thể thao', 'Tình nguyện', 'Âm nhạc'];

const EMPTY_CLUB_FORM = {
  name: '',
  shortName: '',
  category: CLUB_CATEGORIES[0],
  president: '',
  email: '',
  hotline: '',
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

const IcpdpClubRegistrationList = () => {
  const { showToast } = useOutletContext() || {};
  const { pathname } = useLocation();
  const basePath = resolveBasePath(pathname);
  const [view, setView] = useState('registrations');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [editingClub, setEditingClub] = useState(null);
  const [clubForm, setClubForm] = useState(EMPTY_CLUB_FORM);
  const [savingClub, setSavingClub] = useState(false);
  const [deletingClub, setDeletingClub] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const loadClubs = useCallback(() => {
    setClubsLoading(true);
    fetchIcpdpClubs()
      .then((d) => setClubs(d.clubs || []))
      .catch(() => showToast?.('Không tải được danh sách CLB.', 'error'))
      .finally(() => setClubsLoading(false));
  }, [showToast]);

  useEffect(() => {
    if (view === 'clubs') loadClubs();
  }, [view, loadClubs]);

  const openEditClub = (club) => {
    setEditingClub(club);
    setClubForm({
      name: club.name || '',
      shortName: club.shortName || '',
      category: club.category || CLUB_CATEGORIES[0],
      president: club.president || '',
      email: club.email || '',
      hotline: club.hotline || '',
      description: club.description || '',
    });
  };

  const handleSaveClub = async () => {
    if (!editingClub) return;
    if (!clubForm.name.trim()) {
      showToast?.('Vui lòng nhập tên CLB.', 'error');
      return;
    }
    setSavingClub(true);
    try {
      await updateIcpdpClub(editingClub._id, clubForm);
      showToast?.('Đã cập nhật CLB.', 'success');
      setEditingClub(null);
      loadClubs();
    } catch (err) {
      showToast?.(err.message || 'Cập nhật CLB thất bại.', 'error');
    } finally {
      setSavingClub(false);
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const pageClass = pathname.startsWith('/admin')
    ? 'ctsv-events-page admin-icpdp-club-reg-page'
    : 'ctsv-events-page';

  return (
    <div className={pageClass}>
      <header className="ctsv-events-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">IC-PDP · Câu lạc bộ</span>
          <h1>Quản lý câu lạc bộ</h1>
          <p>
            Duyệt đơn thành lập CLB mới và quản lý (sửa/xóa) các CLB đang hoạt động. Sau khi duyệt, hệ thống
            tự tạo CLB và gán quyền quản lý cho chủ nhiệm đề xuất.
          </p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : filtered.length}</span>
            <span className="ctsv-events-hero-stat-label">Đơn đăng ký</span>
          </div>
          {!loading && pendingCount > 0 && (
            <p style={{ fontSize: '0.82rem', color: '#7c3aed', fontWeight: 600, marginTop: 4 }}>
              {pendingCount} chờ IC-PDP duyệt
            </p>
          )}
        </div>
      </header>

      <div className="icpdp-status-filters" role="group" aria-label="Chế độ xem" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`icpdp-status-chip ${view === 'registrations' ? 'is-active' : ''}`}
          onClick={() => setView('registrations')}
        >
          Đơn đăng ký
        </button>
        <button
          type="button"
          className={`icpdp-status-chip ${view === 'clubs' ? 'is-active' : ''}`}
          onClick={() => setView('clubs')}
        >
          CLB hiện có
        </button>
      </div>

      {view === 'clubs' ? (
        <>
          {clubsLoading ? (
            <div className="icpdp-proposals-grid" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="icpdp-proposal-card" style={{ minHeight: 140 }}>
                  <div className="sk sk-line sk-line--lg" />
                  <div className="sk sk-line" />
                </div>
              ))}
            </div>
          ) : clubs.length === 0 ? (
            <div className="ctsv-events-empty">
              <h2>Chưa có CLB nào</h2>
              <p>Các CLB sau khi đăng ký được duyệt sẽ hiển thị ở đây.</p>
            </div>
          ) : (
            <div className="icpdp-proposals-grid">
              {clubs.map((c) => (
                <article key={c._id} className="icpdp-proposal-card icpdp-club-reg-card">
                  <div className="icpdp-proposal-card__header">
                    <div>
                      <h3 className="icpdp-proposal-card__title">{c.name}</h3>
                      <p className="icpdp-proposal-card__club">
                        {c.category} · Chủ nhiệm: {c.president || '—'}
                      </p>
                    </div>
                    <span className={`status-pill ${c.status === 'active' ? 'status-success' : 'status-danger'}`}>
                      {c.status === 'active' ? 'Hoạt động' : 'Đã xóa'}
                    </span>
                  </div>
                  <p className="icpdp-club-reg-card__desc">
                    {(c.description || '').slice(0, 120)}
                    {(c.description || '').length > 120 ? '…' : ''}
                  </p>
                  <div className="icpdp-proposal-card__meta">
                    <span>{c.email || '—'}</span>
                    <span>{c.hotline || ''}</span>
                  </div>
                  <div className="icpdp-proposal-card__footer">
                    <button
                      type="button"
                      className="icpdp-proposal-card__action icpdp-proposal-card__action--ghost"
                      onClick={() => openEditClub(c)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="icpdp-proposal-card__action icpdp-proposal-card__action--ghost"
                      onClick={() => setDeletingClub(c)}
                    >
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
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
        <div className="icpdp-status-filters" role="group" aria-label="Lọc trạng thái">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id || 'default'}
              type="button"
              className={`icpdp-status-chip ${statusFilter === f.id ? 'is-active' : ''}`}
              onClick={() => handleStatusChange(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {loading && registrations.length === 0 ? (
        <div className="icpdp-proposals-grid" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="icpdp-proposal-card" style={{ minHeight: 140 }}>
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
              : 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'}
          </p>
        </div>
      ) : (
        <div className="icpdp-proposals-grid" style={{ opacity: loading ? 0.55 : 1 }}>
          {filtered.map((r) => {
            const isPending = r.statusKey === 'pending_icpdp';
            return (
              <article key={r.id} className="icpdp-proposal-card icpdp-club-reg-card">
                <div className="icpdp-proposal-card__header">
                  <div>
                    <h3 className="icpdp-proposal-card__title">{r.clubName}</h3>
                    <p className="icpdp-proposal-card__club">
                      {r.category} · Chủ nhiệm: {r.president}
                    </p>
                  </div>
                  <span className={`status-pill ${statusClass(r.status, r.statusKey)}`}>{r.status}</span>
                </div>
                <p className="icpdp-club-reg-card__desc">
                  {(r.description || '').slice(0, 120)}
                  {(r.description || '').length > 120 ? '…' : ''}
                </p>
                <div className="icpdp-proposal-card__meta">
                  <span>{r.presidentEmail}</span>
                  <span>Gửi: {formatDate(r.createdAt)}</span>
                </div>
                <div className="icpdp-proposal-card__footer">
                  <Link
                    to={`${basePath}/${r.id}`}
                    className={`icpdp-proposal-card__action ${isPending ? 'icpdp-proposal-card__action--primary' : 'icpdp-proposal-card__action--ghost'}`}
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

      {editingClub && (
        <div className="ctsv-partner-dialog-backdrop" role="presentation" onClick={() => !savingClub && setEditingClub(null)}>
          <div className="ctsv-partner-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="ctsv-partner-dialog-title">Sửa thông tin CLB</h2>
            <label className="ctsv-partner-dialog-field">
              <span>Tên CLB <em>*</em></span>
              <input
                className="ctsv-input"
                value={clubForm.name}
                onChange={(e) => setClubForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="ctsv-partner-dialog-field">
              <span>Tên viết tắt</span>
              <input
                className="ctsv-input"
                value={clubForm.shortName}
                onChange={(e) => setClubForm((f) => ({ ...f, shortName: e.target.value }))}
              />
            </label>
            <label className="ctsv-partner-dialog-field">
              <span>Lĩnh vực</span>
              <select
                className="ctsv-input"
                value={clubForm.category}
                onChange={(e) => setClubForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CLUB_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="ctsv-partner-dialog-field">
              <span>Chủ nhiệm</span>
              <input
                className="ctsv-input"
                value={clubForm.president}
                onChange={(e) => setClubForm((f) => ({ ...f, president: e.target.value }))}
              />
            </label>
            <label className="ctsv-partner-dialog-field">
              <span>Email liên hệ</span>
              <input
                className="ctsv-input"
                value={clubForm.email}
                onChange={(e) => setClubForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label className="ctsv-partner-dialog-field">
              <span>Hotline</span>
              <input
                className="ctsv-input"
                value={clubForm.hotline}
                onChange={(e) => setClubForm((f) => ({ ...f, hotline: e.target.value }))}
              />
            </label>
            <label className="ctsv-partner-dialog-field">
              <span>Mô tả</span>
              <textarea
                className="ctsv-textarea ctsv-partner-dialog-textarea"
                rows={4}
                value={clubForm.description}
                onChange={(e) => setClubForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <div className="ctsv-partner-dialog-actions">
              <button type="button" className="ctsv-partner-dialog-cancel" disabled={savingClub} onClick={() => setEditingClub(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="ctsv-partner-dialog-submit"
                disabled={savingClub}
                onClick={handleSaveClub}
              >
                {savingClub ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletingClub)}
        title="Xóa câu lạc bộ?"
        message={`CLB "${deletingClub?.name || ''}" sẽ bị ẩn khỏi hệ thống. Hành động này có thể cần IC-PDP khôi phục lại nếu nhầm.`}
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
