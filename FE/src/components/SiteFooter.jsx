import React from 'react';
import { Link } from 'react-router-dom';
import fptLogo from '../assets/fpt_logo.png';

const SiteFooter = () => (
  <footer className="home-footer">
    <div className="footer-top-columns">
      <div className="footer-branding-col">
        <img src={fptLogo} alt="F Events" className="footer-logo-img" />
        <p className="footer-brand-desc">
          FPT Event Platform - Nền tảng kết nối, kiến tạo và lan tỏa sức trẻ thông qua những sự kiện, hoạt động ngoại khóa dành riêng cho sinh viên FPT.
        </p>
      </div>

      <div className="footer-links-col">
        <h4>Khám phá</h4>
        <ul className="footer-links-list">
          <li><Link to="/events">Sự kiện sắp tới</Link></li>
          <li><Link to="/clubs">Câu lạc bộ</Link></li>
          <li><a href="#" onClick={(e) => e.preventDefault()}>Địa điểm</a></li>
          <li><a href="#" onClick={(e) => e.preventDefault()}>Thành viên</a></li>
        </ul>
      </div>

      <div className="footer-links-col">
        <h4>Hỗ trợ</h4>
        <ul className="footer-links-list">
          <li><a href="#" onClick={(e) => e.preventDefault()}>Trung tâm trợ giúp</a></li>
          <li><a href="#" onClick={(e) => e.preventDefault()}>Hướng dẫn đăng ký</a></li>
          <li><a href="#" onClick={(e) => e.preventDefault()}>Liên hệ ban tổ chức</a></li>
          <li><a href="#" onClick={(e) => e.preventDefault()}>Báo cáo sự cố</a></li>
        </ul>
      </div>

      <div className="footer-social-col">
        <h4>Kết nối xã hội</h4>
        <div className="social-icon-row">
          <a href="#" className="social-icon-box" aria-label="Facebook" onClick={(e) => e.preventDefault()}>
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" fill="currentColor" />
            </svg>
          </a>
          <a href="#" className="social-icon-box" aria-label="Instagram" onClick={(e) => e.preventDefault()}>
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" fill="currentColor" />
            </svg>
          </a>
          <a href="#" className="social-icon-box" aria-label="Twitter/X" onClick={(e) => e.preventDefault()}>
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor" />
            </svg>
          </a>
        </div>
      </div>
    </div>

    <div className="footer-bottom-row">
      <p className="copyright-text">© 2026 FPT Event Platform. All rights reserved.</p>
      <div className="footer-policy-links">
        <a href="#" onClick={(e) => e.preventDefault()}>Bảo mật</a>
        <a href="#" onClick={(e) => e.preventDefault()}>Cookie Policy</a>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
