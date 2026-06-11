import React, { useEffect, useState } from 'react';
import AdminFilterDropdown from './AdminFilterDropdown';
import AdminRolePicker from './AdminRolePicker';
import {
  ADMIN_ACCOUNT_ROLE_META,
  ADMIN_CAMPUS_OPTIONS,
  ADMIN_COURSE_OPTIONS,
  accountToEditForm,
} from '../../data/adminAccountsData';

const AdminAccountEditModal = ({ open, account, onClose, onSubmit, submitting }) => {
  const [form, setForm] = useState(accountToEditForm(account || {}));
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    if (!open || !account) return undefined;
    setForm(accountToEditForm(account));

    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, account, onClose, submitting]);

  if (!open || !account) return null;

  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const isAdmin = account.role === 'admin';
  const showStudentFields = form.role === 'student' || account.role === 'student';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      role: form.role,
      fullname: form.fullname,
      email: form.email,
      studentId: form.mssv,
      phone: form.phone,
      unitInfo: form.unitInfo,
      course: form.course,
      campus: form.campus,
      isActive: form.isActive,
    });
  };

  return (
    <div className="admin-acc-modal-backdrop" onClick={submitting ? undefined : onClose} role="presentation">
      <div
        className="admin-acc-modal admin-acc-modal--edit"
        role="dialog"
        aria-labelledby="admin-edit-account-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-acc-modal__header">
          <h2 id="admin-edit-account-title">Chỉnh sửa tài khoản</h2>
          <button
            type="button"
            className="admin-acc-modal__close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <form className="admin-acc-modal__form" onSubmit={handleSubmit}>
          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">Vai trò hệ thống</span>
            {isAdmin ? (
              <input
                type="text"
                className="admin-acc-modal__input admin-acc-modal__input--readonly"
                value={ADMIN_ACCOUNT_ROLE_META.admin?.label || 'IT Admin'}
                readOnly
              />
            ) : (
              <AdminRolePicker
                value={form.role || ''}
                onChange={(v) => patch('role', v)}
                name="edit-account-role"
              />
            )}
          </label>

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">Họ tên / Tên đơn vị</span>
            <input
              type="text"
              className="admin-acc-modal__input"
              placeholder="Nguyễn Văn A, Công ty FPT Software..."
              value={form.fullname}
              onChange={(e) => patch('fullname', e.target.value)}
              required
            />
          </label>

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">Email liên hệ</span>
            <input
              type="email"
              className={`admin-acc-modal__input${isAdmin ? ' admin-acc-modal__input--readonly' : ''}`}
              value={form.email}
              onChange={(e) => patch('email', e.target.value)}
              readOnly={isAdmin}
              required
            />
            {isAdmin && (
              <span className="admin-acc-modal__note">
                Tài khoản IT Admin: không thể đổi vai trò hoặc email qua giao diện này.
              </span>
            )}
          </label>

          <div className="admin-acc-modal__row">
            <label className="admin-acc-modal__field">
              <span className="admin-acc-modal__label">Mã số SV / Mã định danh</span>
              <input
                type="text"
                className="admin-acc-modal__input"
                placeholder="DE200000, mã đối tác..."
                value={form.mssv}
                onChange={(e) => patch('mssv', e.target.value)}
              />
            </label>
            <label className="admin-acc-modal__field">
              <span className="admin-acc-modal__label">Số điện thoại</span>
              <input
                type="tel"
                className="admin-acc-modal__input"
                placeholder="0901234567"
                value={form.phone}
                onChange={(e) => patch('phone', e.target.value)}
              />
            </label>
          </div>

          <div className="admin-acc-modal__row">
            <label className="admin-acc-modal__field">
              <span className="admin-acc-modal__label">Khóa học</span>
              {showStudentFields ? (
                <AdminFilterDropdown
                  label=""
                  value={form.course || 'K18'}
                  options={ADMIN_COURSE_OPTIONS}
                  onChange={(v) => patch('course', v)}
                  menuOpen={openMenu === 'course'}
                  onMenuToggle={setOpenMenu}
                  menuId="edit-course"
                />
              ) : (
                <input
                  type="text"
                  className="admin-acc-modal__input"
                  value={form.course}
                  onChange={(e) => patch('course', e.target.value)}
                  placeholder="K18"
                />
              )}
            </label>
            <label className="admin-acc-modal__field">
              <span className="admin-acc-modal__label">Cơ sở</span>
              <AdminFilterDropdown
                label=""
                value={form.campus || ADMIN_CAMPUS_OPTIONS[0].value}
                options={ADMIN_CAMPUS_OPTIONS}
                onChange={(v) => patch('campus', v)}
                menuOpen={openMenu === 'campus'}
                onMenuToggle={setOpenMenu}
                menuId="edit-campus"
              />
            </label>
          </div>

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">Thông tin đơn vị / Chuyên ngành</span>
            <input
              type="text"
              className="admin-acc-modal__input"
              placeholder="Điện K20, Phòng CTSV, Người đại diện đối tác..."
              value={form.unitInfo}
              onChange={(e) => patch('unitInfo', e.target.value)}
            />
          </label>

          <div className="admin-acc-modal__toggle-row">
            <div>
              <p className="admin-acc-modal__toggle-label">Kích hoạt tài khoản</p>
              <p className="admin-acc-modal__toggle-desc">
                Tắt để khóa đăng nhập; bật lại sẽ cấp mật khẩu mặc định Fpt@2026
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              className={`admin-acc-modal__switch${form.isActive ? ' admin-acc-modal__switch--on' : ''}`}
              onClick={() => patch('isActive', !form.isActive)}
              disabled={isAdmin}
            >
              <span className="admin-acc-modal__switch-thumb" />
            </button>
          </div>

          <footer className="admin-acc-modal__footer">
            <button type="button" className="admin-acc-btn admin-acc-btn--ghost" onClick={onClose} disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="admin-acc-btn admin-acc-btn--primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default AdminAccountEditModal;
