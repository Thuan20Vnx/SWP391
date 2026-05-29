import { useNavigate } from 'react-router-dom';
import SettingsRow from '../SettingsRow';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { APP_VERSION, SECTION_META } from '../settingsConfig';

const AboutSection = () => {
  const navigate = useNavigate();

  return (
    <div className="settings-section">
      <SettingsSectionHeader {...SECTION_META.about} />

      <SettingsCard>
        <div className="settings-info-row">
          <div>
            <p className="settings-info-row__label">Phiên bản ứng dụng</p>
            <p className="settings-info-row__desc">F-Events Platform</p>
          </div>
          <span className="settings-version-badge">v{APP_VERSION}</span>
        </div>
        <SettingsRow
          label="Chính sách bảo mật"
          description="Cách chúng tôi thu thập và bảo vệ dữ liệu"
          onClick={() => navigate('/privacy')}
        />
        <SettingsRow
          label="Điều khoản sử dụng"
          description="Quy định khi tham gia nền tảng F-Events"
          onClick={() => navigate('/terms')}
        />
      </SettingsCard>
    </div>
  );
};

export default AboutSection;
