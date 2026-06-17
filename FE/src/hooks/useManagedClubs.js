import { useCallback, useEffect, useState } from 'react';
import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';
import {
  ACTIVE_CLUB_CHANGED,
  getActiveManagedClubId,
  setActiveManagedClubId,
} from '../utils/activeManagedClub';
import { getUserRole, isClubManagerRole } from '../utils/auth';
import { AUTH_CHANGED_EVENT } from '../utils/authEvents';

export function useManagedClubs(enabled = true, role = null) {
  const [clubs, setClubs] = useState([]);
  const [activeClub, setActiveClub] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resolvedRole = role || getUserRole();
  const isManager = enabled && isClubManagerRole(resolvedRole);

  const syncActiveClub = useCallback((list, activeId) => {
    const resolvedId = activeId || getActiveManagedClubId() || list[0]?.id || '';
    if (resolvedId && resolvedId !== getActiveManagedClubId()) {
      setActiveManagedClubId(resolvedId);
    }
    const resolved = list.find((club) => club.id === resolvedId) || list[0] || null;
    setActiveClub(resolved);
    return resolved;
  }, []);

  const load = useCallback(async () => {
    if (!isManager) {
      setClubs([]);
      setActiveClub(null);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/clubs/manage/clubs`, { headers: getAuthHeaders(false) });
      const { ok, data, status } = await parseApiResponse(res);
      if (ok && data.success) {
        const list = data.clubs || [];
        setClubs(list);
        syncActiveClub(list, data.activeClubId);
        if (!list.length) {
          setError('Tài khoản chưa được gán quản lý CLB nào.');
        }
        return;
      }
      setClubs([]);
      setActiveClub(null);
      if (status === 401) {
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng xuất và đăng nhập lại.');
      } else {
        setError(data.message || 'Không thể tải danh sách CLB đang quản lý.');
      }
    } catch {
      setClubs([]);
      setActiveClub(null);
      setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [isManager, syncActiveClub]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener(ACTIVE_CLUB_CHANGED, handler);
    window.addEventListener(AUTH_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(ACTIVE_CLUB_CHANGED, handler);
      window.removeEventListener(AUTH_CHANGED_EVENT, handler);
    };
  }, [load]);

  const switchClub = useCallback((clubId) => {
    setActiveManagedClubId(clubId);
    setActiveClub((prev) => {
      const next = clubs.find((club) => club.id === clubId);
      return next || prev;
    });
  }, [clubs]);

  return {
    clubs,
    activeClub,
    loading,
    error,
    switchClub,
    reload: load,
    hasMultipleClubs: clubs.length > 1,
  };
}

export default useManagedClubs;
