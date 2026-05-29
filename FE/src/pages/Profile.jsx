import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import defaultAvatar from '../constants/defaultAvatar';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { formatMssv } from '../utils/studentId';
import { compressImageFile, resolveUserAvatar } from '../utils/image';
import { getPasswordStrength } from '../utils/password';
import { getRoleLabel } from '../utils/role';
import { clearUserProfileCache } from '../hooks/useUserProfile';

const Profile = ({ showToast }) => {
  const navigate = useNavigate();

  // Profile data from backend
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    fullname: '',
    course: '',
    campus: '',
    email: localStorage.getItem('userEmail') || '',
    phone: ''
  });

  // Role & Student ID for FPT recognition
  const [userRole, setUserRole] = useState('guest');
  const [studentId, setStudentId] = useState('');

  // Track if course cohort has been changed once
  const [courseChanged, setCourseChanged] = useState(false);

  // Responsive Sidebar State
  const [sidebarActive, setSidebarActive] = useState(false);
  const [activeMenu, setActiveMenu] = useState('profile');
  const [authProvider, setAuthProvider] = useState('local');

  const profileSectionRef = useRef(null);
  const passwordSectionRef = useRef(null);

  // Edit profile mode state
  const [isEditing, setIsEditing] = useState(false);
  const [backupData, setBackupData] = useState(null);

  // Avatar Upload State
  const [avatar, setAvatar] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Form Orientation State
  const [orientation, setOrientation] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Load profile from Backend on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setProfileLoading(false);
      navigate('/login');
      return;
    }

    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
      .then(res => {
        if (res.status === 200) {
          return res.json();
        } else {
          throw new Error('Failed to load profile');
        }
      })
      .then(data => {
        const u = data.user;
        setProfileData({
          fullname: u.fullname || '',
          course: u.course || '',
          campus: u.campus || '',
          email: u.email || '',
          phone: u.phone || ''
        });
        setCourseChanged(u.courseChanged || false);
        setAvatar(resolveUserAvatar(u, ''));
        if (u.orientation !== undefined) {
          setOrientation(u.orientation);
        }
        // Load role & studentId
        if (u.role) setUserRole(u.role);
        if (u.studentId) setStudentId(formatMssv(u.studentId));
        if (u.authProvider) setAuthProvider(u.authProvider);

        // Populate interests checklist state
        if (u.interests) {
          const map = {
            hardware: 'Phần cứng & Vi điều khiển',
            ai: 'AI',
            japan: 'Văn hóa Nhật Bản',
            charity: 'Thiện nguyện',
            sports: 'Thể thao',
            music: 'Âm nhạc & Nghệ thuật'
          };
          setInterests({
            hardware: u.interests.includes(map.hardware),
            ai: u.interests.includes(map.ai),
            japan: u.interests.includes(map.japan),
            charity: u.interests.includes(map.charity),
            sports: u.interests.includes(map.sports),
            music: u.interests.includes(map.music)
          });
        }
      })
      .catch(err => {
        console.error(err);
        showToast('Không thể tải dữ liệu hồ sơ cá nhân từ Backend!', 'error');
      })
      .finally(() => setProfileLoading(false));
  }, [navigate, showToast]);

  // Interests Checklist State
  const [interests, setInterests] = useState({
    hardware: false,
    ai: false,
    japan: false,
    charity: false,
    sports: false,
    music: false
  });

  // Change Password Form State
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPasswords, setShowNewPasswords] = useState(false);
  const [currentPwStatus, setCurrentPwStatus] = useState(null);
  const verifyPasswordRequestRef = useRef(0);

  // Handle Sidebar Menu item click
  const handleFeatureNotImplemented = (e) => {
    e.preventDefault();
    showToast('Tính năng đang được phát triển.', 'info');
  };

  const handleSidebarNavigate = (path) => (e) => {
    e.preventDefault();
    setSidebarActive(false);
    navigate(path);
  };

  const handleScanClick = () => {
    showToast('Tính năng quét QR check-in đang được phát triển.', 'info');
  };

  const handleNotificationClick = () => {
    navigate('/announcements');
  };

  const canChangePassword = authProvider !== 'google';
  const displayAvatar = avatar || defaultAvatar;
  const profilePageTitle = activeMenu === 'change-password' ? 'Thay đổi mật khẩu' : 'Thông tin cá nhân';
  const passwordStrength = getPasswordStrength(pwForm.newPassword);
  const confirmPasswordMatch =
    pwForm.confirmPassword.length > 0
      ? pwForm.newPassword === pwForm.confirmPassword
      : null;

  const verifyCurrentPassword = (password) => {
    if (!password) {
      setCurrentPwStatus(null);
      return;
    }

    const requestId = ++verifyPasswordRequestRef.current;
    setCurrentPwStatus('checking');

    fetch(`${API_BASE}/api/user/verify-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password })
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (requestId !== verifyPasswordRequestRef.current) return;
        if (status === 200 && data.valid) {
          setCurrentPwStatus('valid');
        } else {
          setCurrentPwStatus('invalid');
        }
      })
      .catch(() => {
        if (requestId !== verifyPasswordRequestRef.current) return;
        setCurrentPwStatus('invalid');
      });
  };

  const handleCurrentPasswordChange = (value) => {
    setPwForm((prev) => ({ ...prev, currentPassword: value }));
    setCurrentPwStatus(null);
  };

  const handleCurrentPasswordBlur = (e) => {
    verifyCurrentPassword(e.target.value);
  };

  const handleNewPasswordFocus = () => {
    if (pwForm.currentPassword && currentPwStatus !== 'valid') {
      verifyCurrentPassword(pwForm.currentPassword);
    }
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPasswords((prev) => !prev);
  };

  const renderPasswordToggle = (visible, onToggle) => (
    <button
      type="button"
      className="profile-toggle-password"
      onClick={onToggle}
      aria-label={visible ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
    >
      <svg className="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {visible ? (
          <>
            <path className="eye-on-path" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle className="eye-on-circle" cx="12" cy="12" r="3"></circle>
          </>
        ) : (
          <>
            <path className="eye-off-path" d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line className="eye-off-line" x1="1" y1="1" x2="23" y2="23"></line>
          </>
        )}
      </svg>
    </button>
  );

  const handleNavigateProfile = (e) => {
    e.preventDefault();
    setActiveMenu('profile');
    setSidebarActive(false);
    setIsEditing(false);
    profileSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleNavigateChangePassword = (e) => {
    e.preventDefault();
    setActiveMenu('change-password');
    setSidebarActive(false);
    setIsEditing(false);
    passwordSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const saveAvatarToBackend = (imageData) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!', 'error');
      return;
    }

    setAvatarSaving(true);
    fetch(`${API_BASE}/api/user/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ picture: imageData, avatar: imageData })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status !== 200) {
          showToast(data.message || 'Lưu ảnh đại diện thất bại!', 'error');
        }
      })
      .catch(() => {
        showToast('Không thể kết nối đến máy chủ để lưu ảnh đại diện!', 'error');
      })
      .finally(() => setAvatarSaving(false));
  };

  // Handle Avatar Change — auto-save to backend immediately
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chỉ tải lên tệp ảnh!', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước ảnh tối đa là 5MB!', 'error');
      return;
    }

    try {
      const newAvatarData = await compressImageFile(file);
      setAvatar(newAvatarData);
      saveAvatarToBackend(newAvatarData);
    } catch {
      showToast('Không thể xử lý ảnh. Vui lòng thử ảnh khác!', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Handle Interest Tag Checkbox Toggle
  const handleInterestChange = (e, key, label) => {
    const checked = e.target.checked;
    setInterests(prev => ({ ...prev, [key]: checked }));
  };  // Handle Profile Info Save
  const handleProfileSubmit = (e) => {
    e.preventDefault();

    if (userRole !== 'student' && !profileData.fullname.trim()) {
      showToast('Vui lòng nhập họ và tên!', 'error');
      return;
    }

    if (!orientation.trim()) {
      showToast('Vui lòng nhập định hướng chuyên môn!', 'error');
      return;
    }

    setSaveLoading(true);

    const map = {
      hardware: 'Phần cứng & Vi điều khiển',
      ai: 'AI',
      japan: 'Văn hóa Nhật Bản',
      charity: 'Thiện nguyện',
      sports: 'Thể thao',
      music: 'Âm nhạc & Nghệ thuật'
    };

    const activeInterests = Object.keys(interests)
      .filter(k => interests[k])
      .map(k => map[k]);

    fetch(`${API_BASE}/api/user/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...(userRole !== 'student' ? { fullname: profileData.fullname.trim() } : {}),
        phone: profileData.phone.trim(),
        orientation: orientation.trim(),
        interests: activeInterests,
        picture: avatar || displayAvatar,
        avatar: avatar || displayAvatar
      })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setSaveLoading(false);
        if (status === 200) {
          setIsEditing(false);
          if (data.user) {
            setProfileData({
              fullname: data.user.fullname || '',
              course: data.user.course || '',
              campus: data.user.campus || '',
              email: data.user.email || '',
              phone: data.user.phone || ''
            });
            setCourseChanged(data.user.courseChanged || false);
            if (data.user.picture || data.user.avatar) {
              setAvatar(resolveUserAvatar(data.user, ''));
            }
          }
        } else {
          showToast(data.message || 'Cập nhật thất bại!', 'error');
        }
      })
      .catch(err => {
        setSaveLoading(false);
        showToast('Không thể kết nối đến máy chủ Backend!', 'error');
      });
  };
  // Handle Change Password Submit
  const handlePasswordSubmit = (e) => {
    e.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = pwForm;

    if (!currentPassword) {
      showToast('Vui lòng nhập mật khẩu hiện tại!', 'error');
      return;
    }

    if (currentPwStatus === 'invalid') {
      showToast('Mật khẩu hiện tại không chính xác!', 'error');
      return;
    }

    if (currentPwStatus === 'checking') {
      showToast('Đang kiểm tra mật khẩu hiện tại, vui lòng đợi!', 'error');
      return;
    }

    if (currentPwStatus !== 'valid') {
      verifyCurrentPassword(currentPassword);
      showToast('Đang xác minh mật khẩu hiện tại, vui lòng thử lại!', 'error');
      return;
    }

    if (!newPassword) {
      showToast('Vui lòng nhập mật khẩu mới!', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự!', 'error');
      return;
    }

    if (currentPassword === newPassword) {
      showToast('Mật khẩu mới không được trùng với mật khẩu hiện tại!', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Xác nhận mật khẩu mới không khớp!', 'error');
      return;
    }

    setPwLoading(true);

    fetch(`${API_BASE}/api/user/change-password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setPwLoading(false);
        if (status === 200) {
          setPwForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          setShowCurrentPw(false);
          setShowNewPasswords(false);
          setCurrentPwStatus(null);
          showToast(data.message || 'Thay đổi mật khẩu thành công!', 'success');
        } else {
          showToast(data.message || 'Thay đổi mật khẩu thất bại!', 'error');
        }
      })
      .catch(err => {
        setPwLoading(false);
        showToast('Không thể kết nối đến máy chủ Backend!', 'error');
      });
  };

  const startEditing = () => {
    setBackupData({
      profileData: { ...profileData },
      orientation,
      interests: { ...interests }
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (backupData) {
      setProfileData(backupData.profileData);
      setOrientation(backupData.orientation);
      setInterests(backupData.interests);
    }
    setIsEditing(false);
  };

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('loginMethod');
    localStorage.removeItem('userRole');
    localStorage.removeItem('authToken');
    clearUserProfileCache();
    navigate('/login');
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="dashboard-body">
      {/* Mobile Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${sidebarActive ? 'active' : ''}`}
        id="sidebar-overlay"
        onClick={() => setSidebarActive(false)}
      ></div>

      <div className="dashboard-container">
        {/* Sidebar Aside */}
        <aside className={`sidebar-aside ${sidebarActive ? 'active' : ''}`} id="sidebar">
          {/* Logo */}
          <div
            className="sidebar-logo"
            style={{ display: 'flex', justifyContent: 'center', padding: '12px 16px', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <img
              src="https://lh3.googleusercontent.com/d/1zQNsDmGHl1ho4Xk8SN6dOPXSQVQQbhWM"
              alt="FEvents Logo"
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          {/* User Profile Card */}
          <a href="#" className="sidebar-user-card" onClick={(e) => e.preventDefault()}>
            {profileLoading ? (
              <div className="sidebar-avatar profile-skeleton profile-skeleton--avatar" aria-hidden="true" />
            ) : (
              <img className="sidebar-avatar" src={displayAvatar} alt="User Avatar" />
            )}
            <div className="sidebar-user-info">
              {profileLoading ? (
                <span className="profile-skeleton profile-skeleton--name" />
              ) : (
                <>
                  <span className="sidebar-user-name">{profileData.fullname}</span>
                  {userRole?.toLowerCase() !== 'student' && (
                    <span className="sidebar-user-role">{getRoleLabel(userRole)}</span>
                  )}
                </>
              )}
            </div>
          </a>

          {/* Menu Navigation */}
          <nav className="sidebar-menu">
            <div className="menu-section">
              <a href="#" className={`menu-item ${activeMenu === 'profile' ? 'active' : ''}`} onClick={handleNavigateProfile}>
                <div className="menu-item-content">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>Thông tin cá nhân</span>
                </div>
              </a>
              <a
                href="#change-password-section"
                className={`menu-item ${activeMenu === 'change-password' ? 'active' : ''}`}
                onClick={handleNavigateChangePassword}
              >
                <div className="menu-item-content">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Thay đổi mật khẩu</span>
                </div>
              </a>
            </div>

            {/* Section 2 */}
            <div className="menu-section">
              <span className="menu-header">Sự kiện</span>
              <a href="#" className="menu-item" onClick={handleSidebarNavigate('/events')}>
                <div className="menu-item-content">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span>Tìm kiếm & Duyệt sự kiện</span>
                </div>
              </a>
              <a href="#" className="menu-item" onClick={handleSidebarNavigate('/my-events')}>
                <div className="menu-item-content">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>Sự kiện của tôi</span>
                </div>
              </a>
              <a href="#" className="menu-item" onClick={handleSidebarNavigate('/schedule')}>
                <div className="menu-item-content">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>Quản lý lịch trình</span>
                </div>
              </a>
            </div>

            {/* Quick Scan */}
            <button className="btn-scan-aside" onClick={handleScanClick}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="7" y1="7" x2="17" y2="7"></line>
                <line x1="7" y1="12" x2="17" y2="12"></line>
                <line x1="7" y1="17" x2="13" y2="17"></line>
              </svg>
              <span>Quét mã tham gia</span>
            </button>

            {/* Section 3 */}
            <div className="menu-section">
              <span className="menu-header">Tiện ích</span>
              <a href="#" className="menu-item" onClick={handleSidebarNavigate('/event-reviews')}>
                <div className="menu-item-content">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <span>Đánh giá sự kiện</span>
                </div>
              </a>
              <a href="#" className="menu-item" onClick={handleSidebarNavigate('/announcements')}>
                <div className="menu-item-content">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  <span>Thông báo</span>
                </div>
              </a>
            </div>
          </nav>

          {/* Logout */}
          <div className="sidebar-footer">
            <a href="#" className="btn-logout" onClick={handleLogout}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Đăng xuất</span>
            </a>
          </div>
        </aside>

        {/* Main Container */}
        <main className="dashboard-main">
          {/* Top Navigation Bar */}
          <header className="top-navbar">
            <div className="navbar-left">
              {/* Mobile Menu Toggle Button */}
              <button
                className="btn-mobile-menu-toggle"
                id="menu-toggle"
                aria-label="Mở menu"
                onClick={() => setSidebarActive(true)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              {/* Breadcrumbs */}
              <div className="breadcrumbs">
                <Link to="/">Trang chủ</Link>
                <span style={{ color: '#cbd5e1' }}>/</span>
                <span className="current">{profilePageTitle}</span>
              </div>
            </div>

            <div className="navbar-right">
              {/* Notification Bell */}
              <button className="btn-icon-nav" aria-label="Xem thông báo" onClick={handleNotificationClick}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </button>

              {/* User Dropdown Menu link */}
              <a href="#" className="navbar-user-menu" onClick={(e) => e.preventDefault()}>
                {profileLoading ? (
                  <div className="navbar-user-avatar profile-skeleton profile-skeleton--avatar" aria-hidden="true" />
                ) : (
                  <img className="navbar-user-avatar" src={displayAvatar} alt="User Profile" />
                )}
                <div className="navbar-user-details">
                  {profileLoading ? (
                    <span className="profile-skeleton profile-skeleton--name" />
                  ) : (
                    <>
                      <span className="navbar-user-name">{profileData.fullname}</span>
                      {userRole?.toLowerCase() !== 'student' && (
                        <span className="navbar-user-role">{getRoleLabel(userRole)}</span>
                      )}
                    </>
                  )}
                </div>
              </a>
            </div>
          </header>

          {/* Dashboard Scrollable Body */}
          <div className="dashboard-content-wrapper">
            {activeMenu === 'change-password' && (
              <div className="page-header">
                <h1>Thay đổi mật khẩu</h1>
                <p>Cập nhật mật khẩu đăng nhập tài khoản của bạn.</p>
              </div>
            )}

            {/* Layout Grid */}
            <div className="profile-grid">
              {profileLoading ? (
                <div className="profile-page-loading" aria-busy="true" aria-label="Đang tải hồ sơ">
                  <div className="profile-skeleton profile-skeleton--avatar-lg" />
                  <div className="profile-skeleton profile-skeleton--block" />
                  <div className="profile-skeleton profile-skeleton--block profile-skeleton--block-short" />
                </div>
              ) : (
              <>
              {/* Left Column (Avatar & Clubs) */}
              <div className="profile-left-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Avatar card */}
                <div className="profile-card avatar-card">
                  <div className="avatar-card-content">
                    <div className="profile-avatar-container">
                      <img className="large-profile-avatar" id="profile-avatar-img" src={displayAvatar} alt="Avatar lớn" />
                      <label htmlFor="avatar-upload-input" className="btn-avatar-edit-pencil" title="Thay đổi ảnh đại diện">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </label>
                      <input
                        type="file"
                        id="avatar-upload-input"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleAvatarChange}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-upload-avatar"
                      disabled={avatarSaving}
                      onClick={() => document.getElementById('avatar-upload-input').click()}
                    >
                      {avatarSaving ? 'Đang lưu...' : 'Thay đổi ảnh đại diện'}
                    </button>
                  </div>
                </div>

                {/* Clubs card */}
                <div className="profile-card clubs-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span>Câu lạc bộ của tôi</span>
                  </div>
                  <div className="tag-list">
                    <span className="club-tag">FU-DEVIES</span>
                    <span className="club-tag">Minori Japanese Club</span>
                    <span className="club-tag">DreamTeam</span>
                  </div>
                </div>
              </div>

              {/* Right Column (Form Details) */}
              <div className="profile-right-column" ref={profileSectionRef}>
                {activeMenu === 'profile' && (
                <form id="profile-edit-form" onSubmit={handleProfileSubmit} className="profile-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h2 className="profile-card-title" style={{ marginBottom: '4px' }}>Thông tin cá nhân & Sở thích</h2>

                  <div className="profile-form-grid">
                    <div className="profile-input-group">
                      <label htmlFor="profile-name">Họ và tên</label>
                      <input
                        type="text"
                        id="profile-name"
                        value={profileData.fullname}
                        onChange={(e) => setProfileData(prev => ({ ...prev, fullname: e.target.value }))}
                        required
                        readOnly={userRole === 'student'}
                        disabled={userRole !== 'student' && !isEditing}
                      />
                    </div>
                    {userRole === 'student' && (
                      <div className="profile-input-group">
                        <label htmlFor="profile-student-id">MSSV</label>
                        <input
                          type="text"
                          id="profile-student-id"
                          value={studentId || '—'}
                          readOnly
                          placeholder="Chưa có MSSV"
                          title="MSSV định dạng DSxxxxxx hoặc DExxxxxx"
                        />
                      </div>
                    )}
                    {userRole === 'student' && (
                      <div className="profile-input-group">
                        <label htmlFor="profile-course">Khóa học</label>
                        <input
                          type="text"
                          id="profile-course"
                          value={profileData.course}
                          readOnly
                        />
                      </div>
                    )}
                    <div className="profile-input-group">
                      <label htmlFor="profile-email">Email</label>
                      <input type="email" id="profile-email" value={profileData.email} readOnly />
                    </div>
                    <div className="profile-input-group">
                      <label htmlFor="user-phone">Số điện thoại</label>
                      <input
                        type="tel"
                        id="user-phone"
                        placeholder="Nhập số điện thoại..."
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    {userRole === 'student' && (
                      <div className="profile-input-group profile-form-grid-full">
                        <label htmlFor="profile-campus">Cơ sở đào tạo</label>
                        <input type="text" id="profile-campus" value={profileData.campus} readOnly />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    <div className="profile-input-group profile-form-grid-full">
                      <label htmlFor="user-orientation">Định hướng chuyên môn</label>
                      <textarea
                        id="user-orientation"
                        placeholder="Nhập định hướng chuyên môn của bạn..."
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value)}
                        disabled={!isEditing}
                      ></textarea>
                    </div>

                    {/* Interests checklist */}
                    <div className="interest-section">
                      <div className="interest-title-wrapper">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        <span>AI Recommend: Sở thích sự kiện</span>
                      </div>

                      <div className="interest-tag-list">
                        <label className={`interest-tag-checkbox ${!isEditing ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            name="interests"
                            value="hardware"
                            checked={interests.hardware}
                            onChange={(e) => handleInterestChange(e, 'hardware', 'Phần cứng & Vi điều khiển')}
                            disabled={!isEditing}
                          />
                          <div className="interest-tag-content">
                            <svg className="interest-tag-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>Phần cứng & Vi điều khiển</span>
                          </div>
                        </label>

                        <label className={`interest-tag-checkbox ${!isEditing ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            name="interests"
                            value="ai"
                            checked={interests.ai}
                            onChange={(e) => handleInterestChange(e, 'ai', 'AI')}
                            disabled={!isEditing}
                          />
                          <div className="interest-tag-content">
                            <svg className="interest-tag-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>AI</span>
                          </div>
                        </label>

                        <label className={`interest-tag-checkbox ${!isEditing ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            name="interests"
                            value="japan"
                            checked={interests.japan}
                            onChange={(e) => handleInterestChange(e, 'japan', 'Văn hóa Nhật Bản')}
                            disabled={!isEditing}
                          />
                          <div className="interest-tag-content">
                            <svg className="interest-tag-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>Văn hóa Nhật Bản</span>
                          </div>
                        </label>

                        <label className={`interest-tag-checkbox ${!isEditing ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            name="interests"
                            value="charity"
                            checked={interests.charity}
                            onChange={(e) => handleInterestChange(e, 'charity', 'Thiện nguyện')}
                            disabled={!isEditing}
                          />
                          <div className="interest-tag-content">
                            <svg className="interest-tag-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>Thiện nguyện</span>
                          </div>
                        </label>

                        <label className={`interest-tag-checkbox ${!isEditing ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            name="interests"
                            value="sports"
                            checked={interests.sports}
                            onChange={(e) => handleInterestChange(e, 'sports', 'Thể thao')}
                            disabled={!isEditing}
                          />
                          <div className="interest-tag-content">
                            <svg className="interest-tag-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>Thể thao</span>
                          </div>
                        </label>

                        <label className={`interest-tag-checkbox ${!isEditing ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            name="interests"
                            value="music"
                            checked={interests.music}
                            onChange={(e) => handleInterestChange(e, 'music', 'Âm nhạc & Nghệ thuật')}
                            disabled={!isEditing}
                          />
                          <div className="interest-tag-content">
                            <svg className="interest-tag-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>Âm nhạc & Nghệ thuật</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {!isEditing ? (
                      <button
                        type="button"
                        className="primary-button btn-save-profile"
                        onClick={startEditing}
                        style={{ backgroundColor: 'var(--primary)' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Chỉnh sửa thông tin cá nhân
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '12px' }}>
                        <button
                          type="submit"
                          id="save-btn"
                          className="primary-button btn-save-profile"
                          disabled={saveLoading}
                          style={{ flex: 1, margin: 0 }}
                        >
                          {saveLoading ? (
                            <span className="btn-spinner"></span>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                              </svg>
                              <span className="btn-text">Lưu thay đổi</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={cancelEditing}
                          disabled={saveLoading}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1.5px solid #cbd5e1',
                            backgroundColor: '#f8fafc',
                            color: '#475569',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'var(--transition-fast)'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#f1f5f9';
                            e.currentTarget.style.color = 'var(--text-main)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.color = '#475569';
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          Hủy
                        </button>
                      </div>
                    )}
                  </div>
                </form>
                )}

                {activeMenu === 'change-password' && (
                <div
                  id="change-password-section"
                  ref={passwordSectionRef}
                  className="profile-card profile-card--password profile-card--highlight"
                >
                  <h2 className="profile-card-title">Thay đổi mật khẩu</h2>

                  {!canChangePassword ? (
                    <p className="profile-password-notice">
                      Tài khoản đăng nhập Google không hỗ trợ đổi mật khẩu tại đây. Vui lòng quản lý mật khẩu qua tài khoản Google của bạn.
                    </p>
                  ) : (
                    <form id="change-password-form" onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div className="profile-form-grid">
                        <div className="profile-input-group profile-form-grid-full">
                          <label htmlFor="current-password">Mật khẩu hiện tại</label>
                          <div className="profile-password-wrapper">
                            <input
                              type={showCurrentPw ? 'text' : 'password'}
                              id="current-password"
                              placeholder="Nhập mật khẩu hiện tại"
                              required
                              value={pwForm.currentPassword}
                              onChange={(e) => handleCurrentPasswordChange(e.target.value)}
                              onBlur={handleCurrentPasswordBlur}
                              className={
                                currentPwStatus === 'valid'
                                  ? 'is-valid'
                                  : currentPwStatus === 'invalid'
                                    ? 'is-invalid'
                                    : ''
                              }
                            />
                            {renderPasswordToggle(showCurrentPw, () => setShowCurrentPw(!showCurrentPw))}
                          </div>
                          {currentPwStatus === 'checking' && (
                            <p className="profile-password-feedback profile-password-feedback--checking">Đang kiểm tra...</p>
                          )}
                          {currentPwStatus === 'valid' && (
                            <p className="profile-password-feedback profile-password-feedback--valid">Khớp</p>
                          )}
                          {currentPwStatus === 'invalid' && (
                            <p className="profile-password-feedback profile-password-feedback--invalid">Không khớp</p>
                          )}
                        </div>

                        <div className="profile-input-group">
                          <label htmlFor="new-password">Mật khẩu mới</label>
                          <div className="profile-password-wrapper">
                            <input
                              type={showNewPasswords ? 'text' : 'password'}
                              id="new-password"
                              placeholder="Nhập mật khẩu mới"
                              required
                              value={pwForm.newPassword}
                              onChange={(e) => setPwForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                              onFocus={handleNewPasswordFocus}
                            />
                            {renderPasswordToggle(showNewPasswords, toggleNewPasswordVisibility)}
                          </div>
                          {pwForm.newPassword && (
                            <div className="profile-password-strength">
                              <div className="profile-password-strength__bars">
                                {[1, 2, 3, 4].map((bar) => (
                                  <span
                                    key={bar}
                                    className={`profile-password-strength__bar ${
                                      bar <= passwordStrength.bars
                                        ? `profile-password-strength__bar--${passwordStrength.level}`
                                        : ''
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className={`profile-password-strength__label profile-password-strength__label--${passwordStrength.level}`}>
                                {passwordStrength.label}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="profile-input-group">
                          <label htmlFor="confirm-password">Xác nhận mật khẩu mới</label>
                          <div className="profile-password-wrapper">
                            <input
                              type={showNewPasswords ? 'text' : 'password'}
                              id="confirm-password"
                              placeholder="Xác nhận mật khẩu mới"
                              required
                              value={pwForm.confirmPassword}
                              onChange={(e) => setPwForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                              className={
                                confirmPasswordMatch === true
                                  ? 'is-valid'
                                  : confirmPasswordMatch === false
                                    ? 'is-invalid'
                                    : ''
                              }
                            />
                            {renderPasswordToggle(showNewPasswords, toggleNewPasswordVisibility)}
                          </div>
                          {confirmPasswordMatch === true && (
                            <p className="profile-password-feedback profile-password-feedback--valid">Khớp</p>
                          )}
                          {confirmPasswordMatch === false && (
                            <p className="profile-password-feedback profile-password-feedback--invalid">Không khớp</p>
                          )}
                        </div>
                      </div>

                      <button type="submit" id="change-pw-btn" className="primary-button btn-save-profile" disabled={pwLoading}>
                        {pwLoading ? (
                          <span className="btn-spinner"></span>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            <span className="btn-text">Cập nhật mật khẩu</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
                )}
              </div>
              </>
              )}
            </div>
          </div>

          {/* Dashboard Footer */}
          <footer className="dashboard-footer">
            <div className="dashboard-footer-content">
              <div className="footer-top">
                <div className="footer-info">
                  <a href="#" className="footer-logo" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                    <img
                      src="https://lh3.googleusercontent.com/d/1zQNsDmGHl1ho4Xk8SN6dOPXSQVQQbhWM"
                      alt="FEvents Logo"
                      style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
                    />
                  </a>
                  <p>Nền tảng quản lý sự kiện chuyên nghiệp và sáng tạo dành riêng cho hệ sinh thái FPT.</p>
                </div>

                <div className="footer-column">
                  <h3>Khám phá</h3>
                  <ul className="footer-links">
                    <li><a href="#" onClick={handleSidebarNavigate('/events')}>Sự kiện sắp tới</a></li>
                    <li><a href="#" onClick={handleSidebarNavigate('/events')}>Câu lạc bộ nổi bật</a></li>
                    <li><a href="#" onClick={handleSidebarNavigate('/announcements')}>Tin tức công nghệ</a></li>
                    <li><a href="#" onClick={handleSidebarNavigate('/my-events')}>Thư viện hình ảnh</a></li>
                  </ul>
                </div>

                <div className="footer-column">
                  <h3>Hỗ trợ</h3>
                  <ul className="footer-links">
                    <li><a href="#" onClick={handleSidebarNavigate('/support')}>Trung tâm hỗ trợ</a></li>
                    <li><a href="#" onClick={handleSidebarNavigate('/contact')}>Liên hệ chúng tôi</a></li>
                    <li><a href="#" onClick={handleSidebarNavigate('/terms')}>Điều khoản dịch vụ</a></li>
                    <li><a href="#" onClick={handleSidebarNavigate('/privacy')}>Chính sách bảo mật</a></li>
                  </ul>
                </div>

                <div className="footer-column">
                  <h3>Kết nối</h3>
                  <div className="social-links">
                    <a href="#" className="social-link" aria-label="Facebook" onClick={(e) => handleFeatureNotImplemented(e, 'Facebook')}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                      </svg>
                    </a>
                    <a href="#" className="social-link" aria-label="Instagram" onClick={(e) => handleFeatureNotImplemented(e, 'Instagram')}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              <div className="footer-bottom">
                <span className="copyright-text">© 2024 FPT Event Platform. All rights reserved.</span>
                <div className="footer-bottom-links">
                  <a href="#" onClick={(e) => handleFeatureNotImplemented(e, 'Báo cáo')}>Báo cáo</a>
                  <a href="#" onClick={(e) => handleFeatureNotImplemented(e, 'Cookie Policy')}>Cookie Policy</a>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Profile;
