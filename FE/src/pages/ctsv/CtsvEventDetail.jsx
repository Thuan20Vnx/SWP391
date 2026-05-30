import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  approveCtsvEvent,
  fetchCtsvEvent,
  publishCtsvEvent,
  rejectCtsvEvent,
  revisionCtsvEvent
} from '../../services/ctsvApi';
import { getUserRole } from '../../utils/auth';
import { getCtsvEventAccess } from '../../utils/ctsvEventAccess';
import { statusClass } from '../../utils/eventStatus';

const CtsvEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [event, setEvent] = useState(null);
  const [note, setNote] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const isCtsvOnly = getUserRole() === 'ctsv';

  useEffect(() => {
    fetchCtsvEvent(id)
      .then((d) => setEvent(d.event))
      .catch(() => {
        showToast?.('Không tải được sự kiện.', 'error');
        navigate('/ctsv/events');
      });
  }, [id, navigate, showToast]);

  const refresh = () =>
    fetchCtsvEvent(id).then((d) => setEvent(d.event));

  const handleApprove = async () => {
    if (!isCtsvOnly) {
      showToast?.('Chỉ cán bộ CTSV mới được phê duyệt cuối.', 'error');
      return;
    }
    try {
      await approveCtsvEvent(id, note);
      showToast?.('Đã phê duyệt sự kiện!', 'success');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    }
  };

  const handleReject = async () => {
    if (!note.trim()) {
      showToast?.('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }
    try {
      await rejectCtsvEvent(id, note);
      showToast?.('Đã từ chối sự kiện.', 'info');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    }
  };

  const handleRevision = async () => {
    try {
      await revisionCtsvEvent(id, note);
      showToast?.('Đã gửi yêu cầu chỉnh sửa.', 'info');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    }
  };

  const handlePublish = async () => {
    try {
      await publishCtsvEvent(id);
      showToast?.('Đã publish sự kiện!', 'success');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    }
  };

  if (!event) return <div className="ctsv-page"><p className="ctsv-muted">Đang tải...</p></div>;

  const access = getCtsvEventAccess(event);
  const canApprove =
    access.canManage && ['pending_ctsv', 'pending_icpdp', 'revision'].includes(event.statusKey);

  return (
    <div className="ctsv-page ctsv-detail-page">
      <Link to="/ctsv/events" className="ctsv-back-link">
        ← Danh sách sự kiện
      </Link>

      <div className="ctsv-detail-hero">
        {event.image && <img src={event.image} alt="" className="ctsv-detail-img" />}
        <div>
          <span className={`status-pill ${statusClass(event.status, event.statusKey)}`}>{event.status}</span>
          <h1>{event.title}</h1>
          <p>
            {event.category} • {event.date} {event.time} • {event.location}
          </p>
        </div>
      </div>

      <div className="ctsv-tabs">
        {['info', 'tickets', 'reports'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'info' ? 'Thông tin' : tab === 'tickets' ? 'Vé' : 'Báo cáo'}
          </button>
        ))}
      </div>

      {!access.canManage && (
        <div className="ctsv-pd-banner ctsv-pd-banner--info" style={{ marginBottom: 0 }}>
          Sự kiện do CLB hoặc đối tác tổ chức — bạn chỉ xem thông tin, không chỉnh sửa hay phê duyệt tại
          đây.
        </div>
      )}

      {activeTab === 'info' && (
        <div className="ctsv-panel">
          <p>{event.description || 'Chưa có mô tả chi tiết.'}</p>
          <ul className="ctsv-detail-meta">
            <li>
              Vé: {event.remainingTickets}/{event.totalTickets} còn lại
            </li>
            <li>
              Nguồn:{' '}
              {event.source === 'school'
                ? 'Cấp trường (CTSV quản lý)'
                : event.source === 'partner'
                  ? 'Đối tác'
                  : 'Câu lạc bộ / hệ thống'}
            </li>
            {event.ctsvNote && <li>Ghi chú CTSV: {event.ctsvNote}</li>}
          </ul>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="ctsv-panel">
          <p>Tổng vé: {event.totalTickets}</p>
          <p>Đã đăng ký: {event.registeredCount ?? event.totalTickets - event.remainingTickets}</p>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="ctsv-panel">
          <p>Báo cáo sau sự kiện sẽ hiển thị khi sự kiện kết thúc.</p>
          <Link to="/ctsv/reports" className="ctsv-link-btn">
            Xem báo cáo tổng hợp
          </Link>
        </div>
      )}

      {access.canManage && (
        <div className="ctsv-action-panel">
          <textarea
            className="ctsv-textarea"
            placeholder="Ghi chú / lý do (bắt buộc khi từ chối)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <div className="ctsv-action-buttons">
            {canApprove && isCtsvOnly && (
              <>
                <button type="button" className="ctsv-btn-primary" onClick={handleApprove}>
                  Phê duyệt
                </button>
                <button type="button" className="ctsv-btn-danger" onClick={handleReject}>
                  Từ chối
                </button>
                <button type="button" className="ctsv-btn-secondary" onClick={handleRevision}>
                  Yêu cầu chỉnh sửa
                </button>
              </>
            )}
            {event.statusKey === 'approved' && (
              <button type="button" className="ctsv-btn-primary" onClick={handlePublish}>
                Publish sự kiện
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CtsvEventDetail;
