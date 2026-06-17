const STORAGE_KEY = 'activeManagedClubId';

export const ACTIVE_CLUB_CHANGED = 'activeManagedClubChanged';

export function getActiveManagedClubId() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setActiveManagedClubId(clubId) {
  const next = String(clubId || '');
  localStorage.setItem(STORAGE_KEY, next);
  window.dispatchEvent(new CustomEvent(ACTIVE_CLUB_CHANGED, { detail: { clubId: next } }));
}

export function clearActiveManagedClubId() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(ACTIVE_CLUB_CHANGED, { detail: { clubId: '' } }));
}
