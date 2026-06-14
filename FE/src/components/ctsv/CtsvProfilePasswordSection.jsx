import React from 'react';
import ProfilePasswordSection from '../profile/ProfilePasswordSection';

const CtsvProfilePasswordSection = (props) => (
  <ProfilePasswordSection
    idPrefix="ctsv"
    description="Cập nhật mật khẩu đăng nhập tài khoản cán bộ CTSV."
    {...props}
  />
);

export default CtsvProfilePasswordSection;
