import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';
import {
  cachedFetchDedup,
  getCached,
  invalidateCache,
  patchEventsInListCaches,
  setCache,
} from '../utils/apiCache';

const LIST_TTL = 45_000;
const DETAIL_TTL = 90_000;
const SUMMARY_TTL = 120_000;

const resolveEventId = (event) => String(event?._id || event?.id || '').trim();

export const eventSummaryCacheKey = (eventId) => `events:summary:${eventId}`;

export const eventDetailCacheKey = (eventId) => {
  const auth = localStorage.getItem('authToken') ? 'auth' : 'guest';
  const role = localStorage.getItem('userRole') || 'guest';
  return `events:detail:${eventId}:${auth}:${role}`;
};

const listCacheScope = () => {
  const auth = localStorage.getItem('authToken') ? 'auth' : 'guest';
  const role = localStorage.getItem('userRole') || 'guest';
  return `${auth}:${role}`;
};

export const buildPublicEventsListCacheKey = ({ q, search, category, club } = {}) => {
  const params = new URLSearchParams();
  const term = String(q || search || '').trim();
  if (term) params.set('q', term);
  if (category && category !== 'all' && category !== 'Tất cả') {
    params.set('category', category);
  }
  if (club?.trim()) params.set('club', club.trim());
  const qs = params.toString();
  return `events:list:${listCacheScope()}:${qs || 'all'}`;
};

export const getCachedPublicEventsList = (params = {}) =>
  getCached(buildPublicEventsListCacheKey(params));

export const seedEventsFromList = (events = []) => {
  if (!Array.isArray(events)) return;
  for (const event of events) {
    const id = resolveEventId(event);
    if (!id) continue;
    setCache(eventSummaryCacheKey(id), event, SUMMARY_TTL);
  }
};

export const getCachedEventSummary = (eventId) =>
  getCached(eventSummaryCacheKey(String(eventId || '')));

export const invalidateEventCaches = (eventId) => {
  const id = String(eventId || '');
  if (!id) return;
  invalidateCache(eventSummaryCacheKey(id));
  invalidateCache(`events:detail:${id}`);
};

/** Cập nhật cache sau đăng ký / hủy đăng ký — không xóa cache danh sách. */
export const syncEventRegistrationInCache = (eventId, apiEvent = null, { registered = true } = {}) => {
  const id = String(eventId || '').trim();
  if (!id) return;

  invalidateCache(`events:detail:${id}`);

  const patchEvent = (ev) => {
    const next = { ...ev, isRegistered: registered };
    if (apiEvent) {
      Object.assign(next, apiEvent, { isRegistered: registered, _id: apiEvent._id || id });
    }
    return next;
  };

  patchEventsInListCaches(id, patchEvent);

  const patch = apiEvent
    ? patchEvent({ ...apiEvent, _id: apiEvent._id || id })
    : null;

  if (patch) {
    seedEventsFromList([patch]);
    setCache(eventDetailCacheKey(id), { success: true, event: patch }, DETAIL_TTL);
    return;
  }

  const summary = getCachedEventSummary(id);
  if (summary) {
    setCache(eventSummaryCacheKey(id), patchEvent(summary), SUMMARY_TTL);
  }
};

export const fetchPublicEvents = async (params = {}, { forceRefresh = false } = {}) => {
  const urlParams = new URLSearchParams();
  const term = String(params.q || params.search || '').trim();
  if (term) urlParams.set('q', term);
  if (params.category && params.category !== 'all' && params.category !== 'Tất cả') {
    urlParams.set('category', params.category);
  }
  if (params.club?.trim()) urlParams.set('club', params.club.trim());

  const qs = urlParams.toString();
  const cacheKey = buildPublicEventsListCacheKey(params);

  const data = await cachedFetchDedup(
    cacheKey,
    async () => {
      const res = await fetch(`${API_BASE}/api/events${qs ? `?${qs}` : ''}`, {
        headers: getAuthHeaders(false),
      });
      const parsed = await parseApiResponse(res);
      if (!parsed.ok || !parsed.data.success) {
        throw new Error(parsed.data.message || 'Không thể tải danh sách sự kiện');
      }
      return parsed.data;
    },
    { ttl: LIST_TTL, forceRefresh }
  );

  if (data?.events?.length) {
    seedEventsFromList(data.events);
  }

  return data;
};

export const fetchPublicEventById = async (eventId, { forceRefresh = false } = {}) => {
  const id = String(eventId || '').trim();
  if (!id) {
    throw new Error('Thiếu mã sự kiện');
  }

  const cacheKey = eventDetailCacheKey(id);

  return cachedFetchDedup(
    cacheKey,
    async () => {
      const res = await fetch(`${API_BASE}/api/events/${id}`, {
        headers: getAuthHeaders(false),
      });
      const parsed = await parseApiResponse(res);
      if (parsed.status === 404) {
        return { success: false, notFound: true };
      }
      if (!parsed.ok || !parsed.data.success) {
        throw new Error(parsed.data.message || 'Không thể tải chi tiết sự kiện');
      }
      if (parsed.data.event) {
        seedEventsFromList([parsed.data.event]);
      }
      return parsed.data;
    },
    { ttl: DETAIL_TTL, forceRefresh }
  );
};

export const prefetchPublicEventById = (eventId) => {
  const id = String(eventId || '').trim();
  if (!id) return;
  if (getCached(eventDetailCacheKey(id))) return;
  fetchPublicEventById(id).catch(() => {});
};
