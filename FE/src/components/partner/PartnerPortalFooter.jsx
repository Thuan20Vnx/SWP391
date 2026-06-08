import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';

const PartnerPortalFooter = () => {
  const navigate = useNavigate();

  return (
    <footer className="home-footer ctsv-portal-footer partner-portal-footer">
      <div className="footer-top-columns">
        <div className="footer-branding-col">
          <Link to="/partner" className="footer-logo-link">
            <img src={FE_LOGO} alt={FE_LOGO_ALT} className="footer-logo-img" />
          </Link>
          <p className="footer-brand-desc">
            Nền tảng quản lý sự kiện chuyên nghiệp dành riêng cho hệ sinh thái FPT — kết nối doanh nghiệp với sinh viên tài năng.
          </p>
        </div>
        <div className="footer-links-col">
          <h4>Khám phá</h4>
          <ul className="footer-links-list">
            <li>
              <a href="/events" onClick={(e) => { e.preventDefault(); navigate('/events'); }}>
                Sự kiện sắp tới
              </a>
            </li>
            <li>
              <a href="/partner/events" onClick={(e) => { e.preventDefault(); navigate('/partner/events'); }}>
                Quản lý sự kiện
              </a>
            </li>
            <li>
              <a href="/partner/contracts" onClick={(e) => { e.preventDefault(); navigate('/partner/contracts'); }}>
                Hợp đồng &amp; Thanh toán
              </a>
            </li>
          </ul>
        </div>
        <div className="footer-links-col">
          <h4>Hỗ trợ</h4>
          <ul className="footer-links-list">
            <li>
              <a href="/support" onClick={(e) => { e.preventDefault(); navigate('/support'); }}>
                Hướng dẫn đối tác
              </a>
            </li>
            <li>
              <a href="/contact" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>
                Liên hệ chúng tôi
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom-row">
        <p className="copyright-text">© 2026 FPT Event Platform — Partner Portal</p>
      </div>
    </footer>
  );
};

export default PartnerPortalFooter;
