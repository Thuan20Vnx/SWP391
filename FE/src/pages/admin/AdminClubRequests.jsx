import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  approveAdminClubRequest,
  fetchAdminClubRequests,
  rejectAdminClubRequest,
} from '../../services/adminApi';
import { isAdminRole } from '../../utils/auth';
import AdminFilterDropdown from '../../components/admin/AdminFilterDropdown';
import '../../styles/admin-dashboard.css';
import '../../styles/admin-event-requests.css';

const FILTERS = [
  { id: 'pending', label: 'Đang chờ', status: 'pending', type: 'all' },
  { id: 'edit', label: 'Yêu cầu sửa', status: 'pending', type: 'edit' },
  { id: 'delete', label: 'Yêu cầu xóa', status: 'pending', type: 'delete' },
  { id: 'all-status', label: 'Tất cả trạng thái', status: 'all', type: 'all' },
];

const TYPE_LABELS = { edit: 'Sửa CLB', delete: 'Xóa CLB' };

const DIFF_FIELDS = [
  { key: 'name', label: 'Tên CLB' },
  { key: 'category', label: 'Lĩnh vực' },
  { key: 'president', label: 'Chủ nhiệm' },
  { key: 'email', label: 'Email' },
  { key: 'hotline', label: 'Hotline' },
  { key: 'description', label: 'Mô tả' },
];

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};

const DiffBlock = ({ request }) => {
  if (request.requestType !== 'edit') {
    return (
      <p className="admin-event-request-reason">
        <strong>Hành động: </strong>Xóa CLB (chuyển trạng thái ngừng hoạt động)
      </p>
    );
  }

  const before = request.snapshot || {};
  const after = request.payload || {};
  const renderVal = (key, obj) => {
    const v = obj[key];
    if (key === 'description' && v) return v.length > 120 ? `${v.slice(0, 120)}…` : v;
    return v != null && v !== '' ? String(v) : '—';
  };

  return (
    <div className="admin-event-request-diff">
      <div className="admin-event-request-diff__col">
        <h4>Hiện tại</h4>
        <ul>
          {DIFF_FIELDS.map((f) => (
            <li key={f.key}>
              <strong>{f.label}:</strong> {renderVal(f.key, before)}
            </li>
          ))}
        </ul>
      </div>
      <div className="admin-event-request-diff__col admin-event-request-diff__col--new">
        <h4>Đề xuất</h4>
        <ul>
          {DIFF_FIELDS.map((f) => (
            <li key={f.key}>
              <strong>{f.label}:</strong> {renderVal(f.key, after)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const RequestCard = ({ request, actingId, notes, onNoteChange, onApprove, onReject }) => {
  const isPending = request.status === 'pending';
  const busy = actingId === request.id;

  return (
    <article className="admin-event-request-card">
      <header className="admin-event-request-card__head">
        <div>
          <h2 className="admin-event-request-card__title">{request.club?.name || 'CLB không rõ'}</h2>
          <p className="admin-event-request-card__sub">
            {request.requestedByName || request.requestedByEmail || '—'} ·{' '}
            Gửi lúc {request.createdAtLabel || formatDateTime(request.createdAt)}
          </p>
        </div>
        <div className="admin-event-request-badges">
          <span
            className={`admin-event-request-badge admin-event-request-badge--${
              request.requestType === 'delete' ? 'delete' : 'edit'
            }`}
          >
            {TYPE_LABELS[request.requestType] || request.requestType}
          </span>
          <span
            className={`admin-event-request-badge ${
              request.status === 'pending'
                ? 'admin-event-request-badge--pending'
                : request.status === 'approved'
                  ? 'admin-event-request-badge--done'
                  : 'admin-event-request-badge--rejected'
            }`}
          >
            {request.statusLabel}
          </span>
        </div>
      </header>

      <div className="admin-event-request-card__body">
        <p className="admin-event-request-reason">
          <strong>Lý do IC-PDP: </strong>
          {request.reason || '—'}
        </p>
        <DiffBlock request={request} />
        {request.adminNote && !isPending ? (
          <p className="admin-event-request-reason">
            <strong>Ghi chú Admin: </strong>
            {request.adminNote}
          </p>
        ) : null}
      </div>

      {isPending && (
        <footer className="admin-event-request-card__footer">
          <textarea
            className="admin-event-request-note"
            rows={2}
            placeholder="Ghi chú (bắt buộc nếu từ chối)…"
            value={notes[request.id] || ''}
            onChange={(e) => onNoteChange(request.id, e.target.value)}
            disabled={busy}
          />
          <div className="admin-event-request-card__actions">
            <button
              type="button"
              className="admin-proposal-btn admin-proposal-btn--approve"
              disabled={busy || !!actingId}
              onClick={() => onApprove(request.id)}
            >
              {busy ? 'Đang xử lý…' : 'Chấp nhận'}
            </button>
            <button
              type="button"
              className="admin-proposal-btn admin-proposal-btn--reject"
              disabled={busy || !!actingId}
              onClick={() => onReject(request.id)}
            >
              Từ chối
            </button>
          </div>
        </footer>
      )}
    </article>
  );
};

const AdminClubRequests = ({ showToast: showToastProp }) => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const showToast = showToastProp || outlet.showToast;
  const role = localStorage.getItem('userRole');
  const canAccess = isAdminRole(role);

  const [activeFilter, setActiveFilter] = useState('pending');
  const activeFilterDef = FILTERS.find((f) => f.id === activeFilter) || FILTERS[0];
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [notes, setNotes] = useState({});
  const [openMenu, setOpenMenu] = useState(null);
  const filterOptions = useMemo(() => FILTERS.map((f) => ({ value: f.id, label: f.label })), []);

  useEffect(() => {
    if (!canAccess) {
      showToast?.('Bạn không có quyền truy cập trang này.', 'error');
      navigate('/profile');
    }
  }, [canAccess, navigate, showToast]);

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      const data = await fetchAdminClubRequests({
        status: activeFilterDef.status,
        type: activeFilterDef.type,
      });
      setRequests(data.requests || []);
    } catch (err) {
      showToast?.(err.message || 'Không tải được danh sách yêu cầu.', 'error');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [canAccess, showToast, activeFilterDef.status, activeFilterDef.type]);

  useEffect(() => {
    load();
  }, [load]);

  const handleNoteChange = (id, value) => setNotes((prev) => ({ ...prev, [id]: value }));

  const handleApprove = async (id) => {
    setActingId(id);
    try {
      await approveAdminClubRequest(id, notes[id]?.trim() || '');
      showToast?.('Đã chấp nhận yêu cầu.', 'success');
      setNotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch (err) {
      showToast?.(err.message || 'Chấp nhận yêu cầu thất bại.', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id) => {
    const note = notes[id]?.trim();
    if (!note) {
      showToast?.('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }
    setActingId(id);
    try {
      await rejectAdminClubRequest(id, note);
      showToast?.('Đã từ chối yêu cầu.', 'info');
      setNotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch (err) {
      showToast?.(err.message || 'Từ chối yêu cầu thất bại.', 'error');
    } finally {
      setActingId(null);
    }
  };

  if (!canAccess) return null;

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <main className="admin-event-requests">
      <header className="admin-event-requests__header">
        <h1>Yêu cầu sửa / xóa CLB</h1>
        <p>Duyệt các yêu cầu IC-PDP gửi để sửa hoặc xóa CLB đã được phê duyệt.</p>
      </header>

      <div className="admin-event-requests__filters">
        <div className="admin-event-requests__filter-group">
          <AdminFilterDropdown
            label=""
            value={activeFilter}
            options={filterOptions}
            onChange={setActiveFilter}
            menuOpen={openMenu === 'filter'}
            onMenuToggle={setOpenMenu}
            menuId="filter"
          />
        </div>
        <span className="admin-event-requests__count">
          {loading ? 'Đang tải…' : `${requests.length} yêu cầu${pendingCount ? ` (${pendingCount} đang chờ)` : ''}`}
        </span>
      </div>

      {loading ? (
        <p className="admin-events-empty">Đang tải danh sách…</p>
      ) : requests.length === 0 ? (
        <div className="admin-event-requests__empty">
          <p>Không có yêu cầu nào.</p>
        </div>
      ) : (
        requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            actingId={actingId}
            notes={notes}
            onNoteChange={handleNoteChange}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))
      )}
    </main>
  );
};

export default AdminClubRequests;
