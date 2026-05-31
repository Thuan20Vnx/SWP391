/** Một chip active tại một thời điểm — gộp loại + trạng thái */
export const EVENT_REQUEST_FILTERS = [
  { id: 'pending', label: 'Chờ xử lý', status: 'pending', type: 'all' },
  { id: 'edit', label: 'Chỉnh sửa', status: 'pending', type: 'edit' },
  { id: 'hide', label: 'Ẩn', status: 'pending', type: 'hide' },
  { id: 'delete', label: 'Xóa', status: 'pending', type: 'delete' },
  { id: 'all-status', label: 'Mọi trạng thái', status: 'all', type: 'all' },
];
export const EVENT_REQUEST_TYPE_META = {
  edit: { label: 'Chỉnh sửa', tone: 'edit' },
  hide: { label: 'Ẩn', tone: 'hide' },
  delete: { label: 'Xóa', tone: 'delete' },
};
