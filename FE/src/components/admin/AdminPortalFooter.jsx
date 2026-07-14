import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';

const AdminPortalFooter = () => {
  const navigate = useNavigate();
  const go = (path) => (e) => {
    e.preventDefault();
    navigate(path);
  };

  return (
    <footer className="home-footer ctsv-portal-footer admin-portal-footer">
      <div className="footer-top-columns">
        <div className="footer-branding-col">
          <Link to="/admin" className="footer-logo-link">
            <img src={FE_LOGO} alt={FE_LOGO_ALT} className="footer-logo-img" />
          </Link>
          <p className="footer-brand-desc">
            Bảng điều khiển quản trị F-Events — quản lý tài khoản, sự kiện toàn trường, đối tác và giám sát
            vận hành hệ thống.
          </p>
        </div>
        <div className="footer-links-col">
          <h4>Quản trị</h4>
          <ul className="footer-links-list">
            <li><a href="/admin" onClick={go('/admin')}>Bảng điều khiển</a></li>
            <li><a href="/admin/accounts" onClick={go('/admin/accounts')}>Quản lý tài khoản</a></li>
            <li><a href="/admin/events/approved" onClick={go('/admin/events/approved')}>Sự kiện toàn trường</a></li>
            <li><a href="/admin/analytics" onClick={go('/admin/analytics')}>Thống kê &amp; báo cáo</a></li>
          </ul>
        </div>
        <div className="footer-links-col">
          <h4>Xét duyệt</h4>
          <ul className="footer-links-list">
            <li><a href="/admin/events" onClick={go('/admin/events')}>Duyệt đề xuất sự kiện</a></li>
            <li><a href="/admin/partners" onClick={go('/admin/partners')}>Đối tác doanh nghiệp</a></li>
            <li><a href="/admin/partner-settlements" onClick={go('/admin/partner-settlements')}>Tất toán đối tác</a></li>
            <li><a href="/admin/icpdp/club-registrations" onClick={go('/admin/icpdp/club-registrations')}>Đăng ký CLB</a></li>
          </ul>
        </div>
        <div className="footer-links-col">
          <h4>Hệ thống</h4>
          <ul className="footer-links-list">
            <li><a href="/admin/system" onClick={go('/admin/system')}>Cấu hình &amp; bảo trì</a></li>
            <li><a href="/admin/semester-timelines" onClick={go('/admin/semester-timelines')}>Timeline học kỳ</a></li>
            <li><a href="/admin/profile" onClick={go('/admin/profile')}>Hồ sơ quản trị viên</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom-row">
        <p className="copyright-text">© {new Date().getFullYear()} FPT Event Platform — Admin Console</p>
      </div>
    </footer>
  );
};

export default AdminPortalFooter;
