const STORAGE_KEY = 'activeManagedClubId';

export const ACTIVE_CLUB_CHANGED = 'activeManagedClubChanged';

export function getActiveManagedClubId() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setActiveManagedClubId(clubId) {
  const next = String(clubId || '');
  const prev = getActiveManagedClubId();
  if (next === prev) return false;
  localStorage.setItem(STORAGE_KEY, next);
  window.dispatchEvent(new CustomEvent(ACTIVE_CLUB_CHANGED, { detail: { clubId: next } }));
  return true;
}

export function clearActiveManagedClubId() {
  if (!getActiveManagedClubId()) return false;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(ACTIVE_CLUB_CHANGED, { detail: { clubId: '' } }));
  return true;
}
