import React, { useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import EventCalendarPage from '../../components/calendar/EventCalendarPage';
import { fetchPartnerCalendar } from '../../services/partnerApi';

// Lịch toàn trường gồm cả sự kiện của trường/CLB. `/partner/events/:id` chỉ mở được
// sự kiện do chính đối tác tổ chức (BE trả 403/404 → toast "Không tải được sự kiện"),
// nên phần còn lại phải trỏ sang trang chi tiết công khai nhúng trong cổng đối tác.
const resolvePartnerEventLink = (event) =>
  event.isOwner ? `/partner/events/${event.id}` : `/partner/join/events/${event.id}`;

const PartnerCalendar = () => {
  const { showToast } = useOutletContext() || {};
  const loadEvents = useCallback(() => fetchPartnerCalendar(), []);

  return (
    <EventCalendarPage
      showToast={showToast}
      fetchEvents={loadEvents}
      resolveEventLink={resolvePartnerEventLink}
      eyebrow="Lịch toàn trường"
      title="Lịch sự kiện toàn trường"
      description="Theo dõi toàn bộ sự kiện cấp trường, đối tác và CLB theo tháng để lên kế hoạch phối hợp tốt hơn."
    />
  );
};

export default PartnerCalendar;
