import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import defaultAvatar from '../constants/defaultAvatar';
import { API_BASE, getAuthHeaders, getEventHeaders, parseApiResponse } from '../utils/api';
import SiteHeader from '../components/SiteHeader';
import ClubProfileUpdate from '../components/ClubProfileUpdate';
import ClubChairmanTransfer from '../components/club/ClubChairmanTransfer';
import ClubSidebarAside from '../components/club/ClubSidebarAside';
import {
  CLUB_NAV_ITEMS,
  isClubDesktop,
  persistClubSidebarOpen,
  readClubSidebarPref
} from '../components/club/clubNavConfig';
import { resolveUserAvatar } from '../utils/image';
import '../styles/club-portal.css';
import './ClubManagement.css';
import EventIntroFields from '../components/events/EventIntroFields';
import {
  DEFAULT_LEARNING_OUTCOME_ROWS,
  normalizeLearningOutcomesForSave,
} from '../utils/eventIntro';

const ClubManagement = ({ showToast }) => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({ fullname: '', course: 'K18', picture: defaultAvatar, role: '' });
  const [activeNav, setActiveNav] = useState(() => {
    const saved = sessionStorage.getItem('clb_active_nav');
    return saved && CLUB_NAV_ITEMS.some((item) => item.key === saved) ? saved : 'list';
  });
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(readClubSidebarPref);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rejectModalData, setRejectModalData] = useState(null);
  const [createStep, setCreateStep] = useState(1);
  const [lastSeenNotifs, setLastSeenNotifs] = useState(() => parseInt(localStorage.getItem('clb_last_seen_notifs') || '0', 10));
  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    category: '', 
    description: '', 
    maxSlots: 100, 
    location: 'Tầng 5 tòa Alpha', 
    isPaid: false,
    thumbnail: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    speaker: '',
    agenda: '',
    ticketPrice: '',
    learningOutcomes: [...DEFAULT_LEARNING_OUTCOME_ROWS],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null); // ID của row đang mở dropdown
  const totalEvents = events.length;

  useEffect(() => {
    sessionStorage.setItem('clb_active_nav', activeNav);
  }, [activeNav]);

  const eventNotifications = useMemo(() => {
    return events
      .filter(ev => ev.status && ev.status !== 'draft')
      .sort((a, b) => {
        const dA = new Date(a.updatedAt || a.createdAt || 0);
        const dB = new Date(b.updatedAt || b.createdAt || 0);
        return dB - dA;
      })
      .map(ev => {
        let tone = 'info';
        let title = 'Cập nhật trạng thái';
        let body = `Sự kiện "${ev.title}" đã được cập nhật.`;
        let reason = ev.rejectionReason || ev.moderationReason || 'Không có lý do cụ thể.';
        
        if (ev.status === 'approved') {
          tone = 'success';
          title = 'Sự kiện đã được duyệt';
          body = `Đề xuất sự kiện "${ev.title}" đã được phê duyệt.`;
        } else if (ev.status === 'rejected') {
          tone = 'alert';
          title = 'Sự kiện bị từ chối';
          body = `Đề xuất sự kiện "${ev.title}" bị từ chối. Lý do: ${reason}`;
        } else if (ev.status === 'pending') {
          tone = 'warning';
          title = 'Sự kiện đang chờ duyệt';
          body = `Đề xuất "${ev.title}" đã được gửi và đang chờ xét duyệt.`;
        }

        const dateObj = new Date(ev.updatedAt || ev.createdAt || Date.now());
        const rawDate = dateObj.getTime();
        const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + dateObj.toLocaleDateString('vi-VN');

        return {
          id: ev._id,
          title,
          body,
          tone,
          time: timeStr,
          rawDate,
          unread: rawDate > lastSeenNotifs,
          reason
        };
      });
  }, [events, lastSeenNotifs]);

  const hasNewNotifs = eventNotifications.some(n => n.unread);

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
            setUserProfile({
              fullname: u.fullname || '',
              course: u.course || 'K18',
              picture: resolveUserAvatar(u, defaultAvatar),
              role
            });
            if (role && role !== 'club_manager') {
              showToast('Bạn không có quyền truy cập trang quản lý CLB!', 'error');
              localStorage.setItem('userRole', role);
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
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoadingEvents(false);
      setEvents([]);
      showToast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'error');
      return;
    }

    setLoadingEvents(true);
    try {
      const res = await fetch(`${API_BASE}/api/events/my`, { headers: getEventHeaders(false) });
      const { ok, data } = await parseApiResponse(res);
      if (ok && data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        console.error('fetchMyEvents:', res.status, data);
        showToast(data.message || 'Không tải được danh sách sự kiện. Hãy restart backend.', 'error');
        setEvents([]);
      }
    } catch (err) {
      console.error('Lỗi tải sự kiện:', err);
      showToast('Không kết nối được server. Kiểm tra BE đang chạy port 5000.', 'error');
      setEvents([]);
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
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Kích thước ảnh không được vượt quá 5MB!', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEvent(prev => ({ ...prev, thumbnail: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (createStep === 2) {
      if (!newEvent.description.trim()) {
        showToast('Vui lòng nhập mô tả trong phần Giới thiệu sự kiện.', 'error');
        return;
      }
      if (normalizeLearningOutcomesForSave(newEvent.learningOutcomes).length === 0) {
        showToast('Vui lòng thêm ít nhất một mục trong “Bạn sẽ học được gì?”.', 'error');
        return;
      }
    }
    if (createStep < 4) {
      setCreateStep(s => s + 1);
      return;
    }

    try {
      if (!newEvent.startDate || !newEvent.startTime) {
        showToast('Vui lòng nhập ngày và giờ bắt đầu!', 'error');
        setCreateStep(3);
        return;
      }
      
      const startDateTime = new Date(`${newEvent.startDate}T${newEvent.startTime}:00`);
      let endDateTime = null;
      if (newEvent.endDate && newEvent.endTime) {
        endDateTime = new Date(`${newEvent.endDate}T${newEvent.endTime}:00`);
        if (endDateTime <= startDateTime) {
          showToast('Thời gian kết thúc phải sau thời gian bắt đầu!', 'error');
          setCreateStep(3);
          return;
        }
      }

      const body = {
        title: newEvent.title,
        description: newEvent.description || 'Chưa có mô tả',
        thumbnail: newEvent.thumbnail,
        speaker: newEvent.speaker,
        agenda: newEvent.agenda,
        learningOutcomes: normalizeLearningOutcomesForSave(newEvent.learningOutcomes),
        location: newEvent.location,
        capacity: parseInt(newEvent.maxSlots),
        category: newEvent.category || 'Workshop',
        startDate: startDateTime.toISOString(),
        endDate: endDateTime ? endDateTime.toISOString() : undefined,
        ticketPrice: newEvent.isPaid ? parseInt(newEvent.ticketPrice) || 0 : 0
      };

      const res = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: getEventHeaders(true),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đề xuất sự kiện đã được gửi duyệt!', 'success');
        setActiveNav('list');
        setCreateStep(1);
        setNewEvent({
          title: '',
          category: '',
          description: '',
          maxSlots: 100,
          location: 'Tầng 5 tòa Alpha',
          isPaid: false,
          thumbnail: '',
          startDate: '',
          startTime: '',
          endDate: '',
          endTime: '',
          speaker: '',
          agenda: '',
          ticketPrice: '',
          learningOutcomes: [...DEFAULT_LEARNING_OUTCOME_ROWS],
        });
        fetchMyEvents();
      } else {
        showToast(data.message || 'Tạo sự kiện thất bại!', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối server!', 'error');
    }
  };

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      persistClubSidebarOpen(next);
      return next;
    });
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    persistClubSidebarOpen(false);
  }, []);

  const handleNavSelect = useCallback((key) => {
    const item = CLUB_NAV_ITEMS.find((nav) => nav.key === key);
    if (item?.external) {
      navigate(item.external);
      return;
    }
    setActiveNav(key);
    if (key === 'create') setShowCreateModal(true);
    if (key === 'notifications') {
      const now = Date.now();
      setLastSeenNotifs(now);
      localStorage.setItem('clb_last_seen_notifs', now.toString());
    }
  }, [navigate]);

  const shellClass = `ctsv-app-shell club-app-shell${sidebarOpen ? ' sidebar-open' : ' sidebar-closed'}`;

  return (
    <div className={shellClass}>
      {!isClubDesktop() && sidebarOpen && (
        <button type="button" className="ctsv-drawer-backdrop" onClick={closeSidebar} aria-label="Đóng menu" />
      )}

      <ClubSidebarAside
        sidebarOpen={sidebarOpen}
        onClose={closeSidebar}
        userProfile={userProfile}
        activeNav={activeNav}
        onNavSelect={handleNavSelect}
        hasNewNotifs={hasNewNotifs}
      />

      <div className="ctsv-shell-main">
        <div className="clb-page">
          <SiteHeader
            activeNav="club-manage"
            onTogglePortalSidebar={toggleSidebar}
            portalSidebarOpen={sidebarOpen}
          />

          <main className="clb-main">
          {activeNav === 'profile' && (
            <ClubProfileUpdate
              showToast={showToast}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={toggleSidebar}
            />
          )}

          {activeNav === 'transfer-chairman' && (
            <div className="clb-transfer-chairman-page" style={{ width: '100%', maxWidth: '720px', margin: '0 auto' }}>
              <ClubChairmanTransfer showToast={showToast} onTransferred={() => navigate('/')} />
            </div>
          )}

          {activeNav === 'list' && (
            <>
              <div className="clb-page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button
                    className="clb-sidebar-toggle-btn"
                    onClick={() => setSidebarOpen(prev => !prev)}
                    title={sidebarOpen ? 'Đóng sidebar' : 'Mở sidebar'}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="clb-page-title">DANH SÁCH SỰ KIỆN QUẢN LÝ</h1>
                    <p className="clb-page-subtitle">Chào mừng trở lại, <strong>{userProfile.fullname || 'Manager'}</strong>. Bạn đang quản lý <strong>{events.length}</strong> sự kiện.</p>
                  </div>
                </div>
                <button className="clb-create-btn" onClick={() => { setActiveNav('create'); setCreateStep(1); }}>
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
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className={`clb-status-badge ${cls}`}><span className="clb-status-dot"></span>{label}</span>
                            </div>
                          </td>                          <td style={{ position: 'relative' }}>
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
            </>
          )}

          {activeNav === 'create' && (
            <div className="clb-create-view" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <button 
                  onClick={() => setActiveNav('list')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', marginRight: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%' }}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>
                </button>
                <div>
                  <h2 className="clb-modal-title" style={{ margin: 0 }}>TẠO ĐỀ XUẤT SỰ KIỆN MỚI</h2>
                  <p className="clb-modal-subtitle" style={{ margin: '4px 0 0 0' }}>Vui lòng điền đầy đủ thông tin để gửi xét duyệt tới Ban cán bộ IC-PDP.</p>
                </div>
              </div>

              <div className="clb-steps">
                {['THÔNG TIN CHUNG', 'NỘI DUNG', 'THỜI GIAN & ĐỊA ĐIỂM', 'GỬI DUYỆT'].map((step, i) => (
                  <div key={i} className={`clb-step ${createStep === i + 1 ? 'active' : createStep > i + 1 ? 'done' : ''}`}>
                    <div className="clb-step-circle">{createStep > i + 1 ? '✓' : i + 1}</div>
                    <span className="clb-step-label">{step}</span>
                    {i < 3 && <div className="clb-step-line"></div>}
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
                        <option value="Công nghệ">Công nghệ</option>
                        <option value="Thể thao">Thể thao</option>
                        <option value="Âm nhạc">Âm nhạc</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>
                  <div className="clb-form-row">
                    <div className="clb-form-group">
                      <label>Ảnh Banner (Thumbnail)</label>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="clb-input" style={{ padding: '7px' }} />
                      {newEvent.thumbnail && (
                        <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', height: '100px' }}>
                          <img src={newEvent.thumbnail} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>
                    <div className="clb-form-group">
                      <label>Diễn Giả / Khách Mời</label>
                      <input type="text" placeholder="Tên diễn giả..." value={newEvent.speaker} onChange={e => setNewEvent(p => ({ ...p, speaker: e.target.value }))} className="clb-input" />
                    </div>
                  </div>
                </div>
              )}
              {createStep === 2 && (
                <div className="clb-form-step clb-form-step--intro">
                  <EventIntroFields
                    description={newEvent.description}
                    learningOutcomes={newEvent.learningOutcomes || DEFAULT_LEARNING_OUTCOME_ROWS}
                    onDescriptionChange={(e) =>
                      setNewEvent((p) => ({ ...p, description: e.target.value }))
                    }
                    onLearningOutcomeChange={(index, value) =>
                      setNewEvent((p) => {
                        const rows = [...(p.learningOutcomes || DEFAULT_LEARNING_OUTCOME_ROWS)];
                        rows[index] = value;
                        return { ...p, learningOutcomes: rows };
                      })
                    }
                    onAddLearningOutcome={() =>
                      setNewEvent((p) => ({
                        ...p,
                        learningOutcomes: [...(p.learningOutcomes || DEFAULT_LEARNING_OUTCOME_ROWS), ''],
                      }))
                    }
                    onRemoveLearningOutcome={(index) =>
                      setNewEvent((p) => {
                        const rows = [...(p.learningOutcomes || DEFAULT_LEARNING_OUTCOME_ROWS)];
                        if (rows.length <= 1) return p;
                        rows.splice(index, 1);
                        return { ...p, learningOutcomes: rows };
                      })
                    }
                    descriptionRequired
                  />
                  <div className="clb-form-group">
                    <label>Chương trình dự kiến (Agenda)</label>
                    <textarea
                      placeholder="Lịch trình cụ thể của sự kiện..."
                      value={newEvent.agenda}
                      onChange={(e) => setNewEvent((p) => ({ ...p, agenda: e.target.value }))}
                      rows={4}
                      className="clb-input clb-textarea"
                    />
                  </div>
                </div>
              )}
              {createStep === 3 && (
                <div className="clb-form-step">
                  <div className="clb-form-row">
                    <div className="clb-form-group">
                      <label>Ngày Bắt Đầu <span className="clb-required">*</span></label>
                      <input type="date" value={newEvent.startDate} onChange={e => setNewEvent(p => ({ ...p, startDate: e.target.value }))} required className="clb-input" />
                    </div>
                    <div className="clb-form-group">
                      <label>Giờ Bắt Đầu <span className="clb-required">*</span></label>
                      <input type="time" value={newEvent.startTime} onChange={e => setNewEvent(p => ({ ...p, startTime: e.target.value }))} required className="clb-input" />
                    </div>
                  </div>
                  <div className="clb-form-row">
                    <div className="clb-form-group">
                      <label>Ngày Kết Thúc</label>
                      <input type="date" value={newEvent.endDate} onChange={e => setNewEvent(p => ({ ...p, endDate: e.target.value }))} className="clb-input" />
                    </div>
                    <div className="clb-form-group">
                      <label>Giờ Kết Thúc</label>
                      <input type="time" value={newEvent.endTime} onChange={e => setNewEvent(p => ({ ...p, endTime: e.target.value }))} className="clb-input" />
                    </div>
                  </div>
                  <div className="clb-form-row">
                    <div className="clb-form-group">
                      <label>Số lượng vé tối đa</label>
                      <input type="number" min="1" value={newEvent.maxSlots} onChange={e => setNewEvent(p => ({ ...p, maxSlots: e.target.value }))} className="clb-input" />
                    </div>
                    <div className="clb-form-group">
                      <label>Địa điểm tổ chức</label>
                      <select value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} className="clb-input">
                        <option>Tầng 5 tòa Alpha</option>
                        <option>Tầng 4 tòa Beta</option>
                        <option>Sảnh tòa Beta</option>
                        <option>Sảnh tòa Gamma</option>
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
                    {newEvent.isPaid && (
                      <div className="clb-form-row" style={{ marginTop: '12px' }}>
                        <div className="clb-form-group" style={{ marginBottom: 0 }}>
                          <label>Giá vé (VNĐ) <span className="clb-required">*</span></label>
                          <input type="number" min="1000" step="1000" placeholder="Vd: 50000" value={newEvent.ticketPrice} onChange={e => setNewEvent(p => ({ ...p, ticketPrice: e.target.value }))} required={newEvent.isPaid} className="clb-input" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {createStep === 4 && (
                <div className="clb-form-step">
                  <div className="clb-confirm-box">
                    <div className="clb-confirm-icon">📋</div>
                    <h3>Xác nhận gửi đề xuất</h3>
                    <p>Sự kiện sẽ được gửi tới Ban cán bộ IC-PDP. Thời gian duyệt 1-3 ngày làm việc.</p>
                    <div className="clb-confirm-details">
                      <div className="clb-confirm-row"><span>Tên sự kiện:</span><strong>{newEvent.title || 'Chưa nhập'}</strong></div>
                      <div className="clb-confirm-row"><span>Thể loại:</span><strong>{newEvent.category || 'Chưa chọn'}</strong></div>
                      <div className="clb-confirm-row"><span>Thời gian:</span><strong>{newEvent.startTime && newEvent.startDate ? `${newEvent.startTime} ${newEvent.startDate}` : 'Chưa nhập'}</strong></div>
                      <div className="clb-confirm-row"><span>Số slot:</span><strong>{newEvent.maxSlots}</strong></div>
                      <div className="clb-confirm-row"><span>Địa điểm:</span><strong>{newEvent.location}</strong></div>
                      <div className="clb-confirm-row"><span>Có phí:</span><strong>{newEvent.isPaid ? `${Number(newEvent.ticketPrice || 0).toLocaleString('vi-VN')} VNĐ` : 'Miễn phí'}</strong></div>
                    </div>
                  </div>
                </div>
              )}
              <div className="clb-modal-actions">
                {createStep > 1 && <button type="button" className="clb-btn-secondary" onClick={() => setCreateStep(s => s - 1)}>Quay lại</button>}
                {createStep < 4 && <button type="button" className="clb-btn-secondary" onClick={() => { setActiveNav('list'); showToast('Đã lưu bản nháp!', 'info'); }}>Lưu bản nháp</button>}
                <button type="submit" className="clb-btn-primary">{createStep === 4 ? 'Gửi duyệt' : 'Tiếp tục Bước ' + (createStep + 1)}</button>
              </div>
            </form>
          </div>
          )}

          {activeNav === 'notifications' && (
            <div className="clb-notifications-view" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 className="clb-modal-title" style={{ margin: 0 }}>THÔNG BÁO XÉT DUYỆT</h2>
                <p className="clb-modal-subtitle" style={{ margin: '4px 0 0 0' }}>Trạng thái phê duyệt các sự kiện của câu lạc bộ.</p>
              </div>

              <div className="clb-notifications-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {eventNotifications.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0' }}>Chưa có thông báo nào.</p>
                ) : (
                  eventNotifications.map(notif => (
                    <div key={notif.id} style={{ display: 'flex', gap: '16px', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', transition: 'background 0.2s' }}>
                      <div style={{ flexShrink: 0, marginTop: '2px' }}>
                        {notif.tone === 'success' && <svg viewBox="0 0 24 24" width="28" height="28" fill="#22c55e"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>}
                        {notif.tone === 'alert' && <svg viewBox="0 0 24 24" width="28" height="28" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>}
                        {notif.tone === 'warning' && <svg viewBox="0 0 24 24" width="28" height="28" fill="#f59e0b"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>}
                        {notif.tone === 'info' && <svg viewBox="0 0 24 24" width="28" height="28" fill="#3b82f6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#1e293b', fontWeight: notif.unread ? '700' : '600' }}>{notif.title}</h4>
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#475569', lineHeight: '1.5' }}>{notif.body}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                            {notif.time}
                          </span>
                          {notif.tone === 'alert' && (
                            <button
                              style={{ background: 'none', border: 'none', padding: 0, color: '#ef4444', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => setRejectModalData({ title: notif.title, reason: notif.reason })}
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                              Xem lý do chi tiết
                            </button>
                          )}
                        </div>
                      </div>
                      {notif.unread && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f26f21', alignSelf: 'center' }}></div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* REJECT FEEDBACK MODAL */}
          {rejectModalData && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
            }} onClick={() => setRejectModalData(null)}>
              <div style={{
                background: '#fff', borderRadius: '12px', padding: '24px',
                width: '100%', maxWidth: '480px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
              }} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  Phản hồi từ Ban cán bộ
                </h3>
                <div style={{ background: '#ffffff', border: '1px solid #fca5a5', padding: '16px', borderRadius: '8px', color: '#991b1b', lineHeight: '1.5', fontSize: '0.95rem', marginTop: '16px' }}>
                  {rejectModalData.reason}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button className="clb-btn-primary" onClick={() => setRejectModalData(null)}>Đóng</button>
                </div>
              </div>
            </div>
          )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ClubManagement;
