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

const PartnerProfileMenu = ({
  activeItem = '',
  userProfile = null,
  roleLabel = 'Đối tác',
  onMenuAction,
  onLogout,
}) => {
  const act = (key) => () => onMenuAction?.(key);

  return (
    <div className="nav-hub nav-hub--compact">
      <NavHubHeader userProfile={userProfile} fallbackName="Đối tác" roleLabel={roleLabel} />

      <NavHubMenuSection
        items={[
          <NavHubItem
            key="profile"
            active={activeItem === 'profile'}
            label="Hồ sơ & công ty"
            hint="Cá nhân & doanh nghiệp"
            icon={<NavHubIcon>{navIcons.profile}</NavHubIcon>}
            onClick={act('profile')}
          />,
          <NavHubItem
            key="events"
            active={activeItem === 'events'}
            label="Sự kiện"
            hint="Quản lý & theo dõi"
            icon={<NavHubIcon>{navIcons.events}</NavHubIcon>}
            onClick={act('events')}
          />,
          <NavHubItem
            key="contracts"
            active={activeItem === 'contracts'}
            label="Hợp đồng"
            hint="Tài trợ & cam kết"
            icon={<NavHubIcon>{navIcons.contract}</NavHubIcon>}
            onClick={act('contracts')}
          />,
        ]}
        cta={
          <NavHubCtaButton
            className="partner-nav-hub-cta"
            icon={<NavHubIcon size={16}>{navIcons.plus}</NavHubIcon>}
            label="Đề xuất sự kiện mới"
            onClick={act('create-proposal')}
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

export default PartnerProfileMenu;
