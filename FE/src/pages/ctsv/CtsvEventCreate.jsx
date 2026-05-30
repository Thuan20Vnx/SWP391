import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import BannerCropModal from '../../components/ctsv/BannerCropModal';
import AvatarCropModal from '../../components/profile/AvatarCropModal';
import AppSelect from '../../components/ui/AppSelect';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { createCtsvEvent, fetchCtsvEvent, updateCtsvEvent } from '../../services/ctsvApi';
import {
  clearSchoolEventDraft,
  formatDraftSavedLabel,
  loadSchoolEventDraft,
  saveSchoolEventDraft
} from '../../utils/schoolEventDraft';
import {
  SPEAKER_AVATAR_MAX_BYTES,
  SPEAKER_IMAGE_ACCEPT,
  buildSpeakersPayload,
  createEmptySpeakerRow,
  resolveEventSpeakers
} from '../../constants/eventSpeaker';
import { CTSV_CATEGORY_OPTIONS, normalizeEventCategory } from '../../constants/eventCategories';
import { canCtsvEditSchoolEvent } from '../../constants/eventWorkflow';

const TICKET_AUDIENCE_OPTIONS = ['SV FPT', 'Khách ngoài trường', 'Tất cả'];

const BANNER_MAX_BYTES = 5 * 1024 * 1024;
const BANNER_ACCEPT = 'image/jpeg,image/png,image/webp';

const EVENT_TYPES = [
  'Hội thảo & Workshop',
  'Âm nhạc & Giải trí',
  'Thể thao',
  'Kết nối doanh nghiệp',
  'Khác'
];

const CATEGORIES = CTSV_CATEGORY_OPTIONS;

const TICKET_CAP_EXTRA = 10;

/** Tổng vé tối đa = số tham dự dự kiến + 10 (vd: 50 người → tối đa 60 vé). */
const parseExpectedAttendees = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
};

const getMaxTicketTotal = (expectedAttendees) => {
  const parsed = parseExpectedAttendees(expectedAttendees);
  if (parsed == null) return TICKET_CAP_EXTRA;
  return parsed + TICKET_CAP_EXTRA;
};

const clampTicketRows = (rows, maxTotal) => {
  let used = 0;
  return rows.map((row) => {
    const requested = Math.max(0, Number(row.qty) || 0);
    const allowed = Math.max(0, maxTotal - used);
    const qty = Math.min(requested, allowed);
    used += qty;
    return { ...row, qty };
  });
};

const DEFAULT_TICKETS = [
  { id: 1, name: 'Vé sinh viên', priceType: 'free', priceAmount: '', qty: 50, audience: 'SV FPT' },
  { id: 2, name: 'Vé khách mời', priceType: 'free', priceAmount: '', qty: 10, audience: 'Khách ngoài trường' }
];

const formatTicketPriceLabel = (row) => {
  if (row.priceType === 'free') return 'Miễn phí';
  const amount = Number(String(row.priceAmount).replace(/\D/g, ''));
  if (!amount || amount < 0) return 'Có phí (chưa nhập)';
  return `${amount.toLocaleString('vi-VN')} đ`;
};

const TicketPriceEditor = ({ row, onChangeType, onChangeAmount }) => (
  <div className="ctsv-price-editor">
    <div className="ctsv-price-type-toggle" role="group" aria-label="Loại giá vé">
      <button
        type="button"
        className={`ctsv-price-type-btn ${row.priceType === 'free' ? 'active' : ''}`}
        onClick={() => onChangeType('free')}
      >
        Miễn phí
      </button>
      <button
        type="button"
        className={`ctsv-price-type-btn ${row.priceType === 'paid' ? 'active' : ''}`}
        onClick={() => onChangeType('paid')}
      >
        Có phí
      </button>
    </div>
    {row.priceType === 'paid' && (
      <div className="ctsv-price-amount-wrap">
        <input
          type="number"
          className="ctsv-input ctsv-price-amount-input"
          min={0}
          step={1000}
          value={row.priceAmount}
          onChange={(e) => onChangeAmount(e.target.value)}
          placeholder="0"
          inputMode="numeric"
        />
        <span className="ctsv-price-currency">đ</span>
      </div>
    )}
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 className="ctsv-form-section-title">
    <span className="ctsv-form-section-icon" aria-hidden />
    {children}
  </h2>
);

const Field = ({ label, required, hint, children }) => (
  <div className="ctsv-field">
    <label className="ctsv-field-label">
      {label}
      {required && <span className="ctsv-required"> *</span>}
    </label>
    {hint && <p className="ctsv-field-hint">{hint}</p>}
    {children}
  </div>
);

const buildDateTime = (dateStr, timeStr) => {
  if (!dateStr) return '';
  const t = timeStr || '09:00';
  return `${dateStr}T${t}`;
};

const toInputDate = (value) => {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toInputTime = (value) => {
  if (!value) return '14:00';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '14:00';
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

const mapEventToForm = (event) => ({
  title: event.title || '',
  eventType: event.eventType || 'Hội thảo & Workshop',
  category: normalizeEventCategory(event.category),
  description: event.description || '',
  eventDate: toInputDate(event.startDate),
  startTime: toInputTime(event.startDate),
  duration: event.duration || '3 tiếng',
  format: event.format || 'campus',
  location: event.location || '',
  expectedAttendees: event.expectedAttendees ? String(event.expectedAttendees) : '',
  agenda: event.agenda || '',
  image: event.image || ''
});

const mapEventToTickets = (event) => {
  if (!event.ticketTypes?.length) return DEFAULT_TICKETS;
  return event.ticketTypes.map((t, index) => ({
    id: index + 1,
    name: t.name || '',
    priceType: t.priceType === 'paid' ? 'paid' : 'free',
    priceAmount: t.priceType === 'paid' && t.priceAmount ? String(t.priceAmount) : '',
    qty: Number(t.qty ?? t.quantity) || 0,
    audience: t.audience || 'SV FPT'
  }));
};

const mapEventToSpeakers = (event) => {
  const list = resolveEventSpeakers(event);
  if (!list.length) return [];
  return list.map((speaker, index) => ({
    id: index + 1,
    name: speaker.name || '',
    role: speaker.role || '',
    avatar: speaker.avatar || ''
  }));
};

const EMPTY_FORM = {
  title: '',
  eventType: 'Hội thảo & Workshop',
  category: 'Công nghệ',
  description: '',
  eventDate: '',
  startTime: '14:00',
  duration: '3 tiếng',
  format: 'campus',
  location: '',
  expectedAttendees: '',
  agenda: '',
  image: ''
};

const CtsvEventCreate = () => {
  const { id: editEventId } = useParams();
  const location = useLocation();
  const isEditMode = Boolean(editEventId && location.pathname.endsWith('/edit'));
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [loadingEvent, setLoadingEvent] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [expectedAttendeesError, setExpectedAttendeesError] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tickets, setTickets] = useState(DEFAULT_TICKETS);
  const [speakers, setSpeakers] = useState([]);
  const [bannerFileName, setBannerFileName] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState('');
  const [cropFileName, setCropFileName] = useState('');
  const [speakerCrop, setSpeakerCrop] = useState({ open: false, speakerId: null, source: '', fileName: '' });
  const bannerInputRef = useRef(null);
  const draftRestoreToastShownRef = useRef(false);

  useEffect(() => {
    if (!isEditMode || !editEventId) return;
    setLoadingEvent(true);
    fetchCtsvEvent(editEventId)
      .then((data) => {
        const event = data.event;
        if (!canCtsvEditSchoolEvent(event)) {
          showToast?.('Sự kiện không thể chỉnh sửa ở trạng thái hiện tại.', 'error');
          navigate(`/ctsv/events/${editEventId}`);
          return;
        }
        setForm(mapEventToForm(event));
        setTickets(mapEventToTickets(event));
        setSpeakers(mapEventToSpeakers(event));
        setBannerFileName(event.bannerFileName || '');
      })
      .catch((err) => {
        showToast?.(err.message || 'Không tải được sự kiện.', 'error');
        navigate('/ctsv/events');
      })
      .finally(() => setLoadingEvent(false));
  }, [isEditMode, editEventId, navigate, showToast]);

  useEffect(() => {
    if (isEditMode) return;
    const draft = loadSchoolEventDraft();
    if (!draft?.form) return;
    const hasContent =
      draft.form.title ||
      draft.form.description ||
      draft.form.eventDate ||
      draft.form.image ||
      draft.form.location;
    if (!hasContent) return;
    setForm({
      ...EMPTY_FORM,
      ...draft.form,
      expectedAttendees: draft.form.expectedAttendees ?? '',
      category: normalizeEventCategory(draft.form.category)
    });
    if (draft.tickets?.length) setTickets(draft.tickets);
    if (draft.speakers?.length) {
      setSpeakers(draft.speakers);
    } else if (draft.form?.speaker) {
      setSpeakers([
        {
          id: 1,
          name: draft.form.speaker,
          role: draft.form.speakerRole || '',
          avatar: draft.form.speakerAvatar || ''
        }
      ]);
    }
    if (draft.bannerFileName) setBannerFileName(draft.bannerFileName);
    if (draft.savedAt) setDraftSavedAt(draft.savedAt);
    if (!draftRestoreToastShownRef.current) {
      draftRestoreToastShownRef.current = true;
      showToast?.('Đã khôi phục bản nháp tạo sự kiện.', 'info');
    }
  }, [showToast, isEditMode]);

  const parsedExpected = parseExpectedAttendees(form.expectedAttendees);
  const maxTicketTotal = getMaxTicketTotal(form.expectedAttendees);
  const allocatedTickets = tickets.reduce((s, t) => s + (Number(t.qty) || 0), 0);
  const expectedLabel =
    form.expectedAttendees === '' ? '—' : String(form.expectedAttendees);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === 'expectedAttendees') {
      const digits = value.replace(/\D/g, '');
      setExpectedAttendeesError(false);
      setForm((f) => ({ ...f, expectedAttendees: digits }));
      setTickets((rows) => clampTicketRows(rows, getMaxTicketTotal(digits)));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const updateSpeaker = (id, field, value) => {
    setSpeakers((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSpeakerAvatarFile = (id, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast?.('Chỉ chấp nhận file ảnh JPG, PNG hoặc WebP.', 'error');
      return;
    }
    if (file.size > SPEAKER_AVATAR_MAX_BYTES) {
      showToast?.('Ảnh đại diện tối đa 2MB. Vui lòng chọn file nhỏ hơn.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSpeakerCrop({
        open: true,
        speakerId: id,
        source: reader.result,
        fileName: file.name
      });
    };
    reader.onerror = () => showToast?.('Không đọc được file ảnh.', 'error');
    reader.readAsDataURL(file);
  };

  const openSpeakerAvatarEditor = (id) => {
    const row = speakers.find((s) => s.id === id);
    if (!row?.avatar) return;
    setSpeakerCrop({
      open: true,
      speakerId: id,
      source: row.avatar,
      fileName: 'speaker-avatar.jpg'
    });
  };

  const onSpeakerCropConfirm = (dataUrl) => {
    const { speakerId } = speakerCrop;
    setSpeakerCrop({ open: false, speakerId: null, source: '', fileName: '' });
    if (!dataUrl || speakerId == null) {
      if (dataUrl === null) showToast?.('Không xử lý được ảnh. Vui lòng thử lại.', 'error');
      return;
    }
    setSpeakers((rows) => rows.map((r) => (r.id === speakerId ? { ...r, avatar: dataUrl } : r)));
    showToast?.('Đã cập nhật ảnh đại diện diễn giả.', 'success');
  };

  const onSpeakerCropCancel = () => {
    setSpeakerCrop({ open: false, speakerId: null, source: '', fileName: '' });
  };

  const addSpeakerRow = () => {
    setSpeakers((rows) => [...rows, createEmptySpeakerRow()]);
  };

  const removeSpeakerRow = (id) => {
    setSpeakers((rows) => rows.filter((r) => r.id !== id));
  };

  const onExpectedAttendeesBlur = () => {
    setExpectedAttendeesError(parseExpectedAttendees(form.expectedAttendees) == null);
  };

  useEffect(() => {
    setTickets((rows) => clampTicketRows(rows, maxTicketTotal));
  }, [maxTicketTotal]);

  const updateTicket = (id, field, value) => {
    if (field === 'qty') {
      const requested = Math.max(0, Number(value) || 0);
      setTickets((rows) => {
        const otherSum = rows
          .filter((r) => r.id !== id)
          .reduce((s, r) => s + (Number(r.qty) || 0), 0);
        const allowed = Math.max(0, maxTicketTotal - otherSum);
        const qty = Math.min(requested, allowed);
        if (requested > allowed) {
          showToast?.(
            `Tổng số vé không được vượt quá ${maxTicketTotal} (số tham dự dự kiến + 10).`,
            'error'
          );
        }
        return rows.map((r) => (r.id === id ? { ...r, qty } : r));
      });
      return;
    }
    setTickets((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const setTicketPriceType = (id, priceType) => {
    setTickets((rows) =>
      rows.map((r) =>
        r.id === id
          ? { ...r, priceType, priceAmount: priceType === 'free' ? '' : r.priceAmount || '' }
          : r
      )
    );
  };

  const addTicketRow = () => {
    setTickets((rows) => [
      ...rows,
      { id: Date.now(), name: '', priceType: 'free', priceAmount: '', qty: 0, audience: 'SV FPT' }
    ]);
  };

  const handleBannerFile = (file) => {
    if (!file) return;
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
    if (!form.image) return;
    setCropSource(form.image);
    setCropFileName(bannerFileName || 'banner.jpg');
    setCropOpen(true);
  };

  const onCropConfirm = (dataUrl, fileName) => {
    setCropOpen(false);
    setCropSource('');
    if (!dataUrl) {
      showToast?.('Không xử lý được ảnh. Vui lòng thử lại.', 'error');
      return;
    }
    setForm((f) => ({ ...f, image: dataUrl }));
    if (fileName) setBannerFileName(fileName);
    showToast?.('Đã áp dụng ảnh bìa (16:9).', 'success');
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
    setForm((f) => ({ ...f, image: '' }));
    setBannerFileName('');
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const removeTicketRow = (id) => {
    if (tickets.length <= 1) return;
    setTickets((rows) => rows.filter((r) => r.id !== id));
  };

  const persistDraft = () => {
    const at = saveSchoolEventDraft({ form, tickets, speakers, bannerFileName });
    if (at) setDraftSavedAt(at);
    showToast?.('Đã lưu bản nháp.', 'success');
  };

  const doSubmit = async () => {
    if (!form.title.trim() || !form.eventDate) {
      showToast?.('Vui lòng điền tên sự kiện và ngày tổ chức.', 'error');
      setConfirmAction(null);
      return;
    }
    if (parseExpectedAttendees(form.expectedAttendees) == null) {
      setExpectedAttendeesError(true);
      showToast?.('Vui lòng nhập số lượng tham dự dự kiến (tối thiểu 1).', 'error');
      setConfirmAction(null);
      return;
    }
    if (!form.image) {
      showToast?.('Vui lòng tải và cắt ảnh bìa sự kiện.', 'error');
      setConfirmAction(null);
      return;
    }

    const invalidPaid = tickets.find(
      (t) => t.priceType === 'paid' && !(Number(String(t.priceAmount).replace(/\D/g, '')) > 0)
    );
    if (invalidPaid) {
      showToast?.('Vé có phí cần nhập số tiền lớn hơn 0.', 'error');
      setConfirmAction(null);
      return;
    }

    const totalTickets = tickets.reduce((s, t) => s + (Number(t.qty) || 0), 0);
    if (totalTickets > maxTicketTotal) {
      showToast?.(
        `Tổng số vé (${totalTickets}) vượt quá ${maxTicketTotal} (số tham dự dự kiến + 10).`,
        'error'
      );
      setConfirmAction(null);
      return;
    }
    const ticketTypes = tickets.map((t) => ({
      name: t.name,
      priceType: t.priceType,
      priceAmount: t.priceType === 'paid' ? Number(String(t.priceAmount).replace(/\D/g, '')) || 0 : 0,
      qty: Number(t.qty) || 0,
      audience: t.audience
    }));
    const speakerPayload = buildSpeakersPayload(speakers);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: normalizeEventCategory(form.category),
      startDate: buildDateTime(form.eventDate, form.startTime),
      location: form.location,
      totalTickets: Number(totalTickets) || 100,
      image: form.image,
      bannerFileName,
      eventType: form.eventType,
      duration: form.duration,
      format: form.format,
      speakers: speakerPayload,
      agenda: form.agenda,
      expectedAttendees: parsedExpected,
      ticketTypes
    };

    setSubmitting(true);
    try {
      const res = isEditMode
        ? await updateCtsvEvent(editEventId, payload)
        : await createCtsvEvent(payload);
      if (!isEditMode) {
        clearSchoolEventDraft();
        setDraftSavedAt(null);
      }
      showToast?.(
        res.message ||
          (isEditMode
            ? 'Đã cập nhật và gửi lại Admin phê duyệt.'
            : 'Đã gửi đơn tổ chức sự kiện. Chờ Admin phê duyệt.'),
        'success'
      );
      navigate(`/ctsv/events/${res.event.id}`);
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSubmitting(false);
      setConfirmAction(null);
    }
  };

  const draftLabel = formatDraftSavedLabel(draftSavedAt);
  const cancelPath = isEditMode ? `/ctsv/events/${editEventId}` : '/ctsv/events';

  if (loadingEvent) {
    return (
      <div className="ctsv-page ctsv-create-page">
        <p className="ctsv-muted">Đang tải thông tin sự kiện…</p>
      </div>
    );
  }

  return (
    <div className="ctsv-page ctsv-create-page">
      <ConfirmDialog
        open={confirmAction === 'cancel'}
        title={isEditMode ? 'Hủy chỉnh sửa?' : 'Hủy tạo sự kiện?'}
        message="Thay đổi chưa lưu sẽ bị bỏ. Bạn có chắc muốn rời khỏi trang?"
        confirmLabel="Rời trang"
        cancelLabel="Ở lại"
        onConfirm={() => navigate(cancelPath)}
        onCancel={() => setConfirmAction(null)}
        danger
      />
      <ConfirmDialog
        open={confirmAction === 'submit'}
        title={isEditMode ? 'Gửi lại Admin phê duyệt?' : 'Gửi đơn tổ chức sự kiện?'}
        message={
          isEditMode
            ? 'Thông tin sẽ được cập nhật và gửi lại Admin. Sự kiện chỉ publish được sau khi Admin duyệt lại.'
            : 'Đơn sẽ được gửi lên Admin để phê duyệt. Sau khi Admin duyệt, bạn mới có thể publish và mở đăng ký.'
        }
        confirmLabel={isEditMode ? 'Gửi lại Admin' : 'Gửi đơn'}
        cancelLabel="Quay lại"
        onConfirm={doSubmit}
        onCancel={() => !submitting && setConfirmAction(null)}
        loading={submitting}
      />

      <nav className="ctsv-breadcrumb" aria-label="Breadcrumb">
        <Link to="/ctsv/events">Quản lý sự kiện</Link>
        <span className="ctsv-breadcrumb-sep">/</span>
        {isEditMode ? (
          <>
            <Link to={`/ctsv/events/${editEventId}`}>Chi tiết sự kiện</Link>
            <span className="ctsv-breadcrumb-sep">/</span>
            <span>Chỉnh sửa</span>
          </>
        ) : (
          <span>Tạo sự kiện cấp trường</span>
        )}
      </nav>

      <header className="ctsv-create-header">
        <h1>{isEditMode ? 'CHỈNH SỬA SỰ KIỆN CẤP TRƯỜNG' : 'TẠO SỰ KIỆN CẤP TRƯỜNG'}</h1>
        <p className="ctsv-muted">
          {isEditMode
            ? 'Cập nhật thông tin và gửi lại Admin phê duyệt trước khi publish.'
            : 'Điền thông tin chi tiết và gửi đơn tổ chức. Admin sẽ phê duyệt trước khi mở đăng ký.'}
        </p>
        {draftLabel && (
          <p className="ctsv-create-draft-status" aria-live="polite">
            Bản nháp đã lưu lúc {draftLabel}
          </p>
        )}
      </header>

      <form
        className="ctsv-create-form"
        onSubmit={(e) => {
          e.preventDefault();
          setConfirmAction('submit');
        }}
      >
        <section className="ctsv-form-section">
          <SectionTitle>Thông tin chung</SectionTitle>
          <div className="ctsv-form-section-body">
            <Field label="Tên sự kiện" required>
              <input
                name="title"
                value={form.title}
                onChange={onChange}
                className="ctsv-input"
                placeholder="Workshop React Native cho người mới bắt đầu"
                required
              />
            </Field>
            <div className="ctsv-form-row-2">
              <Field label="Loại sự kiện" required>
                <AppSelect
                  name="eventType"
                  value={form.eventType}
                  onChange={onChange}
                  options={EVENT_TYPES.map((t) => ({ value: t, label: t }))}
                />
              </Field>
              <Field label="Danh mục" required>
                <AppSelect
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  options={CATEGORIES}
                />
              </Field>
            </div>
            <div className="ctsv-field">
              <div className="ctsv-field-label-row">
                <span className="ctsv-field-label">Mô tả sự kiện</span>
                <button
                  type="button"
                  className="ctsv-ai-link"
                  onClick={() => showToast?.('Tính năng AI đang phát triển.', 'info')}
                >
                  AI Tối ưu mô tả
                </button>
              </div>
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                className="ctsv-textarea"
                rows={4}
                placeholder="Buổi workshop chia sẻ kiến thức nền tảng..."
              />
            </div>
            <div className="ctsv-form-row-2">
              <Field label="Ngày tổ chức" required>
                <input type="date" name="eventDate" value={form.eventDate} onChange={onChange} className="ctsv-input" required />
              </Field>
              <div className="ctsv-form-row-2 ctsv-form-row-nested">
                <Field label="Thời gian bắt đầu" required>
                  <input type="time" name="startTime" value={form.startTime} onChange={onChange} className="ctsv-input" />
                </Field>
                <Field label="Thời lượng" required>
                  <input name="duration" value={form.duration} onChange={onChange} className="ctsv-input" placeholder="3 tiếng" />
                </Field>
              </div>
            </div>
          </div>
        </section>

        <section className="ctsv-form-section">
          <SectionTitle>Lịch trình &amp; Địa điểm</SectionTitle>
          <div className="ctsv-form-section-body">
            <div className="ctsv-form-row-2">
              <Field label="Địa điểm" required>
                <input
                  name="location"
                  value={form.location}
                  onChange={onChange}
                  className="ctsv-input"
                  placeholder="Tòa Gamma"
                />
              </Field>
              <Field label="Số lượng tham dự dự kiến" required>
                <input
                  type="text"
                  inputMode="numeric"
                  name="expectedAttendees"
                  value={form.expectedAttendees}
                  onChange={onChange}
                  onBlur={onExpectedAttendeesBlur}
                  className={`ctsv-input ${expectedAttendeesError ? 'ctsv-input--error' : ''}`}
                  placeholder="VD: 40"
                  aria-invalid={expectedAttendeesError}
                />
                {expectedAttendeesError && (
                  <p className="ctsv-field-error-hint">Vui lòng nhập số lượng tham dự dự kiến (tối thiểu 1).</p>
                )}
              </Field>
            </div>
            <Field label="Diễn giả / Khách mời" hint="Thêm từng diễn giả. Có thể tải, cắt/chỉnh sửa hoặc đổi ảnh đại diện.">
              <div className="ctsv-speaker-table-wrap">
                <table className="ctsv-speaker-table">
                  <thead>
                    <tr>
                      <th>Avatar</th>
                      <th>Họ tên</th>
                      <th>Chức vụ</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {speakers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="ctsv-speaker-empty">
                          Chưa có diễn giả. Bấm &ldquo;Thêm diễn giả&rdquo; bên dưới.
                        </td>
                      </tr>
                    ) : (
                      speakers.map((row) => (
                        <tr key={row.id}>
                          <td className="ctsv-speaker-avatar-cell">
                            <div className="ctsv-speaker-avatar-wrap">
                              <label
                                htmlFor={`speaker-avatar-${row.id}`}
                                className={`ctsv-speaker-avatar-dropzone ${row.avatar ? 'has-image' : ''}`}
                                aria-label={row.avatar ? 'Đổi ảnh đại diện diễn giả' : 'Tải ảnh đại diện diễn giả'}
                              >
                                {row.avatar ? (
                                  <>
                                    <img src={row.avatar} alt="" className="ctsv-speaker-avatar-preview" />
                                    <span className="ctsv-speaker-avatar-overlay">Đổi ảnh</span>
                                  </>
                                ) : (
                                  <span className="ctsv-speaker-avatar-placeholder">
                                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                                      <path
                                        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                                        fill="currentColor"
                                        opacity="0.35"
                                      />
                                    </svg>
                                  </span>
                                )}
                              </label>
                              <input
                                id={`speaker-avatar-${row.id}`}
                                type="file"
                                accept={SPEAKER_IMAGE_ACCEPT}
                                className="ctsv-file-input-hidden"
                                onChange={(e) => {
                                  handleSpeakerAvatarFile(row.id, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                            </div>
                            {row.avatar && (
                              <div className="ctsv-speaker-avatar-tools">
                                <button
                                  type="button"
                                  className="ctsv-speaker-avatar-tool"
                                  onClick={() => openSpeakerAvatarEditor(row.id)}
                                >
                                  Chỉnh sửa
                                </button>
                                <button
                                  type="button"
                                  className="ctsv-speaker-avatar-tool ctsv-speaker-avatar-tool--danger"
                                  onClick={() => updateSpeaker(row.id, 'avatar', '')}
                                >
                                  Xóa
                                </button>
                              </div>
                            )}
                          </td>
                          <td>
                            <input
                              value={row.name}
                              onChange={(e) => updateSpeaker(row.id, 'name', e.target.value)}
                              className="ctsv-input ctsv-input-table"
                              placeholder="Họ tên diễn giả"
                            />
                          </td>
                          <td>
                            <input
                              value={row.role}
                              onChange={(e) => updateSpeaker(row.id, 'role', e.target.value)}
                              className="ctsv-input ctsv-input-table"
                              placeholder="Chức vụ (VD: Tech Lead)"
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="ctsv-ticket-remove"
                              onClick={() => removeSpeakerRow(row.id)}
                              aria-label="Xóa diễn giả"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <button type="button" className="ctsv-btn-add-ticket" onClick={addSpeakerRow}>
                + Thêm diễn giả
              </button>
            </Field>
            <Field label="Lịch trình chi tiết (Agenda)">
              <textarea
                name="agenda"
                value={form.agenda}
                onChange={onChange}
                className="ctsv-textarea"
                rows={5}
                placeholder="- 14:00: Khai mạc&#10;- 14:15: Chia sẻ kiến thức&#10;- 16:00: Q&A"
              />
            </Field>
          </div>
        </section>

        <section className="ctsv-form-section">
          <SectionTitle>Vé &amp; Truyền thông</SectionTitle>
          <div className="ctsv-form-section-body">
            <Field
              label="Danh sách loại vé"
              required
              hint={`Tổng số vé tối đa ${maxTicketTotal} (= ${expectedLabel} + 10). Đã phân bổ: ${allocatedTickets}/${maxTicketTotal}.`}
            >
              <div className="ctsv-ticket-table-wrap">
                <table className="ctsv-ticket-table">
                  <thead>
                    <tr>
                      <th>Tên loại vé</th>
                      <th>Giá vé</th>
                      <th>Số lượng</th>
                      <th>Đối tượng</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <input
                            value={row.name}
                            onChange={(e) => updateTicket(row.id, 'name', e.target.value)}
                            className="ctsv-input ctsv-input-table"
                          />
                        </td>
                        <td className="ctsv-ticket-price-cell">
                          <TicketPriceEditor
                            row={row}
                            onChangeType={(type) => setTicketPriceType(row.id, type)}
                            onChangeAmount={(val) => updateTicket(row.id, 'priceAmount', val)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.qty}
                            onChange={(e) => updateTicket(row.id, 'qty', e.target.value)}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="ctsv-input ctsv-input-table"
                            min={0}
                            max={maxTicketTotal}
                          />
                        </td>
                        <td>
                          <AppSelect
                            value={row.audience}
                            onChange={(e) => updateTicket(row.id, 'audience', e.target.value)}
                            variant="table"
                            options={TICKET_AUDIENCE_OPTIONS}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ctsv-ticket-remove"
                            onClick={() => removeTicketRow(row.id)}
                            aria-label="Xóa dòng vé"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="ctsv-btn-add-ticket" onClick={addTicketRow}>
                + Thêm loại vé
              </button>
            </Field>

            <Field
              label="Ảnh bìa sự kiện (Banner)"
              required
              hint="Sau khi chọn ảnh, kéo và zoom trong khung 16:9 rồi áp dụng. JPG, PNG, WebP — tối đa 5MB."
            >
              <input
                ref={bannerInputRef}
                type="file"
                accept={BANNER_ACCEPT}
                className="ctsv-file-input-hidden"
                onChange={onBannerInputChange}
              />
              <div className="ctsv-banner-upload">
                <div
                  className={`ctsv-banner-dropzone ${form.image ? 'has-image' : ''}`}
                  onClick={() => bannerInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && bannerInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('is-dragover');
                  }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('is-dragover')}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('is-dragover');
                    handleBannerFile(e.dataTransfer.files?.[0]);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {form.image ? (
                    <>
                      <img src={form.image} alt="Xem trước ảnh bìa" className="ctsv-banner-preview" />
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
                  {bannerFileName && (
                    <span className="ctsv-banner-filename" title={bannerFileName}>
                      {bannerFileName}
                    </span>
                  )}
                  <div className="ctsv-banner-meta-actions">
                    <button type="button" className="ctsv-btn-banner-secondary" onClick={() => bannerInputRef.current?.click()}>
                      Chọn file
                    </button>
                    {form.image && (
                      <>
                        <button type="button" className="ctsv-btn-banner-secondary" onClick={openBannerCropEditor}>
                          Cắt / chỉnh sửa
                        </button>
                        <button type="button" className="ctsv-btn-banner-remove" onClick={removeBanner}>
                          Xóa ảnh
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Field>
          </div>
        </section>

        <footer className="ctsv-form-actions">
          <button
            type="button"
            className="ctsv-btn-secondary"
            disabled={submitting}
            onClick={() => setConfirmAction('cancel')}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="ctsv-btn-draft"
            disabled={submitting || isEditMode}
            onClick={persistDraft}
          >
            Lưu nháp
          </button>
          <button type="submit" className="ctsv-btn-primary ctsv-btn-save" disabled={submitting}>
            {submitting
              ? isEditMode
                ? 'Đang gửi lại...'
                : 'Đang gửi...'
              : isEditMode
                ? 'Gửi lại Admin'
                : 'Gửi đơn tổ chức'}
          </button>
        </footer>
      </form>

      <BannerCropModal
        open={cropOpen}
        imageSrc={cropSource}
        fileName={cropFileName}
        onConfirm={onCropConfirm}
        onCancel={onCropCancel}
      />

      <AvatarCropModal
        open={speakerCrop.open}
        imageSrc={speakerCrop.source}
        fileName={speakerCrop.fileName}
        onConfirm={onSpeakerCropConfirm}
        onCancel={onSpeakerCropCancel}
      />
    </div>
  );
};

export default CtsvEventCreate;
