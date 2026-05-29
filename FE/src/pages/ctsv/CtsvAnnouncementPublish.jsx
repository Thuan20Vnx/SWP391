import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchCtsvAnnouncements, fetchCtsvEvents, publishCtsvAnnouncement } from '../../services/ctsvApi';

const CtsvAnnouncementPublish = () => {
  const { showToast } = useOutletContext() || {};
  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', eventId: '' });

  useEffect(() => {
    fetchCtsvEvents({ status: 'approved' })
      .then((d) => setEvents(d.events || []))
      .catch(() => {});
    fetchCtsvAnnouncements()
      .then((d) => setHistory(d.announcements || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast?.('Nhập tiêu đề thông báo.', 'error');
      return;
    }
    try {
      await publishCtsvAnnouncement({
        title: form.title,
        content: form.content,
        eventId: form.eventId || undefined
      });
      showToast?.('Đã phát hành thông báo chính thức!', 'success');
      setForm({ title: '', content: '', eventId: '' });
      const d = await fetchCtsvAnnouncements();
      setHistory(d.announcements || []);
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  return (
    <div className="ctsv-page">
      <h1>Phát hành thông báo chính thức</h1>
      <p className="ctsv-muted">Thông báo sau khi sự kiện được CTSV phê duyệt.</p>

      <form className="ctsv-form" onSubmit={handleSubmit}>
        <label>
          Tiêu đề *
          <input
            className="ctsv-input"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </label>
        <label>
          Liên kết sự kiện
          <select
            className="ctsv-select"
            value={form.eventId}
            onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))}
          >
            <option value="">— Không chọn —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nội dung
          <textarea
            className="ctsv-textarea"
            rows={6}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          />
        </label>
        <button type="submit" className="ctsv-btn-primary">
          Phát hành
        </button>
      </form>

      <h2>Đã phát hành</h2>
      <ul className="ctsv-list-plain">
        {history.map((a) => (
          <li key={a._id}>
            <strong>{a.title}</strong> — {new Date(a.publishedAt).toLocaleDateString('vi-VN')}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CtsvAnnouncementPublish;
