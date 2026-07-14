import React, { useMemo } from 'react';

const dayLabel = (key) => {
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const timeLabel = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const isValidDayKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));

const pad2 = (n) => String(n).padStart(2, '0');

/** Khóa ngày 'YYYY-MM-DD' theo giờ địa phương từ một mốc ISO. */
const localDayKey = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/**
 * Trả về danh sách session theo ngày của một sinh viên.
 * Ưu tiên attendanceLog; nếu chưa có (dữ liệu cũ) thì suy ra 1 session từ checkedInAt/checkedOutAt cấp cao.
 */
const resolveStudentSessions = (s) => {
  const log = Array.isArray(s.attendanceLog) ? s.attendanceLog : [];
  const valid = log.filter((l) => isValidDayKey(l.sessionKey));
  if (valid.length) {
    return valid.map((l) => ({ sessionKey: l.sessionKey, in: l.checkedInAt, out: l.checkedOutAt }));
  }
  const key = localDayKey(s.checkedInAt) || localDayKey(s.checkedOutAt);
  if (key) {
    return [{ sessionKey: key, in: s.checkedInAt || null, out: s.checkedOutAt || null }];
  }
  return [];
};

const EventAttendanceMatrixPanel = ({ event, students = [] }) => {
  const activeStudents = useMemo(
    () => students.filter((s) => s.status !== 'cancelled'),
    [students]
  );

  // Một ngày được tính nếu BTC đã mở check-in/out ngày đó HOẶC có sinh viên đã điểm danh ngày đó
  // (gộp cả dữ liệu điểm danh cũ trước khi có attendanceOpenDays). Nếu không có ngày nào → bảng rỗng.
  const dayKeys = useMemo(() => {
    const set = new Set();
    (Array.isArray(event?.attendanceOpenDays) ? event.attendanceOpenDays : [])
      .filter(isValidDayKey)
      .forEach((k) => set.add(k));
    activeStudents.forEach((s) => {
      resolveStudentSessions(s).forEach((sess) => set.add(sess.sessionKey));
    });
    return [...set].sort();
  }, [event?.attendanceOpenDays, activeStudents]);

  // Map sessionKey -> {in,out} cho mỗi sinh viên + tổng số ngày tham gia.
  const rows = useMemo(
    () =>
      activeStudents.map((s) => {
        const byDay = {};
        resolveStudentSessions(s).forEach((sess) => {
          byDay[sess.sessionKey] = { in: sess.in, out: sess.out };
        });
        const attendedDays = dayKeys.filter((k) => byDay[k]?.in).length;
        return {
          id: s._id,
          name: s.student?.fullname || '—',
          studentId: s.student?.studentId || '',
          email: s.student?.email || '',
          byDay,
          attendedDays,
        };
      }),
    [activeStudents, dayKeys]
  );

  const perDayCount = useMemo(
    () => dayKeys.map((k) => rows.filter((r) => r.byDay[k]?.in).length),
    [dayKeys, rows]
  );

  const handleExportCsv = () => {
    const header = ['Sinh viên', 'MSSV', 'Email', ...dayKeys.map(dayLabel), 'Số ngày tham gia'];
    const lines = rows.map((r) => {
      const cells = dayKeys.map((k) => {
        const c = r.byDay[k];
        if (!c?.in) return 'Vắng';
        return `Vào ${timeLabel(c.in)}${c.out ? ` - Ra ${timeLabel(c.out)}` : ''}`;
      });
      return [r.name, r.studentId, r.email, ...cells, `${r.attendedDays}/${dayKeys.length}`];
    });
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [header, ...lines].map((row) => row.map(esc).join(',')).join('\r\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diem-danh-${(event?.title || 'su-kien').replace(/[^\w\-]+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (dayKeys.length === 0) {
    return (
      <div className="ev-panel-empty-cell">
        Chưa có ngày điểm danh nào. Bảng sẽ bắt đầu tính từ ngày BTC mở check-in/check-out cho sự kiện.
      </div>
    );
  }

  return (
    <div className="ev-table-card">
      <div className="ev-table-toolbar ev-attendance-toolbar">
        <div>
          <h3 className="ev-attendance-title">Điểm danh theo ngày</h3>
          <p className="ev-attendance-sub">
            {dayKeys.length} ngày · {activeStudents.length} người đăng ký
          </p>
        </div>
        <button type="button" className="ev-btn-outline" onClick={handleExportCsv} disabled={rows.length === 0}>
          Xuất CSV
        </button>
      </div>

      <div className="ev-table-wrapper ev-attendance-wrapper">
        <table className="ev-table ev-attendance-table">
          <thead>
            <tr>
              <th className="ev-attendance-name-col">SINH VIÊN</th>
              {dayKeys.map((k) => (
                <th key={k} className="ev-attendance-day-col">{dayLabel(k)}</th>
              ))}
              <th className="ev-attendance-total-col">TỔNG</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={dayKeys.length + 2} className="ev-panel-empty-cell">
                  Chưa có sinh viên đăng ký.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="ev-attendance-name-col">
                    <span className="ev-attendance-name">{r.name}</span>
                    {r.studentId && <span className="ev-attendance-mssv">{r.studentId}</span>}
                  </td>
                  {dayKeys.map((k) => {
                    const c = r.byDay[k];
                    if (!c?.in) {
                      return (
                        <td key={k} className="ev-attendance-cell ev-attendance-cell--absent">
                          Vắng
                        </td>
                      );
                    }
                    return (
                      <td key={k} className="ev-attendance-cell ev-attendance-cell--present">
                        <span className="ev-attendance-in">Vào {timeLabel(c.in)}</span>
                        <span className="ev-attendance-out">
                          {c.out ? `Ra ${timeLabel(c.out)}` : 'Chưa ra'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="ev-attendance-total-col">
                    <span className="ev-attendance-total-badge">
                      {r.attendedDays}/{dayKeys.length}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td className="ev-attendance-name-col ev-attendance-foot-label">Có mặt mỗi ngày</td>
                {perDayCount.map((n, i) => (
                  <td key={dayKeys[i]} className="ev-attendance-foot-count">
                    {n}/{activeStudents.length}
                  </td>
                ))}
                <td className="ev-attendance-total-col" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default EventAttendanceMatrixPanel;
