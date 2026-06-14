import { useState, useEffect, useCallback } from 'react';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { resolveUserAvatar } from '../utils/image';
import defaultAvatar from '../constants/defaultAvatar';
import { AUTH_CHANGED_EVENT } from '../utils/authEvents';
import { normalizeRole } from '../utils/auth';
import { cachedFetchDedup, invalidateCache } from '../utils/apiCache';

const PROFILE_CACHE_KEY = 'fevents_user_profile';

const emptyProfile = {
  fullname: '',
  course: '',
  picture: defaultAvatar,
  role: 'guest',
};

const readCachedProfile = () => {
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    return {
      ...emptyProfile,
      ...cached,
      picture: cached.picture || defaultAvatar,
    };
  } catch {
    return null;
  }
};

const writeCachedProfile = (profile) => {
  try {
    sessionStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify({
        fullname: profile.fullname,
        course: profile.course,
        role: profile.role,
        picture: profile.picture,
      })
    );
  } catch {
    /* ignore quota errors */
  }
};

export const clearUserProfileCache = () => {
  sessionStorage.removeItem(PROFILE_CACHE_KEY);
  invalidateCache('user:profile');
};

export const cacheUserProfile = (profile) => {
  writeCachedProfile(profile);
};

const useUserProfile = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem('isLoggedIn') === 'true'
  );
  const [profileLoading, setProfileLoading] = useState(
    () => localStorage.getItem('isLoggedIn') === 'true'
  );
  const [userProfile, setUserProfile] = useState(
    () => readCachedProfile() || emptyProfile
  );

  const refreshProfile = useCallback(() => {
    const logged = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(logged);

    if (!logged) {
      setUserProfile(emptyProfile);
      setProfileLoading(false);
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      setProfileLoading(false);
      return;
    }

    // Nếu đã có cached profile (sessionStorage), hiển thị ngay
    const cached = readCachedProfile();
    if (cached) {
      setUserProfile(cached);
      setProfileLoading(false);
    } else {
      setProfileLoading(true);
    }

    cachedFetchDedup('user:profile', () =>
      fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('profile fetch failed')))),
      { ttl: 30000 }
    )
      .then((data) => {
        const u = data.user;
        const profile = {
          fullname: u.fullname || '',
          course: u.course || '',
          picture: resolveUserAvatar(u, defaultAvatar),
          role: u.role || 'guest',
        };
        setUserProfile(profile);
        localStorage.setItem('userRole', normalizeRole(profile.role));
        writeCachedProfile(profile);
      })
      .catch(() => {
        const fallback = readCachedProfile();
        if (fallback) setUserProfile(fallback);
      })
      .finally(() => setProfileLoading(false));
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    const handleAuthChanged = () => refreshProfile();
    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
  }, [refreshProfile]);

  return { isLoggedIn, userProfile, profileLoading };
};

export default useUserProfile;
