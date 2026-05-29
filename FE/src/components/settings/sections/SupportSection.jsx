import { useNavigate } from 'react-router-dom';
import SettingsRow from '../SettingsRow';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';

const SupportSection = () => {
  const navigate = useNavigate();

  return (
    <div className="settings-section">
      <SettingsSectionHeader {...SECTION_META.support} />

      <SettingsCard>
        <SettingsRow
          label="Trung tâm hỗ trợ"
          description="Hướng dẫn sử dụng và câu hỏi thường gặp"
          onClick={() => navigate('/support')}
        />
        <SettingsRow
          label="Báo lỗi & góp ý"
          description="Gửi phản hồi để cải thiện nền tảng"
          onClick={() => navigate('/contact')}
        />
        <SettingsRow
          label="Liên hệ quản trị viên"
          description="Trao đổi trực tiếp với đội vận hành"
          onClick={() => navigate('/contact')}
        />
      </SettingsCard>
    </div>
  );
};

export default SupportSection;
