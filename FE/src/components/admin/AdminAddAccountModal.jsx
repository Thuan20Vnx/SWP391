import React, { useEffect, useState } from 'react';
import AdminFilterDropdown from './AdminFilterDropdown';
import AdminRolePicker from './AdminRolePicker';
import { ADMIN_CREATE_ROLE_OPTIONS } from '../../data/adminAccountsData';

const EMPTY_FORM = {
  role: '',
  fullname: '',
  email: '',
  identifier: '',
  unitInfo: '',
  activateNow: true,
};

const AdminAddAccountModal = ({ open, onClose, onSubmit, submitting }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setOpenMenu(null);
    }
  }, [open]);

  if (!open) return null;

  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="admin-acc-modal-backdrop" onClick={submitting ? undefined : onClose} role="presentation">
      <div
        className="admin-acc-modal"
        role="dialog"
        aria-labelledby="admin-add-account-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-acc-modal__header">
          <h2 id="admin-add-account-title">Thêm tài khoản mới</h2>
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
          <div className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">Vai trò hệ thống</span>
            <AdminRolePicker
              value={form.role || ''}
              onChange={(v) => patch('role', v)}
              name="add-account-role"
            />
            {!form.role && (
              <span className="admin-acc-modal__note">Chọn một vai trò trước khi tạo tài khoản.</span>
            )}
          </div>

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">Họ tên / Tên đơn vị</span>
            <input
              type="text"
              className="admin-acc-modal__input"
              placeholder="Tên (Sinh viên/Cán bộ), CLB FU-DEVER, Công ty FPT Software..."
              value={form.fullname}
              onChange={(e) => patch('fullname', e.target.value)}
              required
            />
          </label>

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">Email liên hệ</span>
            <input
              type="email"
              className="admin-acc-modal__input"
              placeholder="anv@fpt.edu.vn (Sinh viên/Cán bộ) HOẶC partner@gmail.com (Đối tác)..."
              value={form.email}
              onChange={(e) => patch('email', e.target.value)}
              required
            />
            <span className="admin-acc-modal__note">
              Hệ thống tự động cấp mật khẩu mặc định là &apos;Fpt@2026&apos; và gửi về Email kích hoạt của
              người dùng.
            </span>
          </label>

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">Mã định danh / Số điện thoại</span>
            <input
              type="text"
              className="admin-acc-modal__input"
              placeholder="Mã số SV (Ví dụ: DE200000), Mã số thuế đối tác, SĐT liên hệ của CLB..."
              value={form.identifier}
              onChange={(e) => patch('identifier', e.target.value)}
            />
          </label>

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">Thông tin đơn vị / Khóa học (Không bắt buộc)</span>
            <input
              type="text"
              className="admin-acc-modal__input"
              placeholder="Điện K20/Chuyên ngành (nếu là SV) HOẶC Phòng ban công tác (nếu là CTSV/ICPDP)..."
              value={form.unitInfo}
              onChange={(e) => patch('unitInfo', e.target.value)}
            />
          </label>

          <div className="admin-acc-modal__toggle-row">
            <div>
              <p className="admin-acc-modal__toggle-label">Kích hoạt tài khoản ngay</p>
              <p className="admin-acc-modal__toggle-desc">Cho phép đăng nhập ngay với mật khẩu mặc định</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.activateNow}
              className={`admin-acc-modal__switch${form.activateNow ? ' admin-acc-modal__switch--on' : ''}`}
              onClick={() => patch('activateNow', !form.activateNow)}
            >
              <span className="admin-acc-modal__switch-thumb" />
            </button>
          </div>

          <footer className="admin-acc-modal__footer">
            <button type="button" className="admin-acc-btn admin-acc-btn--ghost" onClick={onClose} disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="admin-acc-btn admin-acc-btn--primary" disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Xác nhận tạo'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default AdminAddAccountModal;
