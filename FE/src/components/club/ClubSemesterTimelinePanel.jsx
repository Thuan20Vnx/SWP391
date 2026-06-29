import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppSelect from '../ui/AppSelect';
import AutoGrowTextarea from '../ui/AutoGrowTextarea';
import ConfirmDialog from '../ui/ConfirmDialog';
import EventPlanFilePanel from '../events/EventPlanFilePanel';
import EventPlanUploadField from '../events/EventPlanUploadField';
import { useCloseOnClickOutside } from '../../hooks/useCloseOnClickOutside';
import TimelineLocationConflictNotice from '../timeline/TimelineLocationConflictNotice';
import { getTimelineApi } from '../../utils/semesterTimelineApiAdapter';
import { defaultEndDateTimeInput, formatTimeRangeLabel } from '../../utils/timelineTimeRange';
import { isValidEventPlanLink, normalizeEventPlanLink } from '../../utils/eventPlanFile';
import { TIMELINE_LIVE_EVENT } from '../../utils/timelineLiveEvents';
import {
  buildTimelineChangeBannerCopy,
  buildTimelineReviewFeedback,
  isScheduledTimelineDelete,
  shouldShowTimelineChangeBanner,
} from '../../utils/timelineReviewFeedback';

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
  plannedEndDate: '',
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

const formatDateTimeRange = (start, end) => {
  if (!start) return '—';
  const label = formatTimeRangeLabel(start, end);
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('vi-VN');
  return label ? `${date} · ${label}` : formatDateTime(start);
};

const canEditTimeline = (timeline, pendingKey = 'pending_icpdp') =>
  timeline && ['draft', 'revision', 'rejected', pendingKey, 'approved'].includes(timeline.statusKey);

const canDirectDeleteTimeline = (timeline, pendingKey = 'pending_icpdp') =>
  timeline && ['draft', 'revision', 'rejected', pendingKey].includes(timeline.statusKey);

const emptyPlanFields = () => ({
  eventPlanFile: '',
  eventPlanFileName: '',
  eventPlanFileMime: '',
  eventPlanFileSizeLabel: '',
  eventPlanLink: '',
  eventPlanExisting: false,
});

const timelineToForm = (timeline) => ({
  semesterTerm: timeline.semesterTerm,
  semesterYear: timeline.semesterYear,
  summary: timeline.summary || '',
  objectives: timeline.objectives || '',
  ...emptyPlanFields(),
  eventPlanFile: timeline.eventPlanFile || '',
  eventPlanFileName: timeline.eventPlanFileName || '',
  eventPlanFileMime: timeline.eventPlanFileMime || '',
  eventPlanLink: timeline.eventPlanLink || '',
  eventPlanExisting: Boolean(
    timeline.hasEventPlan || timeline.eventPlanUrl || timeline.eventPlanFileName
  ),
  items: timeline.items?.length
    ? timeline.items.map((item) => ({
        title: item.title || '',
        description: item.description || '',
        plannedDate: toDateTimeInput(item.plannedDate),
        plannedEndDate: toDateTimeInput(item.plannedEndDate),
        category: item.category || 'Workshop',
        location: item.location || '',
        expectedAttendees: item.expectedAttendees || '',
        notes: item.notes || '',
      }))
    : [emptyItem()],
});

const validateTimelinePlan = (form) => {
  const hasPlanFile = Boolean(form.eventPlanFile);
  const hasPlanLink = isValidEventPlanLink(form.eventPlanLink);
  const hasExistingPlan = Boolean(form.eventPlanExisting);
  if (!hasPlanFile && !hasPlanLink && !hasExistingPlan) {
    return 'Vui lòng tải file hoặc dán link bảng kế hoạch sự kiện (Google Drive, OneDrive...).';
  }
  return null;
};

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
      return `${label}: Vui lòng chọn thời gian bắt đầu dự kiến.`;
    }
    if (!item.plannedEndDate) {
      return `${label}: Vui lòng chọn thời gian kết thúc dự kiến.`;
    }
    const start = new Date(item.plannedDate);
    const end = new Date(item.plannedEndDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return `${label}: Thời gian kết thúc phải sau thời gian bắt đầu.`;
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
  ['pending_icpdp', 'pending_admin', 'scheduled_delete'].includes(timeline.changeRequest.statusKey);

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
    if (timeline.changeRequest?.statusKey === 'scheduled_delete') return 'Chờ xóa';
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

const CLB_STATUS_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'draft', label: 'Bản nháp' },
  { id: 'pending_icpdp', label: 'Chờ IC-PDP' },
  { id: 'pending_admin', label: 'Chờ Admin' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'revision', label: 'Cần chỉnh sửa' },
  { id: 'rejected', label: 'Từ chối' },
  { id: 'cancelled', label: 'Đã hủy' },
];

const CLB_STATUS_META = {
  draft: { tone: 'slate' },
  pending_icpdp: { tone: 'amber' },
  pending_admin: { tone: 'blue' },
  approved: { tone: 'green' },
  revision: { tone: 'orange' },
  rejected: { tone: 'red' },
  cancelled: { tone: 'slate' },
  pending_hide: { tone: 'amber' },
  scheduled_delete: { tone: 'orange' },
};

const resolveClubTimelineMeta = (tl) => {
  const badgeKey = tl.statusBadgeKey || tl.statusKey;
  const meta = CLB_STATUS_META[badgeKey] || CLB_STATUS_META[tl.statusKey];
  return {
    label: tl.status || '—',
    tone: meta?.tone || 'slate',
  };
};

const matchesClubStatusFilter = (tl, filter) => {
  if (!filter || filter === 'all') return true;
  const badgeKey = tl.statusBadgeKey || tl.statusKey;
  if (filter === 'pending_icpdp') {
    return tl.statusKey === 'pending_icpdp' || tl.changeRequest?.statusKey === 'pending_icpdp';
  }
  if (filter === 'pending_admin') {
    return tl.statusKey === 'pending_admin' || tl.changeRequest?.statusKey === 'pending_admin';
  }
  return tl.statusKey === filter || badgeKey === filter;
};

const emptyListHint = (statusFilter) => {
  if (statusFilter === 'all') return 'Chưa có timeline kỳ học. Bấm «Lập timeline kỳ mới» để bắt đầu.';
  return 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.';
};

const ClubSemesterTimelinePanel = ({ showToast, mode = 'club' }) => {
  const api = useMemo(() => getTimelineApi(mode), [mode]);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const [formConflictResults, setFormConflictResults] = useState({});
  const [form, setForm] = useState({
    semesterTerm: defaults.semesterTerm,
    semesterYear: defaults.semesterYear,
    summary: '',
    objectives: '',
    ...emptyPlanFields(),
    items: [emptyItem()],
  });
  const patchPlan = (patch) => setForm((prev) => {
    const next = { ...prev, ...patch };
    if (patch.eventPlanFile) next.eventPlanExisting = false;
    if (patch.eventPlanFile === '') next.eventPlanExisting = false;
    return next;
  });

  useCloseOnClickOutside(filterRef, filterOpen, () => setFilterOpen(false));

  const activeFilterLabel = CLB_STATUS_FILTERS.find((f) => f.id === statusFilter)?.label || 'Tất cả';

  const filteredTimelines = useMemo(() => {
    let list = timelines.filter((tl) => matchesClubStatusFilter(tl, statusFilter));
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          (t.semesterLabel || '').toLowerCase().includes(q) ||
          (t.summary || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [timelines, statusFilter, searchQuery]);

  const actionNeededCount = useMemo(
    () => timelines.filter((t) => ['revision', 'rejected', 'draft'].includes(t.statusKey)).length,
    [timelines]
  );

  const pendingReviewCount = useMemo(
    () => timelines.filter((t) => t.statusKey === api.pendingKey).length,
    [timelines, api.pendingKey]
  );

  const handleStatusSelect = (id) => {
    setStatusFilter(id);
    setFilterOpen(false);
  };

  const loadDetailTimeline = useCallback(async (id, fallback = null) => {
    const [detailRes, planRes] = await Promise.allSettled([
      api.fetchDetail(id),
      api.fetchPlan(id),
    ]);
    if (detailRes.status !== 'fulfilled') {
      throw detailRes.reason;
    }
    const base = detailRes.value || fallback || {};
    const plan = planRes.status === 'fulfilled' ? (planRes.value || {}) : {};
    return { ...(fallback || {}), ...base, ...plan };
  }, [api]);

  const load = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    return api.fetchList()
      .then((rows) => setTimelines(rows))
      .catch(() => {
        if (!silent) showToast?.('Không tải được timeline kỳ học.', 'error');
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [api, showToast]);

  const detailTimelineRef = useRef(detailTimeline);
  detailTimelineRef.current = detailTimeline;
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (view !== 'form') {
      setFormConflictResults({});
      return undefined;
    }
    const timer = setTimeout(() => {
      const editingTimeline = timelines.find((t) => t.id === editingId);
      api.checkConflicts({
        items: form.items,
        excludeTimelineId: editingId,
        submittedAt: editingTimeline?.submittedAt,
      })
        .then((rows) => {
          const byIndex = {};
          (rows || []).forEach((row) => {
            if (row && Number.isInteger(row.index)) byIndex[row.index] = row;
          });
          setFormConflictResults(byIndex);
        })
        .catch(() => setFormConflictResults({}));
    }, 280);
    return () => clearTimeout(timer);
  }, [form.items, editingId, view, api, timelines]);

  useEffect(() => {
    const onLive = () => {
      load({ silent: true });
      const current = detailTimelineRef.current;
      if (current?.id) {
        loadDetailTimeline(current.id, current)
          .then(setDetailTimeline)
          .catch(() => {});
      }
    };
    window.addEventListener(TIMELINE_LIVE_EVENT, onLive);
    return () => window.removeEventListener(TIMELINE_LIVE_EVENT, onLive);
  }, [load, loadDetailTimeline]);

  useEffect(() => {
    if (view === 'form') return undefined;
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      load({ silent: true });
      const current = detailTimelineRef.current;
      if (viewRef.current === 'detail' && current?.id) {
        loadDetailTimeline(current.id, current)
          .then(setDetailTimeline)
          .catch(() => {});
      }
    };
    const pollId = window.setInterval(refresh, 8000);
    const handleVisibility = () => refresh();
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(pollId);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [load, loadDetailTimeline, view]);

  useEffect(() => {
    if (view !== 'detail' || !detailTimeline?.id) return undefined;
    if (detailTimeline.eventPlanFile || detailTimeline.eventPlanUrl) return undefined;
    if (!detailTimeline.hasEventPlan && !detailTimeline.eventPlanFileName && !detailTimeline.eventPlanLink) {
      return undefined;
    }
    let cancelled = false;
    loadDetailTimeline(detailTimeline.id, detailTimeline)
      .then((next) => {
        if (!cancelled) setDetailTimeline(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [view, detailTimeline?.id, detailTimeline?.eventPlanFile, detailTimeline?.hasEventPlan, detailTimeline?.eventPlanFileName, detailTimeline?.eventPlanLink, loadDetailTimeline]);

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
      ...emptyPlanFields(),
      items: [emptyItem()],
    });
    setEditingId(null);
    setEditingStatusKey(null);
  };

  const openCreate = () => {
    resetForm();
    setView('form');
  };

  const openDetail = async (timeline) => {
    setDetailTimeline(timeline);
    setView('detail');
    try {
      setDetailTimeline(await loadDetailTimeline(timeline.id, timeline));
    } catch {
      // giữ bản tóm tắt từ danh sách
    }
  };

  const openEdit = async (timeline) => {
    if (!canEditTimeline(timeline, api.pendingKey)) {
      showToast?.('Timeline này không thể chỉnh sửa trực tiếp.', 'warning');
      return;
    }
    setEditingId(timeline.id);
    setEditingStatusKey(timeline.statusKey);
    setView('form');
    try {
      const detail = await api.fetchDetail(timeline.id);
      const plan = await api.fetchPlan(timeline.id).catch(() => ({}));
      const full = { ...(detail || timeline), ...plan };
      setForm(timelineToForm(full));
    } catch {
      setForm(timelineToForm(timeline));
      showToast?.('Không tải được file kế hoạch — bạn có thể tải lại nếu cần.', 'warning');
    }
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, [field]: value };
        if (field === 'plannedDate' && value && !item.plannedEndDate) {
          next.plannedEndDate = defaultEndDateTimeInput(value);
        }
        return next;
      }),
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

  const buildPayload = () => {
    const payload = {
      semesterTerm: form.semesterTerm,
      semesterYear: Number(form.semesterYear),
      summary: form.summary,
      objectives: form.objectives,
      items: form.items.map((item) => ({
        title: item.title,
        description: item.description,
        plannedDate: item.plannedDate || null,
        plannedEndDate: item.plannedEndDate || null,
        category: item.category,
        location: item.location,
        expectedAttendees: Number(item.expectedAttendees) || 0,
        notes: item.notes,
      })),
      eventPlanLink: normalizeEventPlanLink(form.eventPlanLink),
    };
    if (form.eventPlanFile) {
      payload.eventPlanFile = form.eventPlanFile;
      payload.eventPlanFileName = form.eventPlanFileName || 'bang-ke-hoach-su-kien';
      payload.eventPlanFileMime = form.eventPlanFileMime || '';
    }
    return payload;
  };

  const handleSave = async (andSubmit = false) => {
    const validationError = validateTimelineItems(form.items);
    if (validationError) {
      showToast?.(validationError, 'error');
      return;
    }
    if (andSubmit) {
      const planError = validateTimelinePlan(form);
      if (planError) {
        showToast?.(planError, 'error');
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const wasApproved = editingStatusKey === 'approved';

      let timelineId = editingId;
      if (editingId) {
        await api.update(editingId, payload);
      } else {
        const created = await api.create(payload);
        timelineId = created?.id;
      }
      if (andSubmit && timelineId) {
        await api.submit(timelineId);
        showToast?.(`Đã gửi timeline kỳ học — chờ ${api.reviewerLabel} xét duyệt!`, 'success');
      } else if (wasApproved) {
        showToast?.(`Đã lưu thay đổi — timeline chuyển về chờ ${api.reviewerLabel} duyệt lại!`, 'success');
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
    if (!window.confirm(`Gửi timeline này cho ${api.reviewerLabel} duyệt?`)) return;
    setSubmitting(true);
    try {
      await api.submit(id);
      showToast?.(`Đã gửi timeline — chờ ${api.reviewerLabel} xét duyệt!`, 'success');
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
      await api.delete(deleteTarget.id);
      showToast?.(
        [api.pendingKey, 'revision'].includes(deleteTarget.statusKey)
          ? `Đã hủy đơn timeline — ${api.reviewerLabel} sẽ thấy trạng thái «Đã hủy» trong mục Tất cả.`
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

  const handleCancelScheduledDelete = async (timeline) => {
    if (!window.confirm('Hủy lịch xóa timeline? Timeline sẽ được giữ lại.')) return;
    setSubmitting(true);
    try {
      const result = await api.cancelScheduledDelete(timeline.id);
      showToast?.('Đã hủy yêu cầu xóa timeline.', 'success');
      setDetailTimeline(result.timeline || null);
      load();
    } catch (e) {
      showToast?.(e.message || 'Không hủy được lịch xóa.', 'error');
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
      await api.requestChange(timeline.id, { type, reason });
      showToast?.(
        api.isSchool
          ? 'Đã gửi yêu cầu — chờ Admin duyệt!'
          : 'Đã gửi yêu cầu — chờ IC-PDP và Admin duyệt!',
        'success'
      );
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
      <div className="clb-page-header">
        <div>
          <h1 className="clb-page-title">TIMELINE KỲ HỌC</h1>
          <p className="clb-page-subtitle">
            {editingStatusKey === 'approved'
              ? `Chỉnh sửa timeline đã duyệt — sau khi lưu, timeline sẽ chuyển về trạng thái chờ ${api.reviewerLabel} duyệt lại.`
              : editingStatusKey === api.pendingKey
                ? 'Chỉnh sửa trực tiếp — đơn đang chờ duyệt, thay đổi được lưu ngay không cần phê duyệt lại.'
                : editingStatusKey === 'rejected' || editingStatusKey === 'revision'
                  ? `Chỉnh sửa theo góp ý người duyệt, sau đó gửi lại ${api.reviewerLabel}.`
                  : api.isSchool
                    ? `Lập kế hoạch hoạt động theo kỳ Spring / Summer / Fall và gửi ${api.reviewerLabel} phê duyệt.`
                    : 'Lập kế hoạch hoạt động theo kỳ Spring / Summer / Fall và gửi IC-PDP phê duyệt.'}
          </p>
        </div>
        <button
          type="button"
          className="clb-create-btn"
          onClick={() => {
            resetForm();
            setView(editingId ? 'detail' : 'list');
            if (editingId && detailTimeline) {
              loadDetailTimeline(editingId, detailTimeline)
                .then(setDetailTimeline)
                .catch(() => setDetailTimeline(timelines.find((t) => t.id === editingId) || detailTimeline));
            }
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

        <EventPlanUploadField
          planFile={form.eventPlanFile}
          planFileName={form.eventPlanFileName}
          planFileMime={form.eventPlanFileMime}
          planFileSizeLabel={form.eventPlanFileSizeLabel}
          planLink={form.eventPlanLink}
          onChange={patchPlan}
          showToast={showToast}
          linkInputId="timeline-event-plan-link"
        />

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
                Bắt đầu dự kiến *
                <input
                  type="datetime-local"
                  value={item.plannedDate}
                  onChange={(e) => updateItem(index, 'plannedDate', e.target.value)}
                  required
                />
              </label>
              <label>
                Kết thúc dự kiến *
                <input
                  type="datetime-local"
                  value={item.plannedEndDate}
                  onChange={(e) => updateItem(index, 'plannedEndDate', e.target.value)}
                  min={item.plannedDate || undefined}
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
                  type="text"
                  value={item.location}
                  onChange={(e) => updateItem(index, 'location', e.target.value)}
                  placeholder="VD: Sảnh tòa Beta, Phòng A101..."
                  maxLength={200}
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
            {(formConflictResults[index]?.hasLocationConflict || item.locationConflicts?.length > 0) && (
              <TimelineLocationConflictNotice
                conflicts={formConflictResults[index]?.conflicts || item.locationConflicts}
                venue={item.location}
                plannedDate={item.plannedDate}
                plannedEndDate={item.plannedEndDate}
              />
            )}
          </div>
        ))}

        <div className="clb-timeline-form-actions">
          {['pending_icpdp', 'pending_admin', 'approved'].includes(editingStatusKey) ? (
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
    const listItem = timelines.find((t) => t.id === detailTimeline?.id);
    const tl = detailTimeline
      ? { ...detailTimeline, ...(listItem || {}) }
      : listItem;
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
    const canDirectEdit = canEditTimeline(tl, api.pendingKey) && !pendingChange && !['revision', 'rejected'].includes(tl.statusKey);
    const canDirectDelete = canDirectDeleteTimeline(tl, api.pendingKey) && !pendingChange;
    const canRequestDelete = tl.statusKey === 'approved' && !pendingChange;
    const scheduledDelete = isScheduledTimelineDelete(tl);

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
              {api.statusSteps.map((step) => {
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

          {(() => {
            const reviewFeedback = buildTimelineReviewFeedback(tl);
            if (!reviewFeedback) return null;
            return (
              <div className={`clb-timeline-review-banner clb-timeline-review-banner--${reviewFeedback.tone}`}>
                <strong>{reviewFeedback.title}</strong>
                <p>{reviewFeedback.body}</p>
              </div>
            );
          })()}

          {shouldShowTimelineChangeBanner(tl) && (() => {
            const { clubReason, icpdpNote, adminNote, scheduledDeleteLine } = buildTimelineChangeBannerCopy(tl.changeRequest);
            const isRejected = tl.changeRequest.statusKey === 'rejected';
            const isScheduled = tl.changeRequest.statusKey === 'scheduled_delete';
            return (
              <div className={`clb-timeline-change-banner${isRejected ? ' clb-timeline-change-banner--rejected' : ''}${isScheduled ? ' clb-timeline-change-banner--scheduled' : ''}`}>
                <strong>{tl.changeRequest.typeLabel}</strong>
                <span>{tl.changeRequest.status}</span>
                {clubReason ? <p style={{ marginTop: 8 }}>Lý do CLB gửi: {clubReason}</p> : null}
                {icpdpNote ? <p style={{ marginTop: 8 }}>Phản hồi IC-PDP: {icpdpNote}</p> : null}
                {adminNote ? <p style={{ marginTop: 8 }}>Phản hồi Admin: {adminNote}</p> : null}
                {scheduledDeleteLine ? <p className="ev-moderation-banner__hint" style={{ marginTop: 8 }}>{scheduledDeleteLine}</p> : null}
              </div>
            );
          })()}

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

          {(tl.hasEventPlan || tl.eventPlanFile || tl.eventPlanLink || tl.eventPlanFileName) && (
            <div className="clb-timeline-detail-panel">
              <EventPlanFilePanel
                fileUrl={tl.eventPlanUrl || tl.eventPlanFile}
                fileName={tl.eventPlanFileName}
                mimeType={tl.eventPlanFileMime}
                externalLink={tl.eventPlanLink}
              />
            </div>
          )}

          <div className="clb-timeline-detail-panel">
            <h2>Hoạt động dự kiến ({tl.items?.length || 0})</h2>
            {tl.hasLocationConflict && (
              <TimelineLocationConflictNotice
                variant="info"
                conflicts={(tl.items || []).flatMap((item) => item.locationConflicts || [])}
                title="Có hoạt động trùng địa điểm trong ngày"
                className="tl-conflict-notice--detail"
              />
            )}
            <ul className="clb-timeline-milestone-list">
              {(tl.items || []).map((item, i) => (
                <li key={`${item.title}-${i}`}>
                  <strong>{item.title}</strong>
                  {item.plannedDate && <span>{formatDateTimeRange(item.plannedDate, item.plannedEndDate)} · </span>}
                  {item.category}
                  {item.location && <> · {item.location}</>}
                  {item.hasLocationConflict && (
                    <TimelineLocationConflictNotice
                      conflicts={item.locationConflicts}
                      venue={item.location}
                      plannedDate={item.plannedDate}
                      plannedEndDate={item.plannedEndDate}
                      className="tl-conflict-notice--inline"
                    />
                  )}
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
            {scheduledDelete && (
              <button
                type="button"
                className="clb-view-detail-btn clb-view-detail-btn--edit"
                disabled={submitting}
                onClick={() => handleCancelScheduledDelete(tl)}
              >
                Hủy yêu cầu xóa
              </button>
            )}
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
          [api.pendingKey, 'revision'].includes(deleteTarget?.statusKey)
            ? `Đơn timeline sẽ chuyển sang trạng thái «Đã hủy» và biến mất khỏi hàng chờ ${api.reviewerLabel}. Bạn có chắc không?`
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
      <div className="ctsv-events-page">
        <header className="ctsv-events-hero">
          <div className="ctsv-events-hero-text">
            <span className="ctsv-events-eyebrow">{api.unitLabel} · Kế hoạch kỳ</span>
            <h1>Timeline kỳ học</h1>
            <p>
              {api.isSchool
                ? `Lập kế hoạch hoạt động theo kỳ Spring / Summer / Fall và gửi ${api.reviewerLabel} phê duyệt.`
                : 'Trước mỗi kỳ Spring / Summer / Fall, CLB lập timeline hoạt động và gửi IC-PDP phê duyệt.'}
            </p>
          </div>
          <div className="ctsv-events-hero-aside">
            <div className="ctsv-events-hero-stat" aria-live="polite">
              <span className="ctsv-events-hero-stat-num">{loading ? '—' : filteredTimelines.length}</span>
              <span className="ctsv-events-hero-stat-label">
                {statusFilter === 'all' ? 'Timeline' : 'Timeline (bộ lọc hiện tại)'}
              </span>
            </div>
            {!loading && actionNeededCount > 0 && (
              <p className="stl-pending-hint">{actionNeededCount} cần hành động</p>
            )}
            {!loading && actionNeededCount === 0 && pendingReviewCount > 0 && (
              <p className="stl-pending-hint">{pendingReviewCount} chờ {api.reviewerLabel} duyệt</p>
            )}
            <button type="button" className="ctsv-events-hero-cta" onClick={openCreate}>
              + Lập timeline kỳ mới
            </button>
          </div>
        </header>

        <section className="ctsv-events-filter-card">
          <div className="ctsv-events-filter-form" style={{ flexWrap: 'wrap', gap: 12 }}>
            <label className="ctsv-events-search" style={{ flex: '1 1 220px', maxWidth: 340 }}>
              <span className="ctsv-events-search-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="7" /><path d="M20 20l-3-3" />
                </svg>
              </span>
              <input
                type="search"
                className="ctsv-events-search-input"
                placeholder="Tìm Spring/Summer/Fall..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            <div className="stl-filter-dropdown" ref={filterRef}>
              <button
                type="button"
                className={`stl-filter-pill${filterOpen ? ' stl-filter-pill--open' : ''}`}
                onClick={() => setFilterOpen((open) => !open)}
                aria-expanded={filterOpen}
                aria-haspopup="listbox"
                aria-label="Lọc theo trạng thái timeline"
              >
                <span>{activeFilterLabel}</span>
                <svg className="stl-filter-caret" viewBox="0 0 10 6" width="10" height="6" fill="currentColor" aria-hidden>
                  <path d="M0 0l5 6 5-6z" />
                </svg>
              </button>
              {filterOpen && (
                <div className="stl-filter-menu" role="listbox" aria-label="Trạng thái timeline">
                  {CLB_STATUS_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="option"
                      aria-selected={statusFilter === f.id}
                      className={`stl-filter-menu-item${statusFilter === f.id ? ' stl-filter-menu-item--active' : ''}`}
                      onClick={() => handleStatusSelect(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {!loading && (
            <p className="ctsv-events-filter-summary">
              <strong>{filteredTimelines.length}</strong> timeline
            </p>
          )}
        </section>

        <section className="stl-card club-m-hide-mobile">
          <div className="stl-table-wrap">
            <table className="stl-table">
              <thead>
                <tr>
                  <th>Kỳ học</th>
                  <th className="col-center">Hoạt động</th>
                  <th className="col-center">Bảng KH</th>
                  <th className="col-center">Gửi lúc</th>
                  <th className="col-center">Trạng thái</th>
                  <th className="col-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="stl-row--skeleton">
                    <td><div className="stl-sk stl-sk--sm" /></td>
                    <td><div className="stl-sk stl-sk--sm" /></td>
                    <td><div className="stl-sk stl-sk--sm" /></td>
                    <td><div className="stl-sk stl-sk--sm" /></td>
                    <td><div className="stl-sk stl-sk--sm" /></td>
                    <td><div className="stl-sk stl-sk--sm" /></td>
                  </tr>
                ))}
                {!loading && filteredTimelines.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="stl-empty">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" aria-hidden>
                          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        <p>Không có timeline nào.</p>
                        <p className="stl-empty-hint">{emptyListHint(statusFilter)}</p>
                        {statusFilter !== 'all' && (
                          <button
                            type="button"
                            className="stl-empty-action-btn"
                            onClick={() => handleStatusSelect('all')}
                          >
                            Hiển thị tất cả
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && filteredTimelines.map((tl) => {
                  const meta = resolveClubTimelineMeta(tl);
                  return (
                    <tr key={tl.id} className="stl-row">
                      <td>
                        <button
                          type="button"
                          className="stl-club-name stl-timeline-semester-btn"
                          onClick={() => openDetail(tl)}
                        >
                          {tl.semesterLabel || '—'}
                        </button>
                        {tl.summary && (
                          <p className="stl-timeline-summary">{tl.summary.slice(0, 72)}{tl.summary.length > 72 ? '…' : ''}</p>
                        )}
                      </td>
                      <td className="col-center stl-count">{tl.items?.length ?? 0}</td>
                      <td className="col-center">
                        {tl.hasEventPlan || tl.eventPlanFile || tl.eventPlanLink || tl.eventPlanFileName ? (
                          <span className="stl-badge stl-badge--green">Có file</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td className="col-center stl-date">{formatDate(tl.submittedAt || tl.createdAt)}</td>
                      <td className="col-center">
                        <span className={`stl-badge stl-badge--${meta.tone}`}>{meta.label}</span>
                      </td>
                      <td className="col-center">
                        <div className="stl-timeline-actions">
                          {tl.statusKey === 'draft' && (
                            <button
                              type="button"
                              className="stl-action-btn stl-action-btn--primary"
                              disabled={submitting}
                              onClick={() => handleSubmitExisting(tl.id)}
                            >
                              Gửi duyệt
                            </button>
                          )}
                          {(tl.statusKey === 'revision' || tl.statusKey === 'rejected') && (
                            <button
                              type="button"
                              className="stl-action-btn stl-action-btn--primary"
                              onClick={() => openEdit(tl)}
                            >
                              Chỉnh sửa & gửi lại
                            </button>
                          )}
                          <button
                            type="button"
                            className="stl-action-btn"
                            onClick={() => openDetail(tl)}
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="club-m-timeline-list club-m-show-mobile">
          {loading ? (
            <p className="clb-panel-empty">Đang tải...</p>
          ) : filteredTimelines.length === 0 ? (
            <p className="clb-panel-empty">{emptyListHint(statusFilter)}</p>
          ) : (
            filteredTimelines.map((tl) => {
              const meta = resolveClubTimelineMeta(tl);
              return (
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
                  <span className={`stl-badge stl-badge--${meta.tone}`}>{meta.label}</span>
                  {tl.statusKey === 'revision' && tl.icpdpNote && (
                    <span className="club-m-timeline-card__summary">IC-PDP yêu cầu chỉnh sửa: {tl.icpdpNote}</span>
                  )}
                  {tl.statusKey === 'rejected' && tl.rejectionReason && (
                    <span className="club-m-timeline-card__summary clb-table-sub--danger">
                      Từ chối: {tl.rejectionReason}
                    </span>
                  )}
                  <div className="club-m-timeline-card__actions">
                    {tl.statusKey === 'draft' && (
                      <button
                        type="button"
                        className="stl-action-btn stl-action-btn--primary"
                        disabled={submitting}
                        onClick={() => handleSubmitExisting(tl.id)}
                      >
                        Gửi duyệt
                      </button>
                    )}
                    {(tl.statusKey === 'revision' || tl.statusKey === 'rejected') && (
                      <button type="button" className="stl-action-btn stl-action-btn--primary" onClick={() => openEdit(tl)}>
                        Chỉnh sửa & gửi lại
                      </button>
                    )}
                    <button type="button" className="stl-action-btn" onClick={() => openDetail(tl)}>
                      Xem chi tiết
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default ClubSemesterTimelinePanel;
