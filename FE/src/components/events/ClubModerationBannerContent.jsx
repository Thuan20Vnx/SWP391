import React from 'react';
import { buildClubModerationBannerCopy } from '../../utils/clubModerationBanner';

const ClubModerationBannerContent = ({ event, icpdpHint = false, icpdpNote = '' }) => {
  const { summary, reasonLine, detailLine } = buildClubModerationBannerCopy(event);

  return (
    <>
      <p>{summary}</p>
      {reasonLine ? <p>{reasonLine}</p> : null}
      {detailLine ? <p className="ev-moderation-banner__hint">{detailLine}</p> : null}
      {icpdpHint ? (
        <p className="ev-moderation-banner__hint">
          Sau khi IC-PDP duyệt, yêu cầu sẽ chuyển sang Admin phê duyệt.
        </p>
      ) : null}
      {icpdpNote ? (
        <p className="ev-moderation-banner__hint">Ghi chú IC-PDP: {icpdpNote}</p>
      ) : null}
    </>
  );
};

export default ClubModerationBannerContent;
