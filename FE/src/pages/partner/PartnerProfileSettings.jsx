import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AvatarCropModal from '../../components/profile/AvatarCropModal';

import defaultAvatar from '../../constants/defaultAvatar';
import {
  fetchPartnerMe,
  fetchPartnerUserProfile,
  mapCompanyFormToPartnerPatch,
  mapPartnerToCompanyForm,
  updatePartnerMe,
  updatePartnerUserProfile,
} from '../../services/partnerApi';
import { openImageFilePicker } from '../../utils/imageFilePicker';
import { resolveUserAvatar } from '../../utils/image';
import { PARTNER_STATUS_LABEL, PARTNER_STATUS_TONE } from '../../utils/partnerDisplay';

const Field = ({ label, value, onChange, readOnly = false, type = 'text' }) => (
  <div className="partner-field">
    <label>{label}</label>
    <input type={type} value={value || ''} onChange={onChange} readOnly={readOnly} disabled={readOnly} />
  </div>
);

const TextAreaField = ({ label, value, onChange, readOnly = false, rows = 2 }) => (
  <div className="partner-field partner-field--full">
    <label>{label}</label>
    <textarea value={value || ''} onChange={onChange} readOnly={readOnly} disabled={readOnly} rows={rows} />
  </div>
);

const PartnerProfileSettings = ({ showToast }) => {
  const companyLogoInputRef = useRef(null);
  const [user, setUser] = useState({ fullname: '', email: '', phone: '', avatar: '' });
  const [company, setCompany] = useState({});
  const [partnerRecord, setPartnerRecord] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const [logoCropSrc, setLogoCropSrc] = useState('');
  const [logoCropFileName, setLogoCropFileName] = useState('');

  useEffect(() => {
    setProfileLoading(true);
    Promise.all([
      fetchPartnerUserProfile().catch(() => null),
      fetchPartnerMe().catch(() => ({ partner: null })),
    ])
      .then(([userRes, partnerRes]) => {
        if (userRes?.user) {
          setUser({
            fullname: userRes.user.fullname || '',
            email: userRes.user.email || '',
            phone: userRes.user.phone || '',
            avatar: resolveUserAvatar(userRes.user, ''),
          });
        }
        const partner = partnerRes?.partner || null;
        setPartnerRecord(partner);
        setCompany(mapPartnerToCompanyForm(partner) || {});
      })
      .finally(() => setProfileLoading(false));
  }, []);

  const canEditCompany = Boolean(partnerRecord && ['approved', 'info_requested'].includes(partnerRecord.status));
  const displayAvatar = user.avatar || defaultAvatar;

  const handleUserSave = async () => {
    if (!user.fullname.trim()) {
      showToast?.('Vui lòng nhập họ và tên.', 'error');
      return;
    }
    setSavingUser(true);
    try {
      const res = await updatePartnerUserProfile({
        fullname: user.fullname.trim(),
        phone: user.phone.trim(),
      });
      const nextUser = res?.user || {};
      setUser((prev) => ({
        ...prev,
        fullname: nextUser.fullname || prev.fullname,
        phone: nextUser.phone || '',
        avatar: resolveUserAvatar(nextUser, prev.avatar || defaultAvatar),
      }));
      if (nextUser.fullname) localStorage.setItem('userFullname', nextUser.fullname);
      showToast?.(res?.message || 'Đã cập nhật thông tin tài khoản.', 'success');
    } catch (error) {
      showToast?.(error.message || 'Không thể cập nhật thông tin tài khoản.', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const handleCompanySave = async () => {
    if (!canEditCompany) {
      showToast?.('Hồ sơ doanh nghiệp hiện chưa thể chỉnh sửa.', 'error');
      return;
    }
    if (!company.companyName?.trim()) {
      showToast?.('Vui lòng nhập tên công ty.', 'error');
      return;
    }
    setSavingCompany(true);
    try {
      const res = await updatePartnerMe(mapCompanyFormToPartnerPatch(company));
      const updatedPartner = res?.partner || null;
      setPartnerRecord(updatedPartner);
      setCompany(mapPartnerToCompanyForm(updatedPartner) || {});
      showToast?.('Đã cập nhật hồ sơ doanh nghiệp.', 'success');
    } catch (error) {
      showToast?.(error.message || 'Không thể cập nhật hồ sơ doanh nghiệp.', 'error');
    } finally {
      setSavingCompany(false);
    }
  };

  const openLogoCrop = (src, name = 'partner-logo.jpg') => {
    if (!src) return;
    setLogoCropSrc(src);
    setLogoCropFileName(name);
    setLogoCropOpen(true);
  };

  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const dataUrl = await openImageFilePicker(file, {
      onError: (msg) => msg && showToast?.(msg, 'error'),
    });
    if (dataUrl) openLogoCrop(dataUrl, file?.name);
  };

  const handleLogoCropCancel = () => {
    setLogoCropOpen(false);
    setLogoCropSrc('');
    setLogoCropFileName('');
  };

  const handleLogoCropConfirm = async (dataUrl) => {
    handleLogoCropCancel();
    if (!dataUrl) {
      showToast?.('Không xử lý được logo công ty. Vui lòng thử lại.', 'error');
      return;
    }

    const nextCompany = { ...company, logo: dataUrl };
    setCompany(nextCompany);

    if (!canEditCompany) {
      showToast?.('Đã cập nhật ảnh xem trước. Hãy gửi lại khi hồ sơ có thể chỉnh sửa.', 'info');
      return;
    }

    setSavingCompany(true);
    try {
      const res = await updatePartnerMe(mapCompanyFormToPartnerPatch(nextCompany));
      const updatedPartner = res?.partner || null;
      setPartnerRecord(updatedPartner);
      setCompany(mapPartnerToCompanyForm(updatedPartner) || {});
      showToast?.('Đã cập nhật logo công ty.', 'success');
    } catch (error) {
      showToast?.(error.message || 'Không thể cập nhật logo công ty.', 'error');
    } finally {
      setSavingCompany(false);
    }
  };

  return (
    <div className="partner-profile-page">
      <header className="partner-profile-page__header">
        <h1>Hồ sơ & Cài đặt</h1>
        <p>Thông tin tài khoản và doanh nghiệp của bạn.</p>
        {!profileLoading && (
          <>
            {partnerRecord && (
              <p className="partner-profile-status">
                <span className={`ctsv-pd-status ctsv-pd-status--${PARTNER_STATUS_TONE[partnerRecord.status] || 'slate'}`}>
                  {PARTNER_STATUS_LABEL[partnerRecord.status] || partnerRecord.status}
                </span>
                {partnerRecord.rejectionReason && (
                  <span className="partner-profile-status-reason"> - {partnerRecord.rejectionReason}</span>
                )}
                {partnerRecord.supplementReason && (
                  <span className="partner-profile-status-reason">
                    {' '} - Yêu cầu bổ sung: {partnerRecord.supplementReason}{' '}
                    <Link to="/partner/proposals/create">Bổ sung ngay</Link>
                  </span>
                )}
              </p>
            )}
            {!partnerRecord && (
              <p className="partner-profile-status">
                Chưa có hồ sơ đối tác. <Link to="/partner/proposals/create">Gửi đề xuất đầu tiên</Link>
              </p>
            )}
          </>
        )}
      </header>

      {profileLoading ? (
        <div className="partner-profile-loading">Đang tải thông tin hồ sơ…</div>
      ) : (
        <div className="partner-profile-stack">
          <section className="partner-profile-card">
            <h2 className="partner-profile-card__title">Thông tin tài khoản</h2>
            <p className="partner-profile-card__desc">
              Cập nhật họ tên và số điện thoại của tài khoản đăng nhập.
            </p>
            <div className="partner-user-avatar-row">
              <div className="partner-user-avatar-preview">
                <img src={displayAvatar} alt="Ảnh đại diện" />
              </div>
            </div>
            <div className="partner-form-grid">
              <Field
                label="Họ và tên"
                value={user.fullname}
                onChange={(e) => setUser((prev) => ({ ...prev, fullname: e.target.value }))}
              />
              <Field label="Email đăng nhập" value={user.email} readOnly />
              <Field
                label="Số điện thoại cá nhân"
                value={user.phone}
                onChange={(e) => setUser((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="partner-profile-actions">
              <button type="button" className="ctsv-btn-primary" disabled={savingUser} onClick={handleUserSave}>
                {savingUser ? 'Đang lưu...' : 'Lưu thông tin tài khoản'}
              </button>
            </div>
          </section>

          <section className="partner-profile-card">
            <h2 className="partner-profile-card__title">Thông tin doanh nghiệp</h2>
            <p className="partner-profile-card__desc">
              Hồ sơ hiển thị trên đề xuất hợp tác và các tài liệu làm việc với FPT University.
            </p>
            <div className="partner-company-logo-row">
              <button
                type="button"
                className="partner-company-logo-preview partner-company-logo-preview--banner partner-company-logo-preview--clickable"
                onClick={() => canEditCompany && companyLogoInputRef.current?.click()}
                disabled={!canEditCompany}
                aria-label="Đổi logo công ty"
              >
                {company.logo ? (
                  <img src={company.logo} alt="Logo công ty" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M8 13l2.5-2.5L14 14l2-2 3 3" />
                    <circle cx="8.5" cy="9" r="1.25" fill="currentColor" stroke="none" />
                  </svg>
                )}
                {canEditCompany ? (
                  <span className="partner-company-logo-preview__overlay">Đổi logo</span>
                ) : null}
              </button>
              <div className="partner-company-logo-actions">
                <button
                  type="button"
                  className="partner-btn-outline"
                  onClick={() => companyLogoInputRef.current?.click()}
                  disabled={!canEditCompany || savingCompany}
                >
                  {company.logo ? 'Thay logo công ty' : 'Tải logo công ty'}
                </button>
                <span>Logo công ty có thể cắt và thu phóng giống ảnh đại diện tài khoản.</span>
              </div>
              <input
                ref={companyLogoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleLogoFileChange}
              />
            </div>
            <div className="partner-form-grid">
              <Field
                label="Tên công ty"
                value={company.companyName}
                readOnly={!canEditCompany}
                onChange={(e) => setCompany((prev) => ({ ...prev, companyName: e.target.value }))}
              />
              <Field
                label="Mã số thuế / mã đối tác"
                value={company.taxId}
                readOnly={!canEditCompany}
                onChange={(e) => setCompany((prev) => ({ ...prev, taxId: e.target.value }))}
              />
              <Field
                label="Đại diện pháp luật"
                value={company.representative}
                readOnly={!canEditCompany}
                onChange={(e) => setCompany((prev) => ({ ...prev, representative: e.target.value }))}
              />
              <Field label="Email liên hệ doanh nghiệp" value={company.email} readOnly />
              <Field
                label="Số điện thoại doanh nghiệp"
                value={company.phone}
                readOnly={!canEditCompany}
                onChange={(e) => setCompany((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <TextAreaField
                label="Địa chỉ trụ sở"
                value={company.address}
                readOnly={!canEditCompany}
                onChange={(e) => setCompany((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="partner-profile-actions">
              <button
                type="button"
                className="ctsv-btn-primary"
                disabled={savingCompany || !canEditCompany}
                onClick={handleCompanySave}
              >
                {savingCompany ? 'Đang lưu...' : 'Lưu hồ sơ doanh nghiệp'}
              </button>
            </div>
          </section>
        </div>
      )}
      <AvatarCropModal
        open={logoCropOpen}
        imageSrc={logoCropSrc}
        fileName={logoCropFileName}
        onCancel={handleLogoCropCancel}
        onConfirm={handleLogoCropConfirm}
      />
    </div>
  );
};

export default PartnerProfileSettings;
