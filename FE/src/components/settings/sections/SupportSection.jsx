import { useNavigate } from 'react-router-dom';
import SettingsRow from '../SettingsRow';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';
import { normalizeSettingsRole } from '../settingsRoleConfig';

const SUPPORT_LINKS = {
  student: [
    { label: 'Trung tâm hỗ trợ', description: 'Hướng dẫn sử dụng và câu hỏi thường gặp', path: '/support' },
    { label: 'Báo lỗi & góp ý', description: 'Gửi phản hồi để cải thiện nền tảng', path: '/contact' },
    { label: 'Liên hệ quản trị viên', description: 'Trao đổi trực tiếp với đội vận hành', path: '/contact' },
  ],
  club_manager: [
    { label: 'Hướng dẫn quản lý CLB', description: 'Tạo sự kiện, duyệt thành viên và báo cáo', path: '/support' },
    { label: 'Quản lý CLB', description: 'Mở portal quản lý câu lạc bộ', path: '/quan-ly-clb' },
    { label: 'Liên hệ IC-PDP / CTSV', description: 'Hỗ trợ duyệt sự kiện và hoạt động CLB', path: '/contact' },
  ],
  ctsv: [
    { label: 'Trung tâm hỗ trợ CTSV', description: 'Quy trình duyệt sự kiện và đối tác', path: '/support' },
    { label: 'Portal CTSV', description: 'Quay lại bảng điều khiển CTSV', path: '/ctsv/dashboard' },
    { label: 'Liên hệ Admin', description: 'Escalate yêu cầu cần quyền Admin', path: '/contact' },
  ],
  icpdp: [
    { label: 'Trung tâm hỗ trợ IC-PDP', description: 'Duyệt đề xuất CLB và sự kiện', path: '/support' },
    { label: 'Portal IC-PDP', description: 'Quay lại bảng điều khiển IC-PDP', path: '/icpdp/dashboard' },
    { label: 'Liên hệ Admin', description: 'Hỗ trợ khi cần phê duyệt cấp Admin', path: '/contact' },
  ],
  partner: [
    { label: 'Hỗ trợ đối tác', description: 'Hướng dẫn đề xuất sự kiện và hợp đồng', path: '/support' },
    { label: 'Portal đối tác', description: 'Quay lại bảng điều khiển đối tác', path: '/partner/dashboard' },
    { label: 'Liên hệ CTSV', description: 'Trao đổi về duyệt đề xuất và hợp đồng', path: '/contact' },
  ],
  admin: [
    { label: 'Kiểm soát hệ thống', description: 'Bảo trì, cấu hình và vận hành nền tảng', path: '/admin/system' },
    { label: 'Trung tâm hỗ trợ', description: 'Tài liệu vận hành và FAQ', path: '/support' },
    { label: 'Liên hệ kỹ thuật', description: 'Báo sự cố hạ tầng hoặc bảo mật', path: '/contact' },
  ],
};

const SupportSection = ({ role = 'student' }) => {
  const navigate = useNavigate();
  const normalized = normalizeSettingsRole(role);
  const links = SUPPORT_LINKS[normalized] || SUPPORT_LINKS.student;

  return (
    <div className="settings-section">
      <SettingsSectionHeader {...SECTION_META.support} />

      <SettingsCard>
        {links.map((item) => (
          <SettingsRow
            key={item.path + item.label}
            label={item.label}
            description={item.description}
            onClick={() => navigate(item.path)}
          />
        ))}
      </SettingsCard>
    </div>
  );
};

export default SupportSection;
