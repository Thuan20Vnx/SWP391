import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  adminApproveSemesterTimeline,
  fetchIcpdpSemesterTimeline,
  icpdpApproveSemesterTimeline,
  icpdpApproveTimelineChangeRequest,
  rejectIcpdpSemesterTimeline,
  rejectTimelineChangeRequest,
  revisionIcpdpSemesterTimeline,
} from '../../services/icpdpApi';
import { getUserRole, isAdminRole } from '../../utils/auth';

const fmt = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

const fmtDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? '—'
    : `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

const STATUS_META = {
  pending_icpdp: { label: 'Chờ IC-PDP duyệt',   tone: 'amber'  },
  pending_admin: { label: 'Chờ Admin phê duyệt', tone: 'blue'   },
  approved:      { label: 'Đã phê duyệt',        tone: 'green'  },
  revision:      { label: 'Cần chỉnh sửa',       tone: 'orange' },
  rejected:      { label: 'Đã từ chối',          tone: 'red'    },
};

const PanelIcon = ({ children }) => (
  <span className="stl-panel-icon" aria-hidden>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  </span>
);

const IcpdpSemesterTimelineDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const isAdmin = isAdminRole(getUserRole());
  const backPath = isAdmin ? '/admin/semester-timelines' : '/icpdp/semester-timelines';

  const [timeline, setTimeline] = useState(null);
  const [note, setNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = () =>
    fetchIcpdpSemesterTimeline(id).then((d) => setTimeline(d.timeline));

  useEffect(() => {
    refresh().catch(() => {
      showToast?.('Không tải được timeline.', 'error');
      navigate(backPath);
    });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!timeline) {
    return (
      <div className="stl-detail-page">
        <div className="stl-detail-loading">
          <div className="stl-sk stl-sk--wide" style={{ height: 20, marginBottom: 12 }} />
          <div className="stl-sk" style={{ height: 14 }} />
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_META[timeline.statusKey] || { label: timeline.status || '—', tone: 'slate' };
  const canIcpdpForward = !isAdmin && ['pending_icpdp', 'pending_ctsv'].includes(timeline.statusKey);
  const canAdminApprove = isAdmin && timeline.statusKey === 'pending_admin';
  const pendingChange = timeline.changeRequest?.statusKey === 'pending_icpdp';
  const pendingAdminChange = isAdmin && timeline.changeRequest?.statusKey === 'pending_admin';
  const hasAction = canIcpdpForward || canAdminApprove || pendingChange;

  const runAction = async (action) => {
    setSubmitting(true);
    try {
      if (action === 'forward')       { await icpdpApproveSemesterTimeline(id, note); showToast?.('Đã chuyển Admin phê duyệt!', 'success'); }
      else if (action === 'admin-approve') { await adminApproveSemesterTimeline(id, note); showToast?.('Đã phê duyệt timeline!', 'success'); }
      else if (action === 'reject')   { await rejectIcpdpSemesterTimeline(id, rejectReason); showToast?.('Đã từ chối.', 'info'); }
      else if (action === 'revision') { await revisionIcpdpSemesterTimeline(id, note); showToast?.('Đã yêu cầu chỉnh sửa.', 'info'); }
      else if (action === 'change-approve') { await icpdpApproveTimelineChangeRequest(id, note); showToast?.('Đã chuyển lên Admin!', 'success'); }
      else if (action === 'change-reject')  { await rejectTimelineChangeRequest(id, rejectReason || note, 'icpdp'); showToast?.('Đã từ chối.', 'info'); }
      await refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stl-detail-page">
      {/* Back */}
      <Link to={backPath} className="ctsv-pd-back">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Danh sách timeline
      </Link>

      {/* Hero card */}
      <header className="stl-hero-card">
        <div className="stl-hero-left">
          <div className="stl-hero-avatar" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div className="stl-hero-info">
            <span className="stl-hero-eyebrow">{timeline.clubName || 'CLB'}</span>
            <h1 className="stl-hero-title">{timeline.semesterLabel || '—'}</h1>
            <div className="stl-hero-meta">
              <span className={`stl-badge stl-badge--${statusMeta.tone}`}>{statusMeta.label}</span>
              {timeline.submittedAt && (
                <span className="stl-hero-date">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                  Gửi {fmt(timeline.submittedAt)}
                </span>
              )}
              <span className="stl-hero-count">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                {timeline.items?.length || 0} hoạt động
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Info banner */}
      {canIcpdpForward && (
        <div className="stl-banner stl-banner--purple">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          IC-PDP rà soát timeline, sau đó <strong>chuyển Admin phê duyệt cuối</strong>.
        </div>
      )}
      {canAdminApprove && (
        <div className="stl-banner stl-banner--green">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Timeline đã qua IC-PDP. <strong>Admin phê duyệt cuối</strong> để CLB bắt đầu tạo đề xuất.
        </div>
      )}

      {/* Summary & Objectives */}
      {(timeline.summary || timeline.objectives) && (
        <div className="stl-info-grid">
          {timeline.summary && (
            <div className="stl-info-card">
              <h2 className="stl-info-card__title">
                <PanelIcon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></PanelIcon>
                Tóm tắt kế hoạch
              </h2>
              <p className="stl-info-card__body">{timeline.summary}</p>
            </div>
          )}
          {timeline.objectives && (
            <div className="stl-info-card">
              <h2 className="stl-info-card__title">
                <PanelIcon><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></PanelIcon>
                Mục tiêu kỳ học
              </h2>
              <p className="stl-info-card__body">{timeline.objectives}</p>
            </div>
          )}
        </div>
      )}

      {/* Activities table */}
      <section className="stl-card">
        <div className="stl-section-head">
          <h2 className="stl-section-title">
            <PanelIcon><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></PanelIcon>
            Hoạt động dự kiến
            <span className="stl-section-count">{timeline.items?.length || 0}</span>
          </h2>
        </div>
        <div className="stl-table-wrap">
          <table className="stl-table">
            <thead>
              <tr>
                <th>Tên hoạt động</th>
                <th className="col-center">Ngày &amp; giờ dự kiến</th>
                <th>Thể loại</th>
                <th>Địa điểm</th>
                <th className="col-center">Dự kiến SV</th>
              </tr>
            </thead>
            <tbody>
              {(timeline.items || []).length === 0 ? (
                <tr><td colSpan={5}><div className="stl-empty"><p>Chưa có hoạt động nào.</p></div></td></tr>
              ) : (
                (timeline.items || []).map((item, i) => (
                  <tr key={i} className="stl-row">
                    <td>
                      <strong className="stl-club-name">{item.title}</strong>
                      {item.description && <div className="stl-activity-desc">{item.description}</div>}
                    </td>
                    <td className="col-center stl-date">{fmtDateTime(item.plannedDate)}</td>
                    <td className="stl-semester">{item.category || '—'}</td>
                    <td className="stl-semester">{item.location || '—'}</td>
                    <td className="col-center stl-count">{item.expectedAttendees || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Change request (ICPDP) */}
      {pendingChange && (
        <section className="stl-action-card">
          <h2 className="stl-action-card__title">Yêu cầu thay đổi từ CLB</h2>
          <div className="stl-action-card__info">
            <span className="stl-badge stl-badge--amber">{timeline.changeRequest.typeLabel}</span>
            <p className="stl-action-card__reason">Lý do CLB: {timeline.changeRequest.reason}</p>
          </div>
          <div className="stl-textarea-group">
            <label className="stl-textarea-label">Ghi chú IC-PDP</label>
            <textarea className="stl-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nhập ghi chú..." />
          </div>
          <div className="stl-action-btns">
            <button type="button" className="ctsv-pd-btn ctsv-pd-btn--primary" disabled={submitting} onClick={() => runAction('change-approve')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><polyline points="20 6 9 17 4 12"/></svg>
              Duyệt &amp; chuyển Admin
            </button>
            <button type="button" className="ctsv-pd-btn ctsv-pd-btn--danger-outline" disabled={submitting} onClick={() => runAction('change-reject')}>
              Từ chối yêu cầu
            </button>
          </div>
        </section>
      )}

      {/* Change request info (Admin view) */}
      {pendingAdminChange && (
        <section className="stl-info-card stl-info-card--warn">
          <h2 className="stl-info-card__title">Yêu cầu thay đổi — chờ Admin</h2>
          <p><strong>{timeline.changeRequest.typeLabel}</strong></p>
          <p className="stl-action-card__reason">Lý do CLB: {timeline.changeRequest.reason}</p>
          <p className="stl-action-card__reason">Ghi chú IC-PDP: {timeline.changeRequest.icpdpNote || '—'}</p>
        </section>
      )}

      {/* Action section */}
      {hasAction && (
        <section className="stl-action-card">
          <h2 className="stl-action-card__title">
            {isAdmin ? 'Quyết định Admin' : 'Quyết định IC-PDP'}
          </h2>
          <div className="stl-textarea-group">
            <label className="stl-textarea-label">Ghi chú</label>
            <textarea
              className="stl-textarea"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú duyệt hoặc yêu cầu chỉnh sửa..."
            />
          </div>
          {(canIcpdpForward || canAdminApprove) && (
            <div className="stl-textarea-group" style={{ marginTop: 12 }}>
              <label className="stl-textarea-label">Lý do từ chối (nếu có)</label>
              <textarea
                className="stl-textarea"
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Điền lý do nếu từ chối..."
              />
            </div>
          )}
          <div className="stl-action-btns">
            {canIcpdpForward && (
              <>
                <button type="button" className="ctsv-pd-btn ctsv-pd-btn--primary" disabled={submitting} onClick={() => runAction('forward')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><polyline points="20 6 9 17 4 12"/></svg>
                  Chuyển Admin duyệt
                </button>
                <button type="button" className="ctsv-pd-btn ctsv-pd-btn--outline" disabled={submitting} onClick={() => runAction('revision')}>
                  Yêu cầu chỉnh sửa
                </button>
                <button type="button" className="ctsv-pd-btn ctsv-pd-btn--danger-outline" disabled={submitting} onClick={() => runAction('reject')}>
                  Từ chối
                </button>
              </>
            )}
            {canAdminApprove && (
              <>
                <button type="button" className="ctsv-pd-btn ctsv-pd-btn--primary" disabled={submitting} onClick={() => runAction('admin-approve')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><polyline points="20 6 9 17 4 12"/></svg>
                  Phê duyệt timeline
                </button>
                <button type="button" className="ctsv-pd-btn ctsv-pd-btn--danger-outline" disabled={submitting} onClick={() => runAction('reject')}>
                  Từ chối
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {/* Review notes */}
      {(timeline.icpdpNote || timeline.ctsvNote || timeline.rejectionReason) && (
        <section className="stl-notes-card">
          <h2 className="stl-section-title">
            <PanelIcon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></PanelIcon>
            Ghi chú xét duyệt
          </h2>
          {timeline.icpdpNote && (
            <div className="stl-note-row">
              <span className="stl-note-label">IC-PDP</span>
              <p className="stl-note-text">{timeline.icpdpNote}</p>
            </div>
          )}
          {timeline.ctsvNote && (
            <div className="stl-note-row">
              <span className="stl-note-label">Admin</span>
              <p className="stl-note-text">{timeline.ctsvNote}</p>
            </div>
          )}
          {timeline.rejectionReason && (
            <div className="stl-note-row stl-note-row--danger">
              <span className="stl-note-label">Từ chối</span>
              <p className="stl-note-text">{timeline.rejectionReason}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default IcpdpSemesterTimelineDetail;
