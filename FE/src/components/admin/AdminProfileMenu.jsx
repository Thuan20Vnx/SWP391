import React from 'react';
import { useTranslation } from '../../i18n/I18nContext';
import {
  NavHubCtaButton,
  NavHubFooter,
  NavHubHeader,
  NavHubIcon,
  NavHubItem,
  NavHubMenuSection,
  NavHubSystemSection,
  navIcons,
} from '../nav/NavHubPrimitives';

const AdminProfileMenu = ({
  activeItem = '',
  userProfile = null,
  onMenuAction,
  onLogout,
}) => {
  const { t } = useTranslation();
  const act = (key) => () => onMenuAction?.(key);

  return (
    <div className="nav-hub nav-hub--compact">
      <NavHubHeader
        userProfile={userProfile}
        fallbackName={t('header.defaultAdmin')}
        roleLabel={t('admin.profileMenu.roleLabel')}
      />

      <NavHubMenuSection
        items={[
          <NavHubItem
            key="profile"
            active={activeItem === 'profile'}
            label={t('admin.nav.profile')}
            hint={t('admin.profileMenu.profileHint')}
            icon={<NavHubIcon>{navIcons.profile}</NavHubIcon>}
            onClick={act('profile')}
          />,
          <NavHubItem
            key="calendar"
            active={activeItem === 'calendar'}
            label={t('admin.nav.calendar')}
            hint={t('admin.profileMenu.calendarHint')}
            icon={<NavHubIcon>{navIcons.calendar}</NavHubIcon>}
            onClick={act('calendar')}
          />,
          <NavHubItem
            key="partners"
            active={activeItem === 'partners'}
            label={t('admin.nav.partners')}
            hint={t('admin.profileMenu.partnersHint')}
            icon={<NavHubIcon>{navIcons.partners}</NavHubIcon>}
            onClick={act('partners')}
          />,
          <NavHubItem
            key="events"
            active={activeItem === 'events'}
            label={t('admin.profileMenu.events')}
            hint={t('admin.profileMenu.eventsHint')}
            icon={<NavHubIcon>{navIcons.events}</NavHubIcon>}
            onClick={act('events')}
          />,
        ]}
        cta={
          <NavHubCtaButton
            icon={<NavHubIcon size={16}>{navIcons.plus}</NavHubIcon>}
            label={t('admin.profileMenu.fptSystem')}
            onClick={act('fpt-system')}
          />
        }
      />

      <NavHubSystemSection
        items={[
          <NavHubItem
            key="settings"
            active={activeItem === 'settings'}
            label={t('settings.portalTitle')}
            hint={t('admin.profileMenu.settingsHint')}
            icon={<NavHubIcon>{navIcons.settings}</NavHubIcon>}
            onClick={act('settings')}
          />,
        ]}
      />

      <NavHubFooter onLogout={onLogout} />
    </div>
  );
};

export default AdminProfileMenu;
