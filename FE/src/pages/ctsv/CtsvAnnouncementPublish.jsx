import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import AppSelect from '../../components/ui/AppSelect';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fetchCtsvAnnouncements, fetchCtsvEvents, publishCtsvAnnouncement } from '../../services/ctsvApi';
import {
  clearAnnouncementDraft,
  formatDraftSavedLabel,
  loadAnnouncementDraft,
  saveAnnouncementDraft
} from '../../utils/announcementDraft';
import { formatPartnerDate } from '../../utils/partnerDisplay';

const AUTOSAVE_MS = 800;
const EMPTY_FORM = { title: '', content: '', eventId: '' };

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

const CtsvAnnouncementPublish = () => {
  const { showToast } = useOutletContext() || {};
  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const draftReadyRef = useRef(false);
  const autosaveTimerRef = useRef(null);

  const eventTitleById = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      if (ev.id) map[ev.id] = ev.title;
      if (ev._id) map[ev._id] = ev.title;
    });
    return map;
  }, [events]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, annRes] = await Promise.all([
        fetchCtsvEvents({ status: 'approved' }),
        fetchCtsvAnnouncements()
      ]);
      setEvents(eventsRes.events || []);
      setHistory(annRes.announcements || []);
    } catch {
      showToast?.('Không tải dữ liệu thông báo.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const draft = loadAnnouncementDraft();
    if (draft && (draft.title || draft.content || draft.eventId)) {
      setForm({
        title: draft.title,
        content: draft.content,
        eventId: draft.eventId
      });
      setDraftSavedAt(draft.savedAt);
      showToast?.('Đã khôi phục bản nháp đã lưu.', 'info');
    }
    draftReadyRef.current = true;
  }, [showToast]);

  useEffect(() => {
    if (!draftReadyRef.current) return undefined;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      const at = saveAnnouncementDraft(form);
      if (at) setDraftSavedAt(at);
    }, AUTOSAVE_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [form]);

  useEffect(() => {
    const flush = () => {
      const at = saveAnnouncementDraft(form);
      if (at) setDraftSavedAt(at);
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [form]);

  const historyThisWeek = useMemo(
    () => history.filter((a) => isPublishedThisWeek(a.publishedAt)),
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
        eventId: form.eventId || undefined
      });
      showToast?.('Đã phát hành thông báo chính thức!', 'success');
      setForm(EMPTY_FORM);
      clearAnnouncementDraft();
      setDraftSavedAt(null);
      const d = await fetchCtsvAnnouncements();
      setHistory(d.announcements || []);
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSubmitting(false);
      setConfirmAction(null);
    }
  };

  const doClearDraft = () => {
    setForm(EMPTY_FORM);
    clearAnnouncementDraft();
    setDraftSavedAt(null);
    showToast?.('Đã xóa bản nháp.', 'info');
    setConfirmAction(null);
  };

  const handlePublishClick = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setConfirmAction('publish');
  };

  const handleClearDraftClick = () => {
    if (!form.title && !form.content && !form.eventId) {
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
        message="Toàn bộ tiêu đề, nội dung và liên kết sự kiện trong form sẽ bị xóa. Hành động này không thể hoàn tác."
        confirmLabel="Xóa nháp"
        cancelLabel="Giữ lại"
        onConfirm={doClearDraft}
        onCancel={() => setConfirmAction(null)}
        danger
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
              <AppSelect
                value={form.eventId}
                onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))}
                placeholder="— Không chọn sự kiện —"
                disabled={submitting}
                options={[
                  { value: '', label: '— Không chọn sự kiện —' },
                  ...events.map((ev) => ({
                    value: ev.id || ev._id,
                    label: ev.title
                  }))
                ]}
              />
              {selectedEventTitle && (
                <span className="ctsv-announce-hint">
                  Gắn với: <strong>{selectedEventTitle}</strong>
                </span>
              )}
            </label>

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
              <li>Nêu rõ thời gian và địa điểm tổ chức</li>
              <li>Hướng dẫn đăng ký / check-in cho sinh viên</li>
              <li>Liên hệ phụ trách khi cần hỗ trợ</li>
            </ul>
          </div>
          {(form.title || form.content) && (
            <div className="ctsv-announce-preview-card">
              <h3>Xem trước</h3>
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
                  <div className="ctsv-announce-history-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
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
                  {evId && (
                    <Link
                      to={`/ctsv/events/${evId}`}
                      className="ctsv-announce-history-link"
                    >
                      Sự kiện
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default CtsvAnnouncementPublish;
