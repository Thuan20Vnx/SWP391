import { USER_ROLES, getUserRole, isClubManagerRole, normalizeRole } from './auth';
import { setActiveManagedClubId } from './activeManagedClub';
import { getCtsvEventAccess } from './ctsvEventAccess';
import { getPartnerPublicEventAccess } from './partnerPublicEventAccess';

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

const resolveEventClubId = (event) => String(event?.clubId || event?.club?._id || '');

const resolveCreatorEmail = (event) =>
  (event?.createdByEmail || event?.createdBy?.email || '').trim().toLowerCase();

const resolveCreatorId = (event) =>
  String(event?.createdById || event?.createdBy?._id || event?.createdBy || '');

/** Sự kiện CLB thuộc phạm vi quản lý của club_manager hiện tại. */
export const isClubManagedEvent = (event, { managedClubs = [], userEmail = '', userId = '' } = {}) => {
  if ((event?.source || 'club') !== 'club') return false;

  const eventClubId = resolveEventClubId(event);
  const managedIds = new Set(managedClubs.map((club) => String(club.id || club._id || '')));

  if (eventClubId && managedIds.has(eventClubId)) return true;

  const email = String(userEmail || '').trim().toLowerCase();
  const creatorEmail = resolveCreatorEmail(event);
  if (email && creatorEmail && email === creatorEmail) return true;

  const uid = String(userId || '');
  const creatorId = resolveCreatorId(event);
  if (uid && creatorId && uid === creatorId) return true;

  return false;
};

export const getClubPublicEventAccess = (
  event,
  { managedClubs = [], activeClubId = '', userEmail = '', userId = '' } = {}
) => {
  if (!isClubManagedEvent(event, { managedClubs, userEmail, userId })) {
    return {
      viewOnly: false,
      canManage: false,
      label: 'Quản lý',
      managePath: null,
      targetClubId: '',
      targetClubName: '',
      switchClubHint: '',
    };
  }

  const eventId = event?.id || event?._id;
  const eventClubId = resolveEventClubId(event);
  const matchedClub =
    managedClubs.find((club) => String(club.id || club._id) === eventClubId) || managedClubs[0];
  const targetClubId = eventClubId || String(matchedClub?.id || matchedClub?._id || '');
  const targetClubName = event?.clubName || matchedClub?.name || 'CLB của bạn';
  const activeId = String(activeClubId || '');
  const needsClubSwitch = Boolean(targetClubId && activeId && targetClubId !== activeId);

  return {
    viewOnly: true,
    canManage: Boolean(eventId),
    label: 'Quản lý',
    managePath: eventId ? `/quan-ly-clb/su-kien/${eventId}` : null,
    targetClubId,
    targetClubName,
    switchClubHint: needsClubSwitch
      ? `Bạn sẽ được chuyển hướng đến quản lý CLB ${targetClubName}.`
      : '',
  };
};

export const navigateClubEventManage = ({ access, navigate, showToast }) => {
  if (!access?.managePath || typeof navigate !== 'function') return;
  if (access.targetClubId) {
    setActiveManagedClubId(access.targetClubId);
  }
  navigate(access.managePath);
  if (access.switchClubHint) {
    showToast?.(access.switchClubHint, 'info');
  }
};

export const resolveDiscoveryCardProps = ({
  event,
  isCtsvStaff,
  isAdminViewer,
  isClubManager,
  clubManagerContext,
  isPartner,
  partnerContext,
  onDetail,
  onRegister,
  onManageNavigate,
  onClubManageNavigate,
  showToast,
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

  if (isClubManager && clubManagerContext) {
    const access = getClubPublicEventAccess(event, clubManagerContext);
    if (access.canManage && access.managePath) {
      const handleManage = () => {
        if (typeof onClubManageNavigate === 'function') {
          onClubManageNavigate(access);
          return;
        }
        navigateClubEventManage({ access, navigate: onManageNavigate, showToast });
      };
      return {
        viewOnly: true,
        onDetail,
        onManage: handleManage,
        manageLabel: access.label,
        manageHint: access.switchClubHint,
      };
    }
  }

  if (isPartner && partnerContext) {
    const access = getPartnerPublicEventAccess(event, partnerContext);
    if (access.canManage && access.managePath) {
      return {
        viewOnly: true,
        onDetail,
        onManage: () => onManageNavigate(access.managePath),
        manageLabel: access.label,
      };
    }
  }

  return {
    viewOnly: false,
    onDetail,
    onPrimaryAction: onRegister,
  };
};
