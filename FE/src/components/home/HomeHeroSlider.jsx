import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { prefetchPublicEventById } from '../../services/eventsApi';

const HERO_AUTOPLAY_MS = 6000;

const HeroBannerSkeleton = ({ offline = false }) => (
  <section
    className={`hero-banner-slider hero-banner-slider--skeleton${offline ? ' hero-banner-slider--skeleton-offline' : ''}`}
    aria-busy={!offline}
    aria-label={offline ? 'Không tải được banner sự kiện' : 'Đang tải banner sự kiện'}
  >
    <div className="hero-banner-skeleton">
      <div className="hero-banner-skeleton__shimmer" aria-hidden="true" />
      <div className="hero-banner-skeleton__content">
        <div className="hero-banner-skeleton__pill" />
        <div className="hero-banner-skeleton__title" />
        <div className="hero-banner-skeleton__line hero-banner-skeleton__line--short" />
        <div className="hero-banner-skeleton__line" />
        <div className="hero-banner-skeleton__btn" />
      </div>
    </div>
  </section>
);

/**
 * Hero slider dùng chung: trang chủ khách, CTSV home, Partner home.
 * Full-width ảnh, badge/meta, CTA 2 dòng, mũi tên trái/phải, dots.
 */
const HomeHeroSlider = ({
  slides = [],
  loading = false,
  unavailable = false,
  featuredLabel = 'Sự kiện nổi bật',
  resolveDetailPath,
  fallbackCtaPath = '/events',
  fallbackCtaMain = 'Khám phá sự kiện',
  fallbackCtaSub = 'Xem danh sách sự kiện',
  detailCtaMain = 'Xem chi tiết',
  detailCtaSub = 'Mở trang thông tin & đăng ký',
}) => {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroAutoplayKey, setHeroAutoplayKey] = useState(0);
  const slideCount = slides.length;

  const resetHeroAutoplay = useCallback(() => {
    setHeroAutoplayKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (slideCount <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slideCount);
    }, HERO_AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [slideCount, heroAutoplayKey]);

  useEffect(() => {
    setActiveSlide(0);
  }, [slides]);

  useEffect(() => {
    const slide = slides[activeSlide];
    const eventId = slide?.eventId || slide?.id;
    if (!eventId) return undefined;

    const timer = setTimeout(() => prefetchPublicEventById(eventId), 400);
    return () => clearTimeout(timer);
  }, [activeSlide, slides]);

  const goToPrevSlide = () => {
    if (slideCount <= 1) return;
    setActiveSlide((prev) => (prev - 1 + slideCount) % slideCount);
    resetHeroAutoplay();
  };

  const goToNextSlide = () => {
    if (slideCount <= 1) return;
    setActiveSlide((prev) => (prev + 1) % slideCount);
    resetHeroAutoplay();
  };

  const goToSlide = (index) => {
    setActiveSlide(index);
    resetHeroAutoplay();
  };

  const handleCta = (slide) => {
    const detailPath = resolveDetailPath?.(slide);
    if (detailPath) {
      navigate(detailPath);
      return;
    }
    navigate(fallbackCtaPath);
  };

  if (slideCount === 0) {
    if (loading || unavailable) {
      return <HeroBannerSkeleton offline={unavailable && !loading} />;
    }
    return null;
  }

  return (
    <section className={`hero-banner-slider${slideCount > 1 ? ' hero-banner-slider--nav' : ''}`}>
      {slides.map((slide, index) => {
        const detailPath = resolveDetailPath?.(slide);
        return (
        <div
          key={slide.eventId || slide.id || index}
          className={`hero-slide ${index === activeSlide ? 'active' : ''}`}
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.7)), url(${slide.image})`,
          }}
        >
          <div className="hero-content-container">
            <div className="hero-top-row">
              <span className="hero-tag-badge">{slide.featuredLabel || featuredLabel}</span>
              {slide.categoryLabel && (
                <span className="hero-category-pill">{slide.categoryLabel}</span>
              )}
              {slide.organizerLabel && (
                <span className="hero-organizer-pill">{slide.organizerLabel}</span>
              )}
            </div>
            <h1 className="hero-title">{slide.title}</h1>
            <ul className="hero-meta-list">
              {slide.dateLabel && (
                <li className="hero-meta-item">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
                    />
                  </svg>
                  <span>{slide.dateLabel}</span>
                </li>
              )}
              {slide.location && (
                <li className="hero-meta-item">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                    />
                  </svg>
                  <span>{slide.location}</span>
                </li>
              )}
            </ul>
            <button type="button" className="hero-cta-btn" onClick={() => handleCta(slide)}>
              <span className="hero-cta-btn__main">
                {detailPath ? detailCtaMain : fallbackCtaMain}
              </span>
              <span className="hero-cta-btn__sub">
                {detailPath ? detailCtaSub : fallbackCtaSub}
              </span>
            </button>
          </div>
        </div>
        );
      })}

      {slideCount > 1 && (
        <>
          <button
            type="button"
            className="hero-slider-arrow hero-slider-arrow--prev"
            onClick={goToPrevSlide}
            aria-label="Slide trước"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            className="hero-slider-arrow hero-slider-arrow--next"
            onClick={goToNextSlide}
            aria-label="Slide tiếp theo"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </button>
        </>
      )}

      <div className="hero-dot-indicators">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            className={`slider-dot ${index === activeSlide ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HomeHeroSlider;
