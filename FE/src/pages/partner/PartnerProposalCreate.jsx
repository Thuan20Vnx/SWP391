import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EventProposalForm from '../../components/events/EventProposalForm';
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
import {
  PARTNER_STATUS_LABEL,
  PARTNER_STATUS_TONE
} from '../../utils/partnerDisplay';
import {
  clearPartnerEventDraft,
  formatDraftSavedLabel,
  loadPartnerEventDraft,
  savePartnerEventDraft
} from '../../utils/partnerEventDraft';
import {
  ATTACHMENT_MAX_BYTES,
  EMPTY_COMPANY,
  EMPTY_EVENT_FORM,
  mapRequestToState
} from './partnerEventFormUtils';

const ACTIVE_STATUSES = new Set(['pending', 'info_requested', 'approved', 'hidden']);

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SectionTitle = ({ children, className = '' }) => (
  <h2 className={`ctsv-form-section-title ${className}`.trim()}>
    <span className="ctsv-form-section-icon" aria-hidden />
    {children}
  </h2>
);

const CollapsibleFormSection = ({ title, sectionId, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `${sectionId}-panel`;

  return (
    <section className={`ctsv-form-section ctsv-form-section--collapsible${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="ctsv-form-section-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <SectionTitle className="ctsv-form-section-title--toggle">{title}</SectionTitle>
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          aria-hidden="true"
          className={`ctsv-form-section-chevron${open ? ' is-open' : ''}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div id={panelId} className="ctsv-form-section-body">
          {children}
        </div>
      )}
    </section>
  );
};

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
  const [confirmAction, setConfirmAction] = useState(null);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [cancelledRequests, setCancelledRequests] = useState([]);

  const [company, setCompany] = useState(EMPTY_COMPANY);
  const [form, setForm] = useState(EMPTY_EVENT_FORM);
  const [benefits, setBenefits] = useState(['']);
  const [partnerMessage, setPartnerMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [bannerFileName, setBannerFileName] = useState('');

  const attachmentInputRef = useRef(null);
  const draftRestoreToastShownRef = useRef(false);
  const autoSaveSkipRef = useRef(true);

  const requestStatus = activeRequest?.status;
  const isPending = requestStatus === 'pending';
  const isInfoRequested = requestStatus === 'info_requested';
  const isApproved = requestStatus === 'approved';
  const isHidden = requestStatus === 'hidden';
  const isApprovedOrHidden = isApproved || isHidden;
  const isReadOnly = false;
  const canApiDraft = !activeRequest || requestStatus === 'draft';

  const applyState = useCallback((state) => {
    if (state.company) setCompany(state.company);
    if (state.form) setForm(state.form);
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
        setCancelledRequests(activeRes.cancelled || []);

        if (request && ACTIVE_STATUSES.has(request.status)) {
          applyState(mapRequestToState(request));
        } else {
          const draft = loadPartnerEventDraft();
          const hasDraft =
            draft?.form &&
            (draft.form.title ||
              draft.form.description ||
              draft.form.thumbnail ||
              draft.form.image ||
              draft.form.location ||
              draft.company?.companyName);

          if (hasDraft) {
            applyState({
              company: draft.company || EMPTY_COMPANY,
              form: { ...EMPTY_EVENT_FORM, ...draft.form, thumbnail: draft.form.thumbnail || draft.form.image || '' },
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

  const validateForm = () => {
    if (!company.companyName.trim()) {
      showToast?.('Vui lòng cập nhật tên doanh nghiệp trong hồ sơ đối tác trước khi gửi đơn.', 'error');
      return false;
    }
    return true;
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

  const buildPayload = () =>
    buildPartnerEventRequestPayload({
      company,
      form,
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
    activeRequest
  ]);

  const persistDraft = async () => {
    const at = savePartnerEventDraft({
      company,
      form,
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
    benefits,
    partnerMessage,
    attachments,
    bannerFileName,
    persistDraftSilent
  ]);

  const handlePartnerEventSubmit = async () => {
    if (!validateForm()) return;
    if (isApprovedOrHidden) {
      setConfirmAction('update');
      return;
    }
    if (isPending) {
      setConfirmAction('updatePending');
      return;
    }
    if (!isPending) {
      setConfirmAction('submit');
    }
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

  const doUpdatePending = async () => {
    if (!validateForm() || !activeRequest?._id) {
      setConfirmAction(null);
      return;
    }
    setSubmitting(true);
    try {
      const res = await updatePartnerEventRequest(activeRequest._id, buildPayload());
      setActiveRequest(res.request || activeRequest);
      showToast?.('Đã cập nhật đơn đang chờ duyệt.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Cập nhật thất bại.', 'error');
    } finally {
      setSubmitting(false);
      setConfirmAction(null);
    }
  };

  const doDeleteCancelled = async (requestId) => {
    if (!requestId) return;
    setSubmitting(true);
    try {
      await deletePartnerEventRequest(requestId);
      setCancelledRequests((prev) => prev.filter((item) => item._id !== requestId));
      showToast?.('Đã xóa đơn đã hủy.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Xóa đơn thất bại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const doCancelRequest = async () => {
    if (!activeRequest?._id) return;
    setSubmitting(true);
    try {
      const cancelledRequest = activeRequest;
      await cancelPartnerEventRequest(activeRequest._id);
      clearPartnerEventDraft();
      setActiveRequest(null);
      if (cancelledRequest?._id) {
        setCancelledRequests((prev) => [
          { ...cancelledRequest, status: 'cancelled' },
          ...prev.filter((item) => item._id !== cancelledRequest._id)
        ]);
      }
      showToast?.('Đã hủy yêu cầu sự kiện. Bạn có thể xóa đơn đã hủy bên dưới.', 'success');
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
        open={confirmAction === 'updatePending'}
        title="Lưu thay đổi đơn?"
        message="Tên và nội dung đơn sẽ được cập nhật. Đơn cũ trên danh sách CTSV sẽ hiển thị theo thông tin mới."
        confirmLabel="Lưu thay đổi"
        cancelLabel="Quay lại"
        onConfirm={doUpdatePending}
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
          Điền chi tiết sự kiện. Thông tin doanh nghiệp lấy từ hồ sơ đối tác. CTSV sẽ xem xét và phản hồi trong 3–5 ngày làm việc.
        </p>
        {draftLabel && !isApprovedOrHidden && (
          <p className="ctsv-create-draft-status" aria-live="polite">
            Bản nháp đã lưu lúc {draftLabel}
          </p>
        )}
      </header>

      {isPending && (
        <div className="ctsv-pd-banner ctsv-pd-banner--warn" style={{ marginBottom: 24 }}>
          <strong>Yêu cầu đang chờ duyệt.</strong> Bạn có thể chỉnh sửa tên và nội dung đơn trước khi CTSV duyệt.
          {statusLabel && (
            <span className={`ctsv-pd-status ctsv-pd-status--${statusTone}`} style={{ marginLeft: 12 }}>
              {statusLabel}
            </span>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

      {cancelledRequests.length > 0 && (
        <div className="ctsv-pd-banner ctsv-pd-banner--info" style={{ marginBottom: 24 }}>
          <strong>Đơn đã hủy</strong>
          <ul className="ctsv-pd-files" style={{ marginTop: 12 }}>
            {cancelledRequests.map((item) => (
              <li key={item._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span>{item.title || 'Đơn không tên'}</span>
                <button
                  type="button"
                  className="ctsv-btn-secondary"
                  disabled={submitting}
                  onClick={() => doDeleteCancelled(item._id)}
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
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

      <div className="ctsv-create-form">
        <EventProposalForm
          role="partner"
          embedded
          hideHeader
          hideBackButton
          showToast={showToast}
          form={form}
          onFormChange={setForm}
          bannerFileName={bannerFileName}
          onBannerFileNameChange={setBannerFileName}
          disabled={isReadOnly}
          submitting={submitting}
          onDraftSave={!isPending && !isApprovedOrHidden ? persistDraft : undefined}
          beforeFinalSubmit={() =>
            company.companyName.trim()
              ? null
              : 'Vui lòng cập nhật tên doanh nghiệp trong hồ sơ đối tác.'
          }
          onSubmit={handlePartnerEventSubmit}
        />

        <CollapsibleFormSection title="Quyền lợi & Đính kèm" sectionId="partner-benefits">
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
        </CollapsibleFormSection>

        <footer className="ctsv-form-actions">
          <button
            type="button"
            className="ctsv-btn-secondary"
            disabled={submitting}
            onClick={() => setConfirmAction('cancel')}
          >
            Hủy bỏ
          </button>

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
            </>
          )}

        </footer>
      </div>
    </div>
  );
};

export default PartnerProposalCreate;
