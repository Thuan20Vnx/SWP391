import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';

const IcpdpPortalFooter = () => {
  const navigate = useNavigate();

  return (
    <footer className="home-footer ctsv-portal-footer icpdp-portal-footer">
      <div className="footer-top-columns">
        <div className="footer-branding-col">
          <Link to="/icpdp" className="footer-logo-link">
            <img src={FE_LOGO} alt={FE_LOGO_ALT} className="footer-logo-img" />
          </Link>
          <p className="footer-brand-desc">
            Cổng quản trị F-Events dành cho ban IC-PDP — duyệt đề xuất CLB, giám sát hoạt động và nghiệm thu báo cáo.
          </p>
        </div>
        <div className="footer-links-col">
          <h4>Quản lý CLB</h4>
          <ul className="footer-links-list">
            <li>
              <a href="/icpdp/proposals" onClick={(e) => { e.preventDefault(); navigate('/icpdp/proposals'); }}>
                Duyệt đề xuất CLB
              </a>
            </li>
            <li>
              <a href="/icpdp/events" onClick={(e) => { e.preventDefault(); navigate('/icpdp/events'); }}>
                Xem sự kiện
              </a>
            </li>
            <li>
              <a href="/icpdp/reports" onClick={(e) => { e.preventDefault(); navigate('/icpdp/reports'); }}>
                Báo cáo sau sự kiện
              </a>
            </li>
          </ul>
        </div>
        <div className="footer-links-col">
          <h4>Hỗ trợ</h4>
          <ul className="footer-links-list">
            <li>
              <a href="/contact" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>
                Liên hệ ban IC-PDP
              </a>
            </li>
            <li>
              <a href="/support" onClick={(e) => { e.preventDefault(); navigate('/support'); }}>
                Hướng dẫn hệ thống
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom-row">
        <p className="copyright-text">© 2026 FPT Event Platform — IC-PDP Portal</p>
      </div>
    </footer>
  );
};

export default IcpdpPortalFooter;
