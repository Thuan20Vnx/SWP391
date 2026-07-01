import React from 'react';
import { useLocation } from 'react-router-dom';
import EventManagementDetail from '../EventManagementDetail';

const CtsvEventDetail = () => {
  const { pathname } = useLocation();
  const portal = pathname.startsWith('/admin/ctsv') ? 'admin' : 'ctsv';
  return <EventManagementDetail portal={portal} />;
};

export default CtsvEventDetail;
