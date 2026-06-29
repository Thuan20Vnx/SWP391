import ClubSemesterTimelinePanel from '../club/ClubSemesterTimelinePanel';

/**
 * Shared semester timeline panel — club, IC-PDP, or CTSV mode.
 */
const SemesterTimelinePanel = ({ mode = 'club', showToast }) => (
  <ClubSemesterTimelinePanel mode={mode} showToast={showToast} />
);

export default SemesterTimelinePanel;
