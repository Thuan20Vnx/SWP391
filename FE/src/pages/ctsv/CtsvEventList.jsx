import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import AppSelect from '../../components/ui/AppSelect';
import { fetchCtsvEvents, MOCK_EVENTS } from '../../services/ctsvApi';

const TIME_FILTER_OPTIONS = [
  { value: 'Tất cả', label: 'Tất cả thời gian' },
  { value: 'Hôm nay', label: 'Hôm nay' },
  { value: 'Tuần này', label: 'Tuần này' }
];

const CATEGORY_FILTER_OPTIONS = [
  { value: 'Tất cả', label: 'Tất cả chủ đề' },
  { value: 'Âm nhạc', label: 'Âm nhạc' },
  { value: 'Workshop', label: 'Workshop' },
  { value: 'Công nghệ', label: 'Công nghệ' },
  { value: 'Kết nối', label: 'Kết nối' }
];
import { getCtsvEventAccess } from '../../utils/ctsvEventAccess';
import { statusClass } from '../../utils/eventStatus';

const CtsvEventList = () => {
  const { showToast } = useOutletContext() || {};
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [loading, setLoading] = useState(true);

  const loadEvents = () => {
    setLoading(true);
    fetchCtsvEvents({ q: searchQuery, category: categoryFilter, time: timeFilter })
      .then((d) => setEvents(d.events || []))
      .catch(() => {
        setEvents(MOCK_EVENTS);
        showToast?.('Dùng dữ liệu demo — kiểm tra BE đang chạy.', 'info');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleFilter = (e) => {
    e?.preventDefault();
    loadEvents();
    showToast?.(`Đã lọc ${events.length} sự kiện.`, 'success');
  };

  return (
    <div className="ctsv-page">
      <div className="ctsv-page-header">
        <div>
          <h1>Tìm kiếm &amp; Duyệt sự kiện</h1>
          <p>
            Phê duyệt sự kiện cấp trường; các sự kiện CLB/đối tác chỉ xem thông tin.
          </p>
        </div>
        <Link to="/ctsv/events/create" className="ctsv-btn-primary">
          Tạo sự kiện cấp trường
        </Link>
      </div>

      <form className="ctsv-filter-row" onSubmit={handleFilter}>
        <input
          type="search"
          placeholder="Tìm kiếm sự kiện..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ctsv-input"
        />
        <AppSelect
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          options={TIME_FILTER_OPTIONS}
          fullWidth={false}
        />
        <AppSelect
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={CATEGORY_FILTER_OPTIONS}
          fullWidth={false}
        />
        <button type="submit" className="ctsv-btn-primary">
          Lọc kết quả
        </button>
      </form>

      {loading ? (
        <p className="ctsv-muted">Đang tải...</p>
      ) : (
        <div className="event-grid-cards">
          {events.map((ev) => {
            const access = getCtsvEventAccess(ev);
            return (
            <article key={ev.id} className="event-card-item">
              <div className="event-card-image-wrapper">
                <img src={ev.image} alt={ev.title} className="event-card-img" />
                <span className="event-card-category-badge">{ev.category}</span>
              </div>
              <div className="event-card-body">
                <h3 className="event-card-title">{ev.title}</h3>
                <div className="event-card-details">
                  <div className="detail-row">
                    <span>
                      {ev.date} • {ev.time}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="location-text">{ev.location}</span>
                  </div>
                </div>
                <div className="event-card-divider" />
                <div className="event-card-footer">
                  <div className="ticket-info">
                    <span className="ticket-remain-text">
                      Còn: {ev.remainingTickets}/{ev.totalTickets}
                    </span>
                    <span className={`status-pill ${statusClass(ev.status, ev.statusKey)}`}>{ev.status}</span>
                  </div>
                  <Link
                    to={`/ctsv/events/${ev.id}`}
                    className={`btn-card-register ${access.buttonClass}`}
                  >
                    {access.label}
                  </Link>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CtsvEventList;
