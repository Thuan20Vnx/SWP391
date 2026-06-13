import React, { useRef, useState, useEffect } from 'react';
import CtsvNavIcon from '../../components/ctsv/CtsvNavIcon';
import ProfilePasswordSection from '../../components/profile/ProfilePasswordSection';
import AvatarCropModal from '../../components/profile/AvatarCropModal';
import defaultAvatar from '../../constants/defaultAvatar';
import {
  loadIcpdpProfile,
  saveIcpdpProfile,
  loadIcpdpNotificationPrefs,
  saveIcpdpNotificationPrefs,
} from '../../services/icpdpApi';
import { API_BASE, getAuthHeaders } from '../../utils/api';
import { dispatchAuthChanged } from '../../utils/authEvents';
import { resolveUserAvatar } from '../../utils/image';
import { updateUserAvatar } from '../../utils/profileApi';

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const IcpdpProfileSettings = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [avatar, setAvatar] = useState(defaultAvatar);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const [avatarCropSrc, setAvatarCropSrc] = useState('');
  const [avatarCropFileName, setAvatarCropFileName] = useState('');
  const avatarInputRef = useRef(null);

  const [profileData, setProfileData] = useState({
    fullname: '',
    email: '',
    department: '',
    title: '',
    phone: '',
    about: ''
  });

  const [notifications, setNotifications] = useState({
    proposalSubmitted: true,
    eventApprovedByCtsv: true,
    reportSubmitted: true,
    systemAlerts: false
  });

  useEffect(() => {
    const savedProfile = loadIcpdpProfile();
    setProfileData(savedProfile);
    setAvatar(resolveUserAvatar(savedProfile, defaultAvatar));
    setNotifications(loadIcpdpNotificationPrefs());

    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const user = data.user || {};
        const nextAvatar = resolveUserAvatar(user, resolveUserAvatar(savedProfile, defaultAvatar));
        const nextProfile = {
          ...savedProfile,
          fullname: user.fullname || savedProfile.fullname,
          email: user.email || savedProfile.email,
          phone: user.phone || savedProfile.phone,
          picture: nextAvatar,
          avatar: nextAvatar
        };
        setProfileData(nextProfile);
        setAvatar(nextAvatar);
        saveIcpdpProfile(nextProfile);
      })
      .catch(() => {});
  }, []);

  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleInfoSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      saveIcpdpProfile(profileData);
      setLoading(false);
      setIsEditingInfo(false);
      showToast('Cập nhật thông tin thành công!');
    }, 600);
  };

  const openAvatarPicker = () => {
    if (avatarSaving || avatarCropOpen) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast?.('Chỉ chấp nhận file ảnh JPG, PNG hoặc WebP.', 'error');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      showToast?.('Ảnh tối đa 5MB. Vui lòng chọn file nhỏ hơn.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarCropSrc(reader.result);
      setAvatarCropFileName(file.name);
      setAvatarCropOpen(true);
    };
    reader.onerror = () => showToast?.('Không đọc được file ảnh.', 'error');
    reader.readAsDataURL(file);
  };

  const handleAvatarConfirm = async (dataUrl) => {
    setAvatarCropOpen(false);
    setAvatarCropSrc('');
    if (!dataUrl) {
      showToast?.('Không xử lý được ảnh. Vui lòng thử lại.', 'error');
      return;
    }

    setAvatarSaving(true);
    try {
      const data = await updateUserAvatar(dataUrl);
      const nextAvatar = resolveUserAvatar(data.user, dataUrl);
      setAvatar(nextAvatar);
      setProfileData((prev) => {
        const next = { ...prev, picture: nextAvatar, avatar: nextAvatar };
        saveIcpdpProfile(next);
        return next;
      });
      dispatchAuthChanged();
      showToast?.('Đã cập nhật ảnh đại diện.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Lưu ảnh đại diện thất bại.', 'error');
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleNotifToggle = (key) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    saveIcpdpNotificationPrefs(next);
    showToast('Đã lưu tùy chọn thông báo', 'info');
  };

  return (
    <div className="ctsv-dashboard partner-settings-page icpdp-settings-page">
      <div className="partner-settings-header">
        <div className="partner-settings-header__title">
          <h1>Cài đặt tài khoản</h1>
          <p>Quản lý thông tin cá nhân và tùy chọn bảo mật tài khoản IC-PDP</p>
        </div>
      </div>

      <div className="partner-settings-layout">
        <aside className="partner-settings-sidebar">
          <nav className="partner-settings-nav">
            <div className="partner-settings-nav__heading">
              <span>Tài khoản</span>
              <strong>IC-PDP</strong>
            </div>
            <button
              type="button"
              className={`partner-settings-nav-item ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
              aria-current={activeTab === 'info' ? 'page' : undefined}
            >
              <span className="partner-settings-nav-item__icon" aria-hidden>
                <CtsvNavIcon type="profile" />
              </span>
              <span className="partner-settings-nav-item__body">
                <span className="partner-settings-nav-item__label">Thông tin cán bộ</span>
                <span className="partner-settings-nav-item__desc">Hồ sơ, avatar, liên hệ</span>
              </span>
            </button>
            <button
              type="button"
              className={`partner-settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
              aria-current={activeTab === 'notifications' ? 'page' : undefined}
            >
              <span className="partner-settings-nav-item__icon" aria-hidden>
                <CtsvNavIcon type="notifications" />
              </span>
              <span className="partner-settings-nav-item__body">
                <span className="partner-settings-nav-item__label">Thông báo</span>
                <span className="partner-settings-nav-item__desc">Duyệt CLB, báo cáo, hệ thống</span>
              </span>
            </button>
          </nav>
        </aside>

        <main className="partner-settings-content">
          {activeTab === 'info' && (
            <div className="icpdp-profile-settings-grid">
              <aside className="icpdp-avatar-card">
                <div className="icpdp-avatar-frame">
                  <img src={avatar || defaultAvatar} alt="Ảnh đại diện IC-PDP" className="icpdp-profile-avatar" />
                  <button
                    type="button"
                    className="icpdp-avatar-edit-fab"
                    onClick={openAvatarPicker}
                    disabled={avatarSaving || avatarCropOpen}
                    aria-label="Thay đổi ảnh đại diện"
                    title="Thay đổi ảnh đại diện"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="icpdp-avatar-input"
                  onChange={handleAvatarFile}
                />
                <button
                  type="button"
                  className="icpdp-avatar-change-btn"
                  onClick={openAvatarPicker}
                  disabled={avatarSaving || avatarCropOpen}
                >
                  {avatarSaving ? 'Đang lưu ảnh...' : avatarCropOpen ? 'Đang chỉnh sửa...' : 'Thay đổi ảnh đại diện'}
                </button>
                <p className="icpdp-avatar-hint">Ảnh vuông rõ mặt, JPG/PNG/WebP, tối đa 5MB.</p>
              </aside>

              <div className="icpdp-profile-main">
                <div className="partner-settings-panel">
                  <div className="partner-settings-panel__head">
                    <h2>Thông tin cán bộ quản lý</h2>
                    {!isEditingInfo && (
                      <button
                        type="button"
                        className="ctsv-dash-btn ctsv-dash-btn--outline"
                        onClick={() => setIsEditingInfo(true)}
                      >
                        Chỉnh sửa
                      </button>
                    )}
                  </div>
                  <div className="partner-settings-panel__body">
                    {isEditingInfo ? (
                      <form className="partner-settings-form" onSubmit={handleInfoSubmit}>
                        <div className="form-row-2">
                          <div className="form-group">
                            <label>Họ và tên</label>
                            <input
                              type="text"
                              name="fullname"
                              value={profileData.fullname}
                              onChange={handleInfoChange}
                              required
                              className="ctsv-input"
                            />
                          </div>
                          <div className="form-group">
                            <label>Email liên hệ</label>
                            <input
                              type="email"
                              name="email"
                              value={profileData.email}
                              onChange={handleInfoChange}
                              required
                              className="ctsv-input"
                            />
                          </div>
                        </div>
                        <div className="form-row-2">
                          <div className="form-group">
                            <label>Chức vụ</label>
                            <input
                              type="text"
                              name="title"
                              value={profileData.title}
                              onChange={handleInfoChange}
                              className="ctsv-input"
                            />
                          </div>
                          <div className="form-group">
                            <label>Số điện thoại</label>
                            <input
                              type="tel"
                              name="phone"
                              value={profileData.phone}
                              onChange={handleInfoChange}
                              className="ctsv-input"
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Đơn vị / Phòng ban</label>
                          <input
                            type="text"
                            name="department"
                            value={profileData.department}
                            onChange={handleInfoChange}
                            className="ctsv-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>Mô tả ngắn</label>
                          <textarea
                            name="about"
                            rows="3"
                            value={profileData.about}
                            onChange={handleInfoChange}
                            className="ctsv-textarea"
                          />
                        </div>
                        <div className="form-actions">
                          <button
                            type="button"
                            className="ctsv-dash-btn ctsv-dash-btn--ghost"
                            onClick={() => {
                              setProfileData(loadIcpdpProfile());
                              setIsEditingInfo(false);
                            }}
                          >
                            Hủy
                          </button>
                          <button type="submit" className="ctsv-dash-btn ctsv-dash-btn--primary" disabled={loading}>
                            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="partner-profile-view">
                        <div className="profile-view-row">
                          <span>Họ và tên</span>
                          <strong>{profileData.fullname}</strong>
                        </div>
                        <div className="profile-view-row">
                          <span>Email liên hệ</span>
                          <strong>{profileData.email}</strong>
                        </div>
                        <div className="profile-view-row">
                          <span>Chức vụ</span>
                          <strong>{profileData.title}</strong>
                        </div>
                        <div className="profile-view-row">
                          <span>Đơn vị</span>
                          <strong>{profileData.department}</strong>
                        </div>
                        <div className="profile-view-row">
                          <span>Số điện thoại</span>
                          <strong>{profileData.phone || 'Chưa cập nhật'}</strong>
                        </div>
                        <div className="profile-view-row">
                          <span>Mô tả ngắn</span>
                          <p>{profileData.about || 'Chưa có thông tin'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <ProfilePasswordSection
                  showToast={showToast}
                  idPrefix="icpdp"
                  description="Cập nhật mật khẩu đăng nhập tài khoản cán bộ IC-PDP."
                />
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="partner-settings-panel">
              <div className="partner-settings-panel__head">
                <h2>Tùy chọn thông báo</h2>
                <p>Chọn các sự kiện bạn muốn nhận thông báo qua email hoặc trên portal.</p>
              </div>
              <div className="partner-settings-panel__body">
                <div className="notif-toggle-list">
                  <label className="notif-toggle-item">
                    <div className="notif-toggle-info">
                      <strong>Đề xuất CLB mới</strong>
                      <span>Nhận thông báo khi Câu lạc bộ gửi đề xuất sự kiện mới chờ duyệt.</span>
                    </div>
                    <div className="notif-switch">
                      <input
                        type="checkbox"
                        checked={notifications.proposalSubmitted}
                        onChange={() => handleNotifToggle('proposalSubmitted')}
                      />
                      <span className="slider" />
                    </div>
                  </label>

                  <label className="notif-toggle-item">
                    <div className="notif-toggle-info">
                      <strong>Phê duyệt từ CTSV</strong>
                      <span>Nhận thông báo khi CTSV quyết định phê duyệt cuối cùng.</span>
                    </div>
                    <div className="notif-switch">
                      <input
                        type="checkbox"
                        checked={notifications.eventApprovedByCtsv}
                        onChange={() => handleNotifToggle('eventApprovedByCtsv')}
                      />
                      <span className="slider" />
                    </div>
                  </label>

                  <label className="notif-toggle-item">
                    <div className="notif-toggle-info">
                      <strong>Báo cáo sau sự kiện</strong>
                      <span>Nhận thông báo khi CLB nộp báo cáo đánh giá sự kiện.</span>
                    </div>
                    <div className="notif-switch">
                      <input
                        type="checkbox"
                        checked={notifications.reportSubmitted}
                        onChange={() => handleNotifToggle('reportSubmitted')}
                      />
                      <span className="slider" />
                    </div>
                  </label>

                  <label className="notif-toggle-item">
                    <div className="notif-toggle-info">
                      <strong>Cập nhật hệ thống</strong>
                      <span>Bảo trì định kỳ và tính năng mới từ FEvents.</span>
                    </div>
                    <div className="notif-switch">
                      <input
                        type="checkbox"
                        checked={notifications.systemAlerts}
                        onChange={() => handleNotifToggle('systemAlerts')}
                      />
                      <span className="slider" />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <AvatarCropModal
        open={avatarCropOpen}
        imageSrc={avatarCropSrc}
        fileName={avatarCropFileName}
        onConfirm={handleAvatarConfirm}
        onCancel={() => {
          setAvatarCropOpen(false);
          setAvatarCropSrc('');
        }}
      />
    </div>
  );
};

export default IcpdpProfileSettings;
