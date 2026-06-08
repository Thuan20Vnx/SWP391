import { USER_ROLES, getUserRole, normalizeRole } from './auth';
import { getCtsvEventAccess } from './ctsvEventAccess';

export const isPureCtsvStaff = (role = getUserRole()) =>
  normalizeRole(role) === USER_ROLES.CTSV;

/** Sự kiện cấp trường do CTSV tạo / quản lý (không gồm IC-PDP). */
export const isCtsvOwnedSchoolEvent = (event) => {
  if ((event?.source || 'club') !== 'school') return false;
  return (event?.schoolOrganizerRole || 'ctsv') === 'ctsv';
};

export const getCtsvPublicEventAccess = (event) => {
  if (!isCtsvOwnedSchoolEvent(event)) {
    return {
      viewOnly: true,
      canManage: false,
      label: 'Xem chi tiết',
      managePath: null,
    };
  }

  const access = getCtsvEventAccess(event);
  const eventId = event?.id || event?._id;

  return {
    viewOnly: true,
    canManage: true,
    label: access.label,
    managePath: eventId ? `/ctsv/events/${eventId}` : null,
  };
};

export const resolveDiscoveryCardProps = ({
  event,
  isCtsvStaff,
  isAdminViewer,
  onDetail,
  onRegister,
  onManageNavigate,
}) => {
  if (isAdminViewer) {
    return {
      viewOnly: true,
      onDetail,
      onPrimaryAction: onDetail,
    };
  }

  if (isCtsvStaff) {
    const access = getCtsvPublicEventAccess(event);
    return {
      viewOnly: true,
      onDetail,
      onManage:
        access.canManage && access.managePath
          ? () => onManageNavigate(access.managePath)
          : undefined,
      manageLabel: access.label,
    };
  }

  return {
    viewOnly: false,
    onDetail,
    onPrimaryAction: onRegister,
  };
};
