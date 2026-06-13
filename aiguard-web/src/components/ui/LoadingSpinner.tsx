import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner: React.FC<Props> = ({ size = 'md', text }) => {
  const sizeMap = { sm: 20, md: 32, lg: 48 };
  const px = sizeMap[size];

  return (
    <div className="loading-spinner-container">
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        className="loading-spinner-svg"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.15" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="url(#spinner-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      {text && <span className="loading-spinner-text">{text}</span>}
    </div>
  );
};
