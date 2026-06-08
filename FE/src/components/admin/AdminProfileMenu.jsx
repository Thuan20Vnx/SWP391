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

const AdminProfileMenu = ({
  activeItem = '',
  userProfile = null,
  onMenuAction,
  onLogout,
}) => {
  const act = (key) => () => onMenuAction?.(key);

  return (
    <div className="nav-hub nav-hub--compact">
      <NavHubHeader userProfile={userProfile} fallbackName="Quản trị viên" roleLabel="Admin hệ thống" />

      <NavHubMenuSection
        items={[
          <NavHubItem
            key="profile"
            active={activeItem === 'profile'}
            label="Hồ sơ"
            hint="Thông tin quản trị"
            icon={<NavHubIcon>{navIcons.profile}</NavHubIcon>}
            onClick={act('profile')}
          />,
          <NavHubItem
            key="calendar"
            active={activeItem === 'calendar'}
            label="Lịch sự kiện"
            hint="Toàn hệ thống theo tháng"
            icon={<NavHubIcon>{navIcons.calendar}</NavHubIcon>}
            onClick={act('calendar')}
          />,
          <NavHubItem
            key="partners"
            active={activeItem === 'partners'}
            label="Đối tác"
            hint="Phê duyệt & quản lý"
            icon={<NavHubIcon>{navIcons.partners}</NavHubIcon>}
            onClick={act('partners')}
          />,
          <NavHubItem
            key="events"
            active={activeItem === 'events'}
            label="Duyệt sự kiện"
            hint="Đề xuất & yêu cầu sửa"
            icon={<NavHubIcon>{navIcons.events}</NavHubIcon>}
            onClick={act('events')}
          />,
        ]}
        cta={
          <NavHubCtaButton
            icon={<NavHubIcon size={16}>{navIcons.plus}</NavHubIcon>}
            label="Hệ thống FPT"
            onClick={act('fpt-system')}
          />
        }
      />

      <NavHubSystemSection
        items={[
          <NavHubItem
            key="settings"
            active={activeItem === 'settings'}
            label="Cài đặt tài khoản"
            hint="Bảo mật, thông báo, giao diện"
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
