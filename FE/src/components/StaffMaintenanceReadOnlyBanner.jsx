import React from 'react';
import useMaintenanceReadOnly from '../hooks/useMaintenanceReadOnly';

const StaffMaintenanceReadOnlyBanner = () => {
  const { readOnly } = useMaintenanceReadOnly();
  if (!readOnly) return null;

  return (
    <div className="staff-maint-readonly-banner" role="alert">
      <strong>Chế độ bảo trì — chỉ xem</strong>
      <span>
        Hệ thống đang bảo trì. Bạn có thể duyệt dữ liệu nhưng không thể tạo, sửa, duyệt hay gửi thao tác mới.
      </span>
    </div>
  );
};

export default StaffMaintenanceReadOnlyBanner;
