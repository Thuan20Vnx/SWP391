import React from 'react';
import { calendarDayKey } from '../../utils/eventVenueNormalize';
import { formatTimeRangeLabel } from '../../utils/timelineTimeRange';

const fmtDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN');
};

const buildConflictMessage = (conflict, venue, currentRange) => {
  const venueLabel = venue || conflict.location || 'địa điểm này';
  const dateLabel = fmtDate(conflict.plannedDate);
  const timeLabel =
    conflict.timeRangeLabel ||
    formatTimeRangeLabel(conflict.plannedDate, conflict.plannedEndDate);
  const owner = conflict.ownerLabel || 'đơn vị khác';
  const activity = conflict.itemTitle ? ` «${conflict.itemTitle}»` : '';
  const semester = conflict.semesterLabel ? ` (${conflict.semesterLabel})` : '';
  const currentTime =
    currentRange?.start && currentRange?.end
      ? formatTimeRangeLabel(currentRange.start, currentRange.end)
      : '';

  return (
    <>
      {currentTime ? (
        <>
          Khung giờ <strong>{currentTime}</strong> tại <strong>{venueLabel}</strong>
        </>
      ) : (
        <>
          Khu vực <strong>{venueLabel}</strong>
        </>
      )}
      {dateLabel ? (
        <>
          {' '}
          ngày <strong>{dateLabel}</strong>
        </>
      ) : null}{' '}
      trùng với <strong>{owner}</strong>
      {activity}
      {timeLabel ? (
        <>
          {' '}
          (<strong>{timeLabel}</strong>)
        </>
      ) : null}
      {semester}.
    </>
  );
};

const TimelineLocationConflictNotice = ({
  conflicts = [],
  venue = '',
  plannedDate = null,
  plannedEndDate = null,
  variant = 'warning',
  className = '',
  title,
}) => {
  if (!conflicts?.length) return null;

  const currentRange = { start: plannedDate, end: plannedEndDate };

  if (variant === 'info') {
    return (
      <div className={`tl-conflict-notice tl-conflict-notice--info ${className}`.trim()} role="status">
        <p className="tl-conflict-notice__title">
          {title || 'Cảnh báo trùng khung giờ & địa điểm'}
        </p>
        <ul className="tl-conflict-notice__list">
          {conflicts.map((conflict, index) => (
            <li key={`${conflict.timelineId}-${conflict.itemTitle}-${index}`}>
              {buildConflictMessage(conflict, venue || conflict.location, currentRange)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const primary = conflicts[0];
  return (
    <div className={`tl-conflict-notice tl-conflict-notice--warning ${className}`.trim()} role="alert">
      <p className="tl-conflict-notice__text">
        {buildConflictMessage(primary, venue, currentRange)}
      </p>
      {conflicts.length > 1 && (
        <p className="tl-conflict-notice__meta">
          +{conflicts.length - 1} xung đột khác cùng địa điểm ({calendarDayKey(plannedDate || primary.plannedDate)}).
        </p>
      )}
    </div>
  );
};

export default TimelineLocationConflictNotice;
