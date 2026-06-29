import { useOutletContext } from 'react-router-dom';
import SemesterTimelinePanel from '../../components/timeline/SemesterTimelinePanel';

const CtsvSemesterTimelines = () => {
  const { showToast } = useOutletContext() || {};
  return <SemesterTimelinePanel mode="ctsv" showToast={showToast} />;
};

export default CtsvSemesterTimelines;
