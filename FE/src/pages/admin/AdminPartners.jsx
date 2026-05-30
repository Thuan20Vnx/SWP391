import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AdminDataSelect from '../../components/admin/AdminDataSelect';
import {
  PARTNER_FIELD_OPTIONS,
  PARTNER_SPONSOR_PROGRAM_OPTIONS,
  PARTNER_UPLOAD_ACCEPT,
  PARTNER_UPLOAD_MAX_BYTES,
  emptyPartnerForm,
  formatVndInput,
  loadStoredPartners,
  partnerFormToRecord,
  saveStoredPartners,
} from '../../data/adminPartnersData';
import { getUserRole, isAdminRole } from '../../utils/auth';
import '../../styles/admin-dashboard.css';
import '../../styles/admin-accounts.css';
import '../../styles/admin-data-maintenance.css';
import '../../styles/admin-data-fields.css';
import '../../styles/admin-partners.css';

const IconUploadCloud = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
    <path
      d="M12 16V8M8 12l4-4 4 4M4 18a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AdminPartners = () => {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const role = getUserRole();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(emptyPartnerForm);
  const [attachment, setAttachment] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdminRole(role)) {
      showToast?.('Bạn không có quyền truy cập trang quản trị!', 'error');
      navigate('/profile');
    }
  }, [role, navigate, showToast]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validateFile = (file) => {
    if (!file) return 'Không có file.';
    if (file.size > PARTNER_UPLOAD_MAX_BYTES) return 'File tối đa 10MB.';
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext || '')) return 'Chỉ chấp nhận PDF, DOC, DOCX.';
    return null;
  };

  const applyFile = (file) => {
    const err = validateFile(file);
    if (err) {
      showToast?.(err, 'error');
      return;
    }
    setAttachment(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  };

  const resetForm = () => {
    setForm(emptyPartnerForm());
    setAttachment(null);
    setDragOver(false);
  };

  const handleCancel = () => {
    resetForm();
    showToast?.('Đã hủy nhập liệu.', 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.companyName.trim() || !form.field || !form.representative.trim() || !form.email.trim() || !form.phone.trim()) {
      showToast?.('Vui lòng điền đầy đủ các trường bắt buộc (*).', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const record = partnerFormToRecord(form, attachment);
      const list = loadStoredPartners();
      saveStoredPartners([record, ...list]);
      showToast?.('Đã thêm đối tác vào hệ thống.', 'success');
      resetForm();
    } catch {
      showToast?.('Không thể lưu đối tác. Thử lại sau.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdminRole(role)) return null;

  return (
    <main className="admin-main">
      <div className="admin-partners-page">
        <div className="admin-partners-card">
          <header className="admin-partners-card__header">
            <h1 className="admin-partners-card__title">Thêm Đối Tác Mới</h1>
            <p className="admin-partners-card__subtitle">
              Nhập thông tin chi tiết để thêm đối tác tài trợ hoặc đồng hành vào hệ thống.
            </p>
          </header>

          <form className="admin-partners-form" onSubmit={handleSubmit} noValidate>
            <div className="admin-partners-form__grid">
              <div className="admin-data-field">
                <label className="admin-partner-field__label" htmlFor="partner-company">
                  Tên doanh nghiệp/đối tác <span className="admin-partner-required">*</span>
                </label>
                <input
                  id="partner-company"
                  type="text"
                  className="admin-data-input"
                  value={form.companyName}
                  onChange={(e) => setField('companyName', e.target.value)}
                  placeholder="Ví dụ: Công ty Cổ phần VNG"
                  required
                  disabled={submitting}
                />
              </div>

              <AdminDataSelect
                label="Lĩnh vực hoạt động *"
                labelClassName="admin-partner-field__label"
                value={form.field}
                options={PARTNER_FIELD_OPTIONS}
                placeholder="Chọn lĩnh vực"
                onChange={(v) => setField('field', v)}
                disabled={submitting}
                required
              />
            </div>

            <div className="admin-partners-form__grid admin-partners-form__grid--full">
              <div className="admin-data-field">
                <label className="admin-partner-field__label" htmlFor="partner-rep">
                  Người đại diện <span className="admin-partner-required">*</span>
                </label>
                <input
                  id="partner-rep"
                  type="text"
                  className="admin-data-input"
                  value={form.representative}
                  onChange={(e) => setField('representative', e.target.value)}
                  placeholder="Họ và tên người đại diện"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="admin-partners-form__grid">
              <div className="admin-data-field">
                <label className="admin-partner-field__label" htmlFor="partner-email">
                  Email liên hệ <span className="admin-partner-required">*</span>
                </label>
                <input
                  id="partner-email"
                  type="email"
                  className="admin-data-input"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="email@company.com"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="admin-data-field">
                <label className="admin-partner-field__label" htmlFor="partner-phone">
                  Số điện thoại <span className="admin-partner-required">*</span>
                </label>
                <input
                  id="partner-phone"
                  type="tel"
                  className="admin-data-input"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  placeholder="09xx xxx xxx"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="admin-partners-form__grid">
              <div className="admin-data-field">
                <label className="admin-partner-field__label" htmlFor="partner-sponsor-value">
                  Giá trị tài trợ dự kiến (VND)
                </label>
                <div className="admin-partner-input-vnd">
                  <input
                    id="partner-sponsor-value"
                    type="text"
                    inputMode="numeric"
                    className="admin-data-input"
                    value={form.sponsorValue}
                    onChange={(e) => setField('sponsorValue', formatVndInput(e.target.value))}
                    placeholder="10,000,000"
                    disabled={submitting}
                  />
                  <span className="admin-partner-input-vnd__suffix">VND</span>
                </div>
              </div>

              <AdminDataSelect
                label="Chương trình đề xuất tài trợ"
                labelClassName="admin-partner-field__label"
                value={form.sponsorProgram}
                options={PARTNER_SPONSOR_PROGRAM_OPTIONS}
                placeholder="Chưa xác định"
                onChange={(v) => setField('sponsorProgram', v)}
                disabled={submitting}
              />
            </div>

            <div className="admin-partners-upload">
              <span className="admin-partner-field__label">Hồ sơ năng lực & bản thảo hợp đồng</span>
              <input
                ref={fileInputRef}
                type="file"
                className="admin-partners-upload__input"
                accept={PARTNER_UPLOAD_ACCEPT}
                onChange={handleFileChange}
                disabled={submitting}
              />
              <div
                className={`admin-partners-upload__zone${dragOver ? ' admin-partners-upload__zone--drag' : ''}${attachment ? ' admin-partners-upload__zone--has-file' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <span className="admin-partners-upload__icon">
                  <IconUploadCloud />
                </span>
                {attachment ? (
                  <p className="admin-partners-upload__file-name">{attachment.name}</p>
                ) : (
                  <p className="admin-partners-upload__text">
                    <strong>Tải file lên</strong> hoặc kéo thả vào đây
                  </p>
                )}
                <p className="admin-partners-upload__hint">PDF, DOCX lên đến 10MB</p>
              </div>
            </div>

            <footer className="admin-partners-form__footer">
              <button type="button" className="admin-partners-btn-cancel" onClick={handleCancel} disabled={submitting}>
                Hủy bỏ
              </button>
              <button type="submit" className="admin-partners-btn-submit" disabled={submitting}>
                {submitting ? 'Đang thêm...' : 'Thêm đối tác'}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </main>
  );
};

export default AdminPartners;
