import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import defaultAvatar from '../assets/profile_avatar.png';
import fptLogo from '../assets/fpt_logo.png';
import { API_BASE, getAuthHeaders, getEventHeaders } from '../utils/api';

const NAV_ITEMS = [
  { key: 'profile', label: 'Cập nhật hồ sơ CLB', icon: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.02 7.02 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84a.484.484 0 0 0-.47.41l-.36 2.54a7.37 7.37 0 0 0-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.04.69 1.62.94l.36 2.54c.05.24.27.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54a7.37 7.37 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/></svg> },
  { key: 'create', label: 'Tạo đề xuất sự kiện', icon: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="currentColor"/></svg> },
  { key: 'events', label: 'Danh sách Sự kiện quản lý', icon: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" fill="currentColor"/></svg> },
  { key: 'members', label: 'Quản lý người tham gia', icon: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/></svg> },
  { key: 'report', label: 'Báo cáo sau sự kiện', icon: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" fill="currentColor"/></svg> },
  { key: 'dashboard', label: 'Dashboard Thống kê số liệu', icon: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/></svg> },
];

const ClubManagement = ({ showToast }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState({ fullname: '', course: 'K18', picture: defaultAvatar, role: '' });
  const [activeNav, setActiveNav] = useState('events');
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [newEvent, setNewEvent] = useState({ title: '', category: '', description: '', maxSlots: 100, location: 'Hội trường Alpha', isPaid: false });
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null); // ID của row đang mở dropdown
  const totalEvents = 24;

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Fetch user profile + fetch events from API
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập để tiếp tục!', 'error');
      navigate('/login');
      return;
    }
    const token = localStorage.getItem('authToken');
    if (token) {
      fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.user) {
            const u = data.user;
            const role = u.role || '';
            setUserProfile({ fullname: u.fullname || '', course: u.course || 'K18', picture: u.picture || defaultAvatar, role });
            if (role && role !== 'club_manager') {
              showToast('Bạn không có quyền truy cập trang quản lý CLB!', 'error');
              navigate('/');
            }
          }
        })
        .catch(() => {});
    }
    // Load events from API
    fetchMyEvents();
  }, [navigate, showToast]);

  const fetchMyEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch(`${API_BASE}/api/events/my`, { headers: getEventHeaders(false) });
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error('Lỗi tải sự kiện:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const getStatusLabel = (status) => {
    if (status === 'approved') return { label: 'Đã duyệt', cls: 'clb-status-active' };
    if (status === 'pending') return { label: 'Chờ duyệt', cls: 'clb-status-pending' };
    return { label: 'Từ chối', cls: 'clb-status-ended' };
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/events/${id}`, {
        method: 'DELETE',
        headers: getEventHeaders(false)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xóa sự kiện thành công!', 'success');
        fetchMyEvents();
      } else {
        showToast(data.message || 'Xóa thất bại!', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối server!', 'error');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (createStep < 3) { setCreateStep(s => s + 1); return; }
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 30);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 3);

      const body = {
        title: newEvent.title,
        description: newEvent.description || 'Chưa có mô tả',
        location: newEvent.location,
        capacity: parseInt(newEvent.maxSlots),
        category: newEvent.category || 'Workshop',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const res = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: getEventHeaders(true),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đề xuất sự kiện đã được gửi duyệt!', 'success');
        setShowCreateModal(false);
        setCreateStep(1);
        setNewEvent({ title: '', category: '', description: '', maxSlots: 100, location: 'Hội trường Alpha', isPaid: false });
        fetchMyEvents();
      } else {
        showToast(data.message || 'Tạo sự kiện thất bại!', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối server!', 'error');
    }
  };

  const handleLogout = () => {
    ['isLoggedIn', 'userEmail', 'authToken', 'userRole'].forEach(k => localStorage.removeItem(k));
    navigate('/');
  };

  return (
    <div className="clb-page">
      {/* TOP NAVBAR */}
      <header className="home-header">
        <div className="header-container">
          {/* Hamburger toggle sidebar */}
          <button
            className="clb-sidebar-toggle-btn"
            onClick={() => setSidebarOpen(prev => !prev)}
            title={sidebarOpen ? 'Đóng sidebar' : 'Mở sidebar'}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
            </svg>
          </button>
          <div className="header-logo" onClick={() => navigate('/')}><img src={fptLogo} alt="F Events" className="logo-img" /></div>
          <nav className="header-nav">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Trang chủ</Link>
            <Link to="/events" className={`nav-link ${location.pathname === '/events' ? 'active' : ''}`}>Sự kiện</Link>
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); showToast('Câu lạc bộ đang phát triển!', 'info'); }}>Câu lạc bộ</a>
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); showToast('Tin tức đang cập nhật!', 'info'); }}>Tin tức</a>
            <Link to="/quan-ly-clb" className={`nav-link nav-link-manager ${location.pathname === '/quan-ly-clb' ? 'active' : ''}`}>Quản lý CLB</Link>
          </nav>
          <div className="header-actions">
            <button className="notif-bell-btn" onClick={() => showToast('Chưa có thông báo mới.', 'info')} aria-label="Thông báo">
              <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor" /></svg>
              <span className="notif-badge"></span>
            </button>
            <div className="profile-display-card">
              <Link to="/profile" className="profile-display-card-link">
                <div className="profile-info-text">
                  <span className="profile-name">{userProfile.fullname || 'Manager'}</span>
                  <span className="profile-role">{userProfile.course} - Manager</span>
                </div>
                <div className="profile-avatar-circle"><img src={userProfile.picture} alt="Avatar" /></div>
              </Link>
              <button className="small-logout-btn" onClick={handleLogout} title="Đăng xuất">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor" /></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT: Sidebar + Content */}
      <div className="clb-layout">

        {/* SIDEBAR */}
        <aside className={`clb-sidebar ${sidebarOpen ? 'clb-sidebar--open' : 'clb-sidebar--closed'}`}>
          {/* CLB Identity Card */}
          <div className="clb-sidebar-header">
            <div className="clb-identity-card">
              <div className="clb-identity-icon">
                <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="#f26f21" /></svg>
              </div>
              <span className="clb-identity-name">Câu lạc bộ FU-DEVER</span>
            </div>
          </div>

          <div className="clb-sidebar-divider" />

          {/* Navigation */}
          <nav className="clb-sidebar-nav">
            {/* Group 1 */}
            <div className="clb-nav-group">
              {NAV_ITEMS.slice(0, 1).map(item => (
                <button
                  key={item.key}
                  className={`clb-nav-item ${activeNav === item.key ? 'clb-nav-item--active' : ''}`}
                  onClick={() => { setActiveNav(item.key); if (item.key === 'create') setShowCreateModal(true); }}
                >
                  <span className="clb-nav-icon">{item.icon}</span>
                  <span className="clb-nav-label">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="clb-sidebar-divider" />

            {/* Group 2 */}
            <div className="clb-nav-group">
              {NAV_ITEMS.slice(1, 4).map(item => (
                <button
                  key={item.key}
                  className={`clb-nav-item ${activeNav === item.key ? 'clb-nav-item--active' : ''}`}
                  onClick={() => { setActiveNav(item.key); if (item.key === 'create') setShowCreateModal(true); }}
                >
                  <span className="clb-nav-icon">{item.icon}</span>
                  <span className="clb-nav-label">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="clb-sidebar-divider" />

            {/* Group 3 */}
            <div className="clb-nav-group">
              {NAV_ITEMS.slice(4).map(item => (
                <button
                  key={item.key}
                  className={`clb-nav-item ${activeNav === item.key ? 'clb-nav-item--active' : ''}`}
                  onClick={() => setActiveNav(item.key)}
                >
                  <span className="clb-nav-icon">{item.icon}</span>
                  <span className="clb-nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="clb-main">
          <div className="clb-page-header">
            <div>
              <h1 className="clb-page-title">DANH SÁCH SỰ KIỆN QUẢN LÝ</h1>
              <p className="clb-page-subtitle">Chào mừng trở lại, <strong>{userProfile.fullname || 'Manager'}</strong>. Bạn đang quản lý <strong>{events.length}</strong> sự kiện.</p>
            </div>
            <button className="clb-create-btn" onClick={() => { setShowCreateModal(true); setCreateStep(1); }}>
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" /></svg>
              Tạo sự kiện mới
            </button>
          </div>

          <div className="clb-table-wrapper">
            <table className="clb-table">
              <thead>
                <tr>
                  <th>TÊN SỰ KIỆN</th>
                  <th>THỂ LOẠI</th>
                  <th>THỜI GIAN</th>
                  <th>SỐ SLOT</th>
                  <th>TRẠNG THÁI</th>
                  <th>HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody>
                {loadingEvents ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>Đang tải...</td></tr>
                ) : events.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>Chưa có sự kiện nào. Tạo sự kiện đầu tiên của bạn!</td></tr>
                ) : events.map(ev => {
                  const { label, cls } = getStatusLabel(ev.status);
                  const startDate = ev.startDate ? new Date(ev.startDate).toLocaleDateString('vi-VN') : '--';
                  const startTime = ev.startDate ? new Date(ev.startDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--';
                  return (
                    <tr key={ev._id}>
                      <td><span className="clb-event-name">{ev.title}</span></td>
                      <td><span className="clb-category-text">{ev.category || 'Workshop'}</span></td>
                      <td><span className="clb-date-text">{startDate} - {startTime}</span></td>
                      <td>
                        <div className="clb-slot-cell">
                          <span className="clb-slot-nums" style={{ color: '#f26f21' }}>0/{ev.capacity}</span>
                          <div className="clb-slot-bar-bg">
                            <div className="clb-slot-bar-fill" style={{ width: '0%', background: '#f26f21' }}></div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`clb-status-badge ${cls}`}><span className="clb-status-dot"></span>{label}</span></td>
                      <td style={{ position: 'relative' }}>
                        <button
                          className="clb-action-btn"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === ev._id ? null : ev._id); }}
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="5" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="19" r="1.5" fill="currentColor" /></svg>
                        </button>
                        {openMenuId === ev._id && (
                          <div className="clb-dropdown-menu" onClick={e => e.stopPropagation()}>
                            <button
                              className="clb-dropdown-item"
                              onClick={() => { navigate(`/quan-ly-clb/su-kien/${ev._id}`); setOpenMenuId(null); }}
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>
                              Xem chi tiết
                            </button>
                            <button
                              className="clb-dropdown-item"
                              onClick={() => { showToast('Tính năng chỉnh sửa đang phát triển!', 'info'); setOpenMenuId(null); }}
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                              Chỉnh sửa
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="clb-pagination">
              <span className="clb-pagination-info">1-{events.length} trong tổng số {totalEvents}</span>
              <div className="clb-pagination-btns">
                <button className="clb-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <svg viewBox="0 0 24 24" width="16" height="16"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" fill="currentColor" /></svg>
                </button>
                <button className="clb-page-btn" onClick={() => setCurrentPage(p => p + 1)}>
                  <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" fill="currentColor" /></svg>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="clb-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className="clb-modal">
            <button className="clb-modal-close" onClick={() => setShowCreateModal(false)}>
              <svg viewBox="0 0 24 24" width="22" height="22"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" /></svg>
            </button>
            <h2 className="clb-modal-title">TẠO ĐỀ XUẤT SỰ KIỆN MỚI</h2>
            <p className="clb-modal-subtitle">Vui lòng điền đầy đủ thông tin để gửi xét duyệt tới Ban cán bộ IC-PDP.</p>

            <div className="clb-steps">
              {['THÔNG TIN CHUNG', 'VÉ & ĐỊA ĐIỂM', 'GỬI DUYỆT'].map((step, i) => (
                <div key={i} className={`clb-step ${createStep === i + 1 ? 'active' : createStep > i + 1 ? 'done' : ''}`}>
                  <div className="clb-step-circle">{createStep > i + 1 ? '✓' : i + 1}</div>
                  <span className="clb-step-label">{step}</span>
                  {i < 2 && <div className="clb-step-line"></div>}
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateSubmit} className="clb-modal-form">
              {createStep === 1 && (
                <div className="clb-form-step">
                  <div className="clb-form-row">
                    <div className="clb-form-group">
                      <label>Tên Sự Kiện <span className="clb-required">*</span></label>
                      <input type="text" placeholder="Vd: Workshop Lập trình Flutter" value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} required className="clb-input" />
                    </div>
                    <div className="clb-form-group">
                      <label>Thể Loại <span className="clb-required">*</span></label>
                      <select value={newEvent.category} onChange={e => setNewEvent(p => ({ ...p, category: e.target.value }))} required className="clb-input">
                        <option value="">Chọn thể loại</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Competition">Competition</option>
                        <option value="Nội bộ">Nội bộ</option>
                        <option value="Công nghệ">Công nghệ</option>
                        <option value="Âm nhạc">Âm nhạc</option>
                      </select>
                    </div>
                  </div>
                  <div className="clb-form-group">
                    <label>Mô tả chi tiết</label>
                    <textarea placeholder="Mô tả mục tiêu, nội dung và quyền lợi..." value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} rows={4} className="clb-input clb-textarea" />
                  </div>
                </div>
              )}
              {createStep === 2 && (
                <div className="clb-form-step">
                  <div className="clb-form-row">
                    <div className="clb-form-group">
                      <label>Số lượng vé tối đa</label>
                      <input type="number" min="1" value={newEvent.maxSlots} onChange={e => setNewEvent(p => ({ ...p, maxSlots: e.target.value }))} className="clb-input" />
                    </div>
                    <div className="clb-form-group">
                      <label>Địa điểm tổ chức</label>
                      <select value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} className="clb-input">
                        <option>Hội trường Alpha</option>
                        <option>Phòng Lab 402</option>
                        <option>Sân bóng FPTU</option>
                        <option>FPT Tower</option>
                      </select>
                    </div>
                  </div>
                  <div className="clb-form-group">
                    <div className="clb-toggle-row">
                      <div>
                        <label className="clb-toggle-label">Sự kiện có phí</label>
                        <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>Bán vé tham dự</p>
                      </div>
                      <div className={`clb-toggle ${newEvent.isPaid ? 'on' : ''}`} onClick={() => setNewEvent(p => ({ ...p, isPaid: !p.isPaid }))}></div>
                    </div>
                  </div>
                </div>
              )}
              {createStep === 3 && (
                <div className="clb-form-step">
                  <div className="clb-confirm-box">
                    <div className="clb-confirm-icon">📋</div>
                    <h3>Xác nhận gửi đề xuất</h3>
                    <p>Sự kiện sẽ được gửi tới Ban cán bộ IC-PDP. Thời gian duyệt 1-3 ngày làm việc.</p>
                    <div className="clb-confirm-details">
                      <div className="clb-confirm-row"><span>Tên sự kiện:</span><strong>{newEvent.title || 'Chưa nhập'}</strong></div>
                      <div className="clb-confirm-row"><span>Thể loại:</span><strong>{newEvent.category || 'Chưa chọn'}</strong></div>
                      <div className="clb-confirm-row"><span>Số slot:</span><strong>{newEvent.maxSlots}</strong></div>
                      <div className="clb-confirm-row"><span>Địa điểm:</span><strong>{newEvent.location}</strong></div>
                      <div className="clb-confirm-row"><span>Có phí:</span><strong>{newEvent.isPaid ? 'Có' : 'Miễn phí'}</strong></div>
                    </div>
                  </div>
                </div>
              )}
              <div className="clb-modal-actions">
                {createStep > 1 && <button type="button" className="clb-btn-secondary" onClick={() => setCreateStep(s => s - 1)}>Quay lại</button>}
                {createStep < 3 && <button type="button" className="clb-btn-secondary" onClick={() => { setShowCreateModal(false); showToast('Đã lưu bản nháp!', 'info'); }}>Lưu bản nháp</button>}
                <button type="submit" className="clb-btn-primary">{createStep === 3 ? 'Gửi duyệt' : 'Tiếp tục Bước ' + (createStep + 1)}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubManagement;
