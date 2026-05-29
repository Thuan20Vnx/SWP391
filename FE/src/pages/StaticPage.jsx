import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fptLogo from '../assets/fpt_logo.png';

const STATIC_PAGES = {
  terms: {
    title: 'Điều khoản sử dụng nền tảng',
    updated: '24/05/2026',
    sections: [
      {
        heading: '1. Phạm vi áp dụng',
        body: 'Điều khoản này điều chỉnh việc sử dụng nền tảng F-Events dành cho sinh viên, cán bộ và khách mời của FPT University.',
      },
      {
        heading: '2. Tài khoản người dùng',
        body: 'Người dùng chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động phát sinh từ tài khoản của mình.',
      },
      {
        heading: '3. Đăng ký sự kiện',
        body: 'Việc đăng ký sự kiện không đồng nghĩa với việc được tham dự nếu sự kiện đã hết chỗ hoặc không đáp ứng điều kiện tham gia.',
      },
      {
        heading: '4. Quyền sở hữu trí tuệ',
        body: 'Toàn bộ nội dung, thương hiệu và giao diện thuộc quyền sở hữu của FPT University và các đối tác được ủy quyền.',
      },
    ],
  },
  privacy: {
    title: 'Chính sách bảo mật',
    updated: '24/05/2026',
    sections: [
      {
        heading: '1. Dữ liệu thu thập',
        body: 'Chúng tôi thu thập thông tin cá nhân cần thiết như họ tên, email, mã sinh viên và lịch sử tham gia sự kiện.',
      },
      {
        heading: '2. Mục đích sử dụng',
        body: 'Dữ liệu được dùng để xác thực tài khoản, quản lý đăng ký sự kiện, gửi thông báo và cải thiện trải nghiệm người dùng.',
      },
      {
        heading: '3. Bảo vệ dữ liệu',
        body: 'F-Events áp dụng mã hóa truyền tải, phân quyền truy cập và sao lưu định kỳ để bảo vệ dữ liệu người dùng.',
      },
      {
        heading: '4. Quyền của người dùng',
        body: 'Bạn có thể yêu cầu cập nhật hoặc xóa dữ liệu cá nhân thông qua Phòng CTSV hoặc trung tâm hỗ trợ.',
      },
    ],
  },
  support: {
    title: 'Trung tâm hỗ trợ',
    updated: '24/05/2026',
    sections: [
      {
        heading: 'Câu hỏi thường gặp',
        body: 'Xem hướng dẫn đăng ký sự kiện, quét QR check-in, đồng bộ lịch trình và khôi phục mật khẩu.',
      },
      {
        heading: 'Báo lỗi hệ thống',
        body: 'Gửi mô tả lỗi kèm ảnh chụp màn hình qua email hỗ trợ để đội ngũ kỹ thuật xử lý nhanh hơn.',
      },
      {
        heading: 'Thời gian phản hồi',
        body: 'Chúng tôi phản hồi trong vòng 24 giờ làm việc đối với các yêu cầu hỗ trợ thông thường.',
      },
    ],
  },
  contact: {
    title: 'Liên hệ chúng tôi',
    updated: '24/05/2026',
    sections: [
      {
        heading: 'Phòng Công tác Sinh viên',
        body: 'Email: ctsv@fpt.edu.vn · Hotline: 0236 3 757 757 · Campus FPT University Da Nang.',
      },
      {
        heading: 'Hỗ trợ kỹ thuật F-Events',
        body: 'Email: fevents-support@fpt.edu.vn · Thời gian: 8:00 – 17:30, Thứ 2 – Thứ 6.',
      },
      {
        heading: 'Địa chỉ',
        body: 'FPT University Da Nang, Khu đô thị FPT, Ngũ Hành Sơn, Đà Nẵng.',
      },
    ],
  },
};

const StaticPage = ({ pageKey }) => {
  const navigate = useNavigate();
  const page = STATIC_PAGES[pageKey];

  if (!page) return null;

  return (
    <div className="static-page">
      <header className="home-header static-page__header">
        <div className="header-container">
          <button type="button" className="auth-page-back" onClick={() => navigate(-1)}>
            ← Quay lại
          </button>
          <div className="header-logo" onClick={() => navigate('/')}>
            <img src={fptLogo} alt="F Events Logo" className="logo-img" />
          </div>
          <nav className="header-nav">
            <Link to="/" className="nav-link">Trang chủ</Link>
            <Link to="/support" className="nav-link">Hỗ trợ</Link>
          </nav>
        </div>
      </header>

      <main className="static-page__main">
        <div className="static-page__hero">
          <h1>{page.title}</h1>
          <p>Cập nhật lần cuối: {page.updated}</p>
          <span className="student-badge student-badge--primary">Hiệu lực</span>
        </div>
        <div className="static-page__content">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StaticPage;
