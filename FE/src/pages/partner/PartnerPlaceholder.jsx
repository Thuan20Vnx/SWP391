import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import PortalDashHero from '../../components/portal/PortalDashHero';

const PLACEHOLDER_META = {
  events: {
    eyebrow: 'Quản lý sự kiện',
    desc: 'Theo dõi và quản lý các sự kiện do doanh nghiệp bạn tài trợ hoặc đồng tổ chức.',
    cta: { label: 'Về trang chủ', to: '/partner' }
  },
  contracts: {
    eyebrow: 'Hợp đồng tài trợ',
    desc: 'Xem và quản lý hợp đồng tài trợ, thanh toán và lịch sử giao dịch với FPT University.',
    cta: { label: 'Xem dashboard', to: '/partner/dashboard' }
  },
  analytics: {
    eyebrow: 'Phân tích báo cáo',
    desc: 'Báo cáo hiệu suất sự kiện, tỷ lệ check-in, ROI tài trợ và đánh giá từ sinh viên.',
    cta: { label: 'Về dashboard', to: '/partner/dashboard' }
  },
  'proposals/create': {
    eyebrow: 'Tạo đề xuất mới',
    desc: 'Gửi đề xuất tài trợ hoặc đồng tổ chức sự kiện. CTSV sẽ xem xét và phản hồi trong 3–5 ngày làm việc.',
    cta: { label: 'Quay lại dashboard', to: '/partner/dashboard' }
  }
};

const PartnerPlaceholder = ({ pageKey = 'events' }) => {
  const { userProfile } = useOutletContext() || {};
  const meta = PLACEHOLDER_META[pageKey] || {
    eyebrow: 'Đang phát triển',
    desc: 'Tính năng này sẽ sớm được cập nhật.',
    cta: { label: 'Về trang chủ', to: '/partner' }
  };

  return (
    <div className="ctsv-dashboard">
      <PortalDashHero
        fullname={userProfile?.fullname}
        eyebrow={meta.eyebrow}
        description={meta.desc}
        actions={
          <>
            <Link to={meta.cta.to} className="ctsv-dash-btn ctsv-dash-btn--primary">
              {meta.cta.label}
            </Link>
            <Link to="/partner/profile" className="ctsv-dash-btn ctsv-dash-btn--ghost">
              Hồ sơ & Cài đặt
            </Link>
          </>
        }
      />

      <div className="ctsv-dash-empty" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ color: '#64748b', marginBottom: '8px' }}>
          Màn hình chi tiết đang được xây dựng. Bạn có thể sử dụng Dashboard và Hồ sơ & Cài đặt trong lúc chờ.
        </p>
      </div>
    </div>
  );
};

export default PartnerPlaceholder;
