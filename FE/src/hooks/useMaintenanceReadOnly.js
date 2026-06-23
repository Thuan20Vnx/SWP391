import useSystemMaintenanceStatus from './useSystemMaintenanceStatus';
import { isAdminRole, isMaintenanceViewOnlyStaff } from '../utils/auth';
import { isMaintenanceBlocking } from '../utils/maintenanceGrace';

export default function useMaintenanceReadOnly() {
  const { status, loading } = useSystemMaintenanceStatus(5000);
  const blocking = isMaintenanceBlocking(status);
  const readOnly = !loading && blocking && isMaintenanceViewOnlyStaff();
  const adminBypass = isAdminRole();

  return {
    readOnly,
    blocking,
    loading,
    status,
    adminBypass,
  };
}
