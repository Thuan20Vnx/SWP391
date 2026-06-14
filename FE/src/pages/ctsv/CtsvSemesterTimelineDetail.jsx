import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  approveCtsvSemesterTimeline,
  adminApproveTimelineChangeRequest,
  fetchCtsvSemesterTimeline,
  rejectCtsvSemesterTimeline,
  rejectCtsvTimelineChangeRequest,
  revisionCtsvSemesterTimeline,
} from '../../services/ctsvApi';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

const CtsvSemesterTimelineDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [timeline, setTimeline] = useState(null);
  const [note, setNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = () =>
    fetchCtsvSemesterTimeline(id).then((d) => setTimeline(d.timeline));

  useEffect(() => {
    refresh().catch(() => {
      showToast?.('Không tải được timeline.', 'error');
      navigate('/ctsv/semester-timelines');
    });
  }, [id, navigate, showToast]);

  if (!timeline) {
    return <div className="ctsv-ed-page"><p>Đang tải...</p></div>;
  }

  const canApprove = timeline.statusKey === 'pending_ctsv';
  const pendingChange = timeline.changeRequest?.statusKey === 'pending_admin';

  const runChangeAction = async (action) => {
    setSubmitting(true);
    try {
      if (action === 'approve') {
        const data = await adminApproveTimelineChangeRequest(id, note);
        if (data.deleted) {
          showToast?.('Admin đã duyệt — timeline đã xóa.', 'success');
          navigate('/ctsv/semester-timelines');
          return;
        }
        showToast?.('Admin đã duyệt yêu cầu!', 'success');
      } else {
        await rejectCtsvTimelineChangeRequest(id, rejectReason || note);
        showToast?.('Đã từ chối yêu cầu.', 'info');
      }
      await refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (action) => {
    setSubmitting(true);
    try {
      if (action === 'approve') {
        await approveCtsvSemesterTimeline(id, note);
        showToast?.('Đã phê duyệt timeline kỳ!', 'success');
      } else if (action === 'reject') {
        await rejectCtsvSemesterTimeline(id, rejectReason);
        showToast?.('Đã từ chối timeline.', 'info');
      } else {
        await revisionCtsvSemesterTimeline(id, note);
        showToast?.('Đã yêu cầu CLB chỉnh sửa.', 'info');
      }
      await refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ctsv-ed-page">
      <Link to="/ctsv/semester-timelines" className="ctsv-ed-back">← Danh sách timeline</Link>

      <header className="ctsv-ed-hero">
        <div>
          <span className="ctsv-ed-eyebrow">{timeline.clubName}</span>
          <h1>{timeline.semesterLabel}</h1>
          <p>{timeline.status}</p>
        </div>
      </header>

      {timeline.icpdpNote && (
        <section className="ctsv-ed-panel">
          <h2>Ghi chú IC-PDP</h2>
          <p>{timeline.icpdpNote}</p>
        </section>
      )}

      {timeline.summary && (
        <section className="ctsv-ed-panel">
          <h2>Tóm tắt kế hoạch</h2>
          <p>{timeline.summary}</p>
        </section>
      )}

      {timeline.objectives && (
        <section className="ctsv-ed-panel">
          <h2>Mục tiêu kỳ</h2>
          <p>{timeline.objectives}</p>
        </section>
      )}

      <section className="ctsv-ed-panel">
        <h2>Hoạt động dự kiến ({timeline.items?.length || 0})</h2>
        <div className="ctsv-events-table-wrap">
          <table className="ctsv-events-table">
            <thead>
              <tr>
                <th>Hoạt động</th>
                <th>Ngày</th>
                <th>Thể loại</th>
                <th>Địa điểm</th>
                <th>Dự kiến SV</th>
              </tr>
            </thead>
            <tbody>
              {(timeline.items || []).map((item, i) => (
                <tr key={i}>
                  <td>
                    <strong>{item.title}</strong>
                    {item.description && <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{item.description}</div>}
                  </td>
                  <td>{formatDate(item.plannedDate)}</td>
                  <td>{item.category}</td>
                  <td>{item.location || '—'}</td>
                  <td>{item.expectedAttendees || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {pendingChange && (
        <section className="ctsv-ed-panel">
          <h2>Yêu cầu thay đổi — chờ Admin duyệt</h2>
          <p><strong>{timeline.changeRequest.typeLabel}</strong></p>
          <p>Lý do CLB: {timeline.changeRequest.reason}</p>
          {timeline.changeRequest.icpdpNote && <p>Ghi chú IC-PDP: {timeline.changeRequest.icpdpNote}</p>}
          <label>
            Ghi chú Admin / CTSV
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label style={{ marginTop: 12 }}>
            Lý do từ chối yêu cầu
            <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <button type="button" className="ctsv-primary-btn" disabled={submitting} onClick={() => runChangeAction('approve')}>
              Admin duyệt & thực hiện
            </button>
            <button type="button" className="ctsv-danger-btn" disabled={submitting} onClick={() => runChangeAction('reject')}>
              Từ chối yêu cầu
            </button>
          </div>
        </section>
      )}

      {canApprove && (
        <section className="ctsv-ed-panel">
          <h2>Quyết định CTSV</h2>
          <label>
            Ghi chú phê duyệt
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label style={{ marginTop: 12 }}>
            Lý do từ chối
            <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <button type="button" className="ctsv-primary-btn" disabled={submitting} onClick={() => runAction('approve')}>
              Phê duyệt timeline
            </button>
            <button type="button" className="ctsv-secondary-btn" disabled={submitting} onClick={() => runAction('revision')}>
              Yêu cầu chỉnh sửa
            </button>
            <button type="button" className="ctsv-danger-btn" disabled={submitting} onClick={() => runAction('reject')}>
              Từ chối
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default CtsvSemesterTimelineDetail;
