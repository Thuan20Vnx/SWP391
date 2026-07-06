import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import BannerCropModal from '../../components/ctsv/BannerCropModal';
import CtsvActionIcon from '../../components/ctsv/CtsvActionIcon';
import AppSelect from '../../components/ui/AppSelect';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  createManagedAnnouncement,
  deleteManagedAnnouncement,
  fetchManagedAnnouncements,
  fetchManagedAnnouncement,
  hideManagedAnnouncement,
  updateManagedAnnouncement
} from '../../services/announcementManageApi';
import { API_BASE } from '../../utils/api';
import { fetchCtsvAnnouncementLinkableEvents } from '../../services/ctsvApi';
import TargetAudiencePicker from '../../components/announcements/TargetAudiencePicker';
import NoticeCategoryPicker from '../../components/announcements/NoticeCategoryPicker';
import {
  ANNOUNCEMENT_TARGET_ALL,
  formatTargetRolesLabel,
  getAnnouncementDetailPath,
  getDefaultTargetRolesForPublisher,
  getPortalEventDetailPath,
  normalizeTargetsForPublisher,
  PORTAL_ANNOUNCEMENT_CONFIG
} from '../../constants/announcementTargets';
import { NOTICE_CATEGORY_INFO, getNoticeCategoryLabel } from '../../constants/announcementNoticeCategories';
import { useCloseOnClickOutside } from '../../hooks/useCloseOnClickOutside';
import {
  clearAnnouncementDraft,
  formatDraftSavedLabel,
  loadAnnouncementDraft,
  saveAnnouncementDraft
} from '../../utils/announcementDraft';
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  formatAnnouncementEventLabel,
  isAnnouncementLinkableEvent,
  resolveAnnouncementCategory
} from '../../utils/announcementEvents';
import { resolveAnnouncementId } from '../../utils/announcementId';

const AUTOSAVE_MS = 800;
const BANNER_MAX_BYTES = 5 * 1024 * 1024;
const BANNER_ACCEPT = 'image/jpeg,image/png,image/webp';
import { formatPartnerDate } from '../../utils/partnerDisplay';

const EMPTY_FORM = {
  title: '',
  content: '',
  eventId: '',
  image: '',
  imageFileName: '',
  targetRoles: [ANNOUNCEMENT_TARGET_ALL],
  noticeCategory: NOTICE_CATEGORY_INFO
};

const CATEGORY_FILTERS = [
  { value: 'all', label: 'Tất cả danh mục' },
  { value: 'general', label: 'Thông báo chung' },
  { value: 'school', label: 'Sự kiện cấp trường' },
  { value: 'partner', label: 'Sự kiện đối tác' },
  { value: 'icpdp', label: 'Sự kiện ICPDP' },
  { value: 'club', label: 'Sự kiện CLB' },
  { value: 'hidden', label: 'Đã ẩn' }
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'title_asc', label: 'Tiêu đề A → Z' },
  { value: 'title_desc', label: 'Tiêu đề Z → A' }
];

const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3-3" />
  </svg>
);

const IconChevronDown = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const formatHistoryMetaTime = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    const clock = new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
    const date = new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
    return `${clock} · ${date}`;
  } catch {
    return formatPartnerDate(value);
  }
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return formatPartnerDate(value);
  }
};

const excerpt = (text, max = 120) => {
  const t = String(text || '').trim();
  if (!t) return 'Không có nội dung chi tiết.';
  return t.length <= max ? t : `${t.slice(0, max)}…`;
};

const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysFromMonday);
  return start;
};

const isPublishedThisWeek = (publishedAt) => {
  if (!publishedAt) return false;
  return new Date(publishedAt) >= getStartOfWeek();
};

const getAnnouncementPublishedAt = (announcement) =>
  announcement?.publishedAt || announcement?.published_at || announcement?.createdAt || null;

const isAnnouncementVisible = (announcement) => announcement?.isHidden !== true;

const hasDraftContent = (draft) =>
  !!(draft && (draft.title || draft.content || draft.eventId || draft.image));

const readInitialDraftState = (portalRole) => {
  const defaultTargets = getDefaultTargetRolesForPublisher(portalRole);
  const draft = loadAnnouncementDraft(portalRole);
  if (!hasDraftContent(draft)) {
    return { form: { ...EMPTY_FORM, targetRoles: defaultTargets }, savedAt: null, hadDraft: false };
  }
  return {
    form: {
      title: draft.title,
      content: draft.content,
      eventId: draft.eventId,
      image: draft.image,
      imageFileName: draft.imageFileName,
      targetRoles: normalizeTargetsForPublisher(portalRole, draft.targetRoles),
      noticeCategory: draft.noticeCategory || NOTICE_CATEGORY_INFO
    },
    savedAt: draft.savedAt,
    hadDraft: true
  };
};

const PortalAnnouncementManage = ({
  portalRole = 'ctsv',
  showToast: showToastProp,
  detailPathPrefix,
  eventDetailPathPrefix,
}) => {
  const portalConfig = PORTAL_ANNOUNCEMENT_CONFIG[portalRole] || PORTAL_ANNOUNCEMENT_CONFIG.ctsv;
  const noun = portalConfig.noun || 'Thông báo';
  const nounLower = noun.toLowerCase();
  const canLinkEvents = portalRole === 'ctsv';
  const resolveAnnouncementDetailPath = (id) => {
    const annId = String(id || '').trim();
    if (!annId) return detailPathPrefix || getAnnouncementDetailPath(portalRole, '');
    if (detailPathPrefix) return `${detailPathPrefix}/${annId}`;
    return getAnnouncementDetailPath(portalRole, annId);
  };
  const resolveEventDetailPath = (eventId) => {
    const id = String(eventId || '').trim();
    if (!id) return null;
    if (eventDetailPathPrefix) return `${eventDetailPathPrefix}/${id}`;
    return getPortalEventDetailPath(portalRole, id);
  };
  const { showToast: ctxToast } = useOutletContext() || {};
  const showToast = showToastProp || ctxToast;
  const initialDraftRef = useRef(null);
  if (initialDraftRef.current === null) {
    initialDraftRef.current = readInitialDraftState(portalRole);
  }
  const initialDraft = initialDraftRef.current;

  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialDraft.form);
  const [draftSavedAt, setDraftSavedAt] = useState(initialDraft.savedAt);
  const [editingId, setEditingId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [targetAnnouncement, setTargetAnnouncement] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState('');
  const [cropFileName, setCropFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedId, setExpandedId] = useState(null);
  const [composeOpen, setComposeOpen] = useState(initialDraft.hadDraft);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const actionMenuWrapRef = useRef(null);
  const draftReadyRef = useRef(false);
  const draftRestoreToastShownRef = useRef(false);
  const showToastRef = useRef(showToast);
  const autosaveTimerRef = useRef(null);
  const bannerInputRef = useRef(null);
  const historyCardRef = useRef(null);

  showToastRef.current = showToast;

  useCloseOnClickOutside(actionMenuWrapRef, Boolean(openActionMenuId), () => setOpenActionMenuId(null));

  const handleStatsClick = (filterVal = 'all') => {
    setCategoryFilter(filterVal);
    historyCardRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const linkableEvents = useMemo(
    () => events.filter(isAnnouncementLinkableEvent),
    [events]
  );

  const eventTitleById = useMemo(() => {
    const map = {};
    linkableEvents.forEach((ev) => {
      const key = ev.id || ev._id;
      if (key) map[key] = formatAnnouncementEventLabel(ev);
    });
    return map;
  }, [linkableEvents]);

  const loadData = useCallback(async () => {
    setLoading(true);

    const promises = [
      fetchManagedAnnouncements().catch((err) => {
        const msg =
          err?.message?.includes('token') || err?.message?.includes('đăng nhập')
            ? err.message
            : `Không tải dữ liệu ${nounLower}. Hãy restart backend và đăng nhập lại.`;
        showToastRef.current?.(msg, 'error');
        return [];
      })
    ];

    if (canLinkEvents) {
      promises.push(
        fetchCtsvAnnouncementLinkableEvents().catch((err) => {
          console.error('Failed to load linkable events:', err);
          showToastRef.current?.('Không thể tải danh sách sự kiện liên kết do lỗi kết nối.', 'warning');
          return { events: [] };
        })
      );
    }

    const results = await Promise.all(promises);
    setHistory(results[0] || []);

    if (canLinkEvents && results[1]) {
      const list = results[1].events || [];
      setEvents(list);
      setForm((f) => {
        if (!f.eventId) return f;
        const stillValid = list.some(
          (ev) => String(ev.id || ev._id) === String(f.eventId)
        );
        return stillValid ? f : { ...f, eventId: '' };
      });
    }

    setLoading(false);
  }, [canLinkEvents]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    draftReadyRef.current = true;
    if (!initialDraft.hadDraft || draftRestoreToastShownRef.current) return;
    draftRestoreToastShownRef.current = true;
    showToastRef.current?.('Đã khôi phục bản nháp đã lưu.', 'info');
  }, [initialDraft.hadDraft]);

  const updateDraftSavedLabel = (at) => {
    if (!at) return;
    setDraftSavedAt((prev) => {
      if (prev && formatDraftSavedLabel(prev) === formatDraftSavedLabel(at)) return prev;
      return at;
    });
  };

  useEffect(() => {
    if (!draftReadyRef.current) return undefined;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      const at = saveAnnouncementDraft(form, portalRole);
      if (at) updateDraftSavedLabel(at);
    }, AUTOSAVE_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [form, portalRole]);

  useEffect(() => {
    const flush = () => {
      const at = saveAnnouncementDraft(form, portalRole);
      if (at) updateDraftSavedLabel(at);
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [form, portalRole]);

  const refreshAnnouncements = useCallback(async () => {
    const list = await fetchManagedAnnouncements();
    setHistory(list || []);
  }, []);

  const eventSourceById = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const key = ev.id || ev._id;
      if (key) map[String(key)] = ev.source || 'club';
    });
    return map;
  }, [events]);

  const visibleHistoryCount = useMemo(
    () => history.filter(isAnnouncementVisible).length,
    [history]
  );

  const historyThisWeek = useMemo(
    () =>
      history.filter(
        (a) => isAnnouncementVisible(a) && isPublishedThisWeek(getAnnouncementPublishedAt(a))
      ),
    [history]
  );

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = history.filter((a) => {
      const cat = resolveAnnouncementCategory(a, eventSourceById);
      if (categoryFilter === 'all') {
        if (cat === 'hidden') return false;
      } else if (cat !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      const evTitle = a.eventId?.title || '';
      return (
        (a.title || '').toLowerCase().includes(q) ||
        (a.content || '').toLowerCase().includes(q) ||
        evTitle.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.publishedAt) - new Date(b.publishedAt);
      }
      if (sortBy === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '', 'vi');
      }
      if (sortBy === 'title_desc') {
        return (b.title || '').localeCompare(a.title || '', 'vi');
      }
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    return list;
  }, [history, searchQuery, categoryFilter, sortBy, eventSourceById]);

  const selectedEventTitle = form.eventId ? eventTitleById[form.eventId] : null;
  const contentLength = form.content.length;
  const canPublish = form.title.trim() && form.content.trim();

  const validateForm = () => {
    if (!form.title.trim()) {
      showToast?.(`Nhập tiêu đề ${nounLower}.`, 'error');
      return false;
    }
    if (!form.content.trim()) {
      showToast?.(`Nhập nội dung ${nounLower}.`, 'error');
      return false;
    }
    return true;
  };

  const doPublish = async () => {
    if (!validateForm()) {
      setConfirmAction(null);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        targetRoles: normalizeTargetsForPublisher(portalRole, form.targetRoles),
        noticeCategory: form.noticeCategory,
        eventId: canLinkEvents && form.eventId ? form.eventId : undefined,
        image: form.image || undefined,
        imageFileName: form.imageFileName || undefined
      };
      if (editingId) {
        await updateManagedAnnouncement(editingId, payload);
        showToast?.(`Đã cập nhật ${nounLower}!`, 'success');
        setEditingId(null);
      } else {
        await createManagedAnnouncement(payload);
        showToast?.(`Đã phát hành ${nounLower}!`, 'success');
      }
      setForm({ ...EMPTY_FORM, targetRoles: getDefaultTargetRolesForPublisher(portalRole) });
      clearAnnouncementDraft(portalRole);
      setDraftSavedAt(null);
      await refreshAnnouncements();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSubmitting(false);
      setConfirmAction(null);
    }
  };

  const doHideAnnouncement = async () => {
    const annId = resolveAnnouncementId(targetAnnouncement);
    if (!annId) {
      showToast?.(`Không xác định được ${nounLower}.`, 'error');
      setConfirmAction(null);
      return;
    }
    setActionLoading(true);
    try {
      await hideManagedAnnouncement(annId);
      showToast?.(`Đã ẩn ${nounLower} khỏi danh sách.`, 'success');
      await refreshAnnouncements();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
      setTargetAnnouncement(null);
    }
  };

  const doDeleteAnnouncement = async () => {
    const annId = resolveAnnouncementId(targetAnnouncement);
    if (!annId) {
      showToast?.(`Không xác định được ${nounLower} cần xóa.`, 'error');
      setConfirmAction(null);
      return;
    }
    setActionLoading(true);
    try {
      await deleteManagedAnnouncement(annId);
      showToast?.(`Đã xóa ${nounLower}.`, 'success');
      await refreshAnnouncements();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
      setTargetAnnouncement(null);
    }
  };

  const startEditAnnouncement = async (announcement) => {
    const id = resolveAnnouncementId(announcement);
    if (!id) {
      showToast?.(`Không xác định được ${nounLower}.`, 'error');
      return;
    }
    setActionLoading(true);
    try {
      const fullDetails = await fetchManagedAnnouncement(id);
      setEditingId(id);
      setForm({
        title: fullDetails.title || '',
        content: fullDetails.content || '',
        eventId: fullDetails.eventId?._id || fullDetails.eventId || '',
        image: fullDetails.image || '',
        imageFileName: fullDetails.imageFileName || '',
        targetRoles: normalizeTargetsForPublisher(portalRole, fullDetails.targetRoles),
        noticeCategory: fullDetails.noticeCategory || NOTICE_CATEGORY_INFO
      });
      setComposeOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showToast?.(`Không thể tải chi tiết ${nounLower}: ` + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const duplicateAnnouncement = async (announcement) => {
    const id = resolveAnnouncementId(announcement);
    if (!id) {
      showToast?.(`Không xác định được ${nounLower}.`, 'error');
      return;
    }
    setActionLoading(true);
    try {
      const fullDetails = await fetchManagedAnnouncement(id);
      setEditingId(null);
      setForm({
        title: fullDetails.title ? `Bản sao - ${fullDetails.title}` : '',
        content: fullDetails.content || '',
        eventId: fullDetails.eventId?._id || fullDetails.eventId || '',
        image: fullDetails.image || '',
        imageFileName: fullDetails.imageFileName || '',
        targetRoles: normalizeTargetsForPublisher(portalRole, fullDetails.targetRoles),
        noticeCategory: fullDetails.noticeCategory || NOTICE_CATEGORY_INFO
      });
      setComposeOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast?.(`Đã nhân bản ${nounLower} — chỉnh sửa rồi phát hành.`, 'success');
    } catch (err) {
      showToast?.(`Không thể nhân bản ${nounLower}: ` + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const copyAnnouncementLink = async (announcement) => {
    const id = resolveAnnouncementId(announcement);
    if (!id) {
      showToast?.(`Không xác định được ${nounLower}.`, 'error');
      return;
    }
    const link = `${window.location.origin}/announcements/${id}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast?.('Đã sao chép liên kết!', 'success');
    } catch {
      showToast?.('Không thể sao chép liên kết.', 'error');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, targetRoles: getDefaultTargetRolesForPublisher(portalRole) });
    clearAnnouncementDraft(portalRole);
    setDraftSavedAt(null);
  };

  const openListConfirm = (type, announcement) => {
    const id = resolveAnnouncementId(announcement);
    if (!id) {
      showToast?.(`Không xác định được ${nounLower}.`, 'error');
      return;
    }
    setTargetAnnouncement({ id, title: announcement.title });
    setConfirmAction(type);
  };

  const doClearDraft = () => {
    setForm(EMPTY_FORM);
    setCropOpen(false);
    setCropSource('');
    setCropFileName('');
    if (bannerInputRef.current) bannerInputRef.current.value = '';
    clearAnnouncementDraft(portalRole);
    setDraftSavedAt(null);
    showToast?.('Đã xóa bản nháp.', 'info');
    setConfirmAction(null);
  };

  const handleBannerFile = (file) => {
    if (!file || submitting) return;
    if (!file.type.startsWith('image/')) {
      showToast?.('Chỉ chấp nhận file ảnh JPG, PNG hoặc WebP.', 'error');
      return;
    }
    if (file.size > BANNER_MAX_BYTES) {
      showToast?.('Ảnh tối đa 5MB. Vui lòng chọn file nhỏ hơn.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSource(reader.result);
      setCropFileName(file.name);
      setCropOpen(true);
    };
    reader.onerror = () => showToast?.('Không đọc được file ảnh.', 'error');
    reader.readAsDataURL(file);
  };

  const openBannerCropEditor = () => {
    if (!form.image || submitting) return;
    setCropSource(form.image);
    setCropFileName(form.imageFileName || 'announcement.jpg');
    setCropOpen(true);
  };

  const onCropConfirm = (dataUrl, fileName) => {
    setCropOpen(false);
    setCropSource('');
    if (!dataUrl) {
      showToast?.('Không xử lý được ảnh. Vui lòng thử lại.', 'error');
      return;
    }
    setForm((f) => ({
      ...f,
      image: dataUrl,
      imageFileName: fileName || f.imageFileName
    }));
    showToast?.('Đã áp dụng ảnh minh họa (16:9).', 'success');
  };

  const onCropCancel = () => {
    setCropOpen(false);
    setCropSource('');
  };

  const onBannerInputChange = (e) => {
    const file = e.target.files?.[0];
    handleBannerFile(file);
    e.target.value = '';
  };

  const removeBanner = () => {
    setForm((f) => ({ ...f, image: '', imageFileName: '' }));
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const handlePublishClick = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setConfirmAction(editingId ? 'update' : 'publish');
  };

  const handleClearDraftClick = () => {
    if (!form.title && !form.content && !form.eventId && !form.image) {
      showToast?.('Không có nội dung nháp để xóa.', 'info');
      return;
    }
    setConfirmAction('clear');
  };

  const draftLabel = formatDraftSavedLabel(draftSavedAt);

  return (
    <div className="ctsv-announce-page">
      <ConfirmDialog
        open={confirmAction === 'publish'}
        title={`Phát hành ${nounLower}?`}
        message={`${noun} sẽ được gửi tới: ${formatTargetRolesLabel(form.targetRoles)}. Bạn có chắc muốn phát hành?`}
        confirmLabel="Phát hành"
        cancelLabel="Quay lại"
        onConfirm={doPublish}
        onCancel={() => !submitting && setConfirmAction(null)}
        loading={submitting}
      />
      <ConfirmDialog
        open={confirmAction === 'update'}
        title={`Lưu thay đổi ${nounLower}?`}
        message={`Cập nhật sẽ áp dụng cho đối tượng: ${formatTargetRolesLabel(form.targetRoles)}. Bạn có chắc muốn lưu?`}
        confirmLabel="Lưu thay đổi"
        cancelLabel="Quay lại"
        onConfirm={doPublish}
        onCancel={() => !submitting && setConfirmAction(null)}
        loading={submitting}
      />
      <ConfirmDialog
        open={confirmAction === 'clear'}
        title="Xóa bản nháp?"
        message="Toàn bộ tiêu đề, ảnh minh họa, nội dung và liên kết sự kiện trong form sẽ bị xóa. Hành động này không thể hoàn tác."
        confirmLabel="Xóa nháp"
        cancelLabel="Giữ lại"
        onConfirm={doClearDraft}
        onCancel={() => setConfirmAction(null)}
        danger
      />
      <ConfirmDialog
        open={confirmAction === 'hide'}
        title={`Ẩn ${nounLower}?`}
        message={
          targetAnnouncement?.title
            ? `"${targetAnnouncement.title}" sẽ không hiển thị trong danh sách ${nounLower}.`
            : `${noun} sẽ không hiển thị trong danh sách.`
        }
        confirmLabel="Ẩn"
        cancelLabel="Hủy"
        onConfirm={doHideAnnouncement}
        onCancel={() => {
          if (!actionLoading) {
            setConfirmAction(null);
            setTargetAnnouncement(null);
          }
        }}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={confirmAction === 'delete'}
        title={`Xóa ${nounLower} vĩnh viễn?`}
        message={
          targetAnnouncement?.title
            ? `Bạn có chắc muốn xóa "${targetAnnouncement.title}"? Dữ liệu sẽ bị xóa vĩnh viễn và không thể khôi phục.`
            : `${noun} sẽ bị xóa khỏi hệ thống và không thể khôi phục.`
        }
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={doDeleteAnnouncement}
        onCancel={() => {
          if (!actionLoading) {
            setConfirmAction(null);
            setTargetAnnouncement(null);
          }
        }}
        danger
        loading={actionLoading}
      />

      <header className="ctsv-announce-hero">
        <div className="ctsv-announce-hero-text">
          <span className="ctsv-announce-eyebrow">{portalConfig.eyebrow}</span>
          <h1>{portalConfig.title}</h1>
          <p>{portalConfig.subtitle}</p>
        </div>
        <aside className="ctsv-announce-hero-aside" aria-hidden={loading}>
          <div className="ctsv-announce-hero-stats">
            <div
              className="ctsv-announce-hero-stat clickable"
              onClick={() => handleStatsClick('all')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleStatsClick('all')}
            >
              <span className="ctsv-announce-hero-stat-num">{visibleHistoryCount}</span>
              <span className="ctsv-announce-hero-stat-label">Tất cả {nounLower}</span>
            </div>
            <div
              className="ctsv-announce-hero-stat clickable"
              onClick={() => handleStatsClick('partner')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleStatsClick('partner')}
            >
              <span className="ctsv-announce-hero-stat-num">{historyThisWeek.length}</span>
              <span className="ctsv-announce-hero-stat-label">Đã phát hành trong tuần này</span>
            </div>
          </div>
        </aside>
      </header>

      <section className="ctsv-announce-compose-card">
        <button
          type="button"
          className="ctsv-announce-compose-toggle"
          aria-expanded={composeOpen}
          aria-controls="ctsv-announce-compose-panel"
          onClick={() => setComposeOpen((open) => !open)}
        >
          <div className="ctsv-announce-compose-toggle-main">
            <h2>{editingId ? `Chỉnh sửa ${nounLower}` : `Soạn ${nounLower} mới`}</h2>
            <p>{editingId ? 'Cập nhật nội dung và đối tượng nhận, sau đó xác nhận lưu.' : 'Điền đầy đủ tiêu đề, đối tượng nhận và nội dung trước khi gửi.'}</p>
            {draftLabel && (
              <p className="ctsv-announce-draft-status" aria-live="polite">
                Bản nháp tự động lưu lúc {draftLabel}
              </p>
            )}
          </div>
          <span
            className={`ctsv-announce-compose-chevron${composeOpen ? ' is-open' : ''}`}
            aria-hidden
          >
            <IconChevronDown />
          </span>
        </button>

        <div
          id="ctsv-announce-compose-panel"
          className={`ctsv-announce-compose-panel${composeOpen ? ' is-open' : ''}`}
        >
          <div className="ctsv-announce-compose-panel-inner">
            <div className="ctsv-announce-layout">
        <section className="ctsv-announce-form-card ctsv-announce-form-card--nested">
          <form className="ctsv-announce-form" onSubmit={handlePublishClick}>
            <label className="ctsv-announce-field">
              <span className="ctsv-announce-label">
                Tiêu đề <em>*</em>
              </span>
              <input
                className="ctsv-announce-input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="VD: Mở đăng ký FPT Music Night 2026"
                maxLength={200}
                disabled={submitting}
                required
              />
            </label>

            <TargetAudiencePicker
              portalRole={portalRole}
              value={form.targetRoles}
              onChange={(targetRoles) => setForm((f) => ({ ...f, targetRoles }))}
              disabled={submitting}
            />

            <NoticeCategoryPicker
              value={form.noticeCategory}
              onChange={(noticeCategory) => setForm((f) => ({ ...f, noticeCategory }))}
              disabled={submitting}
            />

            {canLinkEvents && (
            <label className="ctsv-announce-field">
              <span className="ctsv-announce-label">Liên kết sự kiện</span>
              <p className="ctsv-announce-cover-hint">
                Chỉ hiển thị sự kiện cấp trường (CTSV tạo) và sự kiện đối tác đã được CTSV cùng Admin phê
                duyệt. Sự kiện CLB do ICPDP quản lý — không hiển thị tại đây.
              </p>
              <AppSelect
                value={form.eventId}
                onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))}
                placeholder="— Không chọn sự kiện —"
                disabled={submitting || loading}
                options={[
                  { value: '', label: '— Không chọn sự kiện —' },
                  ...linkableEvents.map((ev) => ({
                    value: ev.id || ev._id,
                    label: formatAnnouncementEventLabel(ev)
                  }))
                ]}
              />
              {!loading && linkableEvents.length === 0 && (
                <span className="ctsv-announce-hint">
                  Chưa có sự kiện đủ điều kiện. Tạo sự kiện cấp trường hoặc duyệt đơn đối tác (CTSV + Admin)
                  trước.
                </span>
              )}
              {selectedEventTitle && (
                <span className="ctsv-announce-hint">
                  Gắn với: <strong>{selectedEventTitle}</strong>
                </span>
              )}
            </label>
            )}

            <div className="ctsv-announce-field">
              <span className="ctsv-announce-label">Ảnh minh họa</span>
              <p className="ctsv-announce-cover-hint">
                Tùy chọn. Sau khi chọn ảnh, kéo và zoom trong khung 16:9 rồi áp dụng. JPG, PNG, WebP — tối đa 5MB.
              </p>
              <input
                ref={bannerInputRef}
                type="file"
                accept={BANNER_ACCEPT}
                className="ctsv-file-input-hidden"
                onChange={onBannerInputChange}
                disabled={submitting}
              />
              <div className="ctsv-banner-upload ctsv-announce-cover-upload">
                <div
                  className={`ctsv-banner-dropzone ${form.image ? 'has-image' : ''}`}
                  onClick={() => !submitting && bannerInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && !submitting && bannerInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!submitting) e.currentTarget.classList.add('is-dragover');
                  }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('is-dragover')}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('is-dragover');
                    if (!submitting) handleBannerFile(e.dataTransfer.files?.[0]);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {form.image ? (
                    <>
                      <img src={form.image} alt={`Xem trước ảnh ${nounLower}`} className="ctsv-banner-preview" />
                      <div className="ctsv-banner-overlay">
                        <span>Đổi ảnh</span>
                      </div>
                    </>
                  ) : (
                    <div className="ctsv-banner-placeholder">
                      <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden>
                        <path
                          d="M19 7h-1V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v1H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM8 6h8v1H8V6zm11 14H5V9h14v11z"
                          fill="currentColor"
                          opacity="0.4"
                        />
                        <path d="M12 17l-4-4h2.5V9h3v4H16l-4 4z" fill="currentColor" />
                      </svg>
                      <span className="ctsv-banner-upload-title">Tải ảnh lên</span>
                      <span className="ctsv-banner-upload-hint">Kéo thả hoặc bấm để chọn file</span>
                    </div>
                  )}
                </div>
                <div className="ctsv-banner-meta">
                  {form.imageFileName && (
                    <span className="ctsv-banner-filename" title={form.imageFileName}>
                      {form.imageFileName}
                    </span>
                  )}
                  <div className="ctsv-banner-meta-actions">
                    <button
                      type="button"
                      className="ctsv-btn-banner-secondary"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={submitting}
                    >
                      Chọn file
                    </button>
                    {form.image && (
                      <>
                        <button
                          type="button"
                          className="ctsv-btn-banner-secondary"
                          onClick={openBannerCropEditor}
                          disabled={submitting}
                        >
                          Cắt / chỉnh sửa
                        </button>
                        <button
                          type="button"
                          className="ctsv-btn-banner-remove"
                          onClick={removeBanner}
                          disabled={submitting}
                        >
                          Xóa ảnh
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <label className="ctsv-announce-field">
              <span className="ctsv-announce-label">
                Nội dung <em>*</em>
              </span>
              <textarea
                className="ctsv-announce-textarea"
                rows={8}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Mô tả thời gian, địa điểm, cách đăng ký và lưu ý quan trọng..."
                disabled={submitting}
                required
              />
              <span className="ctsv-announce-char">{contentLength} ký tự</span>
            </label>

            <div className="ctsv-announce-form-actions">
              <button
                type="submit"
                className="ctsv-announce-submit"
                disabled={submitting || !canPublish}
              >
                {submitting
                  ? editingId ? 'Đang lưu…' : 'Đang phát hành…'
                  : editingId ? 'Lưu thay đổi' : portalConfig.publishLabel}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="ctsv-announce-reset"
                  disabled={submitting}
                  onClick={cancelEdit}
                >
                  Hủy sửa
                </button>
              )}
              <button
                type="button"
                className="ctsv-announce-reset"
                disabled={submitting}
                onClick={handleClearDraftClick}
              >
                Xóa nháp
              </button>
            </div>
          </form>
        </section>

        <aside className="ctsv-announce-aside">
          <div className="ctsv-announce-tip-card">
            <h3>Gợi ý nội dung</h3>
            <ul>
              <li>Chỉ gắn sự kiện cấp trường hoặc đối tác đã duyệt đủ (không gắn sự kiện CLB)</li>
              <li>Nêu rõ thời gian và địa điểm tổ chức</li>
              <li>Hướng dẫn đăng ký / check-in cho sinh viên</li>
              <li>Thêm ảnh minh họa để thu hút sinh viên (tùy chọn)</li>
              <li>Liên hệ phụ trách khi cần hỗ trợ</li>
            </ul>
          </div>
          {(form.title || form.content || form.image) && (
            <div className="ctsv-announce-preview-card">
              <h3>Xem trước</h3>
              {form.image && (
                <img
                  src={form.image}
                  alt=""
                  className="ctsv-announce-preview-cover"
                />
              )}
              <p className="ctsv-announce-preview-title">
                {form.title.trim() || `Tiêu đề ${nounLower}`}
              </p>
              {selectedEventTitle && (
                <span className="ctsv-announce-preview-event">{selectedEventTitle}</span>
              )}
              <p className="ctsv-announce-preview-body">{excerpt(form.content, 200)}</p>
            </div>
          )}
        </aside>
            </div>
          </div>
        </div>
      </section>

      <section ref={historyCardRef} className="ctsv-announce-history-card">
        <div className="ctsv-announce-card-head">
          <h2>Danh sách {nounLower}</h2>
          <p>Xem, tìm kiếm và quản lý {nounLower} đã phát hành trên toàn trường.</p>
        </div>

        <div className="ctsv-announce-browse-toolbar">
          <label className="ctsv-events-search ctsv-announce-browse-search">
            <span className="ctsv-events-search-icon">
              <IconSearch />
            </span>
            <input
              type="search"
              className="ctsv-events-search-input"
              placeholder="Tìm theo tiêu đề, nội dung, sự kiện…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <div className="ctsv-announce-browse-filters">
            <AppSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={CATEGORY_FILTERS}
              fullWidth={false}
              aria-label="Lọc danh mục"
            />
            <AppSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={SORT_OPTIONS}
              fullWidth={false}
              aria-label="Sắp xếp"
            />
          </div>
        </div>

        <p className="ctsv-events-filter-summary" aria-live="polite">
          Hiển thị <strong>{filteredHistory.length}</strong> / {history.length} {nounLower}
          {categoryFilter !== 'all' && (
            <>
              {' '}
              · Danh mục:{' '}
              <strong>
                {CATEGORY_FILTERS.find((c) => c.value === categoryFilter)?.label}
              </strong>
            </>
          )}
        </p>

        {loading ? (
          <p className="ctsv-announce-empty">Đang tải danh sách…</p>
        ) : filteredHistory.length === 0 ? (
          <div className="ctsv-announce-empty-state">
            <span className="ctsv-announce-empty-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </span>
            <p>
              {history.length === 0
                ? `Chưa có ${nounLower} nào được phát hành.`
                : `Không tìm thấy ${nounLower} phù hợp — thử đổi từ khóa hoặc danh mục.`}
            </p>
            {(searchQuery || categoryFilter !== 'all') && (
              <button
                type="button"
                className="ctsv-announce-reset"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setSortBy('newest');
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <ul className="ctsv-announce-history-list">
            {filteredHistory.map((a) => {
              const annId = resolveAnnouncementId(a);
              const cat = resolveAnnouncementCategory(a, eventSourceById);
              const isExpanded = expandedId === annId;
              const evId = a.eventId?._id || a.eventId;
              return (
                <li key={a._id || annId} className="ctsv-announce-history-item">
                  <div className="ctsv-announce-history-thumb-wrapper">
                    <img
                      src={`${API_BASE}/api/announcements/${annId}/image`}
                      alt=""
                      className="ctsv-announce-history-thumb"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="ctsv-announce-history-icon" aria-hidden style={{ display: 'none' }}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    </div>
                  </div>
                  <div className="ctsv-announce-history-body">
                    <div className="ctsv-announce-history-title-row">
                      <h3>{a.title}</h3>
                      <span className={`ctsv-announce-cat-pill ctsv-announce-cat-pill--${cat}`}>
                        {ANNOUNCEMENT_CATEGORY_LABELS[cat] || cat}
                      </span>
                      <span className={`ctsv-announce-notice-pill ctsv-announce-notice-pill--${a.noticeCategory || 'info'}`}>
                        {getNoticeCategoryLabel(a.noticeCategory)}
                      </span>
                    </div>
                  </div>
                  <div className="ctsv-announce-history-meta">
                    <time dateTime={a.publishedAt}>{formatHistoryMetaTime(a.publishedAt)}</time>
                    <span className="ctsv-announce-history-targets">
                      Gửi tới: {formatTargetRolesLabel(a.targetRoles)}
                    </span>
                  </div>
                  <div className="ctsv-announce-history-content">
                    <p className={isExpanded ? 'is-expanded' : undefined}>
                      {isExpanded ? a.content : excerpt(a.content)}
                    </p>
                    {isExpanded && a.content && a.content.length > 120 && (
                      <button
                        type="button"
                        className="ctsv-announce-read-toggle"
                        onClick={() => setExpandedId(null)}
                      >
                        Thu gọn
                      </button>
                    )}
                    {!isExpanded && (a.content || '').length > 120 && (
                      <button
                        type="button"
                        className="ctsv-announce-read-toggle"
                        onClick={() => setExpandedId(annId)}
                      >
                        Xem đầy đủ
                      </button>
                    )}
                  </div>
                  <div className="ctsv-announce-history-actions">
                    {evId && canLinkEvents && (
                      <Link
                        to={resolveEventDetailPath(evId)}
                        className="ctsv-announce-history-btn ctsv-announce-history-btn--event"
                        title="Xem sự kiện"
                        aria-label="Xem sự kiện"
                      >
                        <CtsvActionIcon type="event" />
                      </Link>
                    )}
                    <Link
                      to={resolveAnnouncementDetailPath(annId)}
                      className="ctsv-announce-history-btn ctsv-announce-history-btn--detail"
                      title={`Chi tiết ${nounLower}`}
                      aria-label={`Chi tiết ${nounLower}`}
                    >
                      <CtsvActionIcon type="detail" />
                    </Link>
                    <button
                      type="button"
                      className="ctsv-announce-history-btn ctsv-announce-history-btn--copy"
                      onClick={() => copyAnnouncementLink(a)}
                      title="Sao chép liên kết"
                      aria-label="Sao chép liên kết"
                    >
                      <CtsvActionIcon type="copy" />
                    </button>
                    <div
                      className="ctsv-announce-history-more"
                      ref={openActionMenuId === annId ? actionMenuWrapRef : undefined}
                    >
                      <button
                        type="button"
                        className={`ctsv-announce-history-btn ctsv-announce-history-btn--more${openActionMenuId === annId ? ' is-open' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionMenuId(openActionMenuId === annId ? null : annId);
                        }}
                        disabled={actionLoading || submitting}
                        title="Thêm thao tác"
                        aria-label="Thêm thao tác"
                        aria-expanded={openActionMenuId === annId}
                        aria-haspopup="menu"
                      >
                        <CtsvActionIcon type="more" />
                      </button>
                      {openActionMenuId === annId && (
                        <div className="ctsv-announce-kebab-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                          {!a.isHidden && (
                            <button
                              type="button"
                              className="ctsv-announce-kebab-item"
                              role="menuitem"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                startEditAnnouncement(a);
                              }}
                              disabled={actionLoading || submitting}
                            >
                              <CtsvActionIcon type="edit" size={16} />
                              Sửa {nounLower}
                            </button>
                          )}
                          <button
                            type="button"
                            className="ctsv-announce-kebab-item"
                            role="menuitem"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              duplicateAnnouncement(a);
                            }}
                            disabled={actionLoading || submitting}
                          >
                            <CtsvActionIcon type="duplicate" size={16} />
                            Nhân bản
                          </button>
                          {!a.isHidden && (
                            <button
                              type="button"
                              className="ctsv-announce-kebab-item"
                              role="menuitem"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                openListConfirm('hide', a);
                              }}
                              disabled={actionLoading || submitting}
                            >
                              <CtsvActionIcon type="hide" size={16} />
                              Ẩn {nounLower}
                            </button>
                          )}
                          <button
                            type="button"
                            className="ctsv-announce-kebab-item ctsv-announce-kebab-item--danger"
                            role="menuitem"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              openListConfirm('delete', a);
                            }}
                            disabled={actionLoading || submitting}
                          >
                            <CtsvActionIcon type="delete" size={16} />
                            Xóa {nounLower}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <BannerCropModal
        open={cropOpen}
        imageSrc={cropSource}
        fileName={cropFileName}
        onConfirm={onCropConfirm}
        onCancel={onCropCancel}
      />
    </div>
  );
};

export { PortalAnnouncementManage };

const CtsvAnnouncementPublish = () => <PortalAnnouncementManage portalRole="ctsv" />;
export default CtsvAnnouncementPublish;

export const AdminAnnouncementManage = () => <PortalAnnouncementManage portalRole="admin" />;
export const IcpdpAnnouncementManage = () => <PortalAnnouncementManage portalRole="icpdp" />;
export const ClubAnnouncementManage = ({ showToast }) => (
  <PortalAnnouncementManage portalRole="club_manager" showToast={showToast} />
);
export const PartnerAnnouncementManage = () => <PortalAnnouncementManage portalRole="partner" />;
