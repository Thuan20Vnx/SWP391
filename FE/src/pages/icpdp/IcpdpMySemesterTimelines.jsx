import { useOutletContext } from 'react-router-dom';
import SemesterTimelinePanel from '../../components/timeline/SemesterTimelinePanel';

const IcpdpMySemesterTimelines = () => {
  const { showToast } = useOutletContext() || {};
  return <SemesterTimelinePanel mode="icpdp" showToast={showToast} />;
};

export default IcpdpMySemesterTimelines;
