import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE, getEventHeaders } from '../../utils/api';

const STATUS_LABEL = {
  registered: 'Đã đăng ký',
  'checked-in': 'Đã check-in',
  attended: 'Đã check-in',
  cancelled: 'Đã hủy',
};

const STATUS_TONE = {
  registered: 'registered',
  'checked-in': 'checked-in',
  attended: 'checked-in',
  cancelled: 'cancelled',
};

const ClubParticipantsPanel = ({ events, showToast, onViewEvent }) => {
  const eligibleEvents = useMemo(
    () => events.filter((e) => e.status === 'approved'),
    [events]
  );
  const [selectedEventId, setSelectedEventId] = useState('');
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!eligibleEvents.length) {
      setSelectedEventId('');
      setParticipants([]);
      return;
    }
    if (!selectedEventId || !eligibleEvents.some((e) => e._id === selectedEventId)) {
      setSelectedEventId(eligibleEvents[0]._id);
    }
  }, [eligibleEvents, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return undefined;
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/api/events/${selectedEventId}`, { headers: getEventHeaders(false) })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          setParticipants(data.students || []);
        } else {
          setParticipants([]);
          showToast?.(data.message || 'Không tải được danh sách người tham gia.', 'error');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setParticipants([]);
          showToast?.('Lỗi kết nối máy chủ.', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedEventId, showToast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((row) => {
      const s = row.student || {};
      return [s.fullname, s.email, s.studentId].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [participants, search]);

  const selectedEvent = eligibleEvents.find((e) => e._id === selectedEventId);

  return (
    <div className="clb-participants-panel">
      <div className="clb-page-header">
        <div>
          <h1 className="clb-page-title">QUẢN LÝ NGƯỜI THAM GIA</h1>
          <p className="clb-page-subtitle">Danh sách sinh viên đăng ký theo từng sự kiện đã duyệt.</p>
        </div>
        {selectedEventId && (
          <button type="button" className="clb-btn-primary" onClick={() => onViewEvent?.(selectedEventId)}>
            Mở chi tiết sự kiện
          </button>
        )}
      </div>

      {eligibleEvents.length === 0 ? (
        <p className="clb-panel-empty">Chưa có sự kiện đã duyệt. Sau khi IC-PDP phê duyệt, bạn có thể xem người tham gia tại đây.</p>
      ) : (
        <>
          <div className="clb-participants-toolbar">
            <div className="clb-profile-field">
              <label htmlFor="clb-participant-event">Chọn sự kiện</label>
              <select
                id="clb-participant-event"
                className="clb-input"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {eligibleEvents.map((ev) => (
                  <option key={ev._id} value={ev._id}>{ev.title}</option>
                ))}
              </select>
            </div>
            <div className="clb-profile-field">
              <label htmlFor="clb-participant-search">Tìm theo tên, MSSV, email</label>
              <input
                id="clb-participant-search"
                type="search"
                className="clb-input"
                placeholder="Nhập từ khóa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {selectedEvent && (
            <p className="clb-participants-meta">
              <strong>{selectedEvent.title}</strong>
              {' · '}
              {selectedEvent.registeredCount || 0}/{selectedEvent.capacity || 0} đăng ký
            </p>
          )}

          <div className="clb-table-wrapper">
            <div className="clb-table-scroll">
              <table className="clb-table">
                <thead>
                  <tr>
                    <th>HỌ TÊN</th>
                    <th>MSSV</th>
                    <th>EMAIL</th>
                    <th>TRẠNG THÁI</th>
                    <th>THỜI GIAN ĐK</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="clb-panel-empty-cell">Đang tải...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="clb-panel-empty-cell">Chưa có người tham gia cho sự kiện này.</td></tr>
                  ) : (
                    filtered.map((row) => {
                      const s = row.student || {};
                      const registeredAt = row.createdAt || row.registeredAt;
                      const statusKey = row.status;
                      const statusLabel = STATUS_LABEL[statusKey] || statusKey || '—';
                      const statusTone = STATUS_TONE[statusKey] || 'registered';
                      const regDate = registeredAt ? new Date(registeredAt) : null;
                      return (
                        <tr key={row._id}>
                          <td><span className="clb-event-name">{s.fullname || '—'}</span></td>
                          <td><span className="clb-table-chip">{s.studentId || '—'}</span></td>
                          <td><span className="clb-date-text">{s.email || '—'}</span></td>
                          <td>
                            {statusKey ? (
                              <span className={`clb-table-status clb-table-status--${statusTone}`}>{statusLabel}</span>
                            ) : (
                              <span className="clb-date-text">—</span>
                            )}
                          </td>
                          <td>
                            {regDate ? (
                              <div className="clb-table-date">
                                <strong>{regDate.toLocaleDateString('vi-VN')}</strong>
                                <span>{regDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            ) : (
                              <span className="clb-date-text">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClubParticipantsPanel;
