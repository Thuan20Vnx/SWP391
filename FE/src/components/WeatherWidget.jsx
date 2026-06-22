import React, { useEffect, useState } from 'react';
import { fetchWeather } from '../services/weatherApi';

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

const WeatherWidget = () => {
  const [state, setState] = useState({ loading: true, error: null, weather: null, advice: '' });

  useEffect(() => {
    let cancelled = false;
    fetchWeather()
      .then(({ weather, advice }) => {
        if (!cancelled) setState({ loading: false, error: null, weather, advice });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: err.message, weather: null, advice: '' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading || state.error || !state.weather) return null;

  const { weather, advice } = state;

  return (
    <div className="weather-widget" title={weather.description}>
      <div className="weather-widget-icon">
        <WeatherIcon main={weather.main} />
      </div>
      <div className="weather-widget-info">
        <span className="weather-widget-temp">{weather.temp}°C</span>
        <span className="weather-widget-advice">{advice}</span>
      </div>
    </div>
  );
};

export default WeatherWidget;
