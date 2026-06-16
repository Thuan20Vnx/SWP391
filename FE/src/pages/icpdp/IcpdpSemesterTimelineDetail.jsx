import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  fetchIcpdpSemesterTimeline,
  icpdpApproveSemesterTimeline,
  icpdpApproveTimelineChangeRequest,
  rejectIcpdpSemesterTimeline,
  rejectTimelineChangeRequest,
  revisionIcpdpSemesterTimeline,
} from '../../services/icpdpApi';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

const IcpdpSemesterTimelineDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [timeline, setTimeline] = useState(null);
  const [note, setNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = () =>
    fetchIcpdpSemesterTimeline(id).then((d) => setTimeline(d.timeline));

  useEffect(() => {
    refresh().catch(() => {
      showToast?.('Không tải được timeline.', 'error');
      navigate('/icpdp/semester-timelines');
    });
  }, [id, navigate, showToast]);

  if (!timeline) {
    return <div className="ctsv-ed-page"><p>Đang tải...</p></div>;
  }

  const canApprove = timeline.statusKey === 'pending_icpdp';
  const pendingChange = timeline.changeRequest?.statusKey === 'pending_icpdp';

  const runChangeAction = async (action) => {
    setSubmitting(true);
    try {
      if (action === 'approve') {
        await icpdpApproveTimelineChangeRequest(id, note);
        showToast?.('Đã chuyển yêu cầu lên Admin duyệt!', 'success');
      } else {
        await rejectTimelineChangeRequest(id, rejectReason || note, 'icpdp');
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
        await icpdpApproveSemesterTimeline(id, note);
        showToast?.('Đã duyệt — chuyển sang CTSV!', 'success');
      } else if (action === 'reject') {
        await rejectIcpdpSemesterTimeline(id, rejectReason);
        showToast?.('Đã từ chối timeline.', 'info');
      } else {
        await revisionIcpdpSemesterTimeline(id, note);
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
      <Link to="/icpdp/semester-timelines" className="ctsv-ed-back">← Danh sách timeline</Link>

      <header className="ctsv-ed-hero">
        <div>
          <span className="ctsv-ed-eyebrow">{timeline.clubName}</span>
          <h1>{timeline.semesterLabel}</h1>
          <p>{timeline.status}</p>
        </div>
      </header>

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
          <h2>Yêu cầu thay đổi từ CLB</h2>
          <p><strong>{timeline.changeRequest.typeLabel}</strong></p>
          <p>Lý do CLB: {timeline.changeRequest.reason}</p>
          <label>
            Ghi chú IC-PDP
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label style={{ marginTop: 12 }}>
            Lý do từ chối yêu cầu
            <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <button type="button" className="ctsv-primary-btn" disabled={submitting} onClick={() => runChangeAction('approve')}>
              Duyệt & chuyển Admin
            </button>
            <button type="button" className="ctsv-danger-btn" disabled={submitting} onClick={() => runChangeAction('reject')}>
              Từ chối yêu cầu
            </button>
          </div>
        </section>
      )}

      {canApprove && (
        <section className="ctsv-ed-panel">
          <h2>Quyết định IC-PDP</h2>
          <label>
            Ghi chú
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú duyệt hoặc yêu cầu chỉnh sửa..." />
          </label>
          <label style={{ marginTop: 12 }}>
            Lý do từ chối (nếu từ chối)
            <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <button type="button" className="ctsv-primary-btn" disabled={submitting} onClick={() => runAction('approve')}>
              Duyệt & chuyển CTSV
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

      {(timeline.icpdpNote || timeline.rejectionReason) && (
        <section className="ctsv-ed-panel">
          <h2>Ghi chú xét duyệt</h2>
          {timeline.icpdpNote && <p><strong>IC-PDP:</strong> {timeline.icpdpNote}</p>}
          {timeline.rejectionReason && <p><strong>Từ chối:</strong> {timeline.rejectionReason}</p>}
        </section>
      )}
    </div>
  );
};

export default IcpdpSemesterTimelineDetail;
