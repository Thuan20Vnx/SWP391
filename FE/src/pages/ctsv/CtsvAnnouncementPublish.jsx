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
  hideManagedAnnouncement,
  updateManagedAnnouncement
} from '../../services/announcementManageApi';
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
  getAnnouncementCategoryLabel,
  isAnnouncementLinkableEvent,
  resolveAnnouncementCategory
} from '../../utils/announcementEvents';
import { resolveAnnouncementId } from '../../utils/announcementId';
import { useTranslation } from '../../i18n/I18nContext';
import { mapSelectOptions } from '../../i18n/helpers';
import { localizeManagedAnnouncement } from '../../utils/localizeAnnouncement';

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
  { value: 'all', labelKey: 'announce.filter.allCategories' },
  { value: 'general', labelKey: 'announce.filter.general' },
  { value: 'school', labelKey: 'announce.filter.school' },
  { value: 'partner', labelKey: 'announce.filter.partner' },
  { value: 'hidden', labelKey: 'announce.filter.hidden' },
];

const SORT_OPTIONS = [
  { value: 'newest', labelKey: 'announce.sort.newest' },
  { value: 'oldest', labelKey: 'announce.sort.oldest' },
  { value: 'title_asc', labelKey: 'announce.sort.titleAsc' },
  { value: 'title_desc', labelKey: 'announce.sort.titleDesc' },
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

const formatDateTime = (value, locale = 'vi-VN') => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return formatPartnerDate(value);
  }
};

const excerpt = (text, max = 120, emptyLabel = '') => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return emptyLabel;
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
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
  const { t, language } = useTranslation();
  const portalConfig = PORTAL_ANNOUNCEMENT_CONFIG[portalRole] || PORTAL_ANNOUNCEMENT_CONFIG.ctsv;
  const portalTexts = useMemo(
    () => ({
      eyebrow: t(portalConfig.eyebrowKey),
      title: t(portalConfig.titleKey),
      subtitle: t(portalConfig.subtitleKey),
      publishLabel: t(portalConfig.publishLabelKey),
    }),
    [portalConfig, t],
  );
  const categoryFilterOptions = useMemo(() => mapSelectOptions(CATEGORY_FILTERS, t), [t]);
  const sortOptions = useMemo(() => mapSelectOptions(SORT_OPTIONS, t), [t]);
  const dateLocale = language === 'en' ? 'en-US' : 'vi-VN';
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

  showToastRef.current = showToast;

  useCloseOnClickOutside(actionMenuWrapRef, Boolean(openActionMenuId), () => setOpenActionMenuId(null));

  const linkableEvents = useMemo(
    () => events.filter(isAnnouncementLinkableEvent),
    [events]
  );

  const eventTitleById = useMemo(() => {
    const map = {};
    linkableEvents.forEach((ev) => {
      const key = ev.id || ev._id;
      if (key) map[key] = formatAnnouncementEventLabel(ev, t, language);
    });
    return map;
  }, [linkableEvents, t, language]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const annRes = await fetchManagedAnnouncements();
      if (canLinkEvents) {
        const eventsRes = await fetchCtsvAnnouncementLinkableEvents();
        const list = eventsRes.events || [];
        setEvents(list);
        setForm((f) => {
          if (!f.eventId) return f;
          const stillValid = list.some(
            (ev) => String(ev.id || ev._id) === String(f.eventId)
          );
          return stillValid ? f : { ...f, eventId: '' };
        });
      }
      setHistory(annRes || []);
    } catch (err) {
      const msg =
        err?.message?.includes('token') || err?.message?.includes('đăng nhập')
          ? err.message
          : t('announce.toast.loadFail');
      showToastRef.current?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [canLinkEvents, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    draftReadyRef.current = true;
    if (!initialDraft.hadDraft || draftRestoreToastShownRef.current) return;
    draftRestoreToastShownRef.current = true;
    showToastRef.current?.(t('announce.toast.draftRestored'), 'info');
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
    () => history.filter((a) => !a.isHidden).length,
    [history]
  );

  const historyThisWeek = useMemo(
    () => history.filter((a) => !a.isHidden && isPublishedThisWeek(a.publishedAt)),
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
        return (a.title || '').localeCompare(b.title || '', language === 'en' ? 'en' : 'vi');
      }
      if (sortBy === 'title_desc') {
        return (b.title || '').localeCompare(a.title || '', language === 'en' ? 'en' : 'vi');
      }
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    return list;
  }, [history, searchQuery, categoryFilter, sortBy, eventSourceById, language]);

  const selectedEventTitle = form.eventId ? eventTitleById[form.eventId] : null;
  const contentLength = form.content.length;
  const canPublish = form.title.trim() && form.content.trim();

  const validateForm = () => {
    if (!form.title.trim()) {
      showToast?.(t('announce.toast.titleRequired'), 'error');
      return false;
    }
    if (!form.content.trim()) {
      showToast?.(t('announce.toast.contentRequired'), 'error');
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
        showToast?.(t('announce.toast.updated'), 'success');
        setEditingId(null);
      } else {
        await createManagedAnnouncement(payload);
        showToast?.(t('announce.toast.published'), 'success');
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
      showToast?.(t('announce.toast.noId'), 'error');
      setConfirmAction(null);
      return;
    }
    setActionLoading(true);
    try {
      await hideManagedAnnouncement(annId);
      showToast?.(t('announce.toast.hidden'), 'success');
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
      showToast?.(t('announce.toast.noId'), 'error');
      setConfirmAction(null);
      return;
    }
    setActionLoading(true);
    try {
      await deleteManagedAnnouncement(annId);
      showToast?.(t('announce.toast.deleted'), 'success');
      await refreshAnnouncements();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
      setTargetAnnouncement(null);
    }
  };

  const startEditAnnouncement = (announcement) => {
    const id = resolveAnnouncementId(announcement);
    if (!id) {
      showToast?.(t('announce.toast.noId'), 'error');
      return;
    }
    setEditingId(id);
    setForm({
      title: announcement.title || '',
      content: announcement.content || '',
      eventId: announcement.eventId?._id || announcement.eventId || '',
      image: announcement.image || '',
      imageFileName: announcement.imageFileName || '',
      targetRoles: normalizeTargetsForPublisher(portalRole, announcement.targetRoles),
      noticeCategory: announcement.noticeCategory || NOTICE_CATEGORY_INFO
    });
    setComposeOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      showToast?.(t('announce.toast.noId'), 'error');
      return;
    }
    setTargetAnnouncement({
      id,
      title: localizeManagedAnnouncement(announcement, t, language, eventTitleById).title,
    });
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
    showToast?.(t('announce.toast.draftCleared'), 'info');
    setConfirmAction(null);
  };

  const handleBannerFile = (file) => {
    if (!file || submitting) return;
    if (!file.type.startsWith('image/')) {
      showToast?.(t('announce.toast.imageType'), 'error');
      return;
    }
    if (file.size > BANNER_MAX_BYTES) {
      showToast?.(t('announce.toast.imageSize'), 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSource(reader.result);
      setCropFileName(file.name);
      setCropOpen(true);
    };
    reader.onerror = () => showToast?.(t('announce.toast.imageReadFail'), 'error');
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
      showToast?.(t('announce.toast.imageProcessFail'), 'error');
      return;
    }
    setForm((f) => ({
      ...f,
      image: dataUrl,
      imageFileName: fileName || f.imageFileName
    }));
    showToast?.(t('announce.toast.imageApplied'), 'success');
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
      showToast?.(t('announce.toast.noDraft'), 'info');
      return;
    }
    setConfirmAction('clear');
  };

  const draftLabel = formatDraftSavedLabel(draftSavedAt, dateLocale);

  return (
    <div className="ctsv-announce-page">
      <ConfirmDialog
        open={confirmAction === 'publish'}
        title={t('announce.dialog.publishTitle')}
        message={t('announce.dialog.publishMessage', {
          targets: formatTargetRolesLabel(form.targetRoles, t),
        })}
        confirmLabel={t('announce.dialog.publishConfirm')}
        cancelLabel={t('announce.dialog.back')}
        onConfirm={doPublish}
        onCancel={() => !submitting && setConfirmAction(null)}
        loading={submitting}
      />
      <ConfirmDialog
        open={confirmAction === 'update'}
        title={t('announce.dialog.saveTitle')}
        message={t('announce.dialog.saveMessage', {
          targets: formatTargetRolesLabel(form.targetRoles, t),
        })}
        confirmLabel={t('announce.form.saveChanges')}
        cancelLabel={t('announce.dialog.back')}
        onConfirm={doPublish}
        onCancel={() => !submitting && setConfirmAction(null)}
        loading={submitting}
      />
      <ConfirmDialog
        open={confirmAction === 'clear'}
        title={t('announce.dialog.clearDraftTitle')}
        message={t('announce.dialog.clearDraftMessage')}
        confirmLabel={t('announce.dialog.clearDraftConfirm')}
        cancelLabel={t('announce.dialog.keepDraft')}
        onConfirm={doClearDraft}
        onCancel={() => setConfirmAction(null)}
        danger
      />
      <ConfirmDialog
        open={confirmAction === 'hide'}
        title={t('announce.dialog.hideTitle')}
        message={
          targetAnnouncement?.title
            ? t('announce.dialog.hideMessageNamed', { title: targetAnnouncement.title })
            : t('announce.dialog.hideMessage')
        }
        confirmLabel={t('announce.hide')}
        cancelLabel={t('announce.dialog.cancel')}
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
        title={t('announce.dialog.deleteTitle')}
        message={
          targetAnnouncement?.title
            ? t('announce.dialog.deleteMessageNamed', { title: targetAnnouncement.title })
            : t('announce.dialog.deleteMessage')
        }
        confirmLabel={t('announce.delete')}
        cancelLabel={t('announce.dialog.cancel')}
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
          <span className="ctsv-announce-eyebrow">{portalTexts.eyebrow}</span>
          <h1>{portalTexts.title}</h1>
          <p>{portalTexts.subtitle}</p>
        </div>
        <div className="ctsv-announce-hero-stat" aria-hidden={loading}>
          <span className="ctsv-announce-hero-stat-num">{visibleHistoryCount}</span>
          <span className="ctsv-announce-hero-stat-label">{t('announce.visibleCount')}</span>
          <span className="ctsv-announce-hero-stat-sub">
            {t('announce.thisWeek', { count: historyThisWeek.length })}
          </span>
        </div>
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
            <h2>{editingId ? t('announce.composeEdit') : t('announce.composeNew')}</h2>
            <p>{editingId ? t('announce.composeEditDesc') : t('announce.composeNewDesc')}</p>
            {draftLabel && (
              <p className="ctsv-announce-draft-status" aria-live="polite">
                {t('announce.draftSaved', { time: draftLabel })}
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
                {t('announce.form.title')} <em>*</em>
              </span>
              <input
                className="ctsv-announce-input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t('announce.form.titlePlaceholder')}
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
              <span className="ctsv-announce-label">{t('announce.form.linkEvent')}</span>
              <p className="ctsv-announce-cover-hint">{t('announce.form.linkEventHint')}</p>
              <AppSelect
                value={form.eventId}
                onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))}
                placeholder={t('announce.event.none')}
                disabled={submitting || loading}
                options={[
                  { value: '', label: t('announce.event.none') },
                  ...linkableEvents.map((ev) => ({
                    value: ev.id || ev._id,
                    label: formatAnnouncementEventLabel(ev, t, language)
                  }))
                ]}
              />
              {!loading && linkableEvents.length === 0 && (
                <span className="ctsv-announce-hint">{t('announce.form.noEventsHint')}</span>
              )}
              {selectedEventTitle && (
                <span className="ctsv-announce-hint">
                  {t('announce.form.linkedTo', { title: selectedEventTitle })}
                </span>
              )}
            </label>
            )}

            <div className="ctsv-announce-field">
              <span className="ctsv-announce-label">{t('announce.form.coverImage')}</span>
              <p className="ctsv-announce-cover-hint">{t('announce.form.coverHint')}</p>
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
                      <img src={form.image} alt={t('announce.form.previewAlt')} className="ctsv-banner-preview" />
                      <div className="ctsv-banner-overlay">
                        <span>{t('announce.form.changeImage')}</span>
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
                      <span className="ctsv-banner-upload-title">{t('announce.form.uploadImage')}</span>
                      <span className="ctsv-banner-upload-hint">{t('announce.form.uploadHint')}</span>
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
                      {t('announce.form.chooseFile')}
                    </button>
                    {form.image && (
                      <>
                        <button
                          type="button"
                          className="ctsv-btn-banner-secondary"
                          onClick={openBannerCropEditor}
                          disabled={submitting}
                        >
                          {t('announce.form.cropEdit')}
                        </button>
                        <button
                          type="button"
                          className="ctsv-btn-banner-remove"
                          onClick={removeBanner}
                          disabled={submitting}
                        >
                          {t('announce.form.removeImage')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <label className="ctsv-announce-field">
              <span className="ctsv-announce-label">
                {t('announce.form.content')} <em>*</em>
              </span>
              <textarea
                className="ctsv-announce-textarea"
                rows={8}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder={t('announce.form.contentPlaceholder')}
                disabled={submitting}
                required
              />
              <span className="ctsv-announce-char">{t('announce.form.charCount', { count: contentLength })}</span>
            </label>

            <div className="ctsv-announce-form-actions">
              <button
                type="submit"
                className="ctsv-announce-submit"
                disabled={submitting || !canPublish}
              >
                {submitting
                  ? editingId ? t('announce.form.saving') : t('announce.form.publishing')
                  : editingId ? t('announce.form.saveChanges') : portalTexts.publishLabel}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="ctsv-announce-reset"
                  disabled={submitting}
                  onClick={cancelEdit}
                >
                  {t('announce.form.cancelEdit')}
                </button>
              )}
              <button
                type="button"
                className="ctsv-announce-reset"
                disabled={submitting}
                onClick={handleClearDraftClick}
              >
                {t('announce.form.clearDraft')}
              </button>
            </div>
          </form>
        </section>

        <aside className="ctsv-announce-aside">
          <div className="ctsv-announce-tip-card">
            <h3>{t('announce.form.tipsTitle')}</h3>
            <ul>
              <li>{t('announce.form.tip1')}</li>
              <li>{t('announce.form.tip2')}</li>
              <li>{t('announce.form.tip3')}</li>
              <li>{t('announce.form.tip4')}</li>
              <li>{t('announce.form.tip5')}</li>
            </ul>
          </div>
          {(form.title || form.content || form.image) && (
            <div className="ctsv-announce-preview-card">
              <h3>{t('announce.form.previewTitle')}</h3>
              {form.image && (
                <img
                  src={form.image}
                  alt=""
                  className="ctsv-announce-preview-cover"
                />
              )}
              <p className="ctsv-announce-preview-title">
                {form.title.trim() || t('announce.form.previewTitleFallback')}
              </p>
              {selectedEventTitle && (
                <span className="ctsv-announce-preview-event">{selectedEventTitle}</span>
              )}
              <p className="ctsv-announce-preview-body">{excerpt(form.content, 200, t('announce.noContent'))}</p>
            </div>
          )}
        </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="ctsv-announce-history-card">
        <div className="ctsv-announce-card-head">
          <h2>{t('announce.listTitle')}</h2>
          <p>{t('announce.listDesc')}</p>
        </div>

        <div className="ctsv-announce-browse-toolbar">
          <label className="ctsv-events-search ctsv-announce-browse-search">
            <span className="ctsv-events-search-icon">
              <IconSearch />
            </span>
            <input
              type="search"
              className="ctsv-events-search-input"
              placeholder={t('announce.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <div className="ctsv-announce-browse-filters">
            <AppSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={categoryFilterOptions}
              fullWidth={false}
              aria-label={t('announce.filterCategoryAria')}
            />
            <AppSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={sortOptions}
              fullWidth={false}
              aria-label={t('announce.sortAria')}
            />
          </div>
        </div>

        <p className="ctsv-events-filter-summary" aria-live="polite">
          {t('announce.showingCount', { shown: filteredHistory.length, total: history.length })}
          {categoryFilter !== 'all' && (
            <>
              {' '}
              · {t('announce.categoryLabel')}:{' '}
              <strong>
                {categoryFilterOptions.find((c) => c.value === categoryFilter)?.label}
              </strong>
            </>
          )}
        </p>

        {loading ? (
          <p className="ctsv-announce-empty">{t('announce.loadingList')}</p>
        ) : filteredHistory.length === 0 ? (
          <div className="ctsv-announce-empty-state">
            <span className="ctsv-announce-empty-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </span>
            <p>
              {history.length === 0 ? t('announce.emptyNone') : t('announce.emptyFilter')}
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
                {t('announce.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <ul className="ctsv-announce-history-list">
            {filteredHistory.map((a) => {
              const annId = resolveAnnouncementId(a);
              const display = localizeManagedAnnouncement(a, t, language, eventTitleById);
              const cat = resolveAnnouncementCategory(a, eventSourceById);
              const isExpanded = expandedId === annId;
              const evId = a.eventId?._id || a.eventId;
              const linkedTitle =
                display._localizedEventTitle ||
                a.eventId?.title ||
                (evId && eventTitleById[evId]) ||
                null;
              return (
                <li key={a._id || annId} className="ctsv-announce-history-item">
                  {a.image ? (
                    <img
                      src={a.image}
                      alt=""
                      className="ctsv-announce-history-thumb"
                    />
                  ) : (
                  <div className="ctsv-announce-history-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
                  )}
                  <div className="ctsv-announce-history-body">
                    <div className="ctsv-announce-history-title-row">
                      <h3>{display.title}</h3>
                      <span className={`ctsv-announce-cat-pill ctsv-announce-cat-pill--${cat}`}>
                        {getAnnouncementCategoryLabel(cat, t)}
                      </span>
                      <span className={`ctsv-announce-notice-pill ctsv-announce-notice-pill--${a.noticeCategory || 'info'}`}>
                        {getNoticeCategoryLabel(a.noticeCategory, t)}
                      </span>
                    </div>
                    <p>{isExpanded ? display.content : excerpt(display.content, 120, t('announce.noContent'))}</p>
                    {isExpanded && display.content && display.content.length > 120 && (
                      <button
                        type="button"
                        className="ctsv-announce-read-toggle"
                        onClick={() => setExpandedId(null)}
                      >
                        {t('announce.collapse')}
                      </button>
                    )}
                    {!isExpanded && (display.content || '').length > 120 && (
                      <button
                        type="button"
                        className="ctsv-announce-read-toggle"
                        onClick={() => setExpandedId(annId)}
                      >
                        {t('announce.expand')}
                      </button>
                    )}
                    <div className="ctsv-announce-history-meta">
                      <time dateTime={a.publishedAt}>{formatDateTime(a.publishedAt, dateLocale)}</time>
                      {linkedTitle && (
                        <span className="ctsv-announce-history-event">{linkedTitle}</span>
                      )}
                      {a.publishedByEmail && (
                        <span className="ctsv-announce-history-author">{a.publishedByEmail}</span>
                      )}
                      <span className="ctsv-announce-history-targets">
                        {t('announce.sentTo', { targets: formatTargetRolesLabel(a.targetRoles, t) })}
                      </span>
                    </div>
                  </div>
                  <div className="ctsv-announce-history-actions">
                    {evId && canLinkEvents && (
                      <Link
                        to={resolveEventDetailPath(evId)}
                        className="ctsv-announce-history-btn ctsv-announce-history-btn--event"
                        title={t('announce.viewEvent')}
                        aria-label={t('announce.viewEvent')}
                      >
                        <CtsvActionIcon type="event" />
                      </Link>
                    )}
                    <Link
                      to={resolveAnnouncementDetailPath(annId)}
                      className="ctsv-announce-history-btn ctsv-announce-history-btn--detail"
                      title={t('announce.viewDetail')}
                      aria-label={t('announce.viewDetail')}
                    >
                      <CtsvActionIcon type="detail" />
                    </Link>
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
                        title={t('announce.moreActions')}
                        aria-label={t('announce.moreActions')}
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
                              {t('announce.edit')}
                            </button>
                          )}
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
                              {t('announce.hide')}
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
                            {t('announce.delete')}
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
