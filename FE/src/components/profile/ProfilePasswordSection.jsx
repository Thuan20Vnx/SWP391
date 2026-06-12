import React, { useState } from 'react';
import { API_BASE, getAuthHeaders } from '../../utils/api';
import { useTranslation } from '../../i18n/I18nContext';

const IconChevronDown = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EMPTY_PW = { currentPassword: '', newPassword: '', confirmPassword: '' };

const ProfilePasswordSection = ({
  showToast,
  description = 'Cập nhật mật khẩu đăng nhập tài khoản của bạn.',
  idPrefix = 'profile',
}) => {
  const { t } = useTranslation();
  const isGoogleLogin = localStorage.getItem('loginMethod') === 'google';
  const [open, setOpen] = useState(false);
  const [pwForm, setPwForm] = useState(EMPTY_PW);
  const [loading, setLoading] = useState(false);
  const panelId = `${idPrefix}-password-panel`;

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = pwForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast?.(t('password.fillAll'), 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast?.(t('password.minLength'), 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast?.(t('password.mismatch'), 'error');
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/api/user/change-password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200) {
          setPwForm(EMPTY_PW);
          showToast?.(t('password.success'), 'success');
        } else {
          showToast?.(data.message || t('password.fail'), 'error');
        }
      })
      .catch(() => showToast?.(t('common.serverError'), 'error'))
      .finally(() => setLoading(false));
  };

  return (
    <section className="ctsv-profile-security-card">
      <button
        type="button"
        className="ctsv-profile-security-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="ctsv-profile-security-toggle-main">
          <h2>{t('password.title')}</h2>
          <p>{description || t('settings.passwordDesc')}</p>
        </div>
        <span className={`ctsv-profile-security-chevron${open ? ' is-open' : ''}`} aria-hidden>
          <IconChevronDown />
        </span>
      </button>

      <div id={panelId} className={`ctsv-profile-security-panel${open ? ' is-open' : ''}`}>
        <div className="ctsv-profile-security-panel-inner">
          <div className="ctsv-profile-security-body">
            {isGoogleLogin ? (
              <p className="ctsv-profile-security-note">{t('password.googleNote')}</p>
            ) : (
              <form className="ctsv-profile-password-form" onSubmit={handlePasswordSubmit}>
                <div className="profile-form-grid">
                  <div className="profile-input-group profile-form-grid-full">
                    <label htmlFor={`${idPrefix}-current-password`}>{t('password.current')}</label>
                    <input
                      id={`${idPrefix}-current-password`}
                      type="password"
                      placeholder={t('password.placeholderCurrent')}
                      value={pwForm.currentPassword}
                      onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                      autoComplete="current-password"
                      disabled={loading}
                    />
                  </div>
                  <div className="profile-input-group">
                    <label htmlFor={`${idPrefix}-new-password`}>{t('password.new')}</label>
                    <input
                      id={`${idPrefix}-new-password`}
                      type="password"
                      placeholder={t('password.placeholderNew')}
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </div>
                  <div className="profile-input-group">
                    <label htmlFor={`${idPrefix}-confirm-password`}>{t('password.confirm')}</label>
                    <input
                      id={`${idPrefix}-confirm-password`}
                      type="password"
                      placeholder={t('password.placeholderConfirm')}
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="ctsv-profile-security-actions">
                  <button type="submit" className="primary-button btn-save-profile" disabled={loading}>
                    {loading ? t('password.saving') : t('password.save')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfilePasswordSection;
