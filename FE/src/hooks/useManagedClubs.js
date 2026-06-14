import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';

import {

  ACTIVE_CLUB_CHANGED,

  getActiveManagedClubId,

  setActiveManagedClubId,

} from '../utils/activeManagedClub';

import { getUserRole, isClubManagerRole } from '../utils/auth';

import { AUTH_CHANGED_EVENT } from '../utils/authEvents';



const resolveActiveClubId = (list, serverActiveId = '') => {

  if (!list.length) return '';



  const stored = getActiveManagedClubId();

  const storedValid = stored && list.some((club) => club.id === stored);

  if (storedValid) return stored;



  const serverValid =

    serverActiveId && list.some((club) => club.id === String(serverActiveId));

  if (serverValid) return String(serverActiveId);



  return list.find((club) => club.slug === 'fu-dever')?.id || list[0]?.id || '';

};



const pickActiveClub = (list, activeId) =>

  list.find((club) => club.id === activeId) || list[0] || null;



export function useManagedClubs(enabled = true, role = null) {

  const [clubs, setClubs] = useState([]);

  const [activeClub, setActiveClub] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const clubsRef = useRef([]);

  const loadSeqRef = useRef(0);



  const resolvedRole = role || getUserRole();

  const isManager = enabled && isClubManagerRole(resolvedRole);



  clubsRef.current = clubs;



  const applyActiveClub = useCallback((list, serverActiveId = '') => {

    const resolvedId = resolveActiveClubId(list, serverActiveId);

    if (resolvedId && resolvedId !== getActiveManagedClubId()) {

      setActiveManagedClubId(resolvedId);

    }

    const resolved = pickActiveClub(list, resolvedId);

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



    const seq = loadSeqRef.current + 1;

    loadSeqRef.current = seq;

    setLoading(true);

    setError('');

    try {

      const res = await fetch(`${API_BASE}/api/clubs/manage/clubs`, { headers: getAuthHeaders(false) });

      const { ok, data, status } = await parseApiResponse(res);

      if (seq !== loadSeqRef.current) return;



      if (ok && data.success) {

        const list = data.clubs || [];

        setClubs(list);

        applyActiveClub(list, data.activeClubId);

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

      if (seq !== loadSeqRef.current) return;

      setClubs([]);

      setActiveClub(null);

      setError('Không thể kết nối máy chủ. Vui lòng thử lại.');

    } finally {

      if (seq === loadSeqRef.current) {

        setLoading(false);

      }

    }

  }, [applyActiveClub, isManager]);



  useEffect(() => {

    load();

  }, [load]);



  useEffect(() => {

    const handleClubChanged = () => {

      const list = clubsRef.current;

      if (!list.length) return;

      const stored = getActiveManagedClubId();

      setActiveClub(pickActiveClub(list, stored));

    };



    const handleAuthChanged = () => load();



    window.addEventListener(ACTIVE_CLUB_CHANGED, handleClubChanged);

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);

    return () => {

      window.removeEventListener(ACTIVE_CLUB_CHANGED, handleClubChanged);

      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);

    };

  }, [load]);



  const switchClub = useCallback((clubId) => {

    if (!clubId || clubId === getActiveManagedClubId()) return;

    setActiveManagedClubId(clubId);

    setActiveClub((prev) => {

      const next = clubsRef.current.find((club) => club.id === clubId);

      return next || prev;

    });

  }, []);



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

