import React from 'react';

interface Robot3DIconProps {
  className?: string;
  size?: number | string;
  glow?: boolean;
}

export const Robot3DIcon: React.FC<Robot3DIconProps> = ({
  className = 'w-6 h-6',
  glow = true,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className} select-none`}>
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md overflow-visible"
      >
        <defs>
          {/* Main 3D Metallic Head Gradient */}
          <radialGradient id="r3d-head-grad" cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#E2E8F0" />
            <stop offset="70%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>

          {/* 3D Visor Dark Glossy Gradient */}
          <linearGradient id="r3d-visor-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="60%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Glowing Visor Rim / Accent */}
          <linearGradient id="r3d-visor-rim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          {/* Cyan Glow for Eyes */}
          <radialGradient id="r3d-eye-glow" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#A5F3FC" />
            <stop offset="40%" stopColor="#22D3EE" />
            <stop offset="85%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#0891B2" />
          </radialGradient>

          {/* Antenna Tip Glow */}
          <radialGradient id="r3d-antenna-ball" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#0284C7" />
          </radialGradient>

          {/* Ear piece 3D Gradient */}
          <radialGradient id="r3d-ear-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </radialGradient>

          {/* Drop Shadow Filter */}
          <filter id="r3d-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Ambient Glow */}
        {glow && (
          <ellipse
            cx="60"
            cy="62"
            rx="46"
            ry="40"
            fill="#38bdf8"
            opacity="0.25"
            className="animate-pulse"
          />
        )}

        {/* Antenna Pole */}
        <path
          d="M60 30 L60 14"
          stroke="#64748B"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Antenna Glowing Orb */}
        <circle cx="60" cy="12" r="7" fill="url(#r3d-antenna-ball)" filter="url(#r3d-shadow)" />
        <circle cx="58" cy="10" r="2.5" fill="#FFFFFF" opacity="0.9" />

        {/* Left Ear Disc */}
        <g>
          <rect x="14" y="52" width="8" height="24" rx="4" fill="#64748B" />
          <circle cx="16" cy="64" r="8" fill="url(#r3d-ear-grad)" />
          <circle cx="16" cy="64" r="4" fill="#0284C7" />
          <circle cx="15" cy="62" r="1.5" fill="#FFFFFF" opacity="0.8" />
        </g>

        {/* Right Ear Disc */}
        <g>
          <rect x="98" y="52" width="8" height="24" rx="4" fill="#64748B" />
          <circle cx="104" cy="64" r="8" fill="url(#r3d-ear-grad)" />
          <circle cx="104" cy="64" r="4" fill="#0284C7" />
          <circle cx="103" cy="62" r="1.5" fill="#FFFFFF" opacity="0.8" />
        </g>

        {/* Main 3D Robot Head Body */}
        <rect
          x="20"
          y="28"
          width="80"
          height="72"
          rx="26"
          fill="url(#r3d-head-grad)"
          filter="url(#r3d-shadow)"
        />

        {/* Top Metallic Specular Highlight */}
        <path
          d="M32 35 C42 30, 78 30, 88 35 C92 37, 85 41, 60 41 C35 41, 28 37, 32 35 Z"
          fill="#FFFFFF"
          opacity="0.65"
        />

        {/* Visor Bezel / Rim */}
        <rect
          x="26"
          y="42"
          width="68"
          height="42"
          rx="18"
          fill="url(#r3d-visor-rim)"
          opacity="0.8"
        />

        {/* Visor Dark Glass Screen */}
        <rect
          x="28"
          y="44"
          width="64"
          height="38"
          rx="16"
          fill="url(#r3d-visor-grad)"
        />

        {/* Glass Screen Reflection Highlight */}
        <path
          d="M32 48 C44 46, 76 46, 88 48 C82 54, 38 54, 32 48 Z"
          fill="#FFFFFF"
          opacity="0.25"
        />

        {/* Robot 3D Eyes (Glowing Cyan Pills) */}
        <g>
          {/* Left Eye */}
          <rect
            x="38"
            y="54"
            width="16"
            height="18"
            rx="8"
            fill="url(#r3d-eye-glow)"
          />
          {/* Left Eye Pupil / Sparkle */}
          <circle cx="43" cy="59" r="2.5" fill="#FFFFFF" />
          <circle cx="48" cy="66" r="1.2" fill="#E0F2FE" />

          {/* Right Eye */}
          <rect
            x="66"
            y="54"
            width="16"
            height="18"
            rx="8"
            fill="url(#r3d-eye-glow)"
          />
          {/* Right Eye Pupil / Sparkle */}
          <circle cx="71" cy="59" r="2.5" fill="#FFFFFF" />
          <circle cx="76" cy="66" r="1.2" fill="#E0F2FE" />
        </g>

        {/* Cute Cheeks Glow */}
        <circle cx="34" cy="74" r="3.5" fill="#38BDF8" opacity="0.4" />
        <circle cx="86" cy="74" r="3.5" fill="#38BDF8" opacity="0.4" />

        {/* Chin Bevel Highlight */}
        <path
          d="M42 96 C50 98, 70 98, 78 96"
          stroke="#CBD5E1"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
