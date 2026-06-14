import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hero banner slider dùng chung cho portal home (CTSV, Partner, ICPDP).
 * Markup & class names khớp CtsvHome để CSS `.ctsv-portal-layout .hero-banner-slider` áp dụng đồng nhất.
 */
const PortalHeroSlider = ({
  slides,
  ctaLabel = 'Vào bảng điều khiển',
  ctaPath,
  autoplayMs = 6000,
}) => {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (!slides?.length) return undefined;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, autoplayMs);
    return () => clearInterval(timer);
  }, [slides?.length, autoplayMs]);

  if (!slides?.length) return null;

  return (
    <section className="hero-banner-slider">
      {slides.map((slide, index) => (
        <div
          key={`${slide.tag}-${index}`}
          className={`hero-slide ${index === activeSlide ? 'active' : ''}`}
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.72)), url(${slide.image})`,
          }}
        >
          <div className="hero-content-container">
            <span className="hero-tag-badge">{slide.tag}</span>
            <h1 className="hero-title">{slide.title}</h1>
            <p className="hero-description">{slide.desc}</p>
            {ctaPath ? (
              <button type="button" className="hero-cta-btn" onClick={() => navigate(ctaPath)}>
                <span className="hero-cta-btn__main">{ctaLabel}</span>
                <span className="hero-cta-btn__sub">Bấm để truy cập ngay</span>
              </button>
            ) : null}
          </div>
        </div>
      ))}
      <div className="hero-dot-indicators">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            className={`slider-dot ${index === activeSlide ? 'active' : ''}`}
            onClick={() => setActiveSlide(index)}
            aria-label={`Slide ${index + 1}`}
            aria-current={index === activeSlide ? 'true' : undefined}
          />
        ))}
      </div>
    </section>
  );
};

export default PortalHeroSlider;
