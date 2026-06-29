import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';

const schoolFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}/api/ctsv${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || data.success === false) {
    throw new Error(data.message || 'Yêu cầu thất bại');
  }
  return data;
};

export const fetchSchoolSemesterTimelines = () =>
  schoolFetch('/school-semester-timelines');

export const fetchSchoolSemesterTimeline = (id) =>
  schoolFetch(`/school-semester-timelines/${id}`);

export const fetchSchoolSemesterTimelinePlan = (id) =>
  schoolFetch(`/school-semester-timelines/${id}/event-plan`);

export const createSchoolSemesterTimeline = (body) =>
  schoolFetch('/school-semester-timelines', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateSchoolSemesterTimeline = (id, body) =>
  schoolFetch(`/school-semester-timelines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

export const submitSchoolSemesterTimeline = (id) =>
  schoolFetch(`/school-semester-timelines/${id}/submit`, { method: 'POST', body: '{}' });

export const withdrawSchoolSemesterTimeline = (id) =>
  schoolFetch(`/school-semester-timelines/${id}/withdraw`, { method: 'POST', body: '{}' });

export const deleteSchoolSemesterTimeline = (id) =>
  schoolFetch(`/school-semester-timelines/${id}`, { method: 'DELETE' });

export const requestSchoolSemesterTimelineChange = (id, body) =>
  schoolFetch(`/school-semester-timelines/${id}/change-request`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const cancelScheduledSchoolTimelineDelete = (id) =>
  schoolFetch(`/school-semester-timelines/${id}/cancel-scheduled-delete`, {
    method: 'POST',
    body: '{}',
  });

export const checkSchoolTimelineConflicts = (body) =>
  schoolFetch('/school-semester-timelines/check-conflicts', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const checkEventVenueConflictsApi = (body) =>
  schoolFetch('/events/check-venue-conflicts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
