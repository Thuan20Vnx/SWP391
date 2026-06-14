import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppSelect from '../ui/AppSelect';
import AutoGrowTextarea from '../ui/AutoGrowTextarea';
import ConfirmDialog from '../ui/ConfirmDialog';
import {
  createClubSemesterTimeline,
  deleteClubSemesterTimeline,
  fetchClubSemesterTimelines,
  requestClubSemesterTimelineChange,
  submitClubSemesterTimeline,
  updateClubSemesterTimeline,
  withdrawClubSemesterTimeline,
} from '../../services/clubTimelineApi';

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
  { key: 'pending_icpdp', label: 'IC-PDP', match: ['pending_icpdp'] },
  { key: 'pending_ctsv', label: 'Admin / CTSV', match: ['pending_ctsv'] },
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

const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

const canEditTimeline = (timeline) =>
  timeline && ['draft', 'revision', 'pending_icpdp', 'pending_ctsv'].includes(timeline.statusKey);

const canWithdrawTimeline = (timeline) =>
  timeline && ['pending_icpdp', 'pending_ctsv'].includes(timeline.statusKey);

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
  edit: {
    title: 'Yêu cầu sửa timeline',
    subtitle: 'Nhập lý do chỉnh sửa timeline. Nội dung form sẽ được gửi kèm yêu cầu duyệt.',
    placeholder: 'VD: Bổ sung thêm hoạt động workshop, cập nhật mục tiêu kỳ...',
    confirmLabel: 'Gửi yêu cầu sửa',
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
  if (step.key === 'pending_icpdp' || step.key === 'pending_ctsv') return 'Chờ duyệt';
  if (step.key === 'approved') {
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
  const defaults = useMemo(() => inferDefaultSemester(), []);
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [detailTimeline, setDetailTimeline] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editRequestMode, setEditRequestMode] = useState(false);
  const [editingStatusKey, setEditingStatusKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reasonModal, setReasonModal] = useState(null);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
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
    setEditRequestMode(false);
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

  const openEdit = (timeline, asChangeRequest = false) => {
    if (!asChangeRequest && !canEditTimeline(timeline)) {
      showToast?.('Timeline này không thể chỉnh sửa trực tiếp.', 'warning');
      return;
    }
    if (asChangeRequest && timeline.statusKey !== 'approved') {
      showToast?.('Chỉ timeline đã duyệt mới gửi yêu cầu sửa.', 'warning');
      return;
    }
    setEditingId(timeline.id);
    setEditRequestMode(asChangeRequest);
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
            plannedDate: toDateInput(item.plannedDate),
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
    const validItems = form.items.filter((item) => item.title.trim());
    if (!validItems.length) {
      showToast?.('Thêm ít nhất một hoạt động/sự kiện dự kiến.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();

      if (editRequestMode && editingId) {
        setSubmitting(false);
        setReasonModal({
          mode: 'edit',
          timelineId: editingId,
          payload,
          reason: '',
        });
        return;
      }

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
    if (!window.confirm('Gửi timeline này cho IC-PDP và CTSV duyệt?')) return;
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

  const handleDeleteDraft = async (id) => {
    if (!window.confirm('Xóa timeline bản nháp này?')) return;
    setSubmitting(true);
    try {
      await deleteClubSemesterTimeline(id);
      showToast?.('Đã xóa timeline.', 'success');
      if (detailTimeline?.id === id) {
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

  const handleWithdraw = async () => {
    if (!withdrawTarget) return;
    setSubmitting(true);
    try {
      await withdrawClubSemesterTimeline(withdrawTarget.id);
      showToast?.('Đã thu hồi đơn về bản nháp — bạn có thể chỉnh sửa và gửi lại.', 'success');
      setWithdrawTarget(null);
      if (detailTimeline?.id === withdrawTarget.id) {
        setDetailTimeline((prev) => (prev ? { ...prev, statusKey: 'draft', status: 'Bản nháp' } : prev));
      }
      load();
    } catch (e) {
      showToast?.(e.message || 'Thu hồi đơn thất bại.', 'error');
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
      showToast?.('Vui lòng nhập lý do.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (reasonModal.mode === 'edit') {
        await requestClubSemesterTimelineChange(reasonModal.timelineId, {
          type: 'edit',
          reason,
          payload: reasonModal.payload,
        });
        showToast?.('Đã gửi yêu cầu sửa — chờ IC-PDP và Admin duyệt!', 'success');
        setReasonModal(null);
        resetForm();
        setView('list');
        load();
        return;
      }

      const { timeline, type } = reasonModal;
      await requestClubSemesterTimelineChange(timeline.id, { type, reason });
      showToast?.('Đã gửi yêu cầu — chờ IC-PDP và Admin duyệt!', 'success');
      setReasonModal(null);
      load();
      setDetailTimeline((prev) =>
        prev?.id === timeline.id
          ? {
              ...prev,
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
    const copyKey = reasonModal.mode === 'edit' ? 'edit' : reasonModal.type;
    const copy = REASON_MODAL_COPY[copyKey];
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
          <label className="clb-reason-modal-field">
            Lý do <span className="clb-reason-modal-required">*</span>
            <AutoGrowTextarea
              minRows={4}
              spellCheck={false}
              value={reasonModal.reason}
              onChange={(e) => setReasonModal((prev) => (prev ? { ...prev, reason: e.target.value } : prev))}
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
      <div className="clb-page-header">
        <div>
          <h1 className="clb-page-title">TIMELINE KỲ HỌC</h1>
          <p className="clb-page-subtitle">
            {editRequestMode
              ? 'Chỉnh sửa nội dung — sau khi lưu sẽ gửi yêu cầu sửa lên IC-PDP và Admin duyệt.'
              : ['pending_icpdp', 'pending_ctsv'].includes(editingStatusKey)
                ? 'Chỉnh sửa trực tiếp — đơn đang chờ duyệt, thay đổi được lưu ngay không cần phê duyệt lại.'
                : 'Lập kế hoạch hoạt động theo kỳ Spring / Summer / Fall và gửi IC-PDP / CTSV phê duyệt.'}
          </p>
        </div>
        <button
          type="button"
          className="clb-create-btn"
          onClick={() => {
            resetForm();
            setView(editingId && !editRequestMode ? 'detail' : 'list');
            if (editingId && detailTimeline) setDetailTimeline(timelines.find((t) => t.id === editingId) || detailTimeline);
          }}
        >
          Quay lại
        </button>
      </div>

      <div className="clb-timeline-form">
        {!editRequestMode && (
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
        )}

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
                Ngày dự kiến
                <input
                  type="date"
                  value={item.plannedDate}
                  onChange={(e) => updateItem(index, 'plannedDate', e.target.value)}
                />
              </label>
            </div>
            <div className="clb-timeline-form-row">
                <label>
                  Thể loại
                  <AppSelect
                    value={item.category}
                    onChange={(e) => updateItem(index, 'category', e.target.value)}
                    options={CATEGORY_OPTIONS}
                  />
                </label>
              <label>
                Địa điểm
                <input
                  spellCheck={false}
                  value={item.location}
                  onChange={(e) => updateItem(index, 'location', e.target.value)}
                  placeholder="Hall A / Online..."
                />
              </label>
              <label>
                Số người dự kiến
                <input
                  type="number"
                  min={0}
                  value={item.expectedAttendees}
                  onChange={(e) => updateItem(index, 'expectedAttendees', e.target.value)}
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
          {!editRequestMode && !['pending_icpdp', 'pending_ctsv'].includes(editingStatusKey) && (
            <button type="button" className="clb-create-btn clb-create-btn--ghost" disabled={submitting} onClick={() => handleSave(false)}>
              Lưu nháp
            </button>
          )}
          {!editRequestMode && ['pending_icpdp', 'pending_ctsv'].includes(editingStatusKey) && (
            <button type="button" className="clb-create-btn" disabled={submitting} onClick={() => handleSave(false)}>
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          )}
          {(!['pending_icpdp', 'pending_ctsv'].includes(editingStatusKey) || editRequestMode) && (
            <button type="button" className="clb-create-btn" disabled={submitting} onClick={() => handleSave(!editRequestMode)}>
              {submitting
                ? 'Đang gửi...'
                : editRequestMode
                  ? 'Gửi yêu cầu sửa'
                  : 'Gửi duyệt'}
            </button>
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
    const canWithdraw = canWithdrawTimeline(tl) && !pendingChange;
    const canRequestCancel = tl.statusKey === 'approved' && !pendingChange;
    const canDirectEdit = canEditTimeline(tl) && !pendingChange;
    const canRequestEdit = tl.statusKey === 'approved' && !pendingChange;
    const canDirectDelete = tl.statusKey === 'draft' && !pendingChange;
    const canRequestDelete = tl.statusKey === 'approved' && !pendingChange;

    return (
      <div className="clb-timeline-page">
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
              <span className={`clb-table-status clb-table-status--${timelineStatusBadgeClass(tl.statusKey)}`}>
                {tl.status}
              </span>
            </p>
          </div>

          {tl.changeRequest && tl.changeRequest.statusKey !== 'none' && (
            <div className="clb-timeline-change-banner">
              <strong>{tl.changeRequest.typeLabel}</strong>
              <span>{tl.changeRequest.status}</span>
              {tl.changeRequest.reason && <p style={{ marginTop: 8 }}>Lý do: {tl.changeRequest.reason}</p>}
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
                  {item.plannedDate && <span>{formatDate(item.plannedDate)} · </span>}
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
            {canWithdraw && (
              <button
                type="button"
                className="clb-view-detail-btn"
                disabled={submitting}
                onClick={() => setWithdrawTarget(tl)}
              >
                Thu hồi về nháp
              </button>
            )}
            {canRequestCancel && (
              <button
                type="button"
                className="clb-view-detail-btn"
                disabled={submitting}
                onClick={() => openReasonModal(tl, 'cancel')}
              >
                Hủy đơn
              </button>
            )}
            {canDirectEdit && (
              <button type="button" className="clb-view-detail-btn" onClick={() => openEdit(tl)}>
                Sửa
              </button>
            )}
            {canRequestEdit && (
              <button type="button" className="clb-view-detail-btn" onClick={() => openEdit(tl, true)}>
                Yêu cầu sửa
              </button>
            )}
            {canDirectDelete && (
              <button
                type="button"
                className="clb-action-btn clb-action-btn--danger clb-action-btn--icon"
                title="Xóa timeline"
                aria-label="Xóa timeline bản nháp"
                disabled={submitting}
                onClick={() => handleDeleteDraft(tl.id)}
              >
                <ClbTrashIcon />
              </button>
            )}
            {canRequestDelete && (
              <button
                type="button"
                className="clb-view-detail-btn"
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
          </div>
        </div>
      </div>
    );
  };

  const renderDialogs = () => (
    <>
      {renderReasonModal()}
      <ConfirmDialog
        open={Boolean(withdrawTarget)}
        title="Thu hồi đơn timeline"
        message="Đơn sẽ được chuyển về bản nháp để bạn chỉnh sửa trực tiếp, không cần IC-PDP hay Admin duyệt."
        confirmLabel="Thu hồi về nháp"
        onConfirm={handleWithdraw}
        onCancel={() => {
          if (!submitting) setWithdrawTarget(null);
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
      <div className="clb-page-header">
        <div>
          <h1 className="clb-page-title">TIMELINE KỲ HỌC</h1>
          <p className="clb-page-subtitle">
            Trước mỗi kỳ Spring / Summer / Fall, CLB lập timeline hoạt động và gửi IC-PDP / CTSV phê duyệt.
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
                    </td>
                    <td className="clb-table-col-compact">{tl.items?.length || 0}</td>
                    <td className="clb-table-col-compact">{formatDate(tl.submittedAt || tl.createdAt)}</td>
                    <td className="clb-table-col-status">
                      <span className={`clb-table-status clb-table-status--${timelineStatusBadgeClass(tl.statusKey)}`}>
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
