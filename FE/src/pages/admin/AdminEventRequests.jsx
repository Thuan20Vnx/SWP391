import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  EVENT_REQUEST_FILTERS,
  EVENT_REQUEST_TYPE_META,
} from '../../data/adminEventRequestsData';
import {
  approveAdminEventRequest,
  fetchAdminEventRequests,
  rejectAdminEventRequest,
} from '../../services/adminApi';
import { isAdminRole, isCtsvRole } from '../../utils/auth';
import '../../styles/admin-dashboard.css';
import '../../styles/admin-event-requests.css';

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};

const DiffBlock = ({ request }) => {
  if (request.requestType !== 'edit') {
    return (
      <p className="admin-event-request-reason">
        <strong>Hành động</strong>
        {request.requestType === 'hide'
          ? 'Ẩn sự kiện khỏi danh sách công khai sau khi chấp nhận.'
          : 'Đánh dấu xóa và kết thúc sự kiện sau khi chấp nhận.'}
      </p>
    );
  }

  const before = request.snapshot || {};
  const after = request.payload || {};
  const fields = [
    { key: 'title', label: 'Tên sự kiện' },
    { key: 'location', label: 'Địa điểm' },
    { key: 'description', label: 'Mô tả' },
    { key: 'category', label: 'Danh mục' },
    { key: 'capacity', label: 'Sức chứa' },
    { key: 'startDate', label: 'Bắt đầu', fmt: formatDateTime },
    { key: 'endDate', label: 'Kết thúc', fmt: formatDateTime },
  ];

  const renderVal = (key, obj, fmt) => {
    const v = obj[key];
    if (fmt) return fmt(v);
    if (key === 'description' && v) return v.length > 120 ? `${v.slice(0, 120)}…` : v;
    return v != null && v !== '' ? String(v) : '—';
  };

  return (
    <div className="admin-event-request-diff">
      <div className="admin-event-request-diff__col">
        <h4>Hiện tại</h4>
        <ul>
          {fields.map((f) => (
            <li key={f.key}>
              <strong>{f.label}:</strong> {renderVal(f.key, before, f.fmt)}
            </li>
          ))}
        </ul>
      </div>
      <div className="admin-event-request-diff__col admin-event-request-diff__col--new">
        <h4>Đề xuất mới</h4>
        <ul>
          {fields.map((f) => (
            <li key={f.key}>
              <strong>{f.label}:</strong> {renderVal(f.key, after, f.fmt)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const RequestCard = ({ request, actingId, notes, onNoteChange, onApprove, onReject }) => {
  const meta = EVENT_REQUEST_TYPE_META[request.requestType] || {
    label: request.requestTypeLabel,
    tone: 'edit',
  };
  const isPending = request.status === 'pending';
  const busy = actingId === request.id;

  return (
    <article className="admin-event-request-card">
      <header className="admin-event-request-card__head">
        <div>
          <h2 className="admin-event-request-card__title">
            {request.event?.title || 'Sự kiện không xác định'}
          </h2>
          <p className="admin-event-request-card__sub">
            {request.clubName || 'CLB —'} · {request.requestedByName || request.requestedByEmail || '—'} ·{' '}
            Gửi {request.createdAtLabel || formatDateTime(request.createdAt)}
          </p>
        </div>
        <div className="admin-event-request-badges">
          <span className={`admin-event-request-badge admin-event-request-badge--${meta.tone}`}>
            {meta.label}
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
          <strong>Lý do từ CLB</strong>
          {request.reason || '—'}
        </p>
        <DiffBlock request={request} />
        {request.adminNote && !isPending ? (
          <p className="admin-event-request-reason">
            <strong>Phản hồi admin</strong>
            {request.adminNote}
          </p>
        ) : null}
      </div>

      {isPending && (
        <footer className="admin-event-request-card__footer">
          <textarea
            className="admin-event-request-note"
            rows={2}
            placeholder="Ghi chú gửi lại CLB (không bắt buộc khi chấp nhận, bắt buộc khi từ chối)"
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
              {busy ? 'Đang xử lý...' : 'Chấp nhận'}
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

const AdminEventRequests = ({ showToast: showToastProp }) => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const showToast = showToastProp || outlet.showToast;
  const role = localStorage.getItem('userRole');
  const canAccess = isAdminRole(role) || isCtsvRole(role);

  const [activeFilter, setActiveFilter] = useState('pending');
  const activeFilterDef =
    EVENT_REQUEST_FILTERS.find((f) => f.id === activeFilter) || EVENT_REQUEST_FILTERS[0];
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [notes, setNotes] = useState({});

  useEffect(() => {
    if (!canAccess) {
      showToast?.('Bạn không có quyền truy cập trang này!', 'error');
      navigate('/profile');
    }
  }, [canAccess, navigate, showToast]);

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      const data = await fetchAdminEventRequests({
        status: activeFilterDef.status,
        type: activeFilterDef.type,
      });
      setRequests(data.requests || []);
    } catch (err) {
      showToast?.(err.message || 'Không tải được danh sách yêu cầu', 'error');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [canAccess, activeFilter, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const handleApprove = async (id) => {
    setActingId(id);
    try {
      await approveAdminEventRequest(id, notes[id]?.trim() || '');
      showToast?.('Đã chấp nhận yêu cầu và cập nhật sự kiện.', 'success');
      setNotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch (err) {
      showToast?.(err.message || 'Không thể chấp nhận', 'error');
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
      await rejectAdminEventRequest(id, note);
      showToast?.('Đã từ chối yêu cầu.', 'info');
      setNotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch (err) {
      showToast?.(err.message || 'Không thể từ chối', 'error');
    } finally {
      setActingId(null);
    }
  };

  if (!canAccess) return null;

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <main className="admin-event-requests">
      <header className="admin-event-requests__header">
        <h1>Xử lý yêu cầu sự kiện</h1>
        <p>
          Duyệt các yêu cầu chỉnh sửa, ẩn hoặc xóa sự kiện đã công bố từ phía CLB. Tách biệt với luồng
          phê duyệt đề xuất mới tại trang Duyệt đề xuất sự kiện.
        </p>
      </header>

      <div className="admin-event-requests__filters">
        <div className="admin-event-requests__filter-group" role="tablist" aria-label="Bộ lọc yêu cầu">
          {EVENT_REQUEST_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={activeFilter === f.id}
              className={`admin-event-requests__chip${activeFilter === f.id ? ' admin-event-requests__chip--active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="admin-event-requests__count">
          {loading
            ? 'Đang tải...'
            : `${requests.length} yêu cầu${activeFilterDef.status === 'pending' ? ` · ${pendingCount} chờ` : ''}`}
        </span>
      </div>

      {loading ? (
        <p className="admin-events-empty">Đang tải danh sách...</p>
      ) : requests.length === 0 ? (
        <div className="admin-event-requests__empty">
          <p>Không có yêu cầu nào phù hợp bộ lọc.</p>
          <p>
            Chạy <code>node seed-event-change-requests.js</code> trong thư CLB BE để có dữ liệu demo.
          </p>
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

export default AdminEventRequests;
