import React, { useState } from 'react';
import {
  isPartnerImageSrc,
  partnerInitials,
  resolvePartnerAvatarSrc,
} from '../../utils/partnerDisplay';

const PartnerAvatar = ({ partner, className = '', size = 'md' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const name = partner?.name || partner?.companyName || '';
  const src = resolvePartnerAvatarSrc(partner);
  const showImg = isPartnerImageSrc(src) && !imgFailed;
  const baseClass = className || 'partner-avatar';

  if (showImg) {
    return (
      <img
        src={src}
        alt=""
        className={`${baseClass} ${baseClass}--img ${baseClass}--${size}`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span className={`${baseClass} ${baseClass}--initials ${baseClass}--${size}`}>
      {partnerInitials(name)}
    </span>
  );
};

export default PartnerAvatar;
