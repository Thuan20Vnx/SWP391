import React from 'react';
import { Outlet } from 'react-router-dom';
import { ClubParticipateLayoutProvider } from '../context/ClubParticipateLayoutContext';
import ClubParticipatePortalShell from './ClubParticipatePortalShell';
import useUserProfile from '../hooks/useUserProfile';
import { getUserRole, isAdminRole, isClubManagerRole, normalizeRole } from '../utils/auth';

const ClubManagerParticipateLayout = () => {
  const { isLoggedIn, userProfile } = useUserProfile();
  const role = normalizeRole(userProfile.role || getUserRole());
  const useClubLayout = isLoggedIn && isClubManagerRole(role) && !isAdminRole(role);

  if (!useClubLayout) {
    return <Outlet />;
  }

  return (
    <ClubParticipateLayoutProvider>
      <ClubParticipatePortalShell>
        <Outlet />
      </ClubParticipatePortalShell>
    </ClubParticipateLayoutProvider>
  );
};

export default ClubManagerParticipateLayout;
