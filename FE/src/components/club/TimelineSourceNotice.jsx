import React from 'react';
import { buildTimelineSourceMessage } from '../../utils/timelineSourceLabel';

const TimelineSourceNotice = ({ source, className = '' }) => {
  const message = buildTimelineSourceMessage(source?.timelineSource || source);
  if (!message) return null;

  return (
    <p className={`clb-timeline-source-note ${className}`.trim()} role="note">
      {message}
    </p>
  );
};

export default TimelineSourceNotice;
