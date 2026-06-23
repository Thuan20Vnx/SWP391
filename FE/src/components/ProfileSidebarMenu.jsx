import React from 'react';
import { isAdminRole, isClubManagerRole } from '../utils/auth';
import { useTranslation } from '../i18n/I18nContext';
import {
  NavHubCtaButton,
  NavHubFooter,
  NavHubHeader,
  NavHubIcon,
  NavHubItem,
  NavHubMenuSection,
  NavHubSystemSection,
  navIcons,
} from './nav/NavHubPrimitives';

const ProfileSidebarMenu = ({
  activeItem = '',
  userProfile = null,
  onMenuAction,
  onLogout,
  activeClub = null,
  showSwitchClub = false,
}) => {
  const { t } = useTranslation();
  const go = (action, label) => () => onMenuAction?.(action, label);
  const clubAction = isClubManagerRole() ? 'club-manage' : 'my-clubs';
  const showClubItem = !isAdminRole();

  const menuItems = [
    <NavHubItem
      key="profile"
      active={activeItem === 'profile'}
      label={t('profile.menu.profile')}
      hint={t('profile.menu.profileHint')}
      icon={<NavHubIcon>{navIcons.profile}</NavHubIcon>}
      onClick={go('profile', t('profile.menu.profile'))}
    />,
  ];

  if (showClubItem) {
    menuItems.push(
      <NavHubItem
        key="clubs"
        active={activeItem === clubAction || activeItem === 'my-clubs'}
        label={isClubManagerRole() ? t('profile.menu.clubManage') : t('profile.menu.clubs')}
        hint={isClubManagerRole() ? t('profile.menu.clubManageHint') : t('profile.menu.clubsHint')}
        icon={<NavHubIcon>{navIcons.clubs}</NavHubIcon>}
        onClick={go(clubAction, 'CLB')}
      />,
    );
  }

  if (showSwitchClub) {
    menuItems.push(
      <NavHubItem
        key="switch-club"
        active={activeItem === 'switch-club'}
        label={t('profile.menu.switchClub')}
        hint={activeClub?.name ? `Đang quản lý: ${activeClub.name}` : 'Chọn CLB khác'}
        icon={<NavHubIcon>{navIcons.switchClub}</NavHubIcon>}
        onClick={go('switch-club', t('profile.menu.switchClub'))}
      />,
    );
  }

  menuItems.push(
    <NavHubItem
      key="schedule"
      active={activeItem === 'schedule'}
      label={t('profile.menu.schedule')}
      hint={t('profile.menu.scheduleHint')}
      icon={<NavHubIcon>{navIcons.calendar}</NavHubIcon>}
      onClick={go('schedule', t('profile.menu.schedule'))}
    />,
  );

  return (
    <div className="nav-hub nav-hub--compact">
      <NavHubHeader userProfile={userProfile} fallbackName={t('header.defaultUser')} />

      <NavHubMenuSection
        items={menuItems}
        cta={
          <NavHubCtaButton
            icon={<NavHubIcon size={16}>{navIcons.qr}</NavHubIcon>}
            label={t('profile.menu.checkin')}
            onClick={go('scan', t('profile.menu.checkin'))}
          />
        }
      />

      <NavHubSystemSection
        items={[
          <NavHubItem
            key="settings"
            active={activeItem === 'settings'}
            label={t('profile.menu.settings')}
            hint={t('profile.menu.settingsHint')}
            icon={<NavHubIcon>{navIcons.settings}</NavHubIcon>}
            onClick={go('settings', t('profile.menu.settings'))}
          />,
        ]}
      />

      <NavHubFooter onLogout={onLogout} />
    </div>
  );
};

export default ProfileSidebarMenu;
