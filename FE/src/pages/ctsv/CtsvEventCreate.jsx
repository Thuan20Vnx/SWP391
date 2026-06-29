import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import EventProposalForm from '../../components/events/EventProposalForm';
import { createCtsvEvent, fetchCtsvEvent, fetchCtsvEvents, updateCtsvEvent } from '../../services/ctsvApi';
import { createIcpdpSchoolEvent, fetchIcpdpEvent, fetchIcpdpEvents, updateIcpdpSchoolEvent } from '../../services/icpdpApi';
import { fetchSchoolSemesterTimelines } from '../../services/schoolTimelineApi';
import { canEditSchoolEventForPortal } from '../../constants/eventWorkflow';
import { mapApiEventToForm } from '../../utils/eventFormState';

const CtsvEventCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { showToast } = useOutletContext() || {};

  const isIcpdp = location.pathname.startsWith('/icpdp');
  const portalRole = isIcpdp ? 'icpdp' : 'ctsv';
  const portalBase = isIcpdp ? '/icpdp' : '/ctsv';
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [initialForm, setInitialForm] = useState(null);
  const [bannerFileName, setBannerFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approvedTimelines, setApprovedTimelines] = useState([]);
  const [schoolEvents, setSchoolEvents] = useState([]);

  useEffect(() => {
    if (isEdit) return undefined;
    let cancelled = false;
    Promise.all([
      fetchSchoolSemesterTimelines(),
      isIcpdp ? fetchIcpdpEvents() : fetchCtsvEvents(),
    ])
      .then(([timelineRes, eventsRes]) => {
        if (cancelled) return;
        const timelines = (timelineRes.timelines || []).filter((tl) => tl.statusKey === 'approved');
        setApprovedTimelines(timelines);
        setSchoolEvents(eventsRes?.events || eventsRes?.items || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isEdit, isIcpdp]);

  const existingEvents = useMemo(
    () => schoolEvents.map((ev) => ({ id: ev.id || ev._id, title: ev.title, status: ev.status })),
    [schoolEvents]
  );

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    setLoading(true);
    const fetchEvent = isIcpdp ? fetchIcpdpEvent : fetchCtsvEvent;
    fetchEvent(id)
      .then((data) => {
        if (cancelled) return;
        const event = data?.event || data;
        if (!event) {
          showToast?.('Không tải được sự kiện.', 'error');
          navigate(`${portalBase}/events`);
          return;
        }
        if (!canEditSchoolEventForPortal(event, portalRole)) {
          showToast?.('Sự kiện không thể chỉnh sửa ở trạng thái hiện tại.', 'error');
          navigate(`${portalBase}/events`);
          return;
        }
        setInitialForm(mapApiEventToForm(event));
        setBannerFileName(event.bannerFileName || '');
      })
      .catch(() => {
        if (!cancelled) {
          showToast?.('Lỗi khi tải sự kiện.', 'error');
          navigate(`${portalBase}/events`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, isIcpdp, navigate, portalBase, portalRole, showToast]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        if (isIcpdp) await updateIcpdpSchoolEvent(id, payload);
        else await updateCtsvEvent(id, payload);
        showToast?.('Đã cập nhật và gửi lại Admin phê duyệt.', 'success');
      } else {
        if (isIcpdp) await createIcpdpSchoolEvent(payload);
        else await createCtsvEvent(payload);
        showToast?.('Đã gửi đơn tổ chức sự kiện. Chờ Admin phê duyệt.', 'success');
      }
      navigate(`${portalBase}/events`);
    } catch (err) {
      showToast?.(err.message || 'Gửi đề xuất thất bại.', 'error');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="ctsv-page ctsv-create-page">
        <p className="ctsv-muted">Đang tải sự kiện…</p>
      </div>
    );
  }

  return (
    <div className="ctsv-page ctsv-create-page">
      <header className="ctsv-page-header">
        <div>
          <Link to={`${portalBase}/events`} className="ctsv-back-link">
            ← Danh sách sự kiện
          </Link>
          <h1 className="ctsv-page-title">
            {isEdit ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
          </h1>
        </div>
      </header>

      <EventProposalForm
        role={portalRole}
        showToast={showToast}
        editingId={id}
        isEditMode={isEdit}
        initialForm={initialForm}
        bannerFileName={bannerFileName}
        onBannerFileNameChange={setBannerFileName}
        submitting={submitting}
        onCancel={() => navigate(`${portalBase}/events`)}
        onSubmit={handleSubmit}
        hideHeader
        hideBackButton
        approvedTimelines={approvedTimelines}
        clubEvents={existingEvents}
      />
    </div>
  );
};

export default CtsvEventCreate;
