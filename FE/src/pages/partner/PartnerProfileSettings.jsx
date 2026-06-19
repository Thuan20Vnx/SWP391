import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import defaultAvatar from '../../constants/defaultAvatar';
import { fetchPartnerMe, fetchPartnerUserProfile, mapPartnerToCompanyForm } from '../../services/partnerApi';
import { resolveUserAvatar } from '../../utils/image';
import { PARTNER_STATUS_LABEL, PARTNER_STATUS_TONE } from '../../utils/partnerDisplay';

const ReadField = ({ label, value }) => (
  <div className="partner-field">
    <label>{label}</label>
    <input value={value || '—'} readOnly disabled />
  </div>
);

const PartnerProfileSettings = ({ showToast }) => {
  const [user, setUser] = useState({ fullname: '', email: '', phone: '', avatar: '' });
  const [company, setCompany] = useState({});
  const [partnerRecord, setPartnerRecord] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

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

  const displayAvatar = user.avatar || defaultAvatar;

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
                  <span className="partner-profile-status-reason"> — {partnerRecord.rejectionReason}</span>
                )}
                {partnerRecord.supplementReason && (
                  <span className="partner-profile-status-reason">
                    {' '}— Yêu cầu bổ sung: {partnerRecord.supplementReason}{' '}
                    <Link to="/partner/proposals/create">Bổ sung ngay</Link>
                  </span>
                )}
              </p>
            )}
            {!partnerRecord && (
              <p className="partner-profile-status">
                Chưa có hồ sơ đối tác.{' '}
                <Link to="/partner/proposals/create">Gửi đề xuất đầu tiên</Link>
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
              Thông tin cá nhân của tài khoản đăng nhập.
            </p>
            <div className="partner-user-avatar-row">
              <div className="partner-user-avatar-preview">
                <img src={displayAvatar} alt="Ảnh đại diện" />
              </div>
            </div>
            <div className="partner-form-grid">
              <ReadField label="Họ và tên" value={user.fullname} />
              <ReadField label="Email đăng nhập" value={user.email} />
              <ReadField label="Số điện thoại cá nhân" value={user.phone} />
            </div>
          </section>

          <section className="partner-profile-card">
            <h2 className="partner-profile-card__title">Thông tin doanh nghiệp</h2>
            <p className="partner-profile-card__desc">
              Thông tin hiển thị trên hợp đồng tài trợ và hồ sơ đối tác với FPT University.
            </p>
            {company.logo && (
              <div className="partner-company-logo-row">
                <div className="partner-company-logo-preview partner-company-logo-preview--banner">
                  <img src={company.logo} alt="Logo công ty" />
                </div>
              </div>
            )}
            <div className="partner-form-grid">
              <ReadField label="Tên công ty" value={company.companyName} />
              <ReadField label="Mã số thuế" value={company.taxId} />
              <ReadField label="Đại diện pháp luật" value={company.representative} />
              <ReadField label="Email liên hệ doanh nghiệp" value={company.email} />
              <ReadField label="Số điện thoại doanh nghiệp" value={company.phone} />
              <div className="partner-field partner-field--full">
                <label>Địa chỉ trụ sở</label>
                <textarea value={company.address || '—'} readOnly disabled rows={2} />
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  );
};

export default PartnerProfileSettings;
