import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';

const CtsvPortalFooter = () => {
  const navigate = useNavigate();

  return (
    <footer className="home-footer ctsv-portal-footer">
      <div className="footer-top-columns">
        <div className="footer-branding-col">
          <img src={FE_LOGO} alt={FE_LOGO_ALT} className="footer-logo-img" />
          <p className="footer-brand-desc">
            Cổng quản trị F-Events dành cho Ban Công tác sinh viên — phê duyệt, điều phối và báo cáo sự kiện toàn trường.
          </p>
        </div>
        <div className="footer-links-col">
          <h4>Quản lý</h4>
          <ul className="footer-links-list">
            <li>
              <a href="/ctsv/proposals" onClick={(e) => { e.preventDefault(); navigate('/ctsv/proposals'); }}>
                Phê duyệt đề xuất
              </a>
            </li>
            <li>
              <a href="/ctsv/events/create" onClick={(e) => { e.preventDefault(); navigate('/ctsv/events/create'); }}>
                Sự kiện cấp trường
              </a>
            </li>
            <li>
              <a href="/ctsv/partners" onClick={(e) => { e.preventDefault(); navigate('/ctsv/partners'); }}>
                Đối tác
              </a>
            </li>
          </ul>
        </div>
        <div className="footer-links-col">
          <h4>Hỗ trợ</h4>
          <ul className="footer-links-list">
            <li>
              <a href="/contact" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>
                Liên hệ phòng CTSV
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
        <p className="copyright-text">© 2026 FPT Event Platform — CTSV Portal</p>
      </div>
    </footer>
  );
};

export default CtsvPortalFooter;
