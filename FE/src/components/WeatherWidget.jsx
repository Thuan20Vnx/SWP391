import React, { useEffect, useRef, useState } from 'react';
import { fetchWeather } from '../services/weatherApi';

const MARQUEE_HOLD_MS = 2500;
const marqueeScrollDuration = (distance) => Math.min(10000, Math.max(3500, distance * 55));

const MarqueeLine = ({ text, className }) => {
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

    const scrollDuration = marqueeScrollDuration(distance);
    const holdStart = MARQUEE_HOLD_MS;
    const holdEnd = MARQUEE_HOLD_MS;
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

    return () => {
      animationRef.current?.cancel();
    };
  }, [text]);

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
const WEATHER_LOCATION = 'Đà Nẵng';

const formatEventTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const WeatherDetailPanel = ({ weather, advice, events, onClose }) => (
  <div className="weather-detail-panel" role="dialog" aria-label="Chi tiết thời tiết">
    <div className="weather-detail-header">
      <div className="weather-detail-header-main">
        <div className="weather-detail-icon">
          <WeatherIcon main={weather.main} />
        </div>
        <div>
          <p className="weather-detail-location">{WEATHER_LOCATION}</p>
          <p className="weather-detail-temp">{weather.temp}°C</p>
          <p className="weather-detail-desc">{weather.description}</p>
        </div>
      </div>
      <button type="button" className="weather-detail-close" onClick={onClose} aria-label="Đóng">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>

    <dl className="weather-detail-stats">
      <div className="weather-detail-stat">
        <dt>Cảm giác</dt>
        <dd>{weather.feelsLike}°C</dd>
      </div>
      <div className="weather-detail-stat">
        <dt>Độ ẩm</dt>
        <dd>{weather.humidity}%</dd>
      </div>
      <div className="weather-detail-stat">
        <dt>Gió</dt>
        <dd>{weather.windSpeed} m/s</dd>
      </div>
      {weather.rainVolume > 0 && (
        <div className="weather-detail-stat">
          <dt>Mưa (1h)</dt>
          <dd>{weather.rainVolume} mm</dd>
        </div>
      )}
    </dl>

    <div className="weather-detail-advice">
      <p className="weather-detail-advice-label">Lời khuyên</p>
      <p className="weather-detail-advice-text">{advice}</p>
    </div>

    {events.length > 0 && (
      <div className="weather-detail-events">
        <p className="weather-detail-events-label">Sự kiện sắp tham gia</p>
        <ul className="weather-detail-events-list">
          {events.map((ev) => (
            <li key={ev.id} className="weather-detail-event">
              <p className="weather-detail-event-title">{ev.title}</p>
              <p className="weather-detail-event-meta">
                {formatEventTime(ev.startDate)}
                {ev.location ? ` · ${ev.location}` : ''}
              </p>
              <p className="weather-detail-event-advice">{ev.advice}</p>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const WeatherWidget = () => {
  const wrapRef = useRef(null);
  const [state, setState] = useState({ loading: true, error: null, weather: null, advice: '', events: [] });
  const [slideIndex, setSlideIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);

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

  useEffect(() => {
    if (!detailOpen) return undefined;

    const closeOnOutside = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      setDetailOpen(false);
    };

    const closeOnEscape = (e) => {
      if (e.key === 'Escape') setDetailOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [detailOpen]);

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
    <div className="weather-widget-wrap" ref={wrapRef}>
      {detailOpen && (
        <WeatherDetailPanel
          weather={weather}
          advice={advice}
          events={events}
          onClose={() => setDetailOpen(false)}
        />
      )}
      <button
        type="button"
        className={`weather-widget ${detailOpen ? 'weather-widget--open' : ''}`}
        onClick={() => setDetailOpen((open) => !open)}
        aria-expanded={detailOpen}
        aria-label="Xem chi tiết thời tiết"
        title={`${topLine} — ${bottomLine}`}
      >
        <div className="weather-widget-icon">
          <WeatherIcon main={weather.main} />
        </div>
        <div className="weather-widget-info">
          <MarqueeLine key={`top-${activeIndex}`} text={topLine} className="weather-widget-temp" />
          <MarqueeLine key={`bottom-${activeIndex}`} text={bottomLine} className="weather-widget-advice" />
        </div>
      </button>
    </div>
  );
};

export default WeatherWidget;
