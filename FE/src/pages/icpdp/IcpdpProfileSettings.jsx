import React, { useState, useEffect } from 'react';
import ProfilePasswordSection from '../../components/profile/ProfilePasswordSection';
import {
  loadIcpdpProfile,
  saveIcpdpProfile,
  loadIcpdpNotificationPrefs,
  saveIcpdpNotificationPrefs,
} from '../../services/icpdpApi';

const IcpdpProfileSettings = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);

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
    setProfileData(loadIcpdpProfile());
    setNotifications(loadIcpdpNotificationPrefs());
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

  const handleNotifToggle = (key) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    saveIcpdpNotificationPrefs(next);
    showToast('Đã lưu tùy chọn thông báo', 'info');
  };

  return (
    <div className="ctsv-dashboard partner-settings-page">
      <div className="partner-settings-header">
        <div className="partner-settings-header__title">
          <h1>Cài đặt tài khoản</h1>
          <p>Quản lý thông tin cá nhân và tùy chọn bảo mật tài khoản IC-PDP</p>
        </div>
      </div>

      <div className="partner-settings-layout">
        <aside className="partner-settings-sidebar">
          <nav className="partner-settings-nav">
            <button
              type="button"
              className={`partner-settings-nav-item ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              Thông tin cán bộ
            </button>
            <button
              type="button"
              className={`partner-settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              Thông báo
            </button>
          </nav>
        </aside>

        <main className="partner-settings-content">
          {activeTab === 'info' && (
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
              <ProfilePasswordSection
                showToast={showToast}
                idPrefix="icpdp"
                description="Cập nhật mật khẩu đăng nhập tài khoản cán bộ IC-PDP."
              />
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
    </div>
  );
};

export default IcpdpProfileSettings;
