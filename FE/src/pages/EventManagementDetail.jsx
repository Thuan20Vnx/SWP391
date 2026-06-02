import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_BASE, getEventHeaders } from '../utils/api';
import SiteHeader from '../components/SiteHeader';
import './EventManagementDetail.css';


const EventManagementDetail = ({ showToast }) => {
  const { id } = useParams();
  
  const [activeTab, setActiveTab] = useState('danh-sach');
  const [searchQuery, setSearchQuery] = useState('');
  const [eventData, setEventData] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/events/${id}`, { headers: getEventHeaders(false) });
        const data = await res.json();
        if (data.success && data.event) {
          setEventData(data.event);
          setStudents(data.students || []);
        } else {
          showToast(data.message || 'Không thể lấy thông tin sự kiện', 'error');
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
        showToast('Lỗi khi lấy thông tin sự kiện', 'error');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchEventData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  
  return (
    <div className="event-detail-page">
      <SiteHeader activeNav="club-manage" />

      <main className="ev-detail-main">
        {/* Breadcrumbs */}
        <div className="ev-breadcrumbs">
          <Link to="/quan-ly-clb">Quản lý CLB</Link>
          <span className="ev-bc-separator">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>
          </span>
          <Link to="/quan-ly-clb">Sự kiện</Link>
          <span className="ev-bc-separator">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>
          </span>
          <span className="ev-bc-current">Chi tiết quản lý</span>
        </div>

        {/* Page Header */}
        <div className="ev-header-block">
          <div className="ev-header-left">
            <div className="ev-title-row">
              <h1 className="ev-title">QUẢN LÝ SỰ KIỆN: {eventData ? eventData.title.toUpperCase() : 'ĐANG TẢI...'}</h1>
              <span className="ev-status-badge">{eventData?.status === 'approved' ? 'Đã duyệt' : eventData?.status === 'pending' ? 'Chờ duyệt' : 'Đang chạy'}</span>
            </div>
            <p className="ev-subtitle">
              Mã sự kiện: EVT-{eventData ? eventData._id.substring(eventData._id.length - 6).toUpperCase() : '...'} | 
              Ngày tạo: {eventData ? new Date(eventData.createdAt || eventData.startDate).toLocaleDateString('vi-VN') : '...'}
            </p>
          </div>
          <div className="ev-header-actions">
            <button className="ev-btn-outline" onClick={() => showToast('Chỉnh sửa thông tin!', 'info')}>Chỉnh sửa thông tin</button>
            <button className="ev-btn-outline" onClick={() => showToast('Đang tải xuống!', 'info')}>Tải danh sách SV (Excel)</button>
            <button className="ev-btn-primary" onClick={() => showToast('Tạo QR thành công!', 'success')}>
              Tạo QR Điểm Danh AI
              <svg viewBox="0 0 24 24" width="18" height="18" style={{marginLeft: '8px'}}><path d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13-2h3v2h-3zm-5 0h3v2h-3zm3 3h3v2h-3zm-3 3h3v2h-3zm3 3h3v2h-3zm-5-3h3v2h-3z" fill="currentColor"/></svg>
            </button>
          </div>
        </div>

        {/* Bento Grid Stats */}
        <div className="ev-bento-grid">
          <div className="ev-bento-card">
            <div className="ev-bento-card-header">
              <h3>LƯỢT ĐĂNG KÝ VÉ</h3>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#f26f21"><path d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2-1.46V6H4v2.54A3.996 3.996 0 0 0 4 15.46V18h16v-2.54A3.996 3.996 0 0 0 20 8.54zM11 15h2v2h-2zm0-4h2v2h-2zm0-4h2v2h-2z" /></svg>
            </div>
            <div className="ev-bento-value">
              <span className="ev-bento-num">{eventData?.registeredCount || 0}</span> <span className="ev-bento-total">/ {eventData ? eventData.capacity : '...'}</span>
            </div>
            <div className="ev-bento-progress-bar">
              <div className="ev-bento-progress-fill" style={{ width: '90%' }}></div>
            </div>
            <p className="ev-bento-desc">Đạt 90% mục tiêu</p>
          </div>

          <div className="ev-bento-card">
            <div className="ev-bento-card-header">
              <h3>ĐÃ CHECK-IN</h3>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#334155"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM10.47 14.86l-2.12-2.12a.996.996 0 1 0-1.41 1.41l2.83 2.83c.39.39 1.02.39 1.41 0l5.66-5.66a.996.996 0 0 0-1.41-1.41l-4.96 4.95z"/></svg>
            </div>
            <div className="ev-bento-value">
              <span className="ev-bento-num">{eventData?.checkinCount || 0}</span> <span className="ev-bento-total">/ {eventData?.registeredCount || 0} sinh viên</span>
            </div>
            <div className="ev-bento-progress-bar">
              <div className="ev-bento-progress-fill" style={{ width: '71%', background: '#334155' }}></div>
            </div>
            <p className="ev-bento-desc">Cập nhật: 2 phút trước</p>
          </div>

          <div className="ev-bento-card">
            <div className="ev-bento-card-header">
              <h3>ĐÁNH GIÁ</h3>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#eab308"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            </div>
            <div className="ev-bento-value">
              <span className="ev-bento-num">{eventData?.rating || '0.0'}</span> 
              <span className="ev-bento-stars">
                {[1,2,3,4].map(s => <svg key={s} viewBox="0 0 24 24" width="16" height="16" fill="#eab308"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>)}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#eab308"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4V6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>
              </span>
            </div>
            <p className="ev-bento-desc" style={{marginTop: '24px'}}>Từ {eventData?.ratingCount || 0} lượt phản hồi</p>
          </div>

          <div className="ev-bento-card">
            <div className="ev-bento-card-header">
              <h3>LƯỢT TIẾP CẬN</h3>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#334155"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
            </div>
            <div className="ev-bento-value">
              <span className="ev-bento-num">{eventData?.reach || 0}</span>
            </div>
            <p className="ev-bento-desc" style={{marginTop: '24px', display: 'flex', alignItems: 'center', gap: '4px'}}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#22c55e"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg>
              <span style={{color: '#22c55e', fontWeight: '500'}}>12%</span> so với tuần trước
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="ev-tabs-container">
          <button className={`ev-tab ${activeTab === 'tong-quan' ? 'active' : ''}`} onClick={() => setActiveTab('tong-quan')}>Tổng quan sự kiện</button>
          <button className={`ev-tab ${activeTab === 'danh-sach' ? 'active' : ''}`} onClick={() => setActiveTab('danh-sach')}>Danh sách Sinh viên</button>
          <button className={`ev-tab ${activeTab === 'huy-ve' ? 'active' : ''}`} onClick={() => setActiveTab('huy-ve')}>Yêu cầu hủy vé</button>
          <button className={`ev-tab ${activeTab === 'bao-cao' ? 'active' : ''}`} onClick={() => setActiveTab('bao-cao')}>Báo cáo & Minh chứng</button>
        </div>

        {/* Tab Content */}
        <div className="ev-tab-content">
          {activeTab === 'danh-sach' && (
            <div className="ev-table-card">
              <div className="ev-table-toolbar">
                <div className="ev-search-box">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="#94a3b8"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                  <input 
                    type="text" 
                    placeholder="Tìm MSSV, Tên..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="ev-table-actions">
                  <button className="ev-icon-btn"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button>
                  <button className="ev-icon-btn"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg></button>
                </div>
              </div>

              <div className="ev-table-wrapper">
                <table className="ev-table">
                  <thead>
                    <tr>
                      <th>MSSV</th>
                      <th>HỌ VÀ TÊN</th>
                      <th>THỜI GIAN ĐK</th>
                      <th>TRẠNG THÁI VÉ</th>
                      <th>HÀNH ĐỘNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{textAlign: 'center', padding: '32px', color: '#94a3b8'}}>Chưa có sinh viên nào đăng ký</td>
                      </tr>
                    ) : students.map(st => {
                      const mssv = st.student?.studentId || 'N/A';
                      const name = st.student?.fullname || 'Unknown';
                      const time = new Date(st.createdAt).toLocaleString('vi-VN');
                      const avatarCode = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      const statusDisplay = st.status === 'checked-in' ? 'Đã check-in' : st.status === 'registered' ? 'Chưa check-in' : 'Đã hủy';
                      return (
                        <tr key={st._id}>
                          <td style={{fontWeight: '500', color: '#334155'}}>{mssv}</td>
                          <td>
                            <div className="ev-st-name-cell">
                              <div className="ev-st-avatar" style={{backgroundColor: '#e2e8f0', color: '#64748b'}}>{avatarCode}</div>
                              {name}
                            </div>
                          </td>
                          <td style={{color: '#64748b'}}>{time}</td>
                          <td>
                            {st.status === 'checked-in' ? (
                              <span style={{color: '#334155'}}>{statusDisplay}</span>
                            ) : (
                              <span style={{color: '#eab308', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <span style={{width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#eab308'}}></span>
                                {statusDisplay}
                              </span>
                            )}
                          </td>
                          <td>
                            <button className="ev-action-link" onClick={() => showToast(`Xem chi tiết SV: ${name}`, 'info')}>Chi tiết</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="ev-pagination">
                <span className="ev-page-info">Hiển thị {students.length === 0 ? 0 : 1} - {students.length} trong số {students.length} sinh viên</span>
                <div className="ev-page-controls">
                  <button className="ev-page-btn" disabled>&lt;</button>
                  <button className="ev-page-btn active">1</button>
                  <button className="ev-page-btn">2</button>
                  <button className="ev-page-btn">&gt;</button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab !== 'danh-sach' && (
            <div className="ev-empty-tab">
              <p>Nội dung đang được cập nhật cho phần <strong>{activeTab}</strong></p>
            </div>
          )}
        </div>
      </main>

      {/* Reusing Home Footer minimal elements */}
      <footer className="ev-detail-footer">
        <div className="ev-footer-content">
          <p>© 2026 FPT Event Platform - All Rights Reserved.</p>
          <p>Hotline: 024.1234.5678 | Email: contact@fevents.com</p>
        </div>
      </footer>
    </div>
  );
};

export default EventManagementDetail;
