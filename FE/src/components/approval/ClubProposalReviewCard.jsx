import React from 'react';
import EventPlanFilePanel from '../events/EventPlanFilePanel';
import ProposalTicketsTable from '../admin/ProposalTicketsTable';
import { getCategoryDisplayLabel } from '../../constants/eventCategories';
import { statusClass } from '../../utils/eventStatus';
import { getVisibleProposalReviewNotes } from '../../utils/proposalReviewNotes';
import TimelineSourceNotice from '../club/TimelineSourceNotice';
import '../../styles/admin-dashboard.css';

const THUMB_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23f1ede9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23b0a090'%3EKhông có ảnh%3C/text%3E%3C/svg%3E";

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};

const ClubProposalReviewCard = ({
  proposal,
  index = 0,
  statusLabel,
  statusKey,
  footer = null,
  sourceBadge = null,
}) => {
  const showPlanPanel =
    proposal.hasEventPlan
    || proposal.eventPlanFile
    || proposal.eventPlanLink
    || proposal.eventPlanFileName;

  const statusText = statusLabel || proposal.status;
  const statusToneKey = statusKey || proposal.statusKey;
  const reviewNotes = getVisibleProposalReviewNotes(proposal);

  return (
    <li className="admin-proposal-card">
      <div className="admin-proposal-card__head">
        <div className="admin-proposal-card__head-main">
          <span className="admin-proposal-card__index">#{index + 1}</span>
          <h2 className="admin-proposal-card__title">{proposal.title}</h2>
          {sourceBadge}
          <TimelineSourceNotice source={proposal} className="admin-proposal-card__timeline-source" />
          {showPlanPanel && <span className="adm-ev-plan-badge">Có bảng KH</span>}
        </div>
        <span className={`status-pill ${statusClass(statusText, statusToneKey)}`}>{statusText}</span>
      </div>

      <div className="admin-proposal-card__body">
        <div className="admin-proposal-card__thumb-wrap">
          <img
            src={proposal.image || proposal.thumbnail || THUMB_FALLBACK}
            alt=""
            className="admin-proposal-card__thumb"
            onError={(e) => {
              e.target.src = THUMB_FALLBACK;
              e.target.onerror = null;
            }}
          />
        </div>

        <div className="admin-proposal-card__details">
          <dl className="admin-proposal-meta">
            <div className="admin-proposal-meta__row">
              <dt>Câu lạc bộ</dt>
              <dd>{proposal.clubName || '—'}</dd>
            </div>
            <div className="admin-proposal-meta__row">
              <dt>Danh mục</dt>
              <dd>{getCategoryDisplayLabel(proposal.category) || proposal.category || '—'}</dd>
            </div>
            <div className="admin-proposal-meta__row">
              <dt>Địa điểm</dt>
              <dd>{proposal.location || '—'}</dd>
            </div>
            <div className="admin-proposal-meta__row">
              <dt>Thời gian</dt>
              <dd>
                {proposal.date || formatDateTime(proposal.startDate)}
                {proposal.time ? ` · ${proposal.time}` : ''}
              </dd>
            </div>
            <div className="admin-proposal-meta__row">
              <dt>Số vé dự kiến</dt>
              <dd>{proposal.totalTickets ?? '—'}</dd>
            </div>
            {proposal.submittedByEmail && (
              <div className="admin-proposal-meta__row admin-proposal-meta__row--full">
                <dt>Người gửi</dt>
                <dd className="admin-proposal-meta__email">{proposal.submittedByEmail}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="admin-proposal-card__full">
        <ProposalTicketsTable
          ticketTypes={proposal.ticketTypes}
          ticketPrice={proposal.ticketPrice}
        />

        {proposal.description?.trim() ? (
          <div className="admin-proposal-card__desc">
            <p className="admin-proposal-card__desc-label">Mô tả</p>
            <p className="admin-proposal-card__desc-text">{proposal.description}</p>
          </div>
        ) : null}

        {showPlanPanel && (
          <div className="admin-fpt-unit-events__plan-panel">
            <EventPlanFilePanel
              fileUrl={proposal.eventPlanUrl || proposal.eventPlanFile}
              fileName={proposal.eventPlanFileName}
              mimeType={proposal.eventPlanFileMime}
              externalLink={proposal.eventPlanLink}
            />
          </div>
        )}

        {(reviewNotes.icpdpNote || reviewNotes.ctsvNote || reviewNotes.rejectionReason) && (
          <div className="admin-fpt-unit-events__proposal-notes">
            {reviewNotes.icpdpNote && (
              <div className="admin-fpt-unit-events__note">
                <span className="admin-proposal-card__desc-label">Ghi chú IC-PDP</span>
                <p>{reviewNotes.icpdpNote}</p>
              </div>
            )}
            {reviewNotes.ctsvNote && (
              <div className="admin-fpt-unit-events__note">
                <span className="admin-proposal-card__desc-label">Ghi chú CTSV</span>
                <p>{reviewNotes.ctsvNote}</p>
              </div>
            )}
            {reviewNotes.rejectionReason && (
              <div className="admin-fpt-unit-events__note admin-fpt-unit-events__note--reject">
                <span className="admin-proposal-card__desc-label">Lý do từ chối</span>
                <p>{reviewNotes.rejectionReason}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {footer ? <footer className="admin-proposal-card__footer">{footer}</footer> : null}
    </li>
  );
};

export default ClubProposalReviewCard;
