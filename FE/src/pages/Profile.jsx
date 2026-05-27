import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import defaultAvatar from '../assets/profile_avatar.png';
import fptLogo from '../assets/fpt_logo.png';

const Profile = ({ showToast }) => {
  const navigate = useNavigate();

  // Profile data from backend
  const [profileData, setProfileData] = useState({
    fullname: 'Trần Xuân Thuận',
    course: 'K18',
    campus: 'FPT University Da Nang',
    email: localStorage.getItem('userEmail') || 'thuantx.k18@fpt.edu.vn',
    phone: ''
  });

  // Role & Student ID for FPT recognition
  const [userRole, setUserRole] = useState('guest');
  const [studentId, setStudentId] = useState('');

  // Track if course cohort has been changed once
  const [courseChanged, setCourseChanged] = useState(false);

  // Responsive Sidebar State
  const [sidebarActive, setSidebarActive] = useState(false);

  // Edit profile mode state
  const [isEditing, setIsEditing] = useState(false);
  const [backupData, setBackupData] = useState(null);

  // Avatar Upload State
  const [avatar, setAvatar] = useState(defaultAvatar);

  // Form Orientation State
  const [orientation, setOrientation] = useState('Back-end Development, Internet of Things (IoT)');
  const [saveLoading, setSaveLoading] = useState(false);

  // Load profile from Backend on mount
  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (!email) return;

    fetch(`http://localhost:5000/api/user/profile?email=${email}`)
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
        if (u.avatar) {
          setAvatar(u.avatar);
        } else if (u.picture) {
          setAvatar(u.picture);
        }
        if (u.orientation !== undefined) {
          setOrientation(u.orientation);
        }
        // Load role & studentId
        if (u.role) setUserRole(u.role);
        if (u.studentId) setStudentId(u.studentId);

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
      });
  }, []);

  // Interests Checklist State
  const [interests, setInterests] = useState({
    hardware: true,
    ai: true,
    japan: true,
    charity: true,
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
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Search Input State
  const [searchQuery, setSearchQuery] = useState('');

  // Handle Sidebar Menu item click
  const handleFeatureNotImplemented = (e, label) => {
    e.preventDefault();
    showToast(`Tính năng "${label}" đang được phát triển và liên kết hệ thống!`, 'info');
  };

  // Handle Quick Scan click
  const handleScanClick = () => {
    showToast('Đang khởi động trình quét camera... Vui lòng chuẩn bị QR code sự kiện.', 'info');
  };

  // Handle Notification Bell click
  const handleNotificationClick = () => {
    showToast('Không có thông báo mới nào dành cho bạn.', 'info');
  };

  // Handle Search Submit on Enter keypress
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      const query = searchQuery.trim();
      if (query) {
        showToast(`Đang tìm kiếm thông báo cho từ khóa: "${query}"...`, 'info');
        setSearchQuery('');
      } else {
        showToast('Vui lòng nhập từ khóa tìm kiếm!', 'error');
      }
    }
  };

  // Handle Avatar Change
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Vui lòng chỉ tải lên tệp ảnh!', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('Kích thước ảnh tối đa là 5MB!', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target.result);
        showToast('Thay đổi ảnh đại diện tạm thời thành công!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Interest Tag Checkbox Toggle
  const handleInterestChange = (e, key, label) => {
    const checked = e.target.checked;
    setInterests(prev => ({ ...prev, [key]: checked }));
    if (checked) {
      showToast(`Đã thêm sở thích: ${label}`, 'info');
    } else {
      showToast(`Đã bỏ sở thích: ${label}`, 'info');
    }
  };  // Handle Profile Info Save
  const handleProfileSubmit = (e) => {
    e.preventDefault();

    if (!profileData.fullname.trim()) {
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

    fetch('http://localhost:5000/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: profileData.email,
        fullname: profileData.fullname.trim(),
        phone: profileData.phone.trim(),
        course: profileData.course,
        orientation: orientation.trim(),
        interests: activeInterests,
        picture: avatar
      })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setSaveLoading(false);
        if (status === 200) {
          showToast('Cập nhật hồ sơ thành công! AI đang tối ưu hóa đề xuất sự kiện cho bạn.', 'success');
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
            if (data.user.picture) {
              setAvatar(data.user.picture);
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

    fetch('http://localhost:5000/api/user/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: profileData.email,
        currentPassword,
        newPassword
      })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setPwLoading(false);
        if (status === 200) {
          showToast('Thay đổi mật khẩu thành công!', 'success');
          setPwForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          setShowCurrentPw(false);
          setShowNewPw(false);
          setShowConfirmPw(false);
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
    showToast('Đã đăng xuất tài khoản thành công.', 'info');
    navigate('/login');
  };

  const loginMethod = localStorage.getItem('loginMethod');

  // ============================================================
  // RoleBadge Component — Visual badge for student/staff/guest
  // ============================================================
  const RoleBadge = ({ role, size = 'sm' }) => {
    const config = {
      student: {
        label: 'Sinh viên FPT',
        className: 'role-badge--student',
        icon: (
          <svg width={size === 'lg' ? 16 : 12} height={size === 'lg' ? 16 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        )
      },
      staff: {
        label: 'Cán bộ FPT',
        className: 'role-badge--staff',
        icon: (
          <svg width={size === 'lg' ? 16 : 12} height={size === 'lg' ? 16 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        )
      },
      ctsv: {
        label: 'Phòng CTSV',
        className: 'role-badge--staff', // Using staff style for now, can change later
        icon: (
          <svg width={size === 'lg' ? 16 : 12} height={size === 'lg' ? 16 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        )
      },
      guest: {
        label: 'Khách',
        className: 'role-badge--guest',
        icon: (
          <svg width={size === 'lg' ? 16 : 12} height={size === 'lg' ? 16 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        )
      }
    };

    const c = config[role] || config.guest;
    return (
      <span className={`role-badge ${c.className} ${size === 'lg' ? 'role-badge--lg' : ''}`}>
        {c.icon}
        <span>{c.label}</span>
      </span>
    );
  };

  // ============================================================
  // RoleInfoSection — Detailed role info card in profile
  // ============================================================
  const RoleInfoSection = ({ role, studentIdVal }) => {
    const roleConfig = {
      student: {
        title: '🎓 Sinh viên FPT University',
        subtitle: studentIdVal ? `Mã sinh viên: ${studentIdVal}` : 'Đã xác thực bằng email sinh viên FPT',
        sectionClass: '',
        iconClass: 'role-info-icon--student',
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        )
      },
      staff: {
        title: '👨‍🏫 Cán bộ / Giảng viên FPT',
        subtitle: 'Đã xác thực bằng email nội bộ FPT',
        sectionClass: 'role-info-section--staff',
        iconClass: 'role-info-icon--staff',
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        )
      },
      ctsv: {
        title: '🛡️ Phòng Công Tác Sinh Viên',
        subtitle: 'Đã xác thực quyền Quản trị CTSV',
        sectionClass: 'role-info-section--staff',
        iconClass: 'role-info-icon--staff',
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        )
      },
      guest: {
        title: '👤 Tài khoản Khách',
        subtitle: 'Sử dụng email ngoài hệ thống FPT. Một số tính năng có thể bị giới hạn.',
        sectionClass: 'role-info-section--guest',
        iconClass: 'role-info-icon--guest',
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        )
      }
    };

    const rc = roleConfig[role] || roleConfig.guest;

    return (
      <div className={`role-info-section ${rc.sectionClass}`}>
        <div className={`role-info-icon ${rc.iconClass}`}>
          {rc.icon}
        </div>
        <div className="role-info-details">
          <span className="role-info-title">{rc.title}</span>
          <span className="role-info-subtitle">{rc.subtitle}</span>
        </div>
      </div>
    );
  };

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
            <img className="sidebar-avatar" src={avatar} alt="User Avatar" />
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{profileData.fullname}</span>
              <span className="sidebar-user-role">
                {userRole === 'student' ? `Sinh viên ${profileData.course}` : userRole === 'staff' ? 'Cán bộ FPT' : userRole === 'ctsv' ? 'Phòng CTSV' : 'Khách'}
              </span>
              <div className="sidebar-role-badge">
                <RoleBadge role={userRole} />
              </div>
            </div>
          </a>

          {/* Menu Navigation */}
          <nav className="sidebar-menu">
            {/* Section 1 */}
            <div className="menu-section">
              <a href="#" className="menu-item active" onClick={(e) => e.preventDefault()}>
                <div className="menu-item-content">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>Hồ sơ cá nhân</span>
                </div>
              </a>
              <a href="#" className="menu-item" onClick={(e) => handleFeatureNotImplemented(e, 'Đăng nhập SSO')}>
                <div className="menu-item-content">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Đăng nhập SSO</span>
                </div>
                <span className="status-dot"></span>
              </a>
            </div>

            {/* Section 2 */}
            <div className="menu-section">
              <span className="menu-header">Sự kiện</span>
              <a href="#" className="menu-item" onClick={(e) => handleFeatureNotImplemented(e, 'Tìm kiếm & Duyệt sự kiện')}>
                <div className="menu-item-content">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span>Tìm kiếm & Duyệt sự kiện</span>
                </div>
              </a>
              <a href="#" className="menu-item" onClick={(e) => handleFeatureNotImplemented(e, 'Sự kiện của tôi')}>
                <div className="menu-item-content">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>Sự kiện của tôi</span>
                </div>
              </a>
              <a href="#" className="menu-item" onClick={(e) => handleFeatureNotImplemented(e, 'Quản lý lịch trình')}>
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
              <a href="#" className="menu-item" onClick={(e) => handleFeatureNotImplemented(e, 'Đánh giá sự kiện')}>
                <div className="menu-item-content">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <span>Đánh giá sự kiện</span>
                </div>
              </a>
              <a href="#" className="menu-item" onClick={(e) => handleFeatureNotImplemented(e, 'Thông báo')}>
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
                <a href="#" onClick={(e) => e.preventDefault()}>Hồ sơ</a>
                <span style={{ color: '#cbd5e1' }}>/</span>
                <span className="current">Hồ sơ cá nhân</span>
              </div>
            </div>

            <div className="navbar-right">
              {/* Search Wrapper */}
              <div className="search-wrapper">
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Tìm kiếm thông báo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                />
              </div>

              {/* Notification Bell */}
              <button className="btn-icon-nav" aria-label="Xem thông báo" onClick={handleNotificationClick}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </button>

              {/* User Dropdown Menu link */}
              <a href="#" className="navbar-user-menu" onClick={(e) => e.preventDefault()}>
                <img className="navbar-user-avatar" src={avatar} alt="User Profile" />
                <div className="navbar-user-details">
                  <span className="navbar-user-name">{profileData.fullname}</span>
                  <span className="navbar-user-role">
                    {userRole === 'student' ? `Sinh viên ${profileData.course}` : userRole === 'staff' ? 'Cán bộ FPT' : userRole === 'ctsv' ? 'Phòng CTSV' : 'Khách'}
                  </span>
                </div>
              </a>
            </div>
          </header>

          {/* Dashboard Scrollable Body */}
          <div className="dashboard-content-wrapper">
            {/* Page Header */}
            <div className="page-header">
              <h1>Hồ sơ cá nhân</h1>
              <p>Quản lý và cập nhật thông tin cá nhân của bạn để nhận các đề xuất sự kiện phù hợp từ AI.</p>
            </div>

            {/* Layout Grid */}
            <div className="profile-grid">
              {/* Left Column (Avatar & Clubs) */}
              <div className="profile-left-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Avatar card */}
                <div className="profile-card avatar-card">
                  <div className="avatar-card-content">
                    <div className="profile-avatar-container">
                      <img className="large-profile-avatar" id="profile-avatar-img" src={avatar} alt="Avatar lớn" />
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
                      onClick={() => document.getElementById('avatar-upload-input').click()}
                    >
                      Thay đổi ảnh đại diện
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
              <div className="profile-right-column">
                <form id="profile-edit-form" onSubmit={handleProfileSubmit} className="profile-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* SSO details card */}
                  <div>
                    <div className="profile-card-header">
                      <h2 className="profile-card-title">Thông tin định danh SSO</h2>
                      <div className="card-status-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span>ĐÃ XÁC THỰC</span>
                      </div>
                    </div>

                    {/* Role Info Section */}
                    <RoleInfoSection role={userRole} studentIdVal={studentId} />

                    <div className="profile-form-grid">
                      <div className="profile-input-group">
                        <label htmlFor="sso-name">Họ và tên</label>
                        <input
                          type="text"
                          id="sso-name"
                          value={profileData.fullname}
                          onChange={(e) => setProfileData(prev => ({ ...prev, fullname: e.target.value }))}
                          required
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="profile-input-group">
                        <label htmlFor="sso-course">Khóa học</label>
                        {courseChanged ? (
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              id="sso-course"
                              value={profileData.course}
                              readOnly
                              style={{ paddingRight: '120px' }}
                            />
                            <span style={{
                              position: 'absolute',
                              right: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '0.75rem',
                              color: '#ef4444',
                              fontWeight: '600',
                              backgroundColor: '#fee2e2',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              Đã khóa (đổi 1 lần)
                            </span>
                          </div>
                        ) : (
                          <select
                            id="sso-course"
                            value={profileData.course}
                            onChange={(e) => setProfileData(prev => ({ ...prev, course: e.target.value }))}
                            disabled={!isEditing}
                            style={{
                              width: '100%',
                              height: '48px',
                              padding: '12px 16px',
                              fontSize: '0.9rem',
                              fontFamily: 'inherit',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              outline: 'none',
                              backgroundColor: 'var(--bg-card)',
                              color: 'var(--text-main)',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="K15">Khóa 15 (K15)</option>
                            <option value="K16">Khóa 16 (K16)</option>
                            <option value="K17">Khóa 17 (K17)</option>
                            <option value="K18">Khóa 18 (K18)</option>
                            <option value="K19">Khóa 19 (K19)</option>
                            <option value="K20">Khóa 20 (K20)</option>
                          </select>
                        )}
                      </div>
                      <div className="profile-input-group">
                        <label htmlFor="sso-email">Email sinh viên</label>
                        <input type="email" id="sso-email" value={profileData.email} readOnly />
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
                      {studentId && (
                        <div className="profile-input-group">
                          <label htmlFor="student-id">Mã sinh viên</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="text" id="student-id" value={studentId} readOnly />
                            <RoleBadge role={userRole} size="lg" />
                          </div>
                        </div>
                      )}
                      <div className="profile-input-group profile-form-grid-full">
                        <label htmlFor="sso-campus">Cơ sở đào tạo</label>
                        <input type="text" id="sso-campus" value={profileData.campus} readOnly />
                      </div>
                    </div>
                  </div>

                  {/* Editable details card */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    <h2 className="profile-card-title" style={{ marginBottom: '4px' }}>Thông tin cá nhân & Sở thích</h2>

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

                {/* Change Password Card */}
                {loginMethod !== 'google' && (
                  <div className="profile-card" style={{ marginTop: '24px' }}>
                    <form id="change-password-form" onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <h2 className="profile-card-title">Thay đổi mật khẩu</h2>

                      <div className="profile-form-grid">
                        <div className="profile-input-group profile-form-grid-full">
                          <label htmlFor="current-password">Mật khẩu hiện tại</label>
                          <div className="profile-password-wrapper">
                            <input
                              type={showCurrentPw ? "text" : "password"}
                              id="current-password"
                              placeholder="Nhập mật khẩu hiện tại"
                              required
                              value={pwForm.currentPassword}
                              onChange={(e) => setPwForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                            />
                            <button
                              type="button"
                              className="profile-toggle-password"
                              onClick={() => setShowCurrentPw(!showCurrentPw)}
                              aria-label={showCurrentPw ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                            >
                              <svg className="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {showCurrentPw ? (
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
                          </div>
                        </div>

                        <div className="profile-input-group">
                          <label htmlFor="new-password">Mật khẩu mới</label>
                          <div className="profile-password-wrapper">
                            <input
                              type={showNewPw ? "text" : "password"}
                              id="new-password"
                              placeholder="Nhập mật khẩu mới"
                              required
                              value={pwForm.newPassword}
                              onChange={(e) => setPwForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            />
                            <button
                              type="button"
                              className="profile-toggle-password"
                              onClick={() => setShowNewPw(!showNewPw)}
                              aria-label={showNewPw ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                            >
                              <svg className="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {showNewPw ? (
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
                          </div>
                        </div>

                        <div className="profile-input-group">
                          <label htmlFor="confirm-password">Xác nhận mật khẩu mới</label>
                          <div className="profile-password-wrapper">
                            <input
                              type={showConfirmPw ? "text" : "password"}
                              id="confirm-password"
                              placeholder="Xác nhận mật khẩu mới"
                              required
                              value={pwForm.confirmPassword}
                              onChange={(e) => setPwForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            />
                            <button
                              type="button"
                              className="profile-toggle-password"
                              onClick={() => setShowConfirmPw(!showConfirmPw)}
                              aria-label={showConfirmPw ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                            >
                              <svg className="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {showConfirmPw ? (
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
                          </div>
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
                  </div>
                )}
              </div>
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
                    <li><a href="#" onClick={(e) => handleFeatureNotImplemented(e, 'Sự kiện sắp tới')}>Sự kiện sắp tới</a></li>
                    <li><a href="#" onClick={(e) => handleFeatureNotImplemented(e, 'Câu lạc bộ nổi bật')}>Câu lạc bộ nổi bật</a></li>
                    <li><a href="#" onClick={(e) => handleFeatureNotImplemented(e, 'Tin tức công nghệ')}>Tin tức công nghệ</a></li>
                    <li><a href="#" onClick={(e) => handleFeatureNotImplemented(e, 'Thư viện hình ảnh')}>Thư viện hình ảnh</a></li>
                  </ul>
                </div>

                <div className="footer-column">
                  <h3>Hỗ trợ</h3>
                  <ul className="footer-links">
                    <li><a href="#" onClick={(e) => handleFeatureNotImplemented(e, 'Trung tâm hỗ trợ')}>Trung tâm hỗ trợ</a></li>
                    <li><a href="#" onClick={(e) => handleFeatureNotImplemented(e, 'Liên hệ chúng tôi')}>Liên hệ chúng tôi</a></li>
                    <li><a href="#" onClick={(e) => handleFeatureNotImplemented(e, 'Điều khoản dịch vụ')}>Điều khoản dịch vụ</a></li>
                    <li><a href="#" onClick={(e) => handleFeatureNotImplemented(e, 'Chính sách bảo mật')}>Chính sách bảo mật</a></li>
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
