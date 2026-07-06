import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_VISIBLE = 6;
const COMPACT_BREAKPOINT = 640;

const useCarouselLayout = () => {
  const getLayout = () => {
    if (typeof window === 'undefined') {
      return { visibleCount: DEFAULT_VISIBLE, isCompact: false };
    }
    const width = window.innerWidth;
    if (width <= COMPACT_BREAKPOINT) {
      return { visibleCount: 1, isCompact: true };
    }
    if (width <= 900) {
      return { visibleCount: 3, isCompact: false };
    }
    return { visibleCount: DEFAULT_VISIBLE, isCompact: false };
  };

  const [layout, setLayout] = useState(getLayout);

  useEffect(() => {
    const onResize = () => setLayout(getLayout());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return layout;
};

const IconChevron = ({ direction }) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {direction === 'left' ? (
      <polyline points="15 18 9 12 15 6" />
    ) : (
      <polyline points="9 18 15 12 9 6" />
    )}
  </svg>
);

const EventTabsCarousel = ({ tabs, activeTab, onTabChange, className = '' }) => {
  const { visibleCount, isCompact } = useCarouselLayout();
  const viewportRef = useRef(null);
  const [startIndex, setStartIndex] = useState(0);
  const [navPulse, setNavPulse] = useState(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const visibleTabs = useMemo(
    () => (tabs || []).filter((tab) => tab.visible !== false),
    [tabs],
  );

  const tabCount = visibleTabs.length;
  const needsCarousel = tabCount > visibleCount;
  const maxStart = Math.max(0, tabCount - visibleCount);

  const clampStart = useCallback(
    (index) => Math.max(0, Math.min(index, maxStart)),
    [maxStart],
  );

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isCompact) return;
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    setCanScrollPrev(viewport.scrollLeft > 4);
    setCanScrollNext(viewport.scrollLeft < maxScroll - 4);
  }, [isCompact]);

  useEffect(() => {
    setStartIndex((prev) => clampStart(prev));
  }, [clampStart, visibleCount, tabCount]);

  useEffect(() => {
    const activeIndex = visibleTabs.findIndex((tab) => tab.id === activeTab);
    if (activeIndex < 0) return;

    if (isCompact) {
      const viewport = viewportRef.current;
      const activeEl = viewport?.querySelector(`[data-tab-id="${activeTab}"]`);
      activeEl?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      window.requestAnimationFrame(updateScrollState);
      return;
    }

    setStartIndex((prev) => {
      if (activeIndex < prev) return activeIndex;
      if (activeIndex >= prev + visibleCount) return activeIndex - visibleCount + 1;
      return prev;
    });
  }, [activeTab, visibleTabs, visibleCount, isCompact, updateScrollState]);

  useEffect(() => {
    if (!isCompact) return undefined;
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    updateScrollState();
    viewport.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      viewport.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [isCompact, updateScrollState, tabCount]);

  const triggerPulse = (direction) => {
    setNavPulse(direction);
    window.setTimeout(() => setNavPulse(null), 380);
  };

  const handleTabClick = (tab) => {
    if (tab.onClick) {
      tab.onClick();
      return;
    }
    onTabChange(tab.id);
  };

  const goPrev = () => {
    if (isCompact) {
      viewportRef.current?.scrollBy({
        left: -(viewportRef.current.clientWidth * 0.72),
        behavior: 'smooth',
      });
      triggerPulse('left');
      return;
    }
    if (startIndex <= 0) return;
    setStartIndex((prev) => Math.max(0, prev - 1));
    triggerPulse('left');
  };

  const goNext = () => {
    if (isCompact) {
      viewportRef.current?.scrollBy({
        left: viewportRef.current.clientWidth * 0.72,
        behavior: 'smooth',
      });
      triggerPulse('right');
      return;
    }
    if (startIndex >= maxStart) return;
    setStartIndex((prev) => Math.min(maxStart, prev + 1));
    triggerPulse('right');
  };

  const trackWidthPercent = needsCarousel ? (tabCount / visibleCount) * 100 : 100;
  const tabWidthPercent = tabCount > 0 ? 100 / tabCount : 100;
  const translatePercent = tabCount > 0 ? (startIndex / tabCount) * 100 : 0;

  const showPrev = isCompact ? canScrollPrev : startIndex > 0;
  const showNext = isCompact ? canScrollNext : startIndex < maxStart;

  if (tabCount === 0) return null;

  if (tabCount === 1) {
    const tab = visibleTabs[0];
    return (
      <div className={`ev-tabs-container ev-tabs-container--single ${className}`.trim()}>
        <button
          type="button"
          className={`ev-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => handleTabClick(tab)}
        >
          {tab.label}
        </button>
      </div>
    );
  }

  const carouselClass = [
    'ev-tabs-carousel',
    needsCarousel || isCompact ? 'ev-tabs-carousel--paged' : '',
    isCompact ? 'ev-tabs-carousel--compact' : '',
    showPrev ? 'ev-tabs-carousel--can-prev' : '',
    showNext ? 'ev-tabs-carousel--can-next' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={carouselClass}
      style={{ '--ev-tabs-visible': visibleCount }}
    >
      {(needsCarousel || isCompact) && (
        <button
          type="button"
          className={`ev-tabs-carousel__nav ev-tabs-carousel__nav--prev ${navPulse === 'left' ? 'is-pulse' : ''}`}
          onClick={goPrev}
          disabled={!showPrev}
          aria-label="Xem tab trước"
        >
          <IconChevron direction="left" />
        </button>
      )}

      <div
        ref={viewportRef}
        className="ev-tabs-carousel__viewport"
      >
        <div
          className={`ev-tabs-carousel__track ${isCompact ? 'ev-tabs-carousel__track--scroll' : ''}`}
          style={
            isCompact
              ? undefined
              : {
                  width: `${trackWidthPercent}%`,
                  transform: needsCarousel ? `translateX(-${translatePercent}%)` : 'none',
                }
          }
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-tab-id={tab.id}
              className={`ev-tab ${activeTab === tab.id ? 'active' : ''}`}
              style={isCompact ? undefined : { width: `${tabWidthPercent}%` }}
              onClick={() => handleTabClick(tab)}
            >
              <span className="ev-tab__label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {(needsCarousel || isCompact) && (
        <button
          type="button"
          className={`ev-tabs-carousel__nav ev-tabs-carousel__nav--next ${navPulse === 'right' ? 'is-pulse' : ''}`}
          onClick={goNext}
          disabled={!showNext}
          aria-label="Xem tab tiếp theo"
        >
          <IconChevron direction="right" />
        </button>
      )}
    </div>
  );
};

export default EventTabsCarousel;
