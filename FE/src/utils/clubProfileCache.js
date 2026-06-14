import { getActiveManagedClubId } from './activeManagedClub';

const CACHE_PREFIX = 'fevents_club_profile_';

const cacheKey = (clubId) => `${CACHE_PREFIX}${clubId || getActiveManagedClubId() || 'default'}`;

export const readClubProfileCache = (clubId) => {
  try {
    const raw = sessionStorage.getItem(cacheKey(clubId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const writeClubProfileCache = (form, clubId) => {
  if (!form) return;
  try {
    sessionStorage.setItem(cacheKey(clubId), JSON.stringify(form));
  } catch {
    /* ignore quota errors */
  }
};

export const clearClubProfileCache = (clubId) => {
  sessionStorage.removeItem(cacheKey(clubId));
};
