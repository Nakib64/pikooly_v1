import React from "react";

// Animated "Same Day" icon — bike, CNG auto-rickshaw + car racing across the frame
export const SameDayAnimation: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        width: 52,
        height: 24,
        position: "relative",
        overflow: "hidden",
        verticalAlign: "middle",
        flexShrink: 0,
      }}
      aria-hidden
    >
      <style>{`
        @keyframes sd-dash {
          0%   { transform: translateX(-130%); }
          100% { transform: translateX(160%); }
        }
        @keyframes sd-wheel {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes sd-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1px); }
        }
        .sd-track { position: absolute; inset: 0; }
        .sd-vehicle { position: absolute; bottom: 0; left: 0; will-change: transform; animation: sd-dash linear infinite; }
        .sd-vehicle.bike { animation-duration: 1.6s; animation-delay: 0s; }
        .sd-vehicle.cng  { animation-duration: 2.2s; animation-delay: 0.6s; }
        .sd-vehicle.car  { animation-duration: 2.8s; animation-delay: 1.2s; }
        .sd-wheel { transform-origin: center; transform-box: fill-box; animation: sd-wheel 0.35s linear infinite; }
        .sd-body  { animation: sd-bob 0.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        /* dashed road */
        .sd-road {
          position: absolute; left: 0; right: 0; bottom: 1px; height: 1px;
          background-image: linear-gradient(to right, hsl(var(--muted-foreground) / 0.4) 50%, transparent 50%);
          background-size: 6px 1px;
        }
      `}</style>

      <div className="sd-track">
        <div className="sd-road" />

        {/* Motorbike */}
        <svg className="sd-vehicle bike" width="22" height="16" viewBox="0 0 22 16" fill="none">
          <g className="sd-body">
            <path d="M5 12 L9 7 L13 7 L16 12" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M9 7 L7.5 4.5" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />
            <rect x="11" y="6.5" width="3.5" height="1.2" rx="0.5" fill="#1f2937" />
            <circle cx="10.5" cy="3.6" r="1.4" fill="#1f2937" />
            <path d="M10.5 4.5 L10.5 7" stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round" />
          </g>
          <circle className="sd-wheel" cx="5" cy="12.5" r="2.6" stroke="#1f2937" strokeWidth="1.3" fill="#fff" />
          <circle className="sd-wheel" cx="16" cy="12.5" r="2.6" stroke="#1f2937" strokeWidth="1.3" fill="#fff" />
          <circle cx="5" cy="12.5" r="0.6" fill="#1f2937" />
          <circle cx="16" cy="12.5" r="0.6" fill="#1f2937" />
        </svg>

        {/* CNG auto-rickshaw (green) */}
        <svg className="sd-vehicle cng" width="24" height="18" viewBox="0 0 24 18" fill="none">
          <g className="sd-body">
            <path d="M5 5 Q12 2 19 5 L19 9 L5 9 Z" fill="#16a34a" />
            <path d="M3 13 L4 9 H20 L21 13 V15 H3 Z" fill="#facc15" />
            <path d="M6 9 L7 6 H17 L18 9 Z" fill="#dbeafe" opacity="0.85" />
            <rect x="11.5" y="6" width="0.8" height="3" fill="#16a34a" />
            <circle cx="20" cy="11.5" r="0.7" fill="#fde68a" stroke="#a16207" strokeWidth="0.3" />
          </g>
          <circle className="sd-wheel" cx="6" cy="15.5" r="2.2" fill="#1f2937" />
          <circle className="sd-wheel" cx="18" cy="15.5" r="2.2" fill="#1f2937" />
          <circle cx="6" cy="15.5" r="0.7" fill="#9ca3af" />
          <circle cx="18" cy="15.5" r="0.7" fill="#9ca3af" />
        </svg>

        {/* Private car (sedan) */}
        <svg className="sd-vehicle car" width="28" height="16" viewBox="0 0 28 16" fill="none">
          <g className="sd-body">
            <path d="M7 7 Q9 3.5 14 3.5 Q19 3.5 22 7 Z" fill="#2563eb" />
            <path d="M2 12 L4 7 H24 L26 10 V13 H2 Z" fill="#3b82f6" />
            <path d="M8 7 Q10 4.5 14 4.5 L14 7 Z" fill="#dbeafe" opacity="0.9" />
            <path d="M14 4.5 Q18 4.5 21 7 L14 7 Z" fill="#dbeafe" opacity="0.9" />
            <rect x="24.5" y="9" width="1.3" height="1.3" rx="0.3" fill="#fde68a" />
            <path d="M14 7 L14 12" stroke="#1e40af" strokeWidth="0.5" />
          </g>
          <circle className="sd-wheel" cx="7" cy="13.5" r="2.2" fill="#1f2937" />
          <circle className="sd-wheel" cx="21" cy="13.5" r="2.2" fill="#1f2937" />
          <circle cx="7" cy="13.5" r="0.7" fill="#d1d5db" />
          <circle cx="21" cy="13.5" r="0.7" fill="#d1d5db" />
        </svg>
      </div>
    </span>
  );
};

// Animated "Next Day" icon — delivery truck dashing across the frame
export const NextDayAnimation: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        width: 52,
        height: 24,
        position: "relative",
        overflow: "hidden",
        verticalAlign: "middle",
        flexShrink: 0,
      }}
      aria-hidden
    >
      <style>{`
        @keyframes nd-dash {
          0%   { transform: translateX(-130%); }
          100% { transform: translateX(160%); }
        }
        @keyframes nd-wheel {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes nd-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1px); }
        }
        .nd-track { position: absolute; inset: 0; }
        .nd-vehicle { position: absolute; bottom: 0; left: 0; will-change: transform; animation: nd-dash linear infinite; }
        .nd-vehicle.truck1 { animation-duration: 2.4s; animation-delay: 0s; }
        .nd-vehicle.truck2 { animation-duration: 3.0s; animation-delay: 1.2s; }
        .nd-wheel { transform-origin: center; transform-box: fill-box; animation: nd-wheel 0.4s linear infinite; }
        .nd-body  { animation: nd-bob 0.45s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        .nd-road {
          position: absolute; left: 0; right: 0; bottom: 1px; height: 1px;
          background-image: linear-gradient(to right, hsl(var(--muted-foreground) / 0.4) 50%, transparent 50%);
          background-size: 6px 1px;
        }
      `}</style>

      <div className="nd-track">
        <div className="nd-road" />

        {/* Big delivery truck */}
        <svg className="nd-vehicle truck1" width="32" height="20" viewBox="0 0 32 20" fill="none">
          <g className="nd-body">
            <rect x="2" y="6" width="18" height="11" rx="1" fill="#3b82f6" />
            <rect x="4" y="8" width="14" height="7" rx="0.5" fill="#dbeafe" opacity="0.4" />
            <rect x="8" y="9.5" width="6" height="4" rx="0.5" fill="#fff" />
            <path d="M11 9.5 L11 13.5 M8 11.5 L14 11.5" stroke="#3b82f6" strokeWidth="0.6" />
            <path d="M20 9 L24 9 L27 12 L27 17 L20 17 Z" fill="#1d4ed8" />
            <path d="M21 10 L23.5 10 L25.5 12 L21 12 Z" fill="#dbeafe" opacity="0.9" />
            <rect x="26" y="13.5" width="1" height="1.2" rx="0.2" fill="#fde68a" />
            <rect x="20" y="16.5" width="7" height="0.8" fill="#1e3a8a" />
          </g>
          <circle className="nd-wheel" cx="6" cy="17.5" r="2.2" fill="#1f2937" />
          <circle className="nd-wheel" cx="14" cy="17.5" r="2.2" fill="#1f2937" />
          <circle className="nd-wheel" cx="23" cy="17.5" r="2.2" fill="#1f2937" />
          <circle cx="6" cy="17.5" r="0.7" fill="#9ca3af" />
          <circle cx="14" cy="17.5" r="0.7" fill="#9ca3af" />
          <circle cx="23" cy="17.5" r="0.7" fill="#9ca3af" />
        </svg>

        {/* Smaller courier van */}
        <svg className="nd-vehicle truck2" width="26" height="18" viewBox="0 0 26 18" fill="none">
          <g className="nd-body">
            <path d="M2 7 Q2 6 3 6 L16 6 L21 10 L23 10 Q24 10 24 11 L24 15 L2 15 Z" fill="#ef4444" />
            <rect x="4" y="7.5" width="5" height="3" rx="0.4" fill="#dbeafe" opacity="0.9" />
            <path d="M16 7 L20 10 L16 10 Z" fill="#dbeafe" opacity="0.9" />
            <rect x="2" y="12" width="22" height="0.8" fill="#fff" opacity="0.8" />
            <rect x="22.5" y="11.5" width="1.2" height="1" rx="0.2" fill="#fde68a" />
          </g>
          <circle className="nd-wheel" cx="6" cy="15.5" r="2.2" fill="#1f2937" />
          <circle className="nd-wheel" cx="19" cy="15.5" r="2.2" fill="#1f2937" />
          <circle cx="6" cy="15.5" r="0.7" fill="#d1d5db" />
          <circle cx="19" cy="15.5" r="0.7" fill="#d1d5db" />
        </svg>
      </div>
    </span>
  );
};
