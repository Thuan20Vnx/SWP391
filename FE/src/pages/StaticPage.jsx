import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fptLogo from '../assets/fpt_logo.png';
import SiteFooter from '../components/SiteFooter';

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
      {
        id: 'report',
        heading: 'Báo cáo sự cố',
        body:
          'Gửi email tới fevents-support@fpt.edu.vn kèm mô tả lỗi, thời gian xảy ra và ảnh chụp màn hình (nếu có). Đội kỹ thuật phản hồi trong 24 giờ làm việc.',
      },
    ],
  },
  guide: {
    title: 'Hướng dẫn đăng ký sự kiện',
    updated: '04/06/2026',
    sections: [
      {
        heading: '1. Tạo tài khoản',
        body: 'Sinh viên FPT dùng email @fpt.edu.vn; khách có thể đăng ký tài khoản guest tại trang Đăng ký.',
      },
      {
        heading: '2. Tìm sự kiện',
        body: 'Vào mục Sự kiện hoặc Trang chủ, lọc theo chủ đề, đơn vị tổ chức và trạng thái đang mở đăng ký.',
      },
      {
        heading: '3. Đăng ký tham gia',
        body: 'Chọn sự kiện → Xem chi tiết → bấm Đăng ký ngay. Hệ thống xác nhận khi còn chỗ trống.',
      },
      {
        heading: '4. Quản lý vé & lịch',
        body: 'Xem sự kiện đã đăng ký tại mục Sự kiện của tôi trong Hồ sơ. Nhận thông báo qua email và chuông thông báo.',
      },
      {
        heading: '5. Check-in tại sự kiện',
        body: 'Xuất trình mã QR (khi có) tại quầy check-in. Liên hệ CTSV nếu cần hủy đăng ký trước giờ diễn ra.',
      },
    ],
  },
  cookies: {
    title: 'Chính sách Cookie',
    updated: '04/06/2026',
    sections: [
      {
        heading: '1. Cookie là gì?',
        body: 'Cookie là tệp nhỏ lưu trên trình duyệt giúp ghi nhớ phiên đăng nhập và tùy chọn hiển thị.',
      },
      {
        heading: '2. Cookie chúng tôi dùng',
        body: 'Cookie phiên (bắt buộc), cookie ghi nhớ đăng nhập và cookie phân tích lượt truy cập ẩn danh.',
      },
      {
        heading: '3. Quản lý cookie',
        body: 'Bạn có thể xóa cookie trong cài đặt trình duyệt; một số tính năng (đăng nhập) có thể không hoạt động.',
      },
      {
        heading: '4. Liên hệ',
        body: 'Mọi thắc mắc gửi về fevents-support@fpt.edu.vn hoặc xem Chính sách bảo mật.',
      },
    ],
  },
};

const StaticPage = ({ pageKey }) => {
  const navigate = useNavigate();
  const page = STATIC_PAGES[pageKey];

  if (!page) return null;

  return (
    <div className="static-page home-layout">
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
            <section key={section.heading} id={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default StaticPage;
