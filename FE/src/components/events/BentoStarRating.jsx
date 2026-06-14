import React from 'react';

const STAR_PATH =
  'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

const BentoStarRating = ({ value = 0, max = 5, size = 16 }) => {
  const rating = Math.max(0, Math.min(max, Number(value) || 0));

  return (
    <span className="ev-bento-stars" aria-label={`${rating.toFixed(1)} trên ${max} sao`}>
      {Array.from({ length: max }, (_, index) => {
        const starValue = rating - index;
        let fill = '#e2e8f0';
        let clipPath;

        if (starValue >= 1) {
          fill = '#eab308';
        } else if (starValue >= 0.5) {
          fill = '#eab308';
          clipPath = 'inset(0 50% 0 0)';
        }

        return (
          <svg
            key={index}
            viewBox="0 0 24 24"
            width={size}
            height={size}
            aria-hidden="true"
            className="ev-bento-star"
          >
            <path d={STAR_PATH} fill="#e2e8f0" />
            {fill !== '#e2e8f0' && (
              <path d={STAR_PATH} fill={fill} style={clipPath ? { clipPath } : undefined} />
            )}
          </svg>
        );
      })}
    </span>
  );
};

export default BentoStarRating;
