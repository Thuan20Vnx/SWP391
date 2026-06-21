import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';

const clubFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}/api/clubs${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || data.success === false) {
    throw new Error(data.message || 'Yêu cầu thất bại');
  }
  return data;
};

export const fetchClubSemesterTimelines = () =>
  clubFetch('/manage/semester-timelines');

export const fetchClubSemesterTimeline = (id) =>
  clubFetch(`/manage/semester-timelines/${id}`);

export const createClubSemesterTimeline = (body) =>
  clubFetch('/manage/semester-timelines', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateClubSemesterTimeline = (id, body) =>
  clubFetch(`/manage/semester-timelines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

export const submitClubSemesterTimeline = (id) =>
  clubFetch(`/manage/semester-timelines/${id}/submit`, { method: 'POST', body: '{}' });

export const withdrawClubSemesterTimeline = (id) =>
  clubFetch(`/manage/semester-timelines/${id}/withdraw`, { method: 'POST', body: '{}' });

export const deleteClubSemesterTimeline = (id) =>
  clubFetch(`/manage/semester-timelines/${id}`, { method: 'DELETE' });

export const requestClubSemesterTimelineChange = (id, body) =>
  clubFetch(`/manage/semester-timelines/${id}/change-request`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const fetchIcpdpClubs = () => clubFetch('/manage/all');

export const updateIcpdpClub = (id, body) =>
  clubFetch(`/manage/all/${id}`, { method: 'PATCH', body: JSON.stringify(body) });

export const deleteIcpdpClub = (id) =>
  clubFetch(`/manage/all/${id}`, { method: 'DELETE' });
