import React from 'react';
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

const CtsvProfileMenu = ({
  activeItem = '',
  userProfile = null,
  roleLabel = 'Cán bộ CTSV',
  onMenuAction,
  onLogout,
}) => {
  const act = (key) => () => onMenuAction?.(key);

  return (
    <div className="nav-hub nav-hub--compact">
      <NavHubHeader userProfile={userProfile} fallbackName="Cán bộ CTSV" roleLabel={roleLabel} />

      <NavHubMenuSection
        items={[
          <NavHubItem
            key="profile"
            active={activeItem === 'profile'}
            label="Hồ sơ"
            hint="Thông tin cán bộ"
            icon={<NavHubIcon>{navIcons.profile}</NavHubIcon>}
            onClick={act('profile')}
          />,
          <NavHubItem
            key="partners"
            active={activeItem === 'partners'}
            label="Đối tác"
            hint="Duyệt đơn đăng ký"
            icon={<NavHubIcon>{navIcons.partners}</NavHubIcon>}
            onClick={act('partners')}
          />,
          <NavHubItem
            key="calendar"
            active={activeItem === 'calendar'}
            label="Lịch trường"
            hint="Sự kiện toàn trường"
            icon={<NavHubIcon>{navIcons.calendar}</NavHubIcon>}
            onClick={act('calendar')}
          />,
        ]}
        cta={
          <NavHubCtaButton
            icon={<NavHubIcon size={16}>{navIcons.plus}</NavHubIcon>}
            label="Tạo sự kiện trường"
            onClick={act('create-event')}
          />
        }
      />

      <NavHubSystemSection
        items={[
          <NavHubItem
            key="settings"
            active={activeItem === 'settings'}
            label="Cài đặt"
            hint="Bảo mật tài khoản"
            icon={<NavHubIcon>{navIcons.settings}</NavHubIcon>}
            onClick={act('settings')}
          />,
        ]}
      />

      <NavHubFooter onLogout={onLogout} />
    </div>
  );
};

export default CtsvProfileMenu;
