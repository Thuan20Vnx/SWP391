import React, { useMemo } from 'react';

const EventReportPanel = ({ event, students = [] }) => {
  const stats = useMemo(() => {
    const registered = students.filter((s) => s.status !== 'cancelled').length;
    const checkedIn = students.filter((s) => s.status === 'checked-in' || s.status === 'attended').length;
    const checkedOut = students.filter((s) => s.checkedOutAt).length;
    const cancelled = students.filter((s) => s.status === 'cancelled').length;
    const checkinRate = registered > 0 ? Math.round((checkedIn / registered) * 100) : 0;
    return { registered, checkedIn, checkedOut, cancelled, checkinRate };
  }, [students]);

  if (!event) {
    return <p className="ev-panel-empty">Đang tải báo cáo…</p>;
  }

  const isEnded = event.endDate ? new Date(event.endDate) < new Date() : false;

  return (
    <div className="ev-report-panel">
      <section className="ev-report-section">
        <h3 className="ev-overview-title">Tổng hợp tham dự</h3>
        <div className="ev-report-stats">
          <article className="ev-report-stat">
            <span className="ev-report-stat__label">Đăng ký</span>
            <strong className="ev-report-stat__value">{stats.registered}</strong>
          </article>
          <article className="ev-report-stat">
            <span className="ev-report-stat__label">Check-in</span>
            <strong className="ev-report-stat__value">{stats.checkedIn}</strong>
          </article>
          <article className="ev-report-stat">
            <span className="ev-report-stat__label">Check-out</span>
            <strong className="ev-report-stat__value">{stats.checkedOut}</strong>
          </article>
          <article className="ev-report-stat">
            <span className="ev-report-stat__label">Tỷ lệ check-in</span>
            <strong className="ev-report-stat__value">{stats.checkinRate}%</strong>
          </article>
        </div>
      </section>

      <section className="ev-report-section">
        <h3 className="ev-overview-title">Minh chứng & đánh giá</h3>
        <div className="ev-report-evidence">
          <div className="ev-report-evidence-item">
            <span>Ảnh bìa sự kiện</span>
            {event.thumbnail || event.image ? (
              <img src={event.thumbnail || event.image} alt={event.title} className="ev-report-thumb" />
            ) : (
              <p className="ev-panel-empty-cell">Chưa có ảnh minh chứng.</p>
            )}
          </div>
          <div className="ev-report-evidence-item">
            <span>Đánh giá trung bình</span>
            <strong>{event.rating || event.averageRating || '0.0'} / 5</strong>
            <p className="ev-cancel-hint">{event.ratingCount || event.reviewCount || 0} lượt phản hồi</p>
          </div>
          <div className="ev-report-evidence-item">
            <span>Trạng thái báo cáo</span>
            <strong>{isEnded ? 'Sẵn sàng nộp báo cáo' : 'Sự kiện chưa kết thúc'}</strong>
            <p className="ev-cancel-hint">
              {isEnded
                ? 'Bạn có thể tải danh sách tham dự và ảnh sự kiện làm minh chứng.'
                : 'Báo cáo đầy đủ sẽ khả dụng sau khi sự kiện kết thúc.'}
            </p>
          </div>
        </div>
      </section>

      <section className="ev-report-section">
        <h3 className="ev-overview-title">Ghi chú nội bộ</h3>
        <p className="ev-overview-desc">
          {event.ctsvNote?.trim() || event.icpdpNote?.trim() || 'Chưa có ghi chú từ CTSV/IC-PDP.'}
        </p>
      </section>
    </div>
  );
};

export default EventReportPanel;
