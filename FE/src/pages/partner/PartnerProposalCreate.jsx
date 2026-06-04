import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import BannerCropModal from '../../components/ctsv/BannerCropModal';
import AvatarCropModal from '../../components/profile/AvatarCropModal';
import AppSelect from '../../components/ui/AppSelect';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  fetchPartnerActiveEventRequest,
  savePartnerEventRequestDraft,
  submitPartnerEventRequest,
  cancelPartnerEventRequest,
  updatePartnerEventRequest,
  hidePartnerEventRequest,
  deletePartnerEventRequest,
  buildPartnerEventRequestPayload,
  fetchPartnerMe,
  supplementPartnerProposal
} from '../../services/partnerApi';
import { CTSV_CATEGORY_OPTIONS } from '../../constants/eventCategories';
import { createEmptySpeakerRow, SPEAKER_AVATAR_MAX_BYTES, SPEAKER_IMAGE_ACCEPT } from '../../constants/eventSpeaker';
import {
  PARTNER_STATUS_LABEL,
  PARTNER_STATUS_TONE
} from '../../utils/partnerDisplay';
import { optimizeEventDescription } from '../../utils/aiEventDescription';
import {
  clearPartnerEventDraft,
  formatDraftSavedLabel,
  loadPartnerEventDraft,
  savePartnerEventDraft
} from '../../utils/partnerEventDraft';
import {
  ATTACHMENT_MAX_BYTES,
  BANNER_ACCEPT,
  BANNER_MAX_BYTES,
  DEFAULT_TICKETS,
  EMPTY_COMPANY,
  EMPTY_EVENT_FORM,
  EVENT_TYPES,
  TICKET_AUDIENCE_OPTIONS,
  clampTicketRows,
  getMaxTicketTotal,
  mapRequestToState,
  parseExpectedAttendees
} from './partnerEventFormUtils';
import EventIntroFields from '../../components/events/EventIntroFields';
import {
  DEFAULT_LEARNING_OUTCOME_ROWS,
  normalizeLearningOutcomesForSave,
} from '../../utils/eventIntro';

const FORMAT_OPTIONS = [
  { value: 'campus', label: 'Tại campus' },
  { value: 'online', label: 'Trực tuyến' },
  { value: 'hybrid', label: 'Kết hợp (online + campus)' }
];

const ACTIVE_STATUSES = new Set(['pending', 'info_requested', 'approved', 'hidden']);

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

const PartnerProposalCreate = () => {
  const navigate = useNavigate();
  const { showToast, userProfile } = useOutletContext() || {};

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [expectedAttendeesError, setExpectedAttendeesError] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);

  const [company, setCompany] = useState(EMPTY_COMPANY);
  const [form, setForm] = useState(EMPTY_EVENT_FORM);
  const [tickets, setTickets] = useState(DEFAULT_TICKETS);
  const [speakers, setSpeakers] = useState([]);
  const [benefits, setBenefits] = useState(['']);
  const [partnerMessage, setPartnerMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [bannerFileName, setBannerFileName] = useState('');

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState('');
  const [cropFileName, setCropFileName] = useState('');
  const [speakerCrop, setSpeakerCrop] = useState({ open: false, speakerId: null, source: '', fileName: '' });

  const bannerInputRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const draftRestoreToastShownRef = useRef(false);
  const autoSaveSkipRef = useRef(true);

  const requestStatus = activeRequest?.status;
  const isPending = requestStatus === 'pending';
  const isInfoRequested = requestStatus === 'info_requested';
  const isApproved = requestStatus === 'approved';
  const isHidden = requestStatus === 'hidden';
  const isApprovedOrHidden = isApproved || isHidden;
  const isReadOnly = isPending;
  const canApiDraft = !activeRequest || requestStatus === 'draft';

  const applyState = useCallback((state) => {
    if (state.company) setCompany(state.company);
    if (state.form) setForm(state.form);
    if (state.tickets?.length) setTickets(state.tickets);
    if (state.speakers) setSpeakers(state.speakers);
    if (state.benefits?.length) setBenefits(state.benefits);
    if (state.partnerMessage != null) setPartnerMessage(state.partnerMessage);
    if (state.attachments) setAttachments(state.attachments);
    if (state.bannerFileName) setBannerFileName(state.bannerFileName);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      try {
        const [activeRes, partnerRes] = await Promise.all([
          fetchPartnerActiveEventRequest().catch(() => ({ request: null })),
          fetchPartnerMe().catch(() => ({ partner: null }))
        ]);

        if (cancelled) return;

        const request = activeRes.request;
        setActiveRequest(request || null);

        if (request && ACTIVE_STATUSES.has(request.status)) {
          applyState(mapRequestToState(request));
        } else {
          const draft = loadPartnerEventDraft();
          const hasDraft =
            draft?.form &&
            (draft.form.title ||
              draft.form.description ||
              draft.form.eventDate ||
              draft.form.image ||
              draft.form.location ||
              draft.company?.companyName);

          if (hasDraft) {
            applyState({
              company: draft.company || EMPTY_COMPANY,
              form: { ...EMPTY_EVENT_FORM, ...draft.form },
              tickets: draft.tickets?.length ? draft.tickets : DEFAULT_TICKETS,
              speakers: draft.speakers || [],
              benefits: draft.benefits?.length ? draft.benefits : [''],
              partnerMessage: draft.partnerMessage || '',
              attachments: draft.attachments || [],
              bannerFileName: draft.bannerFileName || ''
            });
            if (draft.savedAt) setDraftSavedAt(draft.savedAt);
            if (!draftRestoreToastShownRef.current) {
              draftRestoreToastShownRef.current = true;
              showToast?.('Đã khôi phục bản nháp tạo sự kiện.', 'info');
            }
          } else if (request?.status === 'draft') {
            applyState(mapRequestToState(request));
            setActiveRequest(request);
          }

          const partner = partnerRes.partner;
          if (partner) {
            setCompany((prev) => ({
              ...prev,
              companyName: prev.companyName || partner.name || '',
              phone: prev.phone || partner.phone || '',
              representative: prev.representative || partner.representative || userProfile?.fullname || '',
              address: prev.address || partner.address || '',
              partnerCode: prev.partnerCode || partner.partnerCode || ''
            }));
          } else if (userProfile?.fullname) {
            setCompany((prev) => ({
              ...prev,
              representative: prev.representative || userProfile.fullname
            }));
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          autoSaveSkipRef.current = false;
        }
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [applyState, showToast, userProfile]);

  const parsedExpected = parseExpectedAttendees(form.expectedAttendees);
  const maxTicketTotal = getMaxTicketTotal(form.expectedAttendees);
  const allocatedTickets = tickets.reduce((s, t) => s + (Number(t.qty) || 0), 0);
  const expectedLabel = form.expectedAttendees === '' ? '—' : String(form.expectedAttendees);

  const onCompanyChange = (field, value) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
  };

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

  const updateLearningOutcome = (index, value) => {
    setForm((f) => {
      const rows = [...(f.learningOutcomes || DEFAULT_LEARNING_OUTCOME_ROWS)];
      rows[index] = value;
      return { ...f, learningOutcomes: rows };
    });
  };

  const addLearningOutcome = () => {
    setForm((f) => ({
      ...f,
      learningOutcomes: [...(f.learningOutcomes || DEFAULT_LEARNING_OUTCOME_ROWS), ''],
    }));
  };

  const removeLearningOutcome = (index) => {
    setForm((f) => {
      const rows = [...(f.learningOutcomes || DEFAULT_LEARNING_OUTCOME_ROWS)];
      if (rows.length <= 1) return f;
      rows.splice(index, 1);
      return { ...f, learningOutcomes: rows };
    });
  };

  const onExpectedAttendeesBlur = () => {
    setExpectedAttendeesError(parseExpectedAttendees(form.expectedAttendees) == null);
  };

  useEffect(() => {
    setTickets((rows) => clampTicketRows(rows, maxTicketTotal));
  }, [maxTicketTotal]);

  const updateSpeaker = (id, field, value) => {
    setSpeakers((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSpeakerAvatarFile = (id, file) => {
    if (!file || isReadOnly) return;
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
      setSpeakerCrop({ open: true, speakerId: id, source: reader.result, fileName: file.name });
    };
    reader.onerror = () => showToast?.('Không đọc được file ảnh.', 'error');
    reader.readAsDataURL(file);
  };

  const openSpeakerAvatarEditor = (id) => {
    if (isReadOnly) return;
    const row = speakers.find((s) => s.id === id);
    if (!row?.avatar) return;
    setSpeakerCrop({ open: true, speakerId: id, source: row.avatar, fileName: 'speaker-avatar.jpg' });
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

  const addSpeakerRow = () => {
    if (isReadOnly) return;
    setSpeakers((rows) => [...rows, createEmptySpeakerRow()]);
  };

  const removeSpeakerRow = (id) => {
    if (isReadOnly) return;
    setSpeakers((rows) => rows.filter((r) => r.id !== id));
  };

  const updateTicket = (id, field, value) => {
    if (isReadOnly) return;
    if (field === 'qty') {
      const requested = Math.max(0, Number(value) || 0);
      setTickets((rows) => {
        const otherSum = rows.filter((r) => r.id !== id).reduce((s, r) => s + (Number(r.qty) || 0), 0);
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
    if (isReadOnly) return;
    setTickets((rows) =>
      rows.map((r) =>
        r.id === id
          ? { ...r, priceType, priceAmount: priceType === 'free' ? '' : r.priceAmount || '' }
          : r
      )
    );
  };

  const addTicketRow = () => {
    if (isReadOnly) return;
    setTickets((rows) => [
      ...rows,
      { id: Date.now(), name: '', priceType: 'free', priceAmount: '', qty: 0, audience: 'SV FPT' }
    ]);
  };

  const removeTicketRow = (id) => {
    if (isReadOnly || tickets.length <= 1) return;
    setTickets((rows) => rows.filter((r) => r.id !== id));
  };

  const handleBannerFile = (file) => {
    if (!file || isReadOnly) return;
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

  const removeBanner = () => {
    if (isReadOnly) return;
    setForm((f) => ({ ...f, image: '' }));
    setBannerFileName('');
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const handleAttachmentFiles = (fileList) => {
    if (isReadOnly) return;
    const files = Array.from(fileList || []);
    if (!files.length) return;

    files.forEach((file) => {
      if (file.size > ATTACHMENT_MAX_BYTES) {
        showToast?.(`"${file.name}" vượt quá 2MB.`, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: reader.result,
            sizeLabel: formatFileSize(file.size),
            mimeType: file.type || 'application/octet-stream'
          }
        ]);
      };
      reader.onerror = () => showToast?.(`Không đọc được file "${file.name}".`, 'error');
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index) => {
    if (isReadOnly) return;
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBenefitChange = (index, value) => {
    if (isReadOnly) return;
    setBenefits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addBenefit = () => {
    if (isReadOnly) return;
    setBenefits((prev) => [...prev, '']);
  };

  const handleOptimizeDescription = () => {
    setAiLoading(true);
    try {
      const optimized = optimizeEventDescription({
        title: form.title,
        eventType: form.eventType,
        category: form.category,
        agenda: form.agenda,
        location: form.location
      });
      setForm((f) => ({ ...f, description: optimized }));
      showToast?.('Đã tối ưu mô tả sự kiện.', 'success');
    } finally {
      setAiLoading(false);
    }
  };

  const buildPayload = () =>
    buildPartnerEventRequestPayload({
      company,
      form,
      tickets,
      speakers,
      benefits,
      partnerMessage,
      attachments,
      bannerFileName,
      requestId: activeRequest?._id
    });

  const persistDraftSilent = useCallback(async () => {
    const at = savePartnerEventDraft({
      company,
      form,
      tickets,
      speakers,
      benefits,
      attachments,
      partnerMessage,
      bannerFileName
    });
    if (at) setDraftSavedAt(at);
    if (!canApiDraft) return;
    try {
      await savePartnerEventRequestDraft(buildPayload());
    } catch {
      /* auto-save failures are silent */
    }
  }, [
    attachments,
    bannerFileName,
    benefits,
    canApiDraft,
    company,
    form,
    partnerMessage,
    speakers,
    tickets,
    activeRequest
  ]);

  const persistDraft = async () => {
    const at = savePartnerEventDraft({
      company,
      form,
      tickets,
      speakers,
      benefits,
      attachments,
      partnerMessage,
      bannerFileName
    });
    if (at) setDraftSavedAt(at);
    if (canApiDraft) {
      try {
        await savePartnerEventRequestDraft(buildPayload());
      } catch (err) {
        showToast?.(err.message || 'Lưu nháp thất bại.', 'error');
        return;
      }
    }
    showToast?.('Đã lưu bản nháp.', 'success');
  };

  useEffect(() => {
    if (loading || autoSaveSkipRef.current || isPending) return undefined;
    const timer = setTimeout(() => {
      persistDraftSilent();
    }, 20000);
    return () => clearTimeout(timer);
  }, [
    loading,
    isPending,
    company,
    form,
    tickets,
    speakers,
    benefits,
    partnerMessage,
    attachments,
    bannerFileName,
    persistDraftSilent
  ]);

  const validateForm = () => {
    if (!company.companyName.trim()) {
      showToast?.('Vui lòng điền tên doanh nghiệp.', 'error');
      return false;
    }
    if (!form.title.trim() || !form.eventDate) {
      showToast?.('Vui lòng điền tên sự kiện và ngày tổ chức.', 'error');
      return false;
    }
    if (!form.description.trim()) {
      showToast?.('Vui lòng nhập mô tả trong phần Giới thiệu sự kiện.', 'error');
      return false;
    }
    if (normalizeLearningOutcomesForSave(form.learningOutcomes).length === 0) {
      showToast?.('Vui lòng thêm ít nhất một mục trong “Bạn sẽ học được gì?”.', 'error');
      return false;
    }
    if (parseExpectedAttendees(form.expectedAttendees) == null) {
      setExpectedAttendeesError(true);
      showToast?.('Vui lòng nhập số lượng tham dự dự kiến (tối thiểu 1).', 'error');
      return false;
    }
    if (!form.image) {
      showToast?.('Vui lòng tải và cắt ảnh bìa sự kiện.', 'error');
      return false;
    }
    const invalidPaid = tickets.find(
      (t) => t.priceType === 'paid' && !(Number(String(t.priceAmount).replace(/\D/g, '')) > 0)
    );
    if (invalidPaid) {
      showToast?.('Vé có phí cần nhập số tiền lớn hơn 0.', 'error');
      return false;
    }
    const totalTickets = tickets.reduce((s, t) => s + (Number(t.qty) || 0), 0);
    if (totalTickets > maxTicketTotal) {
      showToast?.(
        `Tổng số vé (${totalTickets}) vượt quá ${maxTicketTotal} (số tham dự dự kiến + 10).`,
        'error'
      );
      return false;
    }
    return true;
  };

  const doSubmit = async () => {
    if (!validateForm()) {
      setConfirmAction(null);
      return;
    }
    const payload = buildPayload();
    setSubmitting(true);
    try {
      if (isInfoRequested && activeRequest?._id) {
        await supplementPartnerProposal(activeRequest._id, payload);
        showToast?.('Đã gửi bổ sung hồ sơ. CTSV sẽ xem xét lại.', 'success');
      } else {
        await submitPartnerEventRequest(payload);
        showToast?.('Đã gửi yêu cầu tạo sự kiện. CTSV sẽ xem xét trong 3–5 ngày làm việc.', 'success');
      }
      clearPartnerEventDraft();
      setDraftSavedAt(null);
      navigate('/partner/dashboard');
    } catch (err) {
      showToast?.(err.message || 'Gửi yêu cầu thất bại.', 'error');
    } finally {
      setSubmitting(false);
      setConfirmAction(null);
    }
  };

  const doUpdate = async () => {
    if (!validateForm() || !activeRequest?._id) {
      setConfirmAction(null);
      return;
    }
    setSubmitting(true);
    try {
      await updatePartnerEventRequest(activeRequest._id, buildPayload());
      showToast?.('Đã cập nhật thông tin sự kiện.', 'success');
      navigate('/partner/dashboard');
    } catch (err) {
      showToast?.(err.message || 'Cập nhật thất bại.', 'error');
    } finally {
      setSubmitting(false);
      setConfirmAction(null);
    }
  };

  const doCancelRequest = async () => {
    if (!activeRequest?._id) return;
    setSubmitting(true);
    try {
      await cancelPartnerEventRequest(activeRequest._id);
      clearPartnerEventDraft();
      showToast?.('Đã hủy yêu cầu sự kiện.', 'success');
      navigate('/partner/dashboard');
    } catch (err) {
      showToast?.(err.message || 'Hủy yêu cầu thất bại.', 'error');
    } finally {
      setSubmitting(false);
      setConfirmAction(null);
    }
  };

  const doHide = async () => {
    if (!activeRequest?._id) return;
    setSubmitting(true);
    try {
      await hidePartnerEventRequest(activeRequest._id);
      showToast?.('Đã ẩn sự kiện khỏi danh sách công khai.', 'success');
      navigate('/partner/dashboard');
    } catch (err) {
      showToast?.(err.message || 'Ẩn sự kiện thất bại.', 'error');
    } finally {
      setSubmitting(false);
      setConfirmAction(null);
    }
  };

  const doDelete = async () => {
    if (!activeRequest?._id) return;
    setSubmitting(true);
    try {
      await deletePartnerEventRequest(activeRequest._id);
      clearPartnerEventDraft();
      showToast?.('Đã xóa yêu cầu sự kiện.', 'success');
      navigate('/partner/dashboard');
    } catch (err) {
      showToast?.(err.message || 'Xóa yêu cầu thất bại.', 'error');
    } finally {
      setSubmitting(false);
      setConfirmAction(null);
    }
  };

  const draftLabel = formatDraftSavedLabel(draftSavedAt);
  const statusTone = requestStatus ? PARTNER_STATUS_TONE[requestStatus] : null;
  const statusLabel =
    requestStatus === 'hidden'
      ? 'Đã ẩn'
      : requestStatus
        ? PARTNER_STATUS_LABEL[requestStatus] || requestStatus
        : null;

  if (loading) {
    return (
      <div className="ctsv-page ctsv-create-page">
        <p className="ctsv-muted">Đang tải biểu mẫu…</p>
      </div>
    );
  }

  return (
    <div className="ctsv-page ctsv-create-page">
      <ConfirmDialog
        open={confirmAction === 'cancel'}
        title="Hủy tạo sự kiện?"
        message="Thay đổi chưa lưu sẽ bị bỏ. Bạn có chắc muốn rời khỏi trang?"
        confirmLabel="Rời trang"
        cancelLabel="Ở lại"
        onConfirm={() => navigate('/partner/dashboard')}
        onCancel={() => setConfirmAction(null)}
        danger
      />
      <ConfirmDialog
        open={confirmAction === 'submit'}
        title={isInfoRequested ? 'Gửi bổ sung hồ sơ?' : 'Gửi yêu cầu tạo sự kiện?'}
        message={
          isInfoRequested
            ? 'Thông tin bổ sung sẽ được gửi lại CTSV để xem xét tiếp.'
            : 'Yêu cầu sẽ được gửi lên CTSV để phê duyệt trong 3–5 ngày làm việc.'
        }
        confirmLabel={isInfoRequested ? 'Gửi bổ sung' : 'Gửi yêu cầu'}
        cancelLabel="Quay lại"
        onConfirm={doSubmit}
        onCancel={() => !submitting && setConfirmAction(null)}
        loading={submitting}
      />
      <ConfirmDialog
        open={confirmAction === 'update'}
        title="Lưu thay đổi sự kiện?"
        message="Thông tin sự kiện đã duyệt sẽ được cập nhật trên hệ thống."
        confirmLabel="Lưu thay đổi"
        cancelLabel="Quay lại"
        onConfirm={doUpdate}
        onCancel={() => !submitting && setConfirmAction(null)}
        loading={submitting}
      />
      <ConfirmDialog
        open={confirmAction === 'cancelRequest'}
        title="Hủy yêu cầu sự kiện?"
        message="Yêu cầu đang chờ CTSV duyệt sẽ bị hủy. Bạn có chắc muốn tiếp tục?"
        confirmLabel="Hủy yêu cầu"
        cancelLabel="Quay lại"
        onConfirm={doCancelRequest}
        onCancel={() => !submitting && setConfirmAction(null)}
        loading={submitting}
        danger
      />
      <ConfirmDialog
        open={confirmAction === 'hide'}
        title="Ẩn sự kiện?"
        message="Sự kiện sẽ không hiển thị trên danh sách công khai. Bạn vẫn có thể chỉnh sửa sau."
        confirmLabel="Ẩn sự kiện"
        cancelLabel="Quay lại"
        onConfirm={doHide}
        onCancel={() => !submitting && setConfirmAction(null)}
        loading={submitting}
      />
      <ConfirmDialog
        open={confirmAction === 'delete'}
        title="Xóa yêu cầu sự kiện?"
        message="Hành động này không thể hoàn tác. Yêu cầu sẽ bị xóa khỏi hệ thống."
        confirmLabel="Xóa yêu cầu"
        cancelLabel="Quay lại"
        onConfirm={doDelete}
        onCancel={() => !submitting && setConfirmAction(null)}
        loading={submitting}
        danger
      />

      <nav className="ctsv-breadcrumb" aria-label="Breadcrumb">
        <Link to="/partner/dashboard">Bảng điều khiển</Link>
        <span className="ctsv-breadcrumb-sep">/</span>
        <span>Tạo sự kiện mới</span>
      </nav>

      <header className="ctsv-create-header">
        <span className="ctsv-events-eyebrow">Tạo sự kiện mới</span>
        <h1>TẠO SỰ KIỆN ĐỐI TÁC</h1>
        <p className="ctsv-muted">
          Điền thông tin doanh nghiệp và chi tiết sự kiện. CTSV sẽ xem xét và phản hồi trong 3–5 ngày làm việc.
        </p>
        {draftLabel && !isApprovedOrHidden && (
          <p className="ctsv-create-draft-status" aria-live="polite">
            Bản nháp đã lưu lúc {draftLabel}
          </p>
        )}
      </header>

      {isPending && (
        <div className="ctsv-pd-banner ctsv-pd-banner--warn" style={{ marginBottom: 24 }}>
          <strong>Yêu cầu đang chờ duyệt.</strong> CTSV đang xem xét thông tin sự kiện của bạn.
          {statusLabel && (
            <span className={`ctsv-pd-status ctsv-pd-status--${statusTone}`} style={{ marginLeft: 12 }}>
              {statusLabel}
            </span>
          )}
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="ctsv-dash-btn ctsv-dash-btn--ghost"
              onClick={() => setConfirmAction('cancelRequest')}
            >
              Hủy yêu cầu
            </button>
          </div>
        </div>
      )}

      {isInfoRequested && (
        <div className="ctsv-pd-banner ctsv-pd-banner--warn" style={{ marginBottom: 24 }}>
          <strong>Yêu cầu bổ sung:</strong> {activeRequest.supplementReason || 'CTSV cần thêm thông tin.'}
          {statusLabel && (
            <span className={`ctsv-pd-status ctsv-pd-status--${statusTone}`} style={{ marginLeft: 12 }}>
              {statusLabel}
            </span>
          )}
        </div>
      )}

      {isHidden && (
        <div className="ctsv-pd-banner ctsv-pd-banner--info" style={{ marginBottom: 24 }}>
          <strong>Sự kiện đang ẩn</strong> — không hiển thị công khai. Bạn có thể cập nhật hoặc xóa yêu cầu.
        </div>
      )}

      <form
        className="ctsv-create-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (isApprovedOrHidden) {
            setConfirmAction('update');
          } else if (!isPending) {
            setConfirmAction('submit');
          }
        }}
      >
        <section className="ctsv-form-section">
          <SectionTitle>Thông tin doanh nghiệp</SectionTitle>
          <div className="ctsv-form-section-body">
            <div className="ctsv-form-row-2">
              <Field label="Tên doanh nghiệp" required>
                <input
                  type="text"
                  value={company.companyName}
                  onChange={(e) => onCompanyChange('companyName', e.target.value)}
                  className="ctsv-input"
                  placeholder="Công ty TNHH..."
                  required
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Mã số / Mã đối tác">
                <input
                  type="text"
                  value={company.partnerCode}
                  onChange={(e) => onCompanyChange('partnerCode', e.target.value)}
                  className="ctsv-input"
                  placeholder="FPT-SW-001"
                  disabled={isReadOnly}
                />
              </Field>
            </div>
            <div className="ctsv-form-row-2">
              <Field label="Người đại diện">
                <input
                  type="text"
                  value={company.representative}
                  onChange={(e) => onCompanyChange('representative', e.target.value)}
                  className="ctsv-input"
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Chức danh">
                <input
                  type="text"
                  value={company.representativeTitle}
                  onChange={(e) => onCompanyChange('representativeTitle', e.target.value)}
                  className="ctsv-input"
                  placeholder="Giám đốc kinh doanh"
                  disabled={isReadOnly}
                />
              </Field>
            </div>
            <div className="ctsv-form-row-2">
              <Field label="Số điện thoại">
                <input
                  type="tel"
                  value={company.phone}
                  onChange={(e) => onCompanyChange('phone', e.target.value)}
                  className="ctsv-input"
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Giá trị tài trợ dự kiến (VNĐ)">
                <input
                  type="number"
                  min="0"
                  value={company.expectedSponsorAmount}
                  onChange={(e) => onCompanyChange('expectedSponsorAmount', e.target.value)}
                  className="ctsv-input"
                  placeholder="50000000"
                  disabled={isReadOnly}
                />
              </Field>
            </div>
            <Field label="Địa chỉ">
              <input
                type="text"
                value={company.address}
                onChange={(e) => onCompanyChange('address', e.target.value)}
                className="ctsv-input"
                disabled={isReadOnly}
              />
            </Field>
          </div>
        </section>

        <section className="ctsv-form-section">
          <SectionTitle>Thông tin cơ bản</SectionTitle>
          <div className="ctsv-form-section-body">
            <Field label="Tên sự kiện" required>
              <input
                name="title"
                value={form.title}
                onChange={onChange}
                className="ctsv-input"
                placeholder="Tech Talk 2026 — FPT Software"
                required
                disabled={isReadOnly}
              />
            </Field>
            <div className="ctsv-form-row-2">
              <Field label="Loại sự kiện" required>
                <AppSelect
                  name="eventType"
                  value={form.eventType}
                  onChange={onChange}
                  options={EVENT_TYPES.map((t) => ({ value: t, label: t }))}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Danh mục" required>
                <AppSelect
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  options={CTSV_CATEGORY_OPTIONS}
                  disabled={isReadOnly}
                />
              </Field>
            </div>
          </div>
        </section>

        <EventIntroFields
          description={form.description}
          learningOutcomes={form.learningOutcomes || DEFAULT_LEARNING_OUTCOME_ROWS}
          onDescriptionChange={onChange}
          onLearningOutcomeChange={updateLearningOutcome}
          onAddLearningOutcome={addLearningOutcome}
          onRemoveLearningOutcome={removeLearningOutcome}
          disabled={isReadOnly}
          showAiOptimize
          onAiOptimize={handleOptimizeDescription}
          aiLoading={aiLoading}
        />

        <section className="ctsv-form-section">
          <SectionTitle>Thời gian &amp; địa điểm</SectionTitle>
          <div className="ctsv-form-section-body">
            <div className="ctsv-form-row-2">
              <Field label="Ngày tổ chức" required>
                <input
                  type="date"
                  name="eventDate"
                  value={form.eventDate}
                  onChange={onChange}
                  className="ctsv-input"
                  required
                  disabled={isReadOnly}
                />
              </Field>
              <div className="ctsv-form-row-2 ctsv-form-row-nested">
                <Field label="Thời gian bắt đầu" required>
                  <input
                    type="time"
                    name="startTime"
                    value={form.startTime}
                    onChange={onChange}
                    className="ctsv-input"
                    disabled={isReadOnly}
                  />
                </Field>
                <Field label="Thời lượng" required>
                  <input
                    name="duration"
                    value={form.duration}
                    onChange={onChange}
                    className="ctsv-input"
                    placeholder="3 tiếng"
                    disabled={isReadOnly}
                  />
                </Field>
              </div>
            </div>
            <div className="ctsv-form-row-2">
              <Field label="Hình thức" required>
                <AppSelect
                  name="format"
                  value={form.format}
                  onChange={onChange}
                  options={FORMAT_OPTIONS}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Địa điểm" required>
                <input
                  name="location"
                  value={form.location}
                  onChange={onChange}
                  className="ctsv-input"
                  placeholder="Tòa Gamma / Google Meet"
                  disabled={isReadOnly}
                />
              </Field>
            </div>
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
                disabled={isReadOnly}
              />
              {expectedAttendeesError && (
                <p className="ctsv-field-error-hint">Vui lòng nhập số lượng tham dự dự kiến (tối thiểu 1).</p>
              )}
            </Field>
            <Field label="Lịch trình chi tiết (Agenda)">
              <textarea
                name="agenda"
                value={form.agenda}
                onChange={onChange}
                className="ctsv-textarea"
                rows={5}
                placeholder="- 14:00: Khai mạc&#10;- 14:15: Chia sẻ kiến thức&#10;- 16:00: Q&A"
                disabled={isReadOnly}
              />
            </Field>
          </div>
        </section>

        <section className="ctsv-form-section">
          <SectionTitle>Diễn giả &amp; Vé</SectionTitle>
          <div className="ctsv-form-section-body">
            <Field
              label="Diễn giả / Khách mời"
              hint="Thêm từng diễn giả. Có thể tải, cắt/chỉnh sửa hoặc đổi ảnh đại diện."
            >
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
                                disabled={isReadOnly}
                                onChange={(e) => {
                                  handleSpeakerAvatarFile(row.id, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                            </div>
                            {row.avatar && !isReadOnly && (
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
                              disabled={isReadOnly}
                            />
                          </td>
                          <td>
                            <input
                              value={row.role}
                              onChange={(e) => updateSpeaker(row.id, 'role', e.target.value)}
                              className="ctsv-input ctsv-input-table"
                              placeholder="Chức vụ (VD: Tech Lead)"
                              disabled={isReadOnly}
                            />
                          </td>
                          <td>
                            {!isReadOnly && (
                              <button
                                type="button"
                                className="ctsv-ticket-remove"
                                onClick={() => removeSpeakerRow(row.id)}
                                aria-label="Xóa diễn giả"
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {!isReadOnly && (
                <button type="button" className="ctsv-btn-add-ticket" onClick={addSpeakerRow}>
                  + Thêm diễn giả
                </button>
              )}
            </Field>

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
                            disabled={isReadOnly}
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
                            disabled={isReadOnly}
                          />
                        </td>
                        <td>
                          <AppSelect
                            value={row.audience}
                            onChange={(e) => updateTicket(row.id, 'audience', e.target.value)}
                            variant="table"
                            options={TICKET_AUDIENCE_OPTIONS}
                            disabled={isReadOnly}
                          />
                        </td>
                        <td>
                          {!isReadOnly && (
                            <button
                              type="button"
                              className="ctsv-ticket-remove"
                              onClick={() => removeTicketRow(row.id)}
                              aria-label="Xóa dòng vé"
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!isReadOnly && (
                <button type="button" className="ctsv-btn-add-ticket" onClick={addTicketRow}>
                  + Thêm loại vé
                </button>
              )}
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
                disabled={isReadOnly}
                onChange={(e) => {
                  handleBannerFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <div className="ctsv-banner-upload">
                <div
                  className={`ctsv-banner-dropzone ${form.image ? 'has-image' : ''}`}
                  onClick={() => !isReadOnly && bannerInputRef.current?.click()}
                  onKeyDown={(e) => !isReadOnly && e.key === 'Enter' && bannerInputRef.current?.click()}
                  onDragOver={(e) => {
                    if (isReadOnly) return;
                    e.preventDefault();
                    e.currentTarget.classList.add('is-dragover');
                  }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('is-dragover')}
                  onDrop={(e) => {
                    if (isReadOnly) return;
                    e.preventDefault();
                    e.currentTarget.classList.remove('is-dragover');
                    handleBannerFile(e.dataTransfer.files?.[0]);
                  }}
                  role="button"
                  tabIndex={isReadOnly ? -1 : 0}
                >
                  {form.image ? (
                    <>
                      <img src={form.image} alt="Xem trước ảnh bìa" className="ctsv-banner-preview" />
                      {!isReadOnly && (
                        <div className="ctsv-banner-overlay">
                          <span>Đổi ảnh</span>
                        </div>
                      )}
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
                  {!isReadOnly && (
                    <div className="ctsv-banner-meta-actions">
                      <button
                        type="button"
                        className="ctsv-btn-banner-secondary"
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        Chọn file
                      </button>
                      {form.image && (
                        <>
                          <button
                            type="button"
                            className="ctsv-btn-banner-secondary"
                            onClick={() => {
                              setCropSource(form.image);
                              setCropFileName(bannerFileName || 'banner.jpg');
                              setCropOpen(true);
                            }}
                          >
                            Cắt / chỉnh sửa
                          </button>
                          <button type="button" className="ctsv-btn-banner-remove" onClick={removeBanner}>
                            Xóa ảnh
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Field>
          </div>
        </section>

        <section className="ctsv-form-section">
          <SectionTitle>Quyền lợi &amp; Đính kèm</SectionTitle>
          <div className="ctsv-form-section-body">
            <div className="partner-benefits-section">
              <Field label="Quyền lợi đối tác yêu cầu">
                <div className="partner-benefits-list">
                  {benefits.map((b, i) => (
                    <input
                      key={i}
                      type="text"
                      value={b}
                      onChange={(e) => handleBenefitChange(i, e.target.value)}
                      className="ctsv-input"
                      placeholder="VD: Logo trên banner sự kiện"
                      disabled={isReadOnly}
                    />
                  ))}
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    className="ctsv-btn-add-ticket partner-benefits-add"
                    onClick={addBenefit}
                  >
                    + Thêm quyền lợi
                  </button>
                )}
              </Field>
            </div>

            <Field label="Lời nhắn gửi CTSV">
              <textarea
                value={partnerMessage}
                onChange={(e) => setPartnerMessage(e.target.value)}
                className="ctsv-textarea"
                rows={3}
                placeholder="Ghi chú thêm cho CTSV (nếu có)..."
                disabled={isReadOnly}
              />
            </Field>

            <Field label="Tệp đính kèm" hint="PDF, DOCX, JPG… — tối đa 2MB mỗi file.">
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                className="ctsv-file-input-hidden"
                disabled={isReadOnly}
                onChange={(e) => {
                  handleAttachmentFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              {!isReadOnly && (
                <button
                  type="button"
                  className="ctsv-btn-banner-secondary"
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  Chọn tệp
                </button>
              )}
              {attachments.length > 0 ? (
                <ul className="ctsv-pd-files" style={{ marginTop: 12 }}>
                  {attachments.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <div className="ctsv-pd-file">
                        <span className="ctsv-pd-file-icon" aria-hidden>
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </span>
                        <span className="ctsv-pd-file-body">
                          <span className="ctsv-pd-file-name">{file.name}</span>
                          <span className="ctsv-pd-file-size">{file.sizeLabel || '—'}</span>
                        </span>
                        {!isReadOnly && (
                          <button
                            type="button"
                            className="ctsv-ticket-remove"
                            onClick={() => removeAttachment(index)}
                            aria-label={`Xóa ${file.name}`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ctsv-muted" style={{ marginTop: 8 }}>
                  Chưa có tệp đính kèm.
                </p>
              )}
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

          {!isPending && !isApprovedOrHidden && (
            <button
              type="button"
              className="ctsv-btn-draft"
              disabled={submitting}
              onClick={persistDraft}
            >
              Lưu nháp
            </button>
          )}

          {isApprovedOrHidden && (
            <>
              {isApproved && (
                <button
                  type="button"
                  className="ctsv-btn-secondary"
                  disabled={submitting}
                  onClick={() => setConfirmAction('hide')}
                >
                  Ẩn sự kiện
                </button>
              )}
              <button
                type="button"
                className="ctsv-btn-secondary"
                disabled={submitting}
                onClick={() => setConfirmAction('delete')}
              >
                Xóa yêu cầu
              </button>
              <button type="submit" className="ctsv-btn-primary ctsv-btn-save" disabled={submitting}>
                {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </>
          )}

          {!isPending && !isApprovedOrHidden && (
            <button type="submit" className="ctsv-btn-primary ctsv-btn-save" disabled={submitting}>
              {submitting
                ? 'Đang gửi…'
                : isInfoRequested
                  ? 'Gửi bổ sung hồ sơ'
                  : 'Gửi yêu cầu tạo sự kiện'}
            </button>
          )}
        </footer>
      </form>

      <BannerCropModal
        open={cropOpen}
        imageSrc={cropSource}
        fileName={cropFileName}
        onConfirm={onCropConfirm}
        onCancel={() => {
          setCropOpen(false);
          setCropSource('');
        }}
      />

      <AvatarCropModal
        open={speakerCrop.open}
        imageSrc={speakerCrop.source}
        fileName={speakerCrop.fileName}
        onConfirm={onSpeakerCropConfirm}
        onCancel={() => setSpeakerCrop({ open: false, speakerId: null, source: '', fileName: '' })}
      />
    </div>
  );
};

export default PartnerProposalCreate;
