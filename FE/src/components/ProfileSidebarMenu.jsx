import React from 'react';
import { isAdminRole, isClubManagerRole } from '../utils/auth';
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
}) => {
  const go = (action, label) => () => onMenuAction?.(action, label);
  const clubAction = isClubManagerRole() ? 'club-manage' : 'my-clubs';
  const showClubItem = !isAdminRole();

  const menuItems = [
    <NavHubItem
      key="profile"
      active={activeItem === 'profile'}
      label="Hồ sơ"
      hint="Thông tin cá nhân"
      icon={<NavHubIcon>{navIcons.profile}</NavHubIcon>}
      onClick={go('profile', 'Hồ sơ')}
    />,
  ];

  if (showClubItem) {
    menuItems.push(
      <NavHubItem
        key="clubs"
        active={activeItem === clubAction || activeItem === 'my-clubs'}
        label={isClubManagerRole() ? 'Quản lý CLB' : 'CLB của tôi'}
        hint={isClubManagerRole() ? 'Ban quản trị' : 'Theo dõi & tham gia'}
        icon={<NavHubIcon>{navIcons.clubs}</NavHubIcon>}
        onClick={go(clubAction, 'CLB')}
      />,
    );
  }

  menuItems.push(
    <NavHubItem
      key="schedule"
      active={activeItem === 'schedule'}
      label="Lịch của tôi"
      hint="Sự kiện đã đăng ký"
      icon={<NavHubIcon>{navIcons.calendar}</NavHubIcon>}
      onClick={go('schedule', 'Lịch của tôi')}
    />,
  );

  return (
    <div className="nav-hub nav-hub--compact">
      <NavHubHeader userProfile={userProfile} fallbackName="Người dùng" />

      <NavHubMenuSection
        items={menuItems}
        cta={
          <NavHubCtaButton
            icon={<NavHubIcon size={16}>{navIcons.qr}</NavHubIcon>}
            label="Check-in tại sự kiện"
            onClick={go('scan', 'Check-in tại sự kiện')}
          />
        }
      />

      <NavHubSystemSection
        items={[
          <NavHubItem
            key="settings"
            active={activeItem === 'settings'}
            label="Cài đặt"
            hint="Bảo mật & thông báo"
            icon={<NavHubIcon>{navIcons.settings}</NavHubIcon>}
            onClick={go('settings', 'Cài đặt')}
          />,
        ]}
      />

      <NavHubFooter onLogout={onLogout} />
    </div>
  );
};

export default ProfileSidebarMenu;
