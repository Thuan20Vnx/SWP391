import React, { useMemo } from 'react';

const ClubDashboardPanel = ({ events, loadingEvents, userProfile, onViewEvent }) => {
  const stats = useMemo(() => {
    const approved = events.filter((e) => e.status === 'approved').length;
    const pending = events.filter((e) => e.status === 'pending').length;
    const rejected = events.filter((e) => e.status === 'rejected').length;
    const totalRegs = events.reduce((sum, e) => sum + (e.registeredCount || 0), 0);
    const totalCap = events.reduce((sum, e) => sum + (e.capacity || 0), 0);
    const now = Date.now();
    const upcoming = events.filter(
      (e) => e.status === 'approved' && e.startDate && new Date(e.startDate).getTime() >= now
    ).length;
    const fillRate = totalCap > 0 ? Math.round((totalRegs / totalCap) * 100) : 0;
    return { total: events.length, approved, pending, rejected, totalRegs, totalCap, upcoming, fillRate };
  }, [events]);

  const recentEvents = useMemo(() => events.slice(0, 5), [events]);

  const statCards = [
    { label: 'Tổng sự kiện', value: stats.total, hint: 'Tất cả đề xuất & sự kiện' },
    { label: 'Đã duyệt', value: stats.approved, hint: 'Sẵn sàng tổ chức' },
    { label: 'Chờ duyệt', value: stats.pending, hint: 'Đang xét duyệt' },
    { label: 'Lượt đăng ký', value: stats.totalRegs, hint: `Tỷ lệ lấp đầy ${stats.fillRate}%` },
    { label: 'Sắp diễn ra', value: stats.upcoming, hint: 'Sự kiện đã duyệt' },
    { label: 'Bị từ chối', value: stats.rejected, hint: 'Cần chỉnh sửa & gửi lại' },
  ];

  return (
    <div className="clb-dashboard-panel">
      <div className="clb-page-header">
        <div>
          <h1 className="clb-page-title">DASHBOARD THỐNG KÊ SỐ LIỆU</h1>
          <p className="clb-page-subtitle">
            Tổng quan hoạt động sự kiện CLB
            {userProfile?.fullname ? (
              <> — <strong>{userProfile.fullname}</strong></>
            ) : null}
          </p>
        </div>
      </div>

      {loadingEvents ? (
        <p className="clb-panel-empty">Đang tải dữ liệu...</p>
      ) : (
        <>
          <div className="clb-dash-stats">
            {statCards.map((card) => (
              <article key={card.label} className="clb-dash-stat-card">
                <span className="clb-dash-stat-label">{card.label}</span>
                <strong className="clb-dash-stat-value">{card.value}</strong>
                <span className="clb-dash-stat-hint">{card.hint}</span>
              </article>
            ))}
          </div>

          <section className="clb-dash-section">
            <h2 className="clb-dash-section-title">Sự kiện gần đây</h2>
            {recentEvents.length === 0 ? (
              <p className="clb-panel-empty">Chưa có sự kiện nào. Tạo đề xuất đầu tiên từ sidebar.</p>
            ) : (
              <div className="clb-table-wrapper">
                <div className="clb-table-scroll">
                  <table className="clb-table">
                    <thead>
                      <tr>
                        <th>TÊN SỰ KIỆN</th>
                        <th>ĐĂNG KÝ</th>
                        <th>TRẠNG THÁI</th>
                        <th className="clb-table-col-action">HÀNH ĐỘNG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEvents.map((ev) => {
                        const reg = ev.registeredCount || 0;
                        const cap = ev.capacity || 0;
                        const pct = cap > 0 ? Math.min(100, Math.round((reg / cap) * 100)) : 0;
                        const statusLabel =
                          ev.status === 'approved' ? 'Đã duyệt' : ev.status === 'pending' ? 'Chờ duyệt' : 'Từ chối';
                        const statusTone =
                          ev.status === 'approved' ? 'approved' : ev.status === 'pending' ? 'pending' : 'rejected';
                        return (
                          <tr key={ev._id}>
                            <td><span className="clb-event-name">{ev.title}</span></td>
                            <td>
                              <div className="clb-slot-cell">
                                <span className="clb-slot-nums">{reg}/{cap}</span>
                                <div className="clb-slot-bar-bg">
                                  <div className="clb-slot-bar-fill" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`clb-table-status clb-table-status--${statusTone}`}>{statusLabel}</span>
                            </td>
                            <td className="clb-table-col-action">
                              <button type="button" className="clb-btn-secondary clb-btn-sm" onClick={() => onViewEvent?.(ev._id)}>
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default ClubDashboardPanel;
