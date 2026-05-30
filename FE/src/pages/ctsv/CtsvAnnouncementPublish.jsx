import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import BannerCropModal from '../../components/ctsv/BannerCropModal';
import CtsvActionIcon from '../../components/ctsv/CtsvActionIcon';
import AppSelect from '../../components/ui/AppSelect';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  deleteCtsvAnnouncement,
  fetchCtsvAnnouncementLinkableEvents,
  fetchCtsvAnnouncements,
  hideCtsvAnnouncement,
  publishCtsvAnnouncement
} from '../../services/ctsvApi';
import {
  clearAnnouncementDraft,
  formatDraftSavedLabel,
  loadAnnouncementDraft,
  saveAnnouncementDraft
} from '../../utils/announcementDraft';
import { resolveAnnouncementId } from '../../utils/announcementId';
import {
  formatAnnouncementEventLabel,
  isAnnouncementLinkableEvent
} from '../../utils/announcementEvents';
import { formatPartnerDate } from '../../utils/partnerDisplay';

const AUTOSAVE_MS = 800;
const BANNER_MAX_BYTES = 5 * 1024 * 1024;
const BANNER_ACCEPT = 'image/jpeg,image/png,image/webp';
const EMPTY_FORM = { title: '', content: '', eventId: '', image: '', imageFileName: '' };

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

const hasDraftContent = (draft) =>
  !!(draft && (draft.title || draft.content || draft.eventId || draft.image));

const readInitialDraftState = () => {
  const draft = loadAnnouncementDraft();
  if (!hasDraftContent(draft)) {
    return { form: EMPTY_FORM, savedAt: null, hadDraft: false };
  }
  return {
    form: {
      title: draft.title,
      content: draft.content,
      eventId: draft.eventId,
      image: draft.image,
      imageFileName: draft.imageFileName
    },
    savedAt: draft.savedAt,
    hadDraft: true
  };
};

const CtsvAnnouncementPublish = () => {
  const { showToast } = useOutletContext() || {};
  const initialDraftRef = useRef(null);
  if (initialDraftRef.current === null) {
    initialDraftRef.current = readInitialDraftState();
  }
  const initialDraft = initialDraftRef.current;

  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialDraft.form);
  const [draftSavedAt, setDraftSavedAt] = useState(initialDraft.savedAt);
  const [confirmAction, setConfirmAction] = useState(null);
  const [targetAnnouncement, setTargetAnnouncement] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState('');
  const [cropFileName, setCropFileName] = useState('');
  const draftReadyRef = useRef(false);
  const draftRestoreToastShownRef = useRef(false);
  const showToastRef = useRef(showToast);
  const autosaveTimerRef = useRef(null);
  const bannerInputRef = useRef(null);

  showToastRef.current = showToast;

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
    try {
      const [eventsRes, annRes] = await Promise.all([
        fetchCtsvAnnouncementLinkableEvents(),
        fetchCtsvAnnouncements()
      ]);
      const list = eventsRes.events || [];
      setEvents(list);
      setForm((f) => {
        if (!f.eventId) return f;
        const stillValid = list.some(
          (ev) => String(ev.id || ev._id) === String(f.eventId)
        );
        return stillValid ? f : { ...f, eventId: '' };
      });
      setHistory(annRes.announcements || []);
    } catch {
      showToastRef.current?.('Không tải dữ liệu thông báo.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

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
      const at = saveAnnouncementDraft(form);
      if (at) updateDraftSavedLabel(at);
    }, AUTOSAVE_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [form]);

  useEffect(() => {
    const flush = () => {
      const at = saveAnnouncementDraft(form);
      if (at) updateDraftSavedLabel(at);
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [form]);

  const refreshAnnouncements = useCallback(async () => {
    const d = await fetchCtsvAnnouncements();
    setHistory(d.announcements || []);
  }, []);

  const historyThisWeek = useMemo(
    () => history.filter((a) => !a.isHidden && isPublishedThisWeek(a.publishedAt)),
    [history]
  );

  const selectedEventTitle = form.eventId ? eventTitleById[form.eventId] : null;
  const contentLength = form.content.length;
  const canPublish = form.title.trim() && form.content.trim();

  const validateForm = () => {
    if (!form.title.trim()) {
      showToast?.('Nhập tiêu đề thông báo.', 'error');
      return false;
    }
    if (!form.content.trim()) {
      showToast?.('Nhập nội dung thông báo.', 'error');
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
      await publishCtsvAnnouncement({
        title: form.title.trim(),
        content: form.content.trim(),
        eventId: form.eventId || undefined,
        image: form.image || undefined,
        imageFileName: form.imageFileName || undefined
      });
      showToast?.('Đã phát hành thông báo chính thức!', 'success');
      setForm(EMPTY_FORM);
      clearAnnouncementDraft();
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
      showToast?.('Không xác định được thông báo.', 'error');
      setConfirmAction(null);
      return;
    }
    setActionLoading(true);
    try {
      await hideCtsvAnnouncement(annId);
      showToast?.('Đã ẩn thông báo khỏi danh sách.', 'success');
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
      showToast?.('Không xác định được thông báo cần xóa.', 'error');
      setConfirmAction(null);
      return;
    }
    setActionLoading(true);
    try {
      await deleteCtsvAnnouncement(annId);
      showToast?.('Đã xóa thông báo.', 'success');
      await refreshAnnouncements();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
      setTargetAnnouncement(null);
    }
  };

  const openListConfirm = (type, announcement) => {
    const id = resolveAnnouncementId(announcement);
    if (!id) {
      showToast?.('Không xác định được thông báo.', 'error');
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
    clearAnnouncementDraft();
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
    setConfirmAction('publish');
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
        title="Phát hành thông báo?"
        message="Thông báo sẽ được gửi chính thức đến sinh viên và CLB. Bạn có chắc muốn phát hành?"
        confirmLabel="Phát hành"
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
        title="Ẩn thông báo?"
        message={
          targetAnnouncement?.title
            ? `"${targetAnnouncement.title}" sẽ không hiển thị trong danh sách tuần này.`
            : 'Thông báo sẽ không hiển thị trong danh sách tuần này.'
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
        title="Xóa thông báo vĩnh viễn?"
        message={
          targetAnnouncement?.title
            ? `Bạn có chắc muốn xóa "${targetAnnouncement.title}"? Dữ liệu sẽ bị xóa vĩnh viễn và không thể khôi phục.`
            : 'Thông báo sẽ bị xóa khỏi hệ thống và không thể khôi phục.'
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
          <span className="ctsv-announce-eyebrow">Truyền thông CTSV</span>
          <h1>Phát hành thông báo chính thức</h1>
          <p>
            Đăng thông báo sau khi sự kiện được phê duyệt — sinh viên và CLB nhận tin qua cổng F-Events.
          </p>
        </div>
        <div className="ctsv-announce-hero-stat" aria-hidden={loading}>
          <span className="ctsv-announce-hero-stat-num">{historyThisWeek.length}</span>
          <span className="ctsv-announce-hero-stat-label">Đã phát hành trong tuần này</span>
        </div>
      </header>

      <div className="ctsv-announce-layout">
        <section className="ctsv-announce-form-card">
          <div className="ctsv-announce-card-head">
            <h2>Soạn thông báo mới</h2>
            <p>Điền đầy đủ tiêu đề và nội dung trước khi gửi đến cộng đồng.</p>
            {draftLabel && (
              <p className="ctsv-announce-draft-status" aria-live="polite">
                Bản nháp tự động lưu lúc {draftLabel}
              </p>
            )}
          </div>

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
                      <img src={form.image} alt="Xem trước ảnh thông báo" className="ctsv-banner-preview" />
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
                {submitting ? 'Đang phát hành…' : 'Phát hành thông báo'}
              </button>
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
                {form.title.trim() || 'Tiêu đề thông báo'}
              </p>
              {selectedEventTitle && (
                <span className="ctsv-announce-preview-event">{selectedEventTitle}</span>
              )}
              <p className="ctsv-announce-preview-body">{excerpt(form.content, 200)}</p>
            </div>
          )}
        </aside>
      </div>

      <section className="ctsv-announce-history-card">
        <div className="ctsv-announce-card-head">
          <h2>Đã phát hành trong tuần này</h2>
          <p>{historyThisWeek.length} thông báo từ thứ Hai đến hôm nay</p>
        </div>

        {loading ? (
          <p className="ctsv-announce-empty">Đang tải danh sách…</p>
        ) : historyThisWeek.length === 0 ? (
          <div className="ctsv-announce-empty-state">
            <span className="ctsv-announce-empty-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </span>
            <p>Chưa có thông báo nào được phát hành trong tuần này.</p>
          </div>
        ) : (
          <ul className="ctsv-announce-history-list">
            {historyThisWeek.map((a) => {
              const evId = a.eventId?._id || a.eventId;
              const linkedTitle =
                a.eventId?.title || (evId && eventTitleById[evId]) || null;
              return (
                <li key={a._id} className="ctsv-announce-history-item">
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
                    <h3>{a.title}</h3>
                    <p>{excerpt(a.content)}</p>
                    <div className="ctsv-announce-history-meta">
                      <time dateTime={a.publishedAt}>{formatDateTime(a.publishedAt)}</time>
                      {linkedTitle && (
                        <span className="ctsv-announce-history-event">{linkedTitle}</span>
                      )}
                    </div>
                  </div>
                  <div className="ctsv-announce-history-actions">
                    {evId && (
                      <Link
                        to={`/ctsv/events/${evId}`}
                        className="ctsv-announce-history-btn ctsv-announce-history-btn--event"
                        title="Xem sự kiện"
                        aria-label="Xem sự kiện"
                      >
                        <CtsvActionIcon type="event" />
                      </Link>
                    )}
                    <button
                      type="button"
                      className="ctsv-announce-history-btn ctsv-announce-history-btn--hide"
                      onClick={() => openListConfirm('hide', a)}
                      disabled={actionLoading || submitting}
                      title="Ẩn thông báo"
                      aria-label="Ẩn thông báo"
                    >
                      <CtsvActionIcon type="hide" />
                    </button>
                    <button
                      type="button"
                      className="ctsv-announce-history-btn ctsv-announce-history-btn--delete"
                      onClick={() => openListConfirm('delete', a)}
                      disabled={actionLoading || submitting}
                      title="Xóa thông báo"
                      aria-label="Xóa thông báo"
                    >
                      <CtsvActionIcon type="delete" />
                    </button>
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

export default CtsvAnnouncementPublish;
