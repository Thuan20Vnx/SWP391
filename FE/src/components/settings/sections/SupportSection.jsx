import { useNavigate } from 'react-router-dom';
import SettingsRow from '../SettingsRow';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';

const SupportSection = () => {
  const navigate = useNavigate();

  return (
    <div>
      <SettingsSectionHeader {...SECTION_META.support} />

      <SettingsCard>
        <SettingsRow
          label="Trung tâm hỗ trợ"
          description="Xem hướng dẫn và câu hỏi thường gặp"
          onClick={() => navigate('/support')}
        />
        <SettingsRow
          label="Báo lỗi"
          description="Gửi báo cáo lỗi hoặc góp ý cải thiện"
          onClick={() => navigate('/contact')}
        />
        <SettingsRow
          label="Liên hệ admin"
          description="Nhắn tin trực tiếp với quản trị viên hệ thống"
          onClick={() => navigate('/contact')}
        />
      </SettingsCard>
    </div>
  );
};

export default SupportSection;
