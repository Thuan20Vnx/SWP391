import React, { useEffect, useMemo, useState } from 'react';
import AppSelect from '../ui/AppSelect';
import {
  collectApprovedTimelineItems,
  findEventForTimelineItem,
  formatTimelineItemDate,
  mapTimelineItemToEventForm,
} from '../../utils/timelineEventQuickFill';

const AD_HOC_EVENT_VALUE = '__ad_hoc__';

const isUsableApprovedTimeline = (timeline) => {
  if (timeline.statusKey !== 'approved') return false;
  const pendingChange = timeline.changeRequest?.statusKey;
  if (pendingChange && ['pending_icpdp', 'pending_admin'].includes(pendingChange)) return false;
  return true;
};

const ClubTimelineQuickPick = ({
  timelines = [],
  clubEvents = [],
  currentForm,
  selectedKey,
  onSelectItem,
  onSelectAdHoc,
  onOpenExistingEvent,
  disabled = false,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [selectedTimelineId, setSelectedTimelineId] = useState(AD_HOC_EVENT_VALUE);

  const timelineOptions = useMemo(
    () =>
      timelines.filter(isUsableApprovedTimeline).map((timeline) => ({
        value: String(timeline.id),
        label: timeline.semesterLabel || 'Timeline',
      })),
    [timelines]
  );

  const selectOptions = useMemo(
    () => [
      { value: AD_HOC_EVENT_VALUE, label: 'Sự kiện phát sinh' },
      ...(timelineOptions.length > 1 ? [{ value: '', label: 'Tất cả timeline' }] : []),
      ...timelineOptions,
    ],
    [timelineOptions]
  );

  const isAdHoc = selectedTimelineId === AD_HOC_EVENT_VALUE;

  useEffect(() => {
    if (isAdHoc) {
      onSelectAdHoc?.();
    }
  }, [isAdHoc, onSelectAdHoc]);

  const items = useMemo(() => {
    if (isAdHoc) return [];
    const allItems = collectApprovedTimelineItems(timelines);
    if (!selectedTimelineId) return allItems;
    return allItems.filter((item) => String(item.timelineId) === selectedTimelineId);
  }, [timelines, selectedTimelineId, isAdHoc]);

  if (!timelineOptions.length) return null;

  const handlePick = (item) => {
    if (disabled) return;

    const existing = findEventForTimelineItem(item, clubEvents);
    if (existing) {
      onOpenExistingEvent?.(existing);
      return;
    }

    const nextForm = mapTimelineItemToEventForm(item, currentForm);
    onSelectItem?.(item, nextForm);
  };

  return (
    <section className="clb-timeline-quick-pick" aria-label="Chọn nhanh từ timeline đã duyệt">
      <div className="clb-timeline-quick-pick__head">
        <div>
          <p className="clb-timeline-quick-pick__eyebrow">Timeline đã duyệt</p>
          <h3 className="clb-timeline-quick-pick__title">Thao tác nhanh từ kế hoạch kỳ học</h3>
          <p className="clb-timeline-quick-pick__hint">
            Chọn hoạt động trong timeline để điền sẵn form tạo sự kiện.
          </p>
        </div>
        <div className="clb-timeline-quick-pick__actions">
          <AppSelect
            value={selectedTimelineId}
            onChange={(e) => setSelectedTimelineId(e.target.value)}
            options={selectOptions}
            placeholder="Chọn nguồn sự kiện"
            disabled={disabled}
            fullWidth={false}
            className="clb-timeline-quick-pick__timeline-select"
            aria-label="Chọn nguồn sự kiện"
          />
          <button
            type="button"
            className={`clb-timeline-quick-pick__toggle${expanded ? ' is-expanded' : ''}`}
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Thu gọn danh sách timeline' : 'Mở rộng danh sách timeline'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="clb-timeline-quick-pick__list">
          {isAdHoc && (
            <p className="clb-timeline-quick-pick__empty">
              Sự kiện phát sinh không lấy nội dung từ timeline. Điền thông tin sự kiện ở form bên dưới.
            </p>
          )}
          {!isAdHoc && !items.length && (
            <p className="clb-timeline-quick-pick__empty">Không có hoạt động nào trong timeline đã chọn.</p>
          )}
          {items.map((item) => {
            const existing = findEventForTimelineItem(item, clubEvents);
            const isSelected = selectedKey === item.key;
            const isCreated = Boolean(existing);

            return (
              <button
                key={item.key}
                type="button"
                className={`clb-timeline-quick-pick__card${isSelected ? ' is-selected' : ''}${isCreated ? ' is-created' : ''}`}
                onClick={() => handlePick(item)}
                disabled={disabled}
              >
                <div className="clb-timeline-quick-pick__card-top">
                  <span className="clb-timeline-quick-pick__semester">{item.semesterLabel}</span>
                  <span className={`clb-timeline-quick-pick__badge${isCreated ? ' is-created' : ''}`}>
                    {isCreated ? 'Đã tạo SK' : 'Chưa tạo'}
                  </span>
                </div>
                <strong className="clb-timeline-quick-pick__event-title">{item.title}</strong>
                <div className="clb-timeline-quick-pick__meta">
                  <span>{item.category || 'Workshop'}</span>
                  <span>{formatTimelineItemDate(item.plannedDate)}</span>
                </div>
                <p className="clb-timeline-quick-pick__location">
                  {item.location || '\u00A0'}
                </p>
                <span className="clb-timeline-quick-pick__action">
                  {isCreated ? 'Mở sự kiện đã tạo' : 'Điền vào form'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ClubTimelineQuickPick;
