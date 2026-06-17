/** Một chip active tại một thời điểm — gộp loại + trạng thái */
export const EVENT_REQUEST_FILTERS = [
  { id: 'pending', labelKey: 'admin.eventRequests.filter.pending', status: 'pending', type: 'all' },
  { id: 'edit', labelKey: 'admin.eventRequests.filter.edit', status: 'pending', type: 'edit' },
  { id: 'hide', labelKey: 'admin.eventRequests.filter.hide', status: 'pending', type: 'hide' },
  { id: 'delete', labelKey: 'admin.eventRequests.filter.delete', status: 'pending', type: 'delete' },
  { id: 'all-status', labelKey: 'admin.eventRequests.filter.allStatus', status: 'all', type: 'all' },
];
export const EVENT_REQUEST_TYPE_META = {
  edit: { labelKey: 'admin.eventRequests.type.edit', tone: 'edit' },
  hide: { labelKey: 'admin.eventRequests.type.hide', tone: 'hide' },
  delete: { labelKey: 'admin.eventRequests.type.delete', tone: 'delete' },
};
