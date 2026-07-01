import {
  createClubSemesterTimeline,
  deleteClubSemesterTimeline,
  fetchClubSemesterTimelines,
  fetchClubSemesterTimeline,
  fetchClubSemesterTimelinePlan,
  requestClubSemesterTimelineChange,
  submitClubSemesterTimeline,
  updateClubSemesterTimeline,
  cancelScheduledTimelineDelete,
  withdrawClubSemesterTimeline,
  withdrawCancelTimelineChangeRequest,
} from '../services/clubTimelineApi';
import { API_BASE, getAuthHeaders, parseApiResponse } from './api';
import {
  createSchoolSemesterTimeline,
  deleteSchoolSemesterTimeline,
  fetchSchoolSemesterTimelines,
  fetchSchoolSemesterTimeline,
  fetchSchoolSemesterTimelinePlan,
  requestSchoolSemesterTimelineChange,
  submitSchoolSemesterTimeline,
  updateSchoolSemesterTimeline,
  cancelScheduledSchoolTimelineDelete,
  withdrawSchoolSemesterTimeline,
  withdrawCancelSchoolTimelineChangeRequest,
  checkSchoolTimelineConflicts,
} from '../services/schoolTimelineApi';

const clubCheckConflicts = async (body) => {
  const res = await fetch(`${API_BASE}/api/clubs/manage/semester-timelines/check-conflicts`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || data.success === false) throw new Error(data.message || 'Kiểm tra xung đột thất bại');
  return data.results || [];
};

export const getTimelineApi = (mode = 'club') => {
  const isSchool = mode === 'icpdp' || mode === 'ctsv';
  if (!isSchool) {
    return {
      isSchool: false,
      unitLabel: 'CLB',
      reviewerLabel: 'IC-PDP',
      pendingKey: 'pending_icpdp',
      statusSteps: [
        { key: 'draft', label: 'Tạo đơn', match: ['draft', 'revision'] },
        { key: 'pending_icpdp', label: 'IC-PDP', match: ['pending_icpdp', 'pending_ctsv'] },
        { key: 'approved', label: 'Hoàn tất', match: ['approved', 'rejected', 'cancelled'] },
      ],
      fetchList: async () => {
        const data = await fetchClubSemesterTimelines();
        return data.timelines || [];
      },
      fetchDetail: async (id) => {
        const data = await fetchClubSemesterTimeline(id);
        return data.timeline;
      },
      fetchPlan: async (id) => {
        const data = await fetchClubSemesterTimelinePlan(id);
        return data.plan || {};
      },
      create: async (body) => {
        const data = await createClubSemesterTimeline(body);
        return data.timeline;
      },
      update: (id, body) => updateClubSemesterTimeline(id, body),
      submit: (id) => submitClubSemesterTimeline(id),
      delete: (id) => deleteClubSemesterTimeline(id),
      requestChange: (id, body) => requestClubSemesterTimelineChange(id, body),
      cancelScheduledDelete: (id) => cancelScheduledTimelineDelete(id),
      withdrawCancelChangeRequest: (id) => withdrawCancelTimelineChangeRequest(id),
      withdrawPendingSubmit: (id) => withdrawClubSemesterTimeline(id),
      checkConflicts: clubCheckConflicts,
    };
  }

  const unitLabel = mode === 'icpdp' ? 'IC-PDP' : 'CTSV';
  return {
    isSchool: true,
    unitLabel,
    reviewerLabel: 'Admin',
    pendingKey: 'pending_admin',
    statusSteps: [
      { key: 'draft', label: 'Tạo đơn', match: ['draft', 'revision'] },
      { key: 'pending_admin', label: 'Admin', match: ['pending_admin'] },
      { key: 'approved', label: 'Hoàn tất', match: ['approved', 'rejected', 'cancelled'] },
    ],
    fetchList: async () => {
      const data = await fetchSchoolSemesterTimelines();
      return data.timelines || [];
    },
    fetchDetail: async (id) => {
      const data = await fetchSchoolSemesterTimeline(id);
      return data.timeline;
    },
    fetchPlan: async (id) => {
      const data = await fetchSchoolSemesterTimelinePlan(id);
      return data.plan || {};
    },
    create: async (body) => {
      const data = await createSchoolSemesterTimeline(body);
      return data.timeline;
    },
    update: (id, body) => updateSchoolSemesterTimeline(id, body),
    submit: (id) => submitSchoolSemesterTimeline(id),
    delete: (id) => deleteSchoolSemesterTimeline(id),
    requestChange: (id, body) => requestSchoolSemesterTimelineChange(id, body),
    cancelScheduledDelete: (id) => cancelScheduledSchoolTimelineDelete(id),
    withdrawCancelChangeRequest: (id) => withdrawCancelSchoolTimelineChangeRequest(id),
    withdrawPendingSubmit: (id) => withdrawSchoolSemesterTimeline(id),
    checkConflicts: async (body) => {
      const data = await checkSchoolTimelineConflicts(body);
      return data.results || [];
    },
  };
};
