import { useOutletContext, useParams } from 'react-router-dom';
import SemesterTimelinePanel from '../../components/timeline/SemesterTimelinePanel';

const CtsvSemesterTimelines = () => {
  const { showToast } = useOutletContext() || {};
  const { id } = useParams();
  return <SemesterTimelinePanel mode="ctsv" showToast={showToast} initialTimelineId={id} />;
};

export default CtsvSemesterTimelines;
