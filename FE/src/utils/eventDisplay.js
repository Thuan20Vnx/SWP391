/**
 * Code First — hiển thị media sự kiện (banner CTSV lưu ở image)
 */

const DEFAULT_EVENT_IMAGE =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';

export const resolveEventDisplayImage = (event, fallback = DEFAULT_EVENT_IMAGE) =>
  event?.image || event?.thumbnail || fallback;
