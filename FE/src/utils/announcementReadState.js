const STORAGE_KEY = 'fevents_announcement_read_ids';

const readSet = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

export const applyReadState = (announcements = []) => {
  const read = readSet();
  return announcements.map((item) => ({
    ...item,
    unread: !read.has(String(item.id))
  }));
};

export const markAnnouncementRead = (id) => {
  if (!id) return;
  const read = readSet();
  read.add(String(id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...read]));
};

export const markAllAnnouncementsRead = (ids = []) => {
  const read = readSet();
  ids.forEach((id) => read.add(String(id)));
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...read]));
};
