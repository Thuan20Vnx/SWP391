import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../pages/ClubManagement.css';
import AppSelect from '../ui/AppSelect';
import BannerCropModal from '../ctsv/BannerCropModal';
import EventIntroFields from './EventIntroFields';
import EventTicketTypesEditor from './EventTicketTypesEditor';
import { CTSV_CATEGORY_OPTIONS } from '../../constants/eventCategories';
import { DEFAULT_LEARNING_OUTCOME_ROWS, normalizeLearningOutcomesForSave } from '../../utils/eventIntro';
import {
  EMPTY_EVENT_FORM,
  EVENT_FORM_ROLE_CONFIG,
  VENUE_OPTIONS,
  buildCoreEventPayload,
  formatScheduleLabel,
  validateScheduleStep,
  validateTicketTypesStep,
} from '../../utils/eventFormState';
import { audienceLabel, formatTicketPriceLabel } from '../../utils/eventTicketTypes';
import { toLocalDateInputMin } from '../../utils/dateValidation';
import {
  EVENT_PLAN_ACCEPT,
  EVENT_PLAN_MAX_BYTES,
  formatFileSize,
  isAllowedEventPlanFile,
  isValidEventPlanLink,
  normalizeEventPlanLink,
} from '../../utils/eventPlanFile';
import EventProposalFormSkeleton from './EventProposalFormSkeleton';
import EventDocImportPanel from './EventDocImportPanel';
import ClubTimelineQuickPick from '../club/ClubTimelineQuickPick';
import TimelineLocationConflictNotice from '../timeline/TimelineLocationConflictNotice';
import { checkEventVenueConflictsApi } from '../../services/schoolTimelineApi';
import { checkPartnerVenueConflicts } from '../../services/partnerApi';

const BANNER_MAX_BYTES = 5 * 1024 * 1024;

const ConfirmDetailItem = ({ label, value, empty = 'Chưa nhập' }) => {
  const display = value || empty;
  const isMuted = !value || display === empty || display === 'Chưa chọn';
  return (
    <div className="clb-confirm-item">
      <span className="clb-confirm-item__label">{label}</span>
      <span className={`clb-confirm-item__value${isMuted ? ' is-muted' : ''}`}>{display}</span>
    </div>
  );
};
const STEPS = ['THÔNG TIN CHUNG', 'NỘI DUNG', 'THỜI GIAN & ĐỊA ĐIỂM', 'GỬI DUYỆT'];

const EventProposalForm = ({
  role = 'club',
  showToast,
  editingId = null,
  isEditMode = false,
  initialForm,
  form: controlledForm,
  onFormChange,
  bannerFileName: controlledBannerFileName,
  onBannerFileNameChange,
  disabled = false,
  submitting = false,
  onCancel,
  onDraftSave,
  onSubmit,
  beforeFinalSubmit,
  embedded = false,
  hideHeader = false,
  hideBackButton = false,
  loading = false,
  className = '',
  approvedTimelines = [],
  clubEvents = [],
  onOpenExistingEvent,
  onClearEditMode,
}) => {
  const config = EVENT_FORM_ROLE_CONFIG[role] || EVENT_FORM_ROLE_CONFIG.club;
  const isControlled = controlledForm != null && typeof onFormChange === 'function';

  const [internalForm, setInternalForm] = useState(() => ({
    ...EMPTY_EVENT_FORM,
    location: config.defaultLocation || EMPTY_EVENT_FORM.location,
    ...initialForm,
  }));
  const [step, setStep] = useState(1);
  const todayDateMin = useMemo(() => toLocalDateInputMin(), []);
  const [internalBannerFileName, setInternalBannerFileName] = useState('');
  const [bannerCropOpen, setBannerCropOpen] = useState(false);
  const [bannerCropSrc, setBannerCropSrc] = useState('');
  const [selectedTimelineKey, setSelectedTimelineKey] = useState(null);
  const [selectedTimelineSource, setSelectedTimelineSource] = useState(null);
  const [venueConflicts, setVenueConflicts] = useState([]);
  const bannerInputRef = useRef(null);
  const planFileInputRef = useRef(null);

  const form = isControlled ? controlledForm : internalForm;
  const bannerFileName = controlledBannerFileName ?? internalBannerFileName;

  const setForm = (updater) => {
    if (isControlled) {
      const next = typeof updater === 'function' ? updater(controlledForm) : updater;
      onFormChange(next);
    } else {
      setInternalForm(updater);
    }
  };

  const setBannerFileName = (name) => {
    if (onBannerFileNameChange) onBannerFileNameChange(name);
    else setInternalBannerFileName(name);
  };

  useEffect(() => {
    if (!initialForm) return;
    if (isControlled) onFormChange({ ...EMPTY_EVENT_FORM, location: config.defaultLocation, ...initialForm });
    else setInternalForm({ ...EMPTY_EVENT_FORM, location: config.defaultLocation, ...initialForm });
    setSelectedTimelineKey(null);
    setSelectedTimelineSource(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const showVenueConflictCheck = role === 'partner' || role === 'icpdp' || role === 'ctsv';
  const supportsTimelineQuickPick = role === 'club' || role === 'icpdp' || role === 'ctsv';

  useEffect(() => {
    if (!showVenueConflictCheck || !form.location?.trim() || !form.eventStartDate) {
      setVenueConflicts([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      const startPart = form.eventStartTime || '00:00';
      const endPart = form.eventEndTime || '23:59';
      const startDate = new Date(`${form.eventStartDate}T${startPart}`).toISOString();
      const endDate = form.eventEndDate
        ? new Date(`${form.eventEndDate}T${endPart}`).toISOString()
        : undefined;
      const checkPromise =
        role === 'partner'
          ? checkPartnerVenueConflicts({ location: form.location, startDate, endDate })
          : checkEventVenueConflictsApi({
              location: form.location,
              startDate,
              endDate,
              excludeTimelineId: selectedTimelineSource?.timelineId,
              excludeItemIndex: selectedTimelineSource?.itemIndex,
            });
      checkPromise
        .then((res) => setVenueConflicts(res.conflicts || []))
        .catch(() => setVenueConflicts([]));
    }, 280);
    return () => clearTimeout(timer);
  }, [
    form.location,
    form.eventStartDate,
    form.eventStartTime,
    form.eventEndDate,
    form.eventEndTime,
    role,
    showVenueConflictCheck,
    selectedTimelineSource,
  ]);

  const handleTimelineQuickPick = (item, nextForm) => {
    if (isEditMode || editingId) {
      const confirmed = window.confirm(
        'Thay thế nội dung form hiện tại bằng thông tin từ timeline? Các thay đổi chưa lưu sẽ bị mất.'
      );
      if (!confirmed) return;
      onClearEditMode?.();
    }

    setSelectedTimelineKey(item.key);
    setSelectedTimelineSource({
      timelineId: item.timelineId,
      itemIndex: item.itemIndex,
      itemTitle: item.title,
      semesterLabel: item.semesterLabel,
    });
    setStep(1);
    setForm(nextForm);
    showToast?.('Đã điền thông tin từ timeline. Vui lòng bổ sung banner và gửi duyệt.', 'success');
  };

  const handleAdHocEventMode = useCallback(() => {
    setSelectedTimelineKey(null);
    setSelectedTimelineSource(null);
  }, []);

  const patchForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleBannerFile = (file) => {
    if (disabled || !file) return;
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
      setBannerCropSrc(reader.result);
      setBannerFileName(file.name);
      setBannerCropOpen(true);
    };
    reader.onerror = () => showToast?.('Không đọc được file ảnh.', 'error');
    reader.readAsDataURL(file);
  };

  const onBannerCropConfirm = (dataUrl, fileName) => {
    setBannerCropOpen(false);
    setBannerCropSrc('');
    if (!dataUrl) {
      showToast?.('Không xử lý được ảnh. Vui lòng thử lại.', 'error');
      return;
    }
    patchForm({ thumbnail: dataUrl });
    if (fileName) setBannerFileName(fileName);
    showToast?.('Đã áp dụng ảnh bìa (16:9).', 'success');
  };

  const handlePlanFile = (file) => {
    if (disabled || !file) return;
    if (!isAllowedEventPlanFile(file)) {
      showToast?.('Chỉ chấp nhận PDF, DOC, DOCX, XLS, XLSX hoặc ZIP.', 'error');
      return;
    }
    if (file.size > EVENT_PLAN_MAX_BYTES) {
      showToast?.('Tệp tối đa 10MB. Vui lòng chọn file nhỏ hơn.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      patchForm({
        eventPlanFile: reader.result,
        eventPlanFileName: file.name,
        eventPlanFileMime: file.type || 'application/octet-stream',
        eventPlanFileSizeLabel: formatFileSize(file.size),
      });
      showToast?.('Đã tải bảng kế hoạch sự kiện.', 'success');
    };
    reader.onerror = () => showToast?.('Không đọc được tệp kế hoạch.', 'error');
    reader.readAsDataURL(file);
  };

  const clearPlanFile = () => {
    patchForm({
      eventPlanFile: '',
      eventPlanFileName: '',
      eventPlanFileMime: '',
      eventPlanFileSizeLabel: '',
      eventPlanUrl: '',
    });
    if (planFileInputRef.current) planFileInputRef.current.value = '';
  };

  const supportsDocImport =
    ['ctsv', 'icpdp', 'club', 'partner'].includes(role) && !isEditMode && !editingId && !disabled;

  const handleDocImport = (patch) => {
    if (!patch || typeof patch !== 'object') return;
    setForm((prev) => ({ ...prev, ...patch }));
    setStep(1);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.title?.trim()) return 'Vui lòng nhập tên sự kiện.';
      if (!form.category) return 'Vui lòng chọn thể loại.';
      if (!form.thumbnail) return 'Vui lòng tải ảnh banner tỉ lệ 16:9.';
      if (config.requireEventPlan) {
        const hasPlanFile = Boolean(form.eventPlanFile);
        const hasPlanLink = isValidEventPlanLink(form.eventPlanLink);
        // Khi sửa đơn, file đã lưu trước đó (eventPlanUrl/tên file từ BE) vẫn được tính là
        // hợp lệ — không bắt buộc tải lại file mới. Bấm "Xóa file" sẽ clear cả hai.
        const hasExistingPlan = Boolean(form.eventPlanUrl) || Boolean(form.eventPlanFileName);
        if (!hasPlanFile && !hasPlanLink && !hasExistingPlan) {
          return 'Vui lòng tải file hoặc dán link bảng kế hoạch sự kiện (Google Drive, OneDrive...).';
        }
      }
    }
    if (step === 2) {
      if (!form.description?.trim()) return 'Vui lòng nhập mô tả trong phần Giới thiệu sự kiện.';
      if (normalizeLearningOutcomesForSave(form.learningOutcomes).length === 0) {
        return 'Vui lòng thêm ít nhất một mục trong “Bạn sẽ học được gì?”.';
      }
    }
    if (step === 3) {
      if (!form.location?.trim()) return 'Vui lòng nhập địa điểm tổ chức.';
      return validateScheduleStep(form) || validateTicketTypesStep(form);
    }
    if (step === 4 && beforeFinalSubmit) return beforeFinalSubmit();
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep();
    if (err) {
      showToast?.(err, 'error');
      return;
    }
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }

    const payload = buildCoreEventPayload(form);
    if (bannerFileName) payload.bannerFileName = bannerFileName;
    if (form.eventPlanFile) {
      payload.eventPlanFile = form.eventPlanFile;
      payload.eventPlanFileName = form.eventPlanFileName || 'bang-ke-hoach-su-kien';
      payload.eventPlanFileMime = form.eventPlanFileMime || '';
    }
    if (form.eventPlanLink?.trim()) {
      payload.eventPlanLink = normalizeEventPlanLink(form.eventPlanLink);
    }
    if (selectedTimelineSource?.itemTitle) {
      payload.timelineSource = selectedTimelineSource;
    }
    await onSubmit?.(payload);
  };

  const title = isEditMode || editingId ? config.titleEdit : config.titleCreate;
  const subtitle = isEditMode || editingId ? config.subtitleEdit : config.subtitleCreate;
  const submitLabel = isEditMode || editingId ? config.submitEdit : config.submitCreate;

  const wrapperClass = embedded
    ? `event-proposal-form-embedded ${className}`.trim()
    : `clb-create-view event-proposal-form ${className}`.trim();

  const wrapperStyle = embedded
    ? undefined
    : { width: '100%', maxWidth: '1200px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' };

  if (loading) {
    return (
      <EventProposalFormSkeleton
        role={role}
        isEditMode={isEditMode || Boolean(editingId)}
        onCancel={hideBackButton ? undefined : onCancel}
      />
    );
  }

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      {!hideHeader && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          {!hideBackButton && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                marginRight: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor" />
              </svg>
            </button>
          )}
          <div>
            <h2 className="clb-modal-title" style={{ margin: 0 }}>
              {title}
            </h2>
            <p className="clb-modal-subtitle" style={{ margin: '4px 0 0 0' }}>
              {subtitle}
            </p>
          </div>
        </div>
      )}

      {supportsTimelineQuickPick && approvedTimelines.length > 0 && (
        <ClubTimelineQuickPick
          timelines={approvedTimelines}
          clubEvents={clubEvents}
          currentForm={form}
          selectedKey={selectedTimelineKey}
          onSelectItem={handleTimelineQuickPick}
          onSelectAdHoc={handleAdHocEventMode}
          onOpenExistingEvent={onOpenExistingEvent}
          disabled={disabled || submitting}
        />
      )}

      <div className="clb-steps">
        {STEPS.map((label, i) => (
          <div key={label} className={`clb-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
            <div className="clb-step-circle">{step > i + 1 ? '✓' : i + 1}</div>
            <span className="clb-step-label">{label}</span>
            {i < 3 && <div className="clb-step-line" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="clb-modal-form">
        {step === 1 && (
          <div className="clb-form-step">
            {supportsDocImport && (
              <EventDocImportPanel
                onApply={handleDocImport}
                onAttachFile={config.requireEventPlan ? handlePlanFile : undefined}
                disabled={disabled}
                showToast={showToast}
              />
            )}
            <div className="clb-form-row">
              <div className="clb-form-group">
                <label>
                  Tên Sự Kiện <span className="clb-required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Vd: Workshop Lập trình Flutter"
                  value={form.title}
                  onChange={(e) => patchForm({ title: e.target.value })}
                  required
                  className="clb-input"
                  disabled={disabled}
                />
              </div>
              <div className="clb-form-group">
                <label>
                  Thể Loại <span className="clb-required">*</span>
                </label>
                <AppSelect
                  value={form.category}
                  onChange={(e) => patchForm({ category: e.target.value })}
                  options={CTSV_CATEGORY_OPTIONS}
                  placeholder="Chọn thể loại"
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="clb-form-group clb-form-group--banner">
              <label>
                Ảnh Banner (Thumbnail) <span className="clb-required">*</span>
              </label>
              <p className="clb-banner-hint">Tỉ lệ bắt buộc 16:9 · Xuất 1200×675px · Tối đa 5MB</p>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="ctsv-file-input-hidden"
                onChange={(e) => {
                  handleBannerFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
                disabled={disabled}
              />
              <div className="ctsv-banner-upload">
                <div
                  className={`ctsv-banner-dropzone clb-banner-dropzone${form.thumbnail ? ' has-image' : ''}`}
                  onClick={() => !disabled && bannerInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      bannerInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('is-dragover');
                  }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('is-dragover')}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('is-dragover');
                    if (!disabled) handleBannerFile(e.dataTransfer.files?.[0]);
                  }}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                >
                  {form.thumbnail ? (
                    <>
                      <img src={form.thumbnail} alt="Xem trước ảnh bìa" className="ctsv-banner-preview" />
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
                  {!disabled && (
                    <div className="ctsv-banner-meta-actions">
                      <button type="button" className="ctsv-btn-banner-secondary" onClick={() => bannerInputRef.current?.click()}>
                        Chọn file
                      </button>
                      {form.thumbnail && (
                        <>
                          <button
                            type="button"
                            className="ctsv-btn-banner-secondary"
                            onClick={() => {
                              setBannerCropSrc(form.thumbnail);
                              setBannerCropOpen(true);
                            }}
                          >
                            Cắt / chỉnh sửa
                          </button>
                          <button
                            type="button"
                            className="ctsv-btn-banner-remove"
                            onClick={() => {
                              patchForm({ thumbnail: '' });
                              setBannerFileName('');
                              if (bannerInputRef.current) bannerInputRef.current.value = '';
                            }}
                          >
                            Xóa ảnh
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {config.requireEventPlan && (
              <div className="clb-form-group clb-form-group--plan">
                <label>
                  Bảng kế hoạch sự kiện <span className="clb-required">*</span>
                </label>
                <p className="clb-banner-hint">PDF, DOC, DOCX, XLS, XLSX, ZIP — tối đa 10MB</p>
                <input
                  ref={planFileInputRef}
                  type="file"
                  accept={EVENT_PLAN_ACCEPT}
                  className="ctsv-file-input-hidden"
                  onChange={(e) => {
                    handlePlanFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                  disabled={disabled}
                />
                <div className="clb-plan-upload">
                  <div
                    className={`clb-plan-dropzone${form.eventPlanFile ? ' has-file' : ''}`}
                    onClick={() => !disabled && planFileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (disabled) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        planFileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('is-dragover');
                    }}
                    onDragLeave={(e) => e.currentTarget.classList.remove('is-dragover')}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('is-dragover');
                      if (!disabled) handlePlanFile(e.dataTransfer.files?.[0]);
                    }}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                  >
                    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
                      <path
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                        fill="currentColor"
                        opacity="0.35"
                      />
                      <path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                    <span className="clb-plan-dropzone__title">
                      {form.eventPlanFileName || 'Tải bảng kế hoạch lên'}
                    </span>
                    <span className="clb-plan-dropzone__hint">Kéo thả hoặc bấm để chọn file</span>
                  </div>
                  {!disabled && (
                    <div className="clb-plan-meta">
                      <button
                        type="button"
                        className="ctsv-btn-banner-secondary"
                        onClick={() => planFileInputRef.current?.click()}
                      >
                        Chọn file
                      </button>
                      {form.eventPlanFile && (
                        <button type="button" className="ctsv-btn-banner-remove" onClick={clearPlanFile}>
                          Xóa file
                        </button>
                      )}
                    </div>
                  )}
                  {form.eventPlanFileSizeLabel && (
                    <span className="ctsv-banner-filename">{form.eventPlanFileSizeLabel}</span>
                  )}
                </div>
                <div className="clb-plan-link-field">
                  <label className="clb-plan-link-field__label" htmlFor="event-plan-link">
                    Hoặc dán link tài liệu
                  </label>
                  <input
                    id="event-plan-link"
                    type="url"
                    className="clb-input"
                    placeholder="https://drive.google.com/..."
                    value={form.eventPlanLink}
                    onChange={(e) => patchForm({ eventPlanLink: e.target.value })}
                    disabled={disabled}
                  />
                  <p className="clb-banner-hint">Dùng khi file quá lớn — Google Drive, OneDrive, v.v.</p>
                </div>
              </div>
            )}
            <div className="clb-form-row">
              <div className="clb-form-group">
                <label>Diễn Giả / Khách Mời</label>
                <input
                  type="text"
                  placeholder="Tên diễn giả..."
                  value={form.speaker}
                  onChange={(e) => patchForm({ speaker: e.target.value })}
                  className="clb-input"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="clb-form-step clb-form-step--intro">
            <EventIntroFields
              description={form.description}
              learningOutcomes={form.learningOutcomes || DEFAULT_LEARNING_OUTCOME_ROWS}
              onDescriptionChange={(e) => patchForm({ description: e.target.value })}
              onLearningOutcomeChange={(index, value) =>
                setForm((p) => {
                  const rows = [...(p.learningOutcomes || DEFAULT_LEARNING_OUTCOME_ROWS)];
                  rows[index] = value;
                  return { ...p, learningOutcomes: rows };
                })
              }
              onAddLearningOutcome={() =>
                setForm((p) => ({
                  ...p,
                  learningOutcomes: [...(p.learningOutcomes || DEFAULT_LEARNING_OUTCOME_ROWS), ''],
                }))
              }
              onRemoveLearningOutcome={(index) =>
                setForm((p) => {
                  const rows = [...(p.learningOutcomes || DEFAULT_LEARNING_OUTCOME_ROWS)];
                  if (rows.length <= 1) return p;
                  rows.splice(index, 1);
                  return { ...p, learningOutcomes: rows };
                })
              }
              descriptionRequired
              disabled={disabled}
            />
            <div className="clb-form-group">
              <label>Chương trình dự kiến (Agenda)</label>
              <textarea
                placeholder="Lịch trình cụ thể của sự kiện..."
                value={form.agenda}
                onChange={(e) => patchForm({ agenda: e.target.value })}
                rows={4}
                className="clb-input clb-textarea"
                disabled={disabled}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="clb-form-step">
            <h4 className="clb-form-subsection-title">Thời gian đăng ký</h4>
            <div className="clb-form-row">
              <div className="clb-form-group">
                <label>
                  Ngày Bắt Đầu Đăng Ký <span className="clb-required">*</span>
                </label>
                <input
                  type="date"
                  value={form.regStartDate}
                  onChange={(e) => patchForm({ regStartDate: e.target.value })}
                  min={todayDateMin}
                  required
                  className="clb-input"
                  disabled={disabled}
                />
              </div>
              <div className="clb-form-group">
                <label>
                  Giờ Bắt Đầu Đăng Ký <span className="clb-required">*</span>
                </label>
                <input
                  type="time"
                  value={form.regStartTime}
                  onChange={(e) => patchForm({ regStartTime: e.target.value })}
                  required
                  className="clb-input"
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="clb-form-row">
              <div className="clb-form-group">
                <label>Ngày Kết Thúc Đăng Ký</label>
                <input
                  type="date"
                  value={form.regEndDate}
                  onChange={(e) => patchForm({ regEndDate: e.target.value })}
                  className="clb-input"
                  disabled={disabled}
                />
              </div>
              <div className="clb-form-group">
                <label>Giờ Kết Thúc Đăng Ký</label>
                <input
                  type="time"
                  value={form.regEndTime}
                  onChange={(e) => patchForm({ regEndTime: e.target.value })}
                  className="clb-input"
                  disabled={disabled}
                />
              </div>
            </div>

            <h4 className="clb-form-subsection-title">Thời gian sự kiện</h4>
            <div className="clb-form-row">
              <div className="clb-form-group">
                <label>
                  Ngày Bắt Đầu Sự Kiện <span className="clb-required">*</span>
                </label>
                <input
                  type="date"
                  value={form.eventStartDate}
                  onChange={(e) => patchForm({ eventStartDate: e.target.value })}
                  min={todayDateMin}
                  required
                  className="clb-input"
                  disabled={disabled}
                />
              </div>
              <div className="clb-form-group">
                <label>
                  Giờ Bắt Đầu Sự Kiện <span className="clb-required">*</span>
                </label>
                <input
                  type="time"
                  value={form.eventStartTime}
                  onChange={(e) => patchForm({ eventStartTime: e.target.value })}
                  required
                  className="clb-input"
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="clb-form-row">
              <div className="clb-form-group">
                <label>Ngày Kết Thúc Sự Kiện</label>
                <input
                  type="date"
                  value={form.eventEndDate}
                  onChange={(e) => patchForm({ eventEndDate: e.target.value })}
                  className="clb-input"
                  disabled={disabled}
                />
              </div>
              <div className="clb-form-group">
                <label>Giờ Kết Thúc Sự Kiện</label>
                <input
                  type="time"
                  value={form.eventEndTime}
                  onChange={(e) => patchForm({ eventEndTime: e.target.value })}
                  className="clb-input"
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="clb-form-row">
              <div className="clb-form-group">
                <label>Số lượng vé tối đa</label>
                <input
                  type="number"
                  min="1"
                  value={form.maxSlots}
                  onChange={(e) => patchForm({ maxSlots: e.target.value })}
                  className="clb-input"
                  disabled={disabled}
                />
              </div>
              <div className="clb-form-group">
                <label>Địa điểm tổ chức</label>
                {config.locationMode === 'select' ? (
                  <AppSelect
                    value={form.location}
                    onChange={(e) => patchForm({ location: e.target.value })}
                    options={VENUE_OPTIONS}
                    placeholder="Chọn địa điểm"
                    disabled={disabled}
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="VD: Sảnh Alpha — FPT University"
                    value={form.location}
                    onChange={(e) => patchForm({ location: e.target.value })}
                    className="clb-input"
                    disabled={disabled}
                  />
                )}
              </div>
            </div>
            {venueConflicts.length > 0 && (
              <TimelineLocationConflictNotice
                conflicts={venueConflicts}
                venue={form.location}
                plannedDate={form.eventStartDate ? `${form.eventStartDate}T${form.eventStartTime || '00:00'}` : null}
                plannedEndDate={
                  form.eventEndDate
                    ? `${form.eventEndDate}T${form.eventEndTime || '23:59'}`
                    : null
                }
              />
            )}
            <div className="clb-form-group">
              <EventTicketTypesEditor
                tickets={form.ticketTypes || []}
                onChange={(ticketTypes) => patchForm({ ticketTypes })}
                maxSlots={form.maxSlots}
                disabled={disabled}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="clb-form-step">
            <div className="clb-confirm-box">
              <div className="clb-confirm-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <h3>Xác nhận gửi đề xuất</h3>
              <p>{config.confirmNote}</p>
              <div className="clb-confirm-details">
                <div className={`clb-confirm-hero${form.thumbnail ? '' : ' clb-confirm-hero--no-banner'}`}>
                  {form.thumbnail && (
                    <div className="clb-confirm-banner">
                      <img src={form.thumbnail} alt="Ảnh bìa sự kiện" />
                    </div>
                  )}
                  <div className="clb-confirm-hero__body">
                    {form.category && (
                      <span className="clb-confirm-category">{form.category}</span>
                    )}
                    <h4 className="clb-confirm-event-title">{form.title || 'Chưa nhập tên sự kiện'}</h4>
                    {form.speaker && (
                      <p className="clb-confirm-speaker">
                        <span className="clb-confirm-speaker__label">Diễn giả</span>
                        {form.speaker}
                      </p>
                    )}
                    {config.requireEventPlan && (
                      <p className="clb-confirm-speaker">
                        <span className="clb-confirm-speaker__label">Kế hoạch</span>
                        {form.eventPlanFileName
                          || (isValidEventPlanLink(form.eventPlanLink) ? form.eventPlanLink.trim() : '')
                          || 'Chưa có file/link'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="clb-confirm-sections">
                  <section className="clb-confirm-section">
                    <h5 className="clb-confirm-section__title">Thời gian đăng ký</h5>
                    <div className="clb-confirm-grid">
                      <ConfirmDetailItem
                        label="Bắt đầu"
                        value={formatScheduleLabel(form.regStartDate, form.regStartTime)}
                      />
                      <ConfirmDetailItem
                        label="Kết thúc"
                        value={formatScheduleLabel(form.regEndDate, form.regEndTime)}
                      />
                    </div>
                  </section>

                  <section className="clb-confirm-section">
                    <h5 className="clb-confirm-section__title">Thời gian sự kiện</h5>
                    <div className="clb-confirm-grid">
                      <ConfirmDetailItem
                        label="Bắt đầu"
                        value={formatScheduleLabel(form.eventStartDate, form.eventStartTime)}
                      />
                      <ConfirmDetailItem
                        label="Kết thúc"
                        value={formatScheduleLabel(form.eventEndDate, form.eventEndTime)}
                      />
                    </div>
                  </section>

                  <section className="clb-confirm-section">
                    <h5 className="clb-confirm-section__title">Địa điểm &amp; sức chứa</h5>
                    <div className="clb-confirm-grid">
                      <ConfirmDetailItem label="Địa điểm" value={form.location} />
                      <ConfirmDetailItem label="Số slot tối đa" value={form.maxSlots ? String(form.maxSlots) : ''} />
                    </div>
                  </section>

                  <section className="clb-confirm-section clb-confirm-section--tickets">
                    <h5 className="clb-confirm-section__title">Loại vé</h5>
                    {(form.ticketTypes || []).length ? (
                      <ul className="clb-confirm-tickets">
                        {(form.ticketTypes || []).map((ticket) => {
                          const price = formatTicketPriceLabel(ticket.priceAmount);
                          const isFree = price === 'Miễn phí';
                          return (
                            <li key={ticket.id} className="clb-confirm-ticket">
                              <div className="clb-confirm-ticket__main">
                                <span className="clb-confirm-ticket__name">
                                  {ticket.name?.trim() || 'Vé'}
                                </span>
                                <span className="clb-confirm-ticket__audience">
                                  {audienceLabel(ticket.audience)}
                                </span>
                              </div>
                              <div className="clb-confirm-ticket__meta">
                                <span className="clb-confirm-ticket__qty">{Number(ticket.qty) || 0} vé</span>
                                <span className={`clb-confirm-ticket__price${isFree ? ' is-free' : ''}`}>
                                  {price}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="clb-confirm-empty">Chưa có loại vé</p>
                    )}
                  </section>
                </div>
              </div>
            </div>
          </div>
        )}

        {!disabled && (
          <div className="clb-modal-actions">
            {step > 1 && (
              <button type="button" className="clb-btn-secondary" onClick={() => setStep((s) => s - 1)}>
                Quay lại
              </button>
            )}
            {onDraftSave && step < 4 && (
              <button type="button" className="clb-btn-secondary" onClick={onDraftSave}>
                Lưu bản nháp
              </button>
            )}
            <button type="submit" className="clb-btn-primary" disabled={submitting}>
              {submitting ? 'Đang gửi…' : step === 4 ? submitLabel : `Tiếp tục Bước ${step + 1}`}
            </button>
          </div>
        )}
      </form>

      <BannerCropModal
        open={bannerCropOpen}
        imageSrc={bannerCropSrc}
        fileName={bannerFileName || 'event-banner.jpg'}
        onConfirm={onBannerCropConfirm}
        onCancel={() => {
          setBannerCropOpen(false);
          setBannerCropSrc('');
        }}
      />
    </div>
  );
};

export default EventProposalForm;
