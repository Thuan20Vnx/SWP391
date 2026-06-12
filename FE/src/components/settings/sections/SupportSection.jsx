import { useNavigate } from 'react-router-dom';
import SettingsRow from '../SettingsRow';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';
import { normalizeSettingsRole } from '../settingsRoleConfig';
import { useTranslation } from '../../../i18n/I18nContext';
import { resolveDescription, resolveLabel } from '../../../i18n/helpers';

const SUPPORT_LINKS = {
  student: [
    {
      labelKey: 'settings.support.student.help',
      descriptionKey: 'settings.support.student.helpDesc',
      path: '/support',
    },
    {
      labelKey: 'settings.support.student.feedback',
      descriptionKey: 'settings.support.student.feedbackDesc',
      path: '/contact',
    },
    {
      labelKey: 'settings.support.student.admin',
      descriptionKey: 'settings.support.student.adminDesc',
      path: '/contact',
    },
  ],
  club_manager: [
    {
      labelKey: 'settings.support.club.guide',
      descriptionKey: 'settings.support.club.guideDesc',
      path: '/support',
    },
    {
      labelKey: 'settings.support.club.portal',
      descriptionKey: 'settings.support.club.portalDesc',
      path: '/quan-ly-clb',
    },
    {
      labelKey: 'settings.support.club.contact',
      descriptionKey: 'settings.support.club.contactDesc',
      path: '/contact',
    },
  ],
  ctsv: [
    {
      labelKey: 'settings.support.ctsv.help',
      descriptionKey: 'settings.support.ctsv.helpDesc',
      path: '/support',
    },
    {
      labelKey: 'settings.support.ctsv.portal',
      descriptionKey: 'settings.support.ctsv.portalDesc',
      path: '/ctsv/dashboard',
    },
    {
      labelKey: 'settings.support.ctsv.admin',
      descriptionKey: 'settings.support.ctsv.adminDesc',
      path: '/contact',
    },
  ],
  icpdp: [
    {
      labelKey: 'settings.support.icpdp.help',
      descriptionKey: 'settings.support.icpdp.helpDesc',
      path: '/support',
    },
    {
      labelKey: 'settings.support.icpdp.portal',
      descriptionKey: 'settings.support.icpdp.portalDesc',
      path: '/icpdp/dashboard',
    },
    {
      labelKey: 'settings.support.icpdp.admin',
      descriptionKey: 'settings.support.icpdp.adminDesc',
      path: '/contact',
    },
  ],
  partner: [
    {
      labelKey: 'settings.support.partner.help',
      descriptionKey: 'settings.support.partner.helpDesc',
      path: '/support',
    },
    {
      labelKey: 'settings.support.partner.portal',
      descriptionKey: 'settings.support.partner.portalDesc',
      path: '/partner/dashboard',
    },
    {
      labelKey: 'settings.support.partner.ctsv',
      descriptionKey: 'settings.support.partner.ctsvDesc',
      path: '/contact',
    },
  ],
  admin: [
    {
      labelKey: 'settings.support.admin.system',
      descriptionKey: 'settings.support.admin.systemDesc',
      path: '/admin/system',
    },
    {
      labelKey: 'settings.support.admin.help',
      descriptionKey: 'settings.support.admin.helpDesc',
      path: '/support',
    },
    {
      labelKey: 'settings.support.admin.tech',
      descriptionKey: 'settings.support.admin.techDesc',
      path: '/contact',
    },
  ],
};

const SupportSection = ({ role = 'student' }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const normalized = normalizeSettingsRole(role);
  const links = SUPPORT_LINKS[normalized] || SUPPORT_LINKS.student;

  return (
    <div className="settings-section">
      <SettingsSectionHeader
        title={t(SECTION_META.support.titleKey)}
        description={t(SECTION_META.support.descKey)}
      />

      <SettingsCard>
        {links.map((item) => (
          <SettingsRow
            key={item.path + item.labelKey}
            label={resolveLabel(item, t)}
            description={resolveDescription(item, t)}
            onClick={() => navigate(item.path)}
          />
        ))}
      </SettingsCard>
    </div>
  );
};

export default SupportSection;
