import React, { useEffect, useRef, useState } from 'react';
import {
  changePartnerPassword,
  loadPartnerCompanyProfile,
  loadPartnerNotificationPrefs,
  savePartnerCompanyProfile,
  savePartnerNotificationPrefs
} from '../../services/partnerApi';

const NOTIFICATION_OPTIONS = [
  {
    key: 'proposalUpdates',
    label: 'Cập nhật duyệt đề xuất',
    desc: 'Thông báo khi CTSV phê duyệt hoặc từ chối đề xuất sự kiện'
  },
  {
    key: 'monthlyReportEmail',
    label: 'Báo cáo định kỳ qua email',
    desc: 'Nhận báo cáo hiệu suất và doanh thu tài trợ hàng tháng'
  },
  {
    key: 'newReviewAlerts',
    label: 'Đánh giá mới từ sinh viên',
    desc: 'Thông báo khi có đánh giá mới sau sự kiện bạn tài trợ'
  }
];

const PartnerToggle = ({ checked, onChange, label, desc }) => (
  <div className="partner-toggle-row">
    <div className="partner-toggle-row__text">
      <span className="partner-toggle-row__label">{label}</span>
      <span className="partner-toggle-row__desc">{desc}</span>
    </div>
    <label className="partner-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="partner-toggle__slider" />
    </label>
  </div>
);

const PartnerProfileSettings = ({ showToast }) => {
  const fileInputRef = useRef(null);
  const isGoogleLogin = localStorage.getItem('loginMethod') === 'google';

  const [company, setCompany] = useState(() => loadPartnerCompanyProfile());
  const [notifications, setNotifications] = useState(() => loadPartnerNotificationPrefs());
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingNotify, setSavingNotify] = useState(false);

  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    setCompany(loadPartnerCompanyProfile());
    setNotifications(loadPartnerNotificationPrefs());
  }, []);

  const handleCompanyChange = (field, value) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast?.('Vui lòng chọn file ảnh (PNG, JPG).', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCompany((prev) => ({ ...prev, logo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (!company.companyName?.trim()) {
      showToast?.('Vui lòng nhập tên công ty.', 'error');
      return;
    }
    setSavingCompany(true);
    try {
      await savePartnerCompanyProfile(company);
      showToast?.('Đã lưu thông tin doanh nghiệp.', 'success');
    } catch {
      showToast?.('Không thể lưu thông tin.', 'error');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSavingNotify(true);
    try {
      await savePartnerNotificationPrefs(notifications);
      showToast?.('Đã cập nhật cấu hình thông báo.', 'success');
    } catch {
      showToast?.('Không thể lưu cấu hình.', 'error');
    } finally {
      setSavingNotify(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = pwForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast?.('Vui lòng điền đầy đủ thông tin mật khẩu.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast?.('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast?.('Xác nhận mật khẩu không khớp.', 'error');
      return;
    }

    setPwLoading(true);
    try {
      await changePartnerPassword(currentPassword, newPassword);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast?.('Đổi mật khẩu thành công.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Đổi mật khẩu thất bại.', 'error');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="partner-profile-page">
      <header className="partner-profile-page__header">
        <h1>Hồ sơ & Cài đặt</h1>
        <p>Quản lý thông tin doanh nghiệp, bảo mật tài khoản và cấu hình thông báo.</p>
      </header>

      <div className="partner-profile-stack">
        <section className="partner-profile-card">
          <h2 className="partner-profile-card__title">Thông tin doanh nghiệp</h2>
          <p className="partner-profile-card__desc">
            Thông tin hiển thị trên hợp đồng tài trợ và hồ sơ đối tác với FPT University.
          </p>

          <form onSubmit={handleSaveCompany}>
            <div className="partner-company-logo-row">
              <div className="partner-company-logo-preview">
                {company.logo ? (
                  <img src={company.logo} alt="Logo công ty" />
                ) : (
                  <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden>
                    <path
                      d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                )}
              </div>
              <div className="partner-company-logo-actions">
                <button type="button" className="partner-btn-outline" onClick={() => fileInputRef.current?.click()}>
                  Tải logo lên
                </button>
                <span>PNG hoặc JPG, tối đa 2MB</span>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleLogoUpload} />
              </div>
            </div>

            <div className="partner-form-grid">
              <div className="partner-field partner-field--full">
                <label htmlFor="companyName">Tên công ty</label>
                <input
                  id="companyName"
                  value={company.companyName}
                  onChange={(e) => handleCompanyChange('companyName', e.target.value)}
                  placeholder="Công ty TNHH..."
                />
              </div>
              <div className="partner-field">
                <label htmlFor="taxId">Mã số thuế</label>
                <input
                  id="taxId"
                  value={company.taxId}
                  onChange={(e) => handleCompanyChange('taxId', e.target.value)}
                  placeholder="0101248141"
                />
              </div>
              <div className="partner-field">
                <label htmlFor="representative">Đại diện pháp luật</label>
                <input
                  id="representative"
                  value={company.representative}
                  onChange={(e) => handleCompanyChange('representative', e.target.value)}
                  placeholder="Họ và tên"
                />
              </div>
              <div className="partner-field">
                <label htmlFor="email">Email liên hệ</label>
                <input
                  id="email"
                  type="email"
                  value={company.email}
                  onChange={(e) => handleCompanyChange('email', e.target.value)}
                  placeholder="contact@company.com"
                />
              </div>
              <div className="partner-field">
                <label htmlFor="phone">Số điện thoại</label>
                <input
                  id="phone"
                  value={company.phone}
                  onChange={(e) => handleCompanyChange('phone', e.target.value)}
                  placeholder="+84 ..."
                />
              </div>
              <div className="partner-field partner-field--full">
                <label htmlFor="address">Địa chỉ trụ sở</label>
                <textarea
                  id="address"
                  value={company.address}
                  onChange={(e) => handleCompanyChange('address', e.target.value)}
                  placeholder="Số nhà, đường, quận, thành phố"
                />
              </div>
            </div>

            <div className="partner-profile-actions">
              <button type="submit" className="partner-btn-primary" disabled={savingCompany}>
                {savingCompany ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </section>

        <section className="partner-profile-card">
          <h2 className="partner-profile-card__title">Bảo mật</h2>
          <p className="partner-profile-card__desc">Đổi mật khẩu đăng nhập tài khoản đối tác.</p>

          {isGoogleLogin ? (
            <p className="partner-profile-card__desc">
              Tài khoản đăng nhập bằng Google không hỗ trợ đổi mật khẩu tại đây.
            </p>
          ) : (
            <form onSubmit={handlePasswordSubmit}>
              <div className="partner-form-grid">
                <div className="partner-field partner-field--full">
                  <label htmlFor="currentPassword">Mật khẩu hiện tại</label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Nhập mật khẩu hiện tại"
                    autoComplete="current-password"
                  />
                </div>
                <div className="partner-field">
                  <label htmlFor="newPassword">Mật khẩu mới</label>
                  <input
                    id="newPassword"
                    type="password"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Ít nhất 6 ký tự"
                    autoComplete="new-password"
                  />
                </div>
                <div className="partner-field">
                  <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Nhập lại mật khẩu mới"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="partner-profile-actions">
                <button type="submit" className="partner-btn-primary" disabled={pwLoading}>
                  {pwLoading ? 'Đang lưu...' : 'Đổi mật khẩu'}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="partner-profile-card">
          <h2 className="partner-profile-card__title">Cấu hình thông báo</h2>
          <p className="partner-profile-card__desc">Chọn loại thông báo bạn muốn nhận qua email và hệ thống.</p>

          {NOTIFICATION_OPTIONS.map((opt) => (
            <PartnerToggle
              key={opt.key}
              label={opt.label}
              desc={opt.desc}
              checked={notifications[opt.key]}
              onChange={(value) => setNotifications((prev) => ({ ...prev, [opt.key]: value }))}
            />
          ))}

          <div className="partner-profile-actions">
            <button type="button" className="partner-btn-primary" disabled={savingNotify} onClick={handleSaveNotifications}>
              {savingNotify ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PartnerProfileSettings;
