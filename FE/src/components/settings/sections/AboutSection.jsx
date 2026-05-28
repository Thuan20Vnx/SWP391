import SettingsRow from '../SettingsRow';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { APP_VERSION, SECTION_META } from '../settingsConfig';

const AboutSection = ({ showToast }) => (
  <div>
    <SettingsSectionHeader {...SECTION_META.about} />

    <SettingsCard>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3.5 dark:border-slate-800">
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Version app</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">F-Events Platform</p>
        </div>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          v{APP_VERSION}
        </span>
      </div>
      <SettingsRow
        label="Chính sách bảo mật"
        description="Xem cách chúng tôi bảo vệ dữ liệu của bạn"
        onClick={() => {}}
      />
      <SettingsRow
        label="Điều khoản sử dụng"
        description="Quy định khi sử dụng nền tảng F-Events"
        onClick={() => {}}
      />
    </SettingsCard>
  </div>
);

export default AboutSection;
