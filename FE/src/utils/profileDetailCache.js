import { resolveUserAvatar } from './image';
import { normalizeRole } from './auth';

const PROFILE_DETAIL_CACHE_KEY = 'fevents_user_profile_detail';

export const INTEREST_LABELS = {
  hardware: 'Phần cứng & Vi điều khiển',
  ai: 'AI',
  japan: 'Văn hóa Nhật Bản',
  charity: 'Thiện nguyện',
  sports: 'Thể thao',
  music: 'Âm nhạc & Nghệ thuật',
};

export const emptyInterestState = () => ({
  hardware: false,
  ai: false,
  japan: false,
  charity: false,
  sports: false,
  music: false,
});

export const mapInterestsFromApi = (interests) => {
  const state = emptyInterestState();
  if (!Array.isArray(interests)) return state;
  Object.entries(INTEREST_LABELS).forEach(([key, label]) => {
    state[key] = interests.includes(label);
  });
  return state;
};

export const mapUserToProfileDetail = (user) => {
  if (!user) return null;
  return {
    profileData: {
      fullname: user.fullname || '',
      course: user.course || '',
      campus: user.campus || '',
      email: user.email || localStorage.getItem('userEmail') || '',
      phone: user.phone || '',
    },
    userRole: normalizeRole(user.role || 'guest'),
    studentId: user.studentId || '',
    courseChanged: Boolean(user.courseChanged),
    orientation: user.orientation || '',
    interests: mapInterestsFromApi(user.interests),
    avatar: resolveUserAvatar(user, ''),
  };
};

export const readProfileDetailCache = () => {
  try {
    const raw = sessionStorage.getItem(PROFILE_DETAIL_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    return {
      ...cached,
      interests: { ...emptyInterestState(), ...(cached.interests || {}) },
    };
  } catch {
    return null;
  }
};

export const writeProfileDetailCache = (detail) => {
  if (!detail) return;
  try {
    sessionStorage.setItem(PROFILE_DETAIL_CACHE_KEY, JSON.stringify(detail));
  } catch {
    /* ignore quota errors */
  }
};

export const clearProfileDetailCache = () => {
  sessionStorage.removeItem(PROFILE_DETAIL_CACHE_KEY);
};
