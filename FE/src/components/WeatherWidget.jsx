import React, { useEffect, useRef, useState } from 'react';
import { fetchWeather } from '../services/weatherApi';

const MarqueeLine = ({ text, className, variant }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (animationRef.current) {
      animationRef.current.cancel();
      animationRef.current = null;
    }
    textEl.style.transform = 'translateX(0)';
    if (!container || !textEl) return undefined;

    const distance = textEl.scrollWidth - container.clientWidth;
    if (distance <= 0) return undefined;

    if (variant === 'bounce') {
      // Hàng trên: chạy qua rồi chạy về (ping-pong), tốc độ chậm
      const duration = Math.min(12000, Math.max(4000, distance * 70));
      animationRef.current = textEl.animate(
        [
          { transform: 'translateX(0)' },
          { transform: `translateX(-${distance}px)` },
          { transform: 'translateX(0)' },
        ],
        { duration, iterations: Infinity, easing: 'ease-in-out' }
      );
    } else {
      // Hàng dưới: khựng 2s khi bắt đầu, chạy 1 chiều, hết 1 vòng khựng lại 2s rồi lặp lại
      const scrollDuration = Math.min(6000, Math.max(2200, distance * 35));
      const holdStart = 2000;
      const holdEnd = 2000;
      const total = holdStart + scrollDuration + holdEnd;
      animationRef.current = textEl.animate(
        [
          { transform: 'translateX(0)', offset: 0 },
          { transform: 'translateX(0)', offset: holdStart / total },
          { transform: `translateX(-${distance}px)`, offset: (holdStart + scrollDuration) / total },
          { transform: `translateX(-${distance}px)`, offset: 1 },
        ],
        { duration: total, iterations: Infinity, easing: 'linear' }
      );
    }

    return () => {
      animationRef.current?.cancel();
    };
  }, [text, variant]);

  return (
    <span ref={containerRef} className={`weather-marquee ${className}`}>
      <span ref={textRef} className="weather-marquee-text">
        {text}
      </span>
    </span>
  );
};

const WeatherIcon = ({ main }) => {
  switch (main) {
    case 'Rain':
    case 'Drizzle':
      return (
        <svg viewBox="0 0 64 64" className="weather-icon weather-icon-rain">
          <ellipse cx="32" cy="26" rx="18" ry="13" className="weather-cloud" />
          <line x1="22" y1="40" x2="18" y2="52" className="weather-drop drop-1" />
          <line x1="32" y1="40" x2="28" y2="54" className="weather-drop drop-2" />
          <line x1="42" y1="40" x2="38" y2="52" className="weather-drop drop-3" />
        </svg>
      );
    case 'Thunderstorm':
      return (
        <svg viewBox="0 0 64 64" className="weather-icon weather-icon-storm">
          <ellipse cx="32" cy="24" rx="18" ry="12" className="weather-cloud" />
          <polygon points="33,34 24,48 31,48 27,58 40,40 32,40" className="weather-bolt" />
        </svg>
      );
    case 'Clouds':
      return (
        <svg viewBox="0 0 64 64" className="weather-icon weather-icon-clouds">
          <ellipse cx="26" cy="34" rx="16" ry="11" className="weather-cloud cloud-back" />
          <ellipse cx="40" cy="30" rx="14" ry="10" className="weather-cloud cloud-front" />
        </svg>
      );
    case 'Snow':
      return (
        <svg viewBox="0 0 64 64" className="weather-icon weather-icon-snow">
          <ellipse cx="32" cy="26" rx="18" ry="13" className="weather-cloud" />
          <circle cx="22" cy="46" r="2.5" className="weather-flake flake-1" />
          <circle cx="32" cy="50" r="2.5" className="weather-flake flake-2" />
          <circle cx="42" cy="46" r="2.5" className="weather-flake flake-3" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" className="weather-icon weather-icon-sun">
          <circle cx="32" cy="32" r="11" className="weather-sun-core" />
          <g className="weather-sun-rays">
            {Array.from({ length: 8 }).map((_, i) => (
              <line
                key={i}
                x1="32"
                y1="32"
                x2="32"
                y2="10"
                transform={`rotate(${i * 45} 32 32)`}
                className="weather-ray"
              />
            ))}
          </g>
        </svg>
      );
  }
};

const SLIDE_INTERVAL_MS = 15000;

const WeatherWidget = () => {
  const [state, setState] = useState({ loading: true, error: null, weather: null, advice: '', events: [] });
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchWeather()
      .then(({ weather, advice, events }) => {
        if (!cancelled) setState({ loading: false, error: null, weather, advice, events: events || [] });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: err.message, weather: null, advice: '', events: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const slideCount = 1 + state.events.length;

  useEffect(() => {
    if (slideCount <= 1) return undefined;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slideCount);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slideCount]);

  if (state.loading || state.error || !state.weather) return null;

  const { weather, advice, events } = state;
  const activeIndex = slideIndex % slideCount;
  const isWeatherSlide = activeIndex === 0;
  const activeEvent = isWeatherSlide ? null : events[activeIndex - 1];

  const topLine = isWeatherSlide
    ? `${weather.temp}°C · ${weather.description}`
    : `Sự kiện: ${activeEvent.title}`;
  const bottomLine = isWeatherSlide ? advice : activeEvent.advice;

  return (
    <div className="weather-widget" title={`${topLine} — ${bottomLine}`}>
      <div className="weather-widget-icon">
        <WeatherIcon main={weather.main} />
      </div>
      <div className="weather-widget-info">
        <MarqueeLine key={`top-${activeIndex}`} text={topLine} className="weather-widget-temp" variant="bounce" />
        <MarqueeLine key={`bottom-${activeIndex}`} text={bottomLine} className="weather-widget-advice" variant="pause" />
      </div>
    </div>
  );
};

export default WeatherWidget;
