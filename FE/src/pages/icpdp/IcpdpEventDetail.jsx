import { useEffect, useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { fetchIcpdpEvent } from '../../services/icpdpApi';
import EventManagementDetail from '../EventManagementDetail';

const isIcpdpSchoolEvent = (event) =>
  event?.source === 'school' && event?.schoolOrganizerRole === 'icpdp';

export default function IcpdpEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [mode, setMode] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchIcpdpEvent(id)
      .then((data) => {
        if (cancelled) return;
        const event = data?.event;
        if (!event) throw new Error('missing');
        setMode(isIcpdpSchoolEvent(event) ? 'school' : 'club');
      })
      .catch(() => {
        if (cancelled) return;
        showToast?.('Không tải được sự kiện.', 'error');
        navigate('/icpdp/events');
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate, showToast]);

  if (mode === null) {
    return (
      <div className="ctsv-ed-page">
        <div className="ctsv-ed-skeleton-hero sk" />
        <div className="ctsv-ed-skeleton-tabs">
          <div className="sk sk-line sk-line--short" />
          <div className="sk sk-line sk-line--short" />
          <div className="sk sk-line sk-line--short" />
        </div>
        <div className="ctsv-ed-skeleton-panel sk" />
      </div>
    );
  }

  if (mode === 'school') {
    return <EventManagementDetail portal="icpdp_school" listPath="/icpdp/events" />;
  }

  return <EventManagementDetail portal="icpdp_club" listPath="/icpdp/events" />;
}
