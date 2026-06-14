import { setActiveManagedClubId } from './activeManagedClub';

export const resolveManagedClubMatch = (club, managedClubs = []) => {
  if (!club || !managedClubs.length) return null;

  const dbId = String(club._id || club.clubId || '');
  const slug = String(club.id || club.slug || '');

  return (
    managedClubs.find(
      (managed) =>
        (dbId && String(managed.id) === dbId) ||
        (slug && managed.slug === slug)
    ) || null
  );
};

export const isUserManagingClub = (club, managedClubs = []) =>
  Boolean(resolveManagedClubMatch(club, managedClubs));

export const openClubManagerPortal = ({ club, managedClubs = [], navigate }) => {
  const matched = resolveManagedClubMatch(club, managedClubs);
  if (matched?.id) {
    setActiveManagedClubId(matched.id);
  }
  if (typeof navigate === 'function') {
    navigate('/quan-ly-clb');
  }
};
