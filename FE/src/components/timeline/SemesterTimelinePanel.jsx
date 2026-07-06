import ClubSemesterTimelinePanel from '../club/ClubSemesterTimelinePanel';

/**
 * Shared semester timeline panel — club, IC-PDP, or CTSV mode.
 */
const SemesterTimelinePanel = ({ mode = 'club', showToast, initialTimelineId }) => (
  <ClubSemesterTimelinePanel mode={mode} showToast={showToast} initialTimelineId={initialTimelineId} />
);

export default SemesterTimelinePanel;
