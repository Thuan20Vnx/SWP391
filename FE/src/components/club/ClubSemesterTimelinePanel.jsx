import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppSelect from '../ui/AppSelect';
import AutoGrowTextarea from '../ui/AutoGrowTextarea';
import ConfirmDialog from '../ui/ConfirmDialog';
import TimelineLiveBanner from '../timeline/TimelineLiveBanner';
import useTimelineLiveStream from '../../hooks/useTimelineLiveStream';
import {
  createClubSemesterTimeline,
  deleteClubSemesterTimeline,
  fetchClubSemesterTimelines,
  requestClubSemesterTimelineChange,
  submitClubSemesterTimeline,
  updateClubSemesterTimeline,
} from '../../services/clubTimelineApi';
import { TIMELINE_LIVE_EVENT } from '../../utils/timelineLiveEvents';

const TERM_OPTIONS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
];

const CATEGORY_OPTIONS = ['Công nghệ (IT)', 'Âm nhạc', 'Workshop', 'Kết nối', 'Thể thao', 'Cuộc thi', 'Tình nguyện', 'Seminar', 'Khác'];

const ClbTrashIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const ClbEyeIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path
      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="12"
      r="3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const STATUS_STEPS = [
  { key: 'draft', label: 'Tạo đơn', match: ['draft', 'revision'] },
  { key: 'pending_icpdp', label: 'IC-PDP', match: ['pending_icpdp', 'pending_ctsv'] },
  { key: 'approved', label: 'Hoàn tất', match: ['approved', 'rejected', 'cancelled'] },
];

const inferDefaultSemester = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 9) return { semesterTerm: 'fall', semesterYear: year };
  if (month >= 5) return { semesterTerm: 'summer', semesterYear: year };
  return { semesterTerm: 'spring', semesterYear: year };
};

const emptyItem = () => ({
  title: '',
  description: '',
  plannedDate: '',
  category: 'Workshop',
  location: '',
  expectedAttendees: '',
  notes: '',
});

const toDateTimeInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

const canEditTimeline = (timeline) =>
  timeline && ['draft', 'revision', 'rejected', 'pending_icpdp', 'approved'].includes(timeline.statusKey);

const canDirectDeleteTimeline = (timeline) =>
  timeline && ['draft', 'revision', 'rejected', 'pending_icpdp'].includes(timeline.statusKey);

const validateTimelineItems = (items) => {
  const titledItems = items
    .map((item, index) => ({ ...item, index }))
    .filter((item) => item.title.trim());
  if (!titledItems.length) {
    return 'Thêm ít nhất một hoạt động/sự kiện dự kiến.';
  }
  for (const item of titledItems) {
    const label = `Mốc #${item.index + 1}`;
    if (!item.plannedDate) {
      return `${label}: Vui lòng chọn ngày & giờ dự kiến.`;
    }
    if (!String(item.category || '').trim()) {
      return `${label}: Vui lòng chọn thể loại.`;
    }
    if (!String(item.location || '').trim()) {
      return `${label}: Vui lòng nhập địa điểm.`;
    }
    const attendees = Number(item.expectedAttendees);
    if (!attendees || attendees <= 0) {
      return `${label}: Vui lòng nhập số người dự kiến (lớn hơn 0).`;
    }
  }
  return null;
};

const hasPendingChange = (timeline) =>
  timeline?.changeRequest &&
  ['pending_icpdp', 'pending_admin'].includes(timeline.changeRequest.statusKey);

const REASON_MODAL_COPY = {
  cancel: {
    title: 'Hủy đơn timeline',
    subtitle: 'Timeline đã được duyệt. Nhập lý do hủy — yêu cầu sẽ được gửi IC-PDP → Admin phê duyệt.',
    placeholder: 'VD: CLB thay đổi kế hoạch kỳ, cần hủy timeline hiện tại...',
    confirmLabel: 'Gửi yêu cầu hủy',
  },
  delete: {
    title: 'Yêu cầu xóa timeline',
    subtitle: 'Nhập lý do xóa timeline. Yêu cầu sẽ được gửi IC-PDP → Admin phê duyệt.',
    placeholder: 'VD: Timeline không còn phù hợp với định hướng CLB...',
    confirmLabel: 'Gửi yêu cầu xóa',
  },
};

const getStepState = (timeline, step) => {
  const status = timeline?.statusKey || 'draft';
  const order = ['draft', 'revision', 'pending_icpdp', 'pending_ctsv', 'approved', 'rejected', 'cancelled'];
  const currentIdx = Math.max(
    order.indexOf(status),
    status === 'revision' ? 0 : -1
  );
  const stepIdx = Math.min(...step.match.map((k) => order.indexOf(k)).filter((i) => i >= 0));
  const lastMatchIdx = Math.max(...step.match.map((k) => order.indexOf(k)).filter((i) => i >= 0));

  if (step.match.includes(status)) return 'current';
  if (currentIdx > lastMatchIdx) return 'done';
  if (status === 'rejected' && step.key === 'approved') return 'current';
  if (status === 'cancelled' && step.key === 'approved') return 'current';
  return '';
};

const getStepStatusText = (timeline, step, state) => {
  if (state === 'done') return 'Đã qua';
  if (state !== 'current') return 'Chờ';
  if (step.key === 'pending_icpdp') return 'Chờ duyệt';
  if (step.key === 'approved') {
    if (hasPendingChange(timeline)) {
      if (timeline.changeRequest?.type === 'cancel') return 'Chờ duyệt hủy';
      if (timeline.changeRequest?.type === 'delete') return 'Chờ duyệt xóa';
      return 'Chờ duyệt';
    }
    if (timeline.changeRequest?.statusKey === 'rejected') {
      if (timeline.changeRequest?.type === 'cancel') return 'Từ chối hủy';
      if (timeline.changeRequest?.type === 'delete') return 'Từ chối xóa';
      return 'Từ chối yêu cầu';
    }
    if (timeline.statusKey === 'approved') return 'Đã duyệt';
    if (timeline.statusKey === 'rejected') return 'Từ chối';
    if (timeline.statusKey === 'cancelled') return 'Đã hủy';
    return '—';
  }
  if (step.key === 'draft') {
    return timeline.statusKey === 'revision' ? 'Chỉnh sửa' : 'Bản nháp';
  }
  return 'Đang xử lý';
};

const timelineStatusBadgeClass = (statusKey) => {
  const key = statusKey || 'draft';
  if (key === 'approved') return 'approved';
  if (key === 'rejected') return 'rejected';
  if (key === 'cancelled') return 'cancelled';
  if (['pending_icpdp', 'pending_ctsv', 'pending_admin'].includes(key)) return 'pending';
  if (key === 'revision') return 'pending';
  return 'registered';
};

const ClubSemesterTimelinePanel = ({ showToast }) => {
  useTimelineLiveStream(true);
  const defaults = useMemo(() => inferDefaultSemester(), []);
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [detailTimeline, setDetailTimeline] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingStatusKey, setEditingStatusKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reasonModal, setReasonModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    semesterTerm: defaults.semesterTerm,
    semesterYear: defaults.semesterYear,
    summary: '',
    objectives: '',
    items: [emptyItem()],
  });

  const load = useCallback(() => {
    setLoading(true);
    fetchClubSemesterTimelines()
      .then((d) => setTimelines(d.timelines || []))
      .catch(() => showToast?.('Không tải được timeline kỳ học.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onLive = () => {
      load();
      if (detailTimeline?.id) {
        fetchClubSemesterTimeline(detailTimeline.id)
          .then((d) => setDetailTimeline(d.timeline))
          .catch(() => {});
      }
    };
    window.addEventListener(TIMELINE_LIVE_EVENT, onLive);
    return () => window.removeEventListener(TIMELINE_LIVE_EVENT, onLive);
  }, [load, detailTimeline?.id]);

  useEffect(() => {
    if (!reasonModal) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) setReasonModal(null);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [reasonModal, submitting]);

  const resetForm = () => {
    setForm({
      semesterTerm: defaults.semesterTerm,
      semesterYear: defaults.semesterYear,
      summary: '',
      objectives: '',
      items: [emptyItem()],
    });
    setEditingId(null);
    setEditingStatusKey(null);
  };

  const openCreate = () => {
    resetForm();
    setView('form');
  };

  const openDetail = (timeline) => {
    setDetailTimeline(timeline);
    setView('detail');
  };

  const openEdit = (timeline) => {
    if (!canEditTimeline(timeline)) {
      showToast?.('Timeline này không thể chỉnh sửa trực tiếp.', 'warning');
      return;
    }
    setEditingId(timeline.id);
    setEditingStatusKey(timeline.statusKey);
    setForm({
      semesterTerm: timeline.semesterTerm,
      semesterYear: timeline.semesterYear,
      summary: timeline.summary || '',
      objectives: timeline.objectives || '',
      items: timeline.items?.length
        ? timeline.items.map((item) => ({
            title: item.title || '',
            description: item.description || '',
            plannedDate: toDateTimeInput(item.plannedDate),
            category: item.category || 'Workshop',
            location: item.location || '',
            expectedAttendees: item.expectedAttendees || '',
            notes: item.notes || '',
          }))
        : [emptyItem()],
    });
    setView('form');
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length <= 1 ? prev.items : prev.items.filter((_, i) => i !== index),
    }));
  };

  const buildPayload = () => ({
    semesterTerm: form.semesterTerm,
    semesterYear: Number(form.semesterYear),
    summary: form.summary,
    objectives: form.objectives,
    items: form.items.map((item) => ({
      title: item.title,
      description: item.description,
      plannedDate: item.plannedDate || null,
      category: item.category,
      location: item.location,
      expectedAttendees: Number(item.expectedAttendees) || 0,
      notes: item.notes,
    })),
  });

  const handleSave = async (andSubmit = false) => {
    const validationError = validateTimelineItems(form.items);
    if (validationError) {
      showToast?.(validationError, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const wasApproved = editingStatusKey === 'approved';

      let timelineId = editingId;
      if (editingId) {
        await updateClubSemesterTimeline(editingId, payload);
      } else {
        const created = await createClubSemesterTimeline(payload);
        timelineId = created.timeline?.id;
      }
      if (andSubmit && timelineId) {
        await submitClubSemesterTimeline(timelineId);
        showToast?.('Đã gửi timeline kỳ học — chờ IC-PDP xét duyệt!', 'success');
      } else if (wasApproved) {
        showToast?.('Đã lưu thay đổi — timeline chuyển về chờ IC-PDP duyệt lại!', 'success');
      } else {
        showToast?.(editingId ? 'Đã lưu timeline.' : 'Đã tạo timeline kỳ học.', 'success');
      }
      resetForm();
      setView('list');
      load();
    } catch (e) {
      showToast?.(e.message || 'Lưu timeline thất bại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitExisting = async (id) => {
    if (!window.confirm('Gửi timeline này cho IC-PDP duyệt?')) return;
    setSubmitting(true);
    try {
      await submitClubSemesterTimeline(id);
      showToast?.('Đã gửi timeline — chờ IC-PDP xét duyệt!', 'success');
      load();
    } catch (e) {
      showToast?.(e.message || 'Gửi timeline thất bại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTimeline = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteClubSemesterTimeline(deleteTarget.id);
      showToast?.(
        ['pending_icpdp', 'revision'].includes(deleteTarget.statusKey)
          ? 'Đã hủy đơn timeline — IC-PDP sẽ thấy trạng thái «Đã hủy» trong mục Tất cả.'
          : 'Đã xóa timeline.',
        'success'
      );
      setDeleteTarget(null);
      if (detailTimeline?.id === deleteTarget.id) {
        setDetailTimeline(null);
        setView('list');
      }
      load();
    } catch (e) {
      showToast?.(e.message || 'Xóa thất bại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openReasonModal = (timeline, type) => {
    setReasonModal({
      mode: 'change',
      timeline,
      type,
      reason: '',
    });
  };

  const submitReasonModal = async () => {
    if (!reasonModal) return;
    const reason = reasonModal.reason?.trim();
    if (!reason) {
      setReasonModal((prev) => prev ? { ...prev, error: 'Vui lòng nhập lý do trước khi gửi.' } : prev);
      return;
    }

    setSubmitting(true);
    try {
      const { timeline, type } = reasonModal;
      await requestClubSemesterTimelineChange(timeline.id, { type, reason });
      showToast?.('Đã gửi yêu cầu — chờ IC-PDP và Admin duyệt!', 'success');
      setReasonModal(null);
      load();
      setDetailTimeline((prev) =>
        prev?.id === timeline.id
          ? {
              ...prev,
              status: type === 'cancel' ? 'Chờ IC-PDP duyệt hủy' : 'Chờ IC-PDP duyệt xóa',
              statusBadgeKey: 'pending_icpdp',
              changeRequest: {
                type,
                typeLabel: type === 'cancel' ? 'Hủy đơn timeline' : 'Xóa timeline',
                statusKey: 'pending_icpdp',
                status: 'Chờ IC-PDP duyệt yêu cầu',
                reason,
              },
            }
          : prev
      );
    } catch (e) {
      showToast?.(e.message || 'Gửi yêu cầu thất bại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderReasonModal = () => {
    if (!reasonModal) return null;
    const copy = REASON_MODAL_COPY[reasonModal.type];
    if (!copy) return null;

    return (
      <div
        className="clb-modal-overlay"
        role="presentation"
        onClick={() => {
          if (!submitting) setReasonModal(null);
        }}
      >
        <div
          className="clb-modal clb-reason-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clb-reason-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="clb-modal-close"
            aria-label="Đóng"
            disabled={submitting}
            onClick={() => setReasonModal(null)}
          >
            ×
          </button>
          <h2 id="clb-reason-modal-title" className="clb-modal-title">
            {copy.title}
          </h2>
          <p className="clb-modal-subtitle">{copy.subtitle}</p>
          {reasonModal.error && (
            <p className="clb-reason-modal-error">{reasonModal.error}</p>
          )}
          <label className="clb-reason-modal-field">
            Lý do <span className="clb-reason-modal-required">*</span>
            <AutoGrowTextarea
              minRows={4}
              spellCheck={false}
              value={reasonModal.reason}
              onChange={(e) => setReasonModal((prev) => (prev ? { ...prev, reason: e.target.value, error: undefined } : prev))}
              placeholder={copy.placeholder}
            />
          </label>
          <div className="clb-modal-actions">
            <button
              type="button"
              className="clb-btn-secondary"
              disabled={submitting}
              onClick={() => setReasonModal(null)}
            >
              Không, giữ lại
            </button>
            <button
              type="button"
              className="clb-btn-primary"
              disabled={submitting}
              onClick={submitReasonModal}
            >
              {submitting ? 'Đang gửi...' : copy.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderForm = () => (
    <div className="clb-timeline-page">
      <TimelineLiveBanner active />
      <div className="clb-page-header">
        <div>
          <h1 className="clb-page-title">TIMELINE KỲ HỌC</h1>
          <p className="clb-page-subtitle">
            {editingStatusKey === 'approved'
              ? 'Chỉnh sửa timeline đã duyệt — sau khi lưu, timeline sẽ chuyển về trạng thái chờ IC-PDP duyệt lại.'
              : editingStatusKey === 'pending_icpdp'
                ? 'Chỉnh sửa trực tiếp — đơn đang chờ duyệt, thay đổi được lưu ngay không cần phê duyệt lại.'
                : editingStatusKey === 'rejected' || editingStatusKey === 'revision'
                  ? 'Chỉnh sửa theo góp ý người duyệt, sau đó gửi lại IC-PDP.'
                  : 'Lập kế hoạch hoạt động theo kỳ Spring / Summer / Fall và gửi IC-PDP phê duyệt.'}
          </p>
        </div>
        <button
          type="button"
          className="clb-create-btn"
          onClick={() => {
            resetForm();
            setView(editingId ? 'detail' : 'list');
            if (editingId && detailTimeline) setDetailTimeline(timelines.find((t) => t.id === editingId) || detailTimeline);
          }}
        >
          Quay lại
        </button>
      </div>

      <div className="clb-timeline-form">
        <div className="clb-timeline-form-row">
            <label>
              Kỳ học (FPT)
              <AppSelect
                value={form.semesterTerm}
                onChange={(e) => setForm((p) => ({ ...p, semesterTerm: e.target.value }))}
                options={TERM_OPTIONS}
              />
            </label>
            <label>
              Năm
              <input
                type="number"
                min={2020}
                max={2100}
                value={form.semesterYear}
                onChange={(e) => setForm((p) => ({ ...p, semesterYear: e.target.value }))}
              />
            </label>
        </div>

        <label>
          Tóm tắt kế hoạch kỳ
          <AutoGrowTextarea
            minRows={3}
            spellCheck={false}
            value={form.summary}
            onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
            placeholder="Mô tả tổng quan định hướng hoạt động của CLB trong kỳ..."
          />
        </label>

        <label>
          Mục tiêu kỳ học
          <AutoGrowTextarea
            minRows={3}
            spellCheck={false}
            value={form.objectives}
            onChange={(e) => setForm((p) => ({ ...p, objectives: e.target.value }))}
            placeholder="VD: Tăng 20% thành viên tích cực, tổ chức 3 workshop..."
          />
        </label>

        <div className="clb-timeline-items-head">
          <h2>Hoạt động / sự kiện dự kiến</h2>
          <button type="button" className="clb-create-btn clb-create-btn--sm" onClick={addItem}>
            + Thêm mốc
          </button>
        </div>

        {form.items.map((item, index) => (
          <div key={index} className="clb-timeline-item-card">
            <div className="clb-timeline-item-card-head">
              <strong>Mốc #{index + 1}</strong>
              {form.items.length > 1 && (
                <button
                  type="button"
                  className="clb-action-btn clb-action-btn--danger"
                  title="Xóa mốc"
                  aria-label={`Xóa mốc ${index + 1}`}
                  onClick={() => removeItem(index)}
                >
                  <ClbTrashIcon />
                </button>
              )}
            </div>
            <div className="clb-timeline-form-row">
              <label>
                Tên hoạt động *
                <input
                  spellCheck={false}
                  value={item.title}
                  onChange={(e) => updateItem(index, 'title', e.target.value)}
                  placeholder="VD: Workshop React cơ bản"
                />
              </label>
              <label>
                Ngày &amp; giờ dự kiến *
                <input
                  type="datetime-local"
                  value={item.plannedDate}
                  onChange={(e) => updateItem(index, 'plannedDate', e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="clb-timeline-form-row">
                <label>
                  Thể loại *
                  <AppSelect
                    value={item.category}
                    onChange={(e) => updateItem(index, 'category', e.target.value)}
                    options={CATEGORY_OPTIONS}
                  />
                </label>
              <label>
                Địa điểm *
                <input
                  spellCheck={false}
                  value={item.location}
                  onChange={(e) => updateItem(index, 'location', e.target.value)}
                  placeholder="Hall A / Online..."
                  required
                />
              </label>
              <label>
                Số người dự kiến *
                <input
                  type="number"
                  min={1}
                  value={item.expectedAttendees}
                  onChange={(e) => updateItem(index, 'expectedAttendees', e.target.value)}
                  required
                />
              </label>
            </div>
            <label>
              Mô tả ngắn
              <AutoGrowTextarea
                minRows={2}
                spellCheck={false}
                value={item.description}
                onChange={(e) => updateItem(index, 'description', e.target.value)}
              />
            </label>
          </div>
        ))}

        <div className="clb-timeline-form-actions">
          {['pending_icpdp', 'approved'].includes(editingStatusKey) ? (
            <button type="button" className="clb-create-btn" disabled={submitting} onClick={() => handleSave(false)}>
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          ) : (
            <>
              <button type="button" className="clb-create-btn clb-create-btn--ghost" disabled={submitting} onClick={() => handleSave(false)}>
                Lưu nháp
              </button>
              <button type="button" className="clb-create-btn" disabled={submitting} onClick={() => handleSave(true)}>
                {submitting ? 'Đang gửi...' : 'Gửi duyệt'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderDetail = () => {
    const tl = timelines.find((t) => t.id === detailTimeline?.id) || detailTimeline;
    if (!tl) {
      return (
        <div className="clb-timeline-page">
          <p className="clb-panel-empty">Không tìm thấy timeline.</p>
          <button type="button" className="clb-create-btn" onClick={() => setView('list')}>
            Quay lại danh sách
          </button>
        </div>
      );
    }

    const pendingChange = hasPendingChange(tl);
    const canRequestCancel = tl.statusKey === 'approved' && !pendingChange;
    const canDirectEdit = canEditTimeline(tl) && !pendingChange;
    const canDirectDelete = canDirectDeleteTimeline(tl) && !pendingChange;
    const canRequestDelete = tl.statusKey === 'approved' && !pendingChange;

    return (
      <div className="clb-timeline-page">
        <TimelineLiveBanner active />
        <div className="clb-page-header">
          <div>
            <h1 className="clb-page-title">{tl.semesterLabel}</h1>
            <p className="clb-page-subtitle">Tình trạng đơn timeline kỳ học</p>
          </div>
          <button type="button" className="clb-create-btn" onClick={() => setView('list')}>
            Quay lại danh sách
          </button>
        </div>

        <div className="clb-timeline-detail">
          <div className="clb-timeline-status-block">
            <div className="clb-timeline-status-track">
              {STATUS_STEPS.map((step) => {
                const state = getStepState(tl, step);
                return (
                  <div
                    key={step.key}
                    className={`clb-timeline-status-step${state === 'done' ? ' is-done' : ''}${state === 'current' ? ' is-current' : ''}`}
                  >
                    <span className="clb-timeline-status-step__label">{step.label}</span>
                    <span className="clb-timeline-status-step__text">
                      {getStepStatusText(tl, step, state)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="clb-timeline-status-badge">
              <span className={`clb-table-status clb-table-status--${timelineStatusBadgeClass(tl.statusBadgeKey || tl.statusKey)}`}>
                {tl.status}
              </span>
            </p>
          </div>

          {tl.changeRequest && tl.changeRequest.statusKey !== 'none' && (
            <div className={`clb-timeline-change-banner${tl.changeRequest.statusKey === 'rejected' ? ' clb-timeline-change-banner--rejected' : ''}`}>
              <strong>{tl.changeRequest.typeLabel}</strong>
              <span>{tl.changeRequest.status}</span>
              {tl.changeRequest.reason && <p style={{ marginTop: 8 }}>Lý do CLB: {tl.changeRequest.reason}</p>}
              {(tl.changeRequest.adminNote || tl.changeRequest.icpdpNote) && (
                <p style={{ marginTop: 8 }}>
                  Lý do từ chối: {tl.changeRequest.adminNote || tl.changeRequest.icpdpNote}
                </p>
              )}
            </div>
          )}

          {(tl.rejectionReason || tl.icpdpNote || tl.ctsvNote) && (
            <div className="clb-timeline-detail-panel">
              <h2>Ghi chú từ người duyệt</h2>
              {tl.rejectionReason && <p><strong>Từ chối:</strong> {tl.rejectionReason}</p>}
              {tl.icpdpNote && <p><strong>IC-PDP:</strong> {tl.icpdpNote}</p>}
              {tl.ctsvNote && <p><strong>Admin / CTSV:</strong> {tl.ctsvNote}</p>}
            </div>
          )}

          {tl.summary && (
            <div className="clb-timeline-detail-panel">
              <h2>Tóm tắt kế hoạch</h2>
              <p>{tl.summary}</p>
            </div>
          )}

          {tl.objectives && (
            <div className="clb-timeline-detail-panel">
              <h2>Mục tiêu kỳ học</h2>
              <p>{tl.objectives}</p>
            </div>
          )}

          <div className="clb-timeline-detail-panel">
            <h2>Hoạt động dự kiến ({tl.items?.length || 0})</h2>
            <ul className="clb-timeline-milestone-list">
              {(tl.items || []).map((item, i) => (
                <li key={`${item.title}-${i}`}>
                  <strong>{item.title}</strong>
                  {item.plannedDate && <span>{formatDateTime(item.plannedDate)} · </span>}
                  {item.category}
                  {item.location && <> · {item.location}</>}
                  {item.description && <p style={{ marginTop: 6, color: '#64748b' }}>{item.description}</p>}
                </li>
              ))}
            </ul>
          </div>

          <div className="clb-timeline-detail-panel">
            <h2>Thông tin gửi</h2>
            <p>Gửi lúc: {formatDate(tl.submittedAt || tl.createdAt)}</p>
            {tl.reviewedAt && <p>Duyệt lần cuối: {formatDate(tl.reviewedAt)}</p>}
          </div>

          <div className="clb-timeline-detail-actions">
            {canRequestCancel && (
              <button
                type="button"
                className="clb-view-detail-btn clb-view-detail-btn--muted"
                disabled={submitting}
                onClick={() => openReasonModal(tl, 'cancel')}
              >
                Hủy đơn
              </button>
            )}
            {canDirectEdit && (
              <button type="button" className="clb-view-detail-btn clb-view-detail-btn--edit" onClick={() => openEdit(tl)}>
                Sửa
              </button>
            )}
            {canDirectDelete && (
              <button
                type="button"
                className="clb-view-detail-btn clb-view-detail-btn--danger"
                disabled={submitting}
                onClick={() => setDeleteTarget(tl)}
              >
                Xóa
              </button>
            )}
            {canRequestDelete && (
              <button
                type="button"
                className="clb-view-detail-btn clb-view-detail-btn--danger"
                disabled={submitting}
                onClick={() => openReasonModal(tl, 'delete')}
              >
                Yêu cầu xóa
              </button>
            )}
            {tl.statusKey === 'draft' && (
              <button type="button" className="clb-create-btn" disabled={submitting} onClick={() => handleSubmitExisting(tl.id)}>
                Gửi duyệt
              </button>
            )}
            {tl.statusKey === 'revision' && (
              <button type="button" className="clb-create-btn" onClick={() => openEdit(tl)}>
                Chỉnh sửa & gửi lại
              </button>
            )}
            {tl.statusKey === 'rejected' && (
              <button type="button" className="clb-create-btn" onClick={() => openEdit(tl)}>
                Chỉnh sửa & gửi lại
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDialogs = () => (
    <>
      {renderReasonModal()}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa timeline"
        message={
          ['pending_icpdp', 'revision'].includes(deleteTarget?.statusKey)
            ? 'Đơn timeline sẽ chuyển sang trạng thái «Đã hủy» và biến mất khỏi hàng chờ IC-PDP. Bạn có chắc không?'
            : ['draft', 'rejected'].includes(deleteTarget?.statusKey)
              ? 'Timeline sẽ bị xóa vĩnh viễn và không thể khôi phục. Bạn có chắc không?'
              : 'Timeline sẽ bị xóa. Bạn có chắc không?'
        }
        confirmLabel="Xóa"
        onConfirm={handleDeleteTimeline}
        onCancel={() => {
          if (!submitting) setDeleteTarget(null);
        }}
        loading={submitting}
      />
    </>
  );

  if (view === 'form') {
    return (
      <>
        {renderDialogs()}
        {renderForm()}
      </>
    );
  }
  if (view === 'detail') {
    return (
      <>
        {renderDialogs()}
        {renderDetail()}
      </>
    );
  }

  return (
    <>
      {renderDialogs()}
      <div className="clb-timeline-page">
      <TimelineLiveBanner active />
      <div className="clb-page-header">
        <div>
          <h1 className="clb-page-title">TIMELINE KỲ HỌC</h1>
          <p className="clb-page-subtitle">
            Trước mỗi kỳ Spring / Summer / Fall, CLB lập timeline hoạt động và gửi IC-PDP phê duyệt.
          </p>
        </div>
        <button type="button" className="clb-create-btn" onClick={openCreate}>
          + Lập timeline kỳ mới
        </button>
      </div>

      <div className="clb-table-wrapper club-m-hide-mobile">
        <div className="clb-table-scroll">
          <table className="clb-table clb-table--timeline">
            <thead>
              <tr>
                <th>KỲ (SPRING/SUMMER/FALL)</th>
                <th>SỐ HOẠT ĐỘNG</th>
                <th>GỬI LÚC</th>
                <th className="clb-table-col-status">TRẠNG THÁI</th>
                <th className="clb-table-col-action">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="clb-panel-empty-cell">Đang tải...</td></tr>
              ) : timelines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="clb-panel-empty-cell">
                    Chưa có timeline kỳ học. Bấm &quot;Lập timeline kỳ mới&quot; để bắt đầu.
                  </td>
                </tr>
              ) : (
                timelines.map((tl) => (
                  <tr key={tl.id}>
                    <td>
                      <button type="button" className="clb-event-name clb-link-btn" onClick={() => openDetail(tl)}>
                        {tl.semesterLabel}
                      </button>
                      {tl.summary && <span className="clb-table-sub">{tl.summary.slice(0, 60)}{tl.summary.length > 60 ? '…' : ''}</span>}
                      {tl.changeRequest?.statusKey === 'pending_icpdp' && (
                        <span className="clb-table-sub">Yêu cầu: {tl.changeRequest.typeLabel}</span>
                      )}
                      {tl.changeRequest?.statusKey === 'pending_admin' && (
                        <span className="clb-table-sub">Đã chuyển Admin: {tl.changeRequest.typeLabel}</span>
                      )}
                      {tl.changeRequest?.statusKey === 'rejected' && (
                        <span className="clb-table-sub clb-table-sub--danger">{tl.status}</span>
                      )}
                    </td>
                    <td className="clb-table-col-compact">{tl.items?.length || 0}</td>
                    <td className="clb-table-col-compact">{formatDate(tl.submittedAt || tl.createdAt)}</td>
                    <td className="clb-table-col-status">
                      <span className={`clb-table-status clb-table-status--${timelineStatusBadgeClass(tl.statusBadgeKey || tl.statusKey)}`}>
                        {tl.status}
                      </span>
                    </td>
                    <td className="clb-table-col-action">
                      <div className="clb-timeline-table-actions">
                        <button
                          type="button"
                          className="clb-view-detail-btn"
                          title="Xem chi tiết"
                          aria-label={`Xem chi tiết ${tl.semesterLabel}`}
                          onClick={() => openDetail(tl)}
                        >
                          <ClbEyeIcon />
                          Xem chi tiết
                        </button>
                        {tl.statusKey === 'draft' && (
                          <button
                            type="button"
                            className="clb-action-btn clb-action-btn--success"
                            disabled={submitting}
                            onClick={() => handleSubmitExisting(tl.id)}
                          >
                            Gửi duyệt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="club-m-timeline-list club-m-show-mobile">
        {loading ? (
          <p className="clb-panel-empty">Đang tải...</p>
        ) : timelines.length === 0 ? (
          <p className="clb-panel-empty">Chưa có timeline. Bấm &quot;Lập timeline kỳ mới&quot; để bắt đầu.</p>
        ) : (
          timelines.map((tl) => (
            <article key={tl.id} className="club-m-timeline-card">
              <span className="club-m-timeline-card__label">{tl.semesterLabel}</span>
              {tl.summary && (
                <span className="club-m-timeline-card__summary">
                  {tl.summary.slice(0, 80)}{tl.summary.length > 80 ? '…' : ''}
                </span>
              )}
              <div className="club-m-timeline-card__row">
                <span>{tl.items?.length || 0} hoạt động</span>
                <span>{formatDate(tl.submittedAt || tl.createdAt)}</span>
              </div>
              <span className={`clb-table-status clb-table-status--${timelineStatusBadgeClass(tl.statusKey)}`}>
                {tl.status}
              </span>
              <div className="club-m-timeline-card__actions">
                <button type="button" className="clb-view-detail-btn" onClick={() => openDetail(tl)}>
                  <ClbEyeIcon />
                  Xem chi tiết
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
    </>
  );
};

export default ClubSemesterTimelinePanel;
