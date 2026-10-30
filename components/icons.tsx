// Stroke icons used across Kortech (replacing emoji, which render differently on every phone).
// Decorative by default: give the surrounding control an accessible name instead.

const PATHS = {
  leaf: ["M11 20A7 7 0 0 1 4 13c0-6 7-9 16-9 0 9-3 16-9 16Z", "M4 20c4-4 7-6 11-8"],
  home: ["M4 11l8-7 8 7v9H4z"],
  book: ["M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z", "M4 19a2 2 0 0 1 2-2h13"],
  chat: ["M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"],
  store: ["M4 10v10h16V10", "M3 10l2-6h14l2 6"],
  rain: ["M7 15a5 5 0 1 1 1-9.9A6 6 0 0 1 19 9a4 4 0 0 1-1 7.9", "M9 18l-1 3", "M13 18l-1 3", "M17 18l-1 3"],
  storm: ["M7 15a5 5 0 1 1 1-9.9A6 6 0 0 1 19 9a4 4 0 0 1-1 7.9", "M12 13l-2 4h3l-2 4"],
  cloud: ["M8 18h9a4 4 0 0 0 0-8 6 6 0 0 0-11 2 3 3 0 0 0 2 6Z"],
  sun: ["M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8", "M12 2v2", "M12 20v2", "M2 12h2", "M20 12h2", "M5 5l1.5 1.5", "M17.5 17.5L19 19", "M5 19l1.5-1.5", "M17.5 6.5L19 5"],
  fog: ["M4 10h16", "M6 14h12", "M8 18h8"],
  basket: ["M5 10h14l-1.5 9h-11L5 10Z", "M9 10l3-6 3 6"],
  bank: ["M3 10l9-6 9 6", "M5 10v8", "M10 10v8", "M14 10v8", "M19 10v8", "M3 20h18"],
  bulb: ["M9 18h6", "M10 21h4", "M12 3a6 6 0 0 0-4 10.5c1 1 1.5 2 1.5 3.5h5c0-1.5.5-2.5 1.5-3.5A6 6 0 0 0 12 3Z"],
  shield: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z", "M9 12l2 2 4-4"],
  phone: ["M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2"],
  arrowRight: ["M5 12h14", "M13 6l6 6-6 6"],
  arrowLeft: ["M19 12H5", "M11 6l-6 6 6 6"],
  send: ["M4 12l16-8-6 16-3-7-7-1Z"],
  thumbUp: ["M7 10v11H4V10h3Z", "M7 10l4-7a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 20H7"],
  flag: ["M5 21V4h12l-2 4 2 4H5"],
  lock: ["M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z", "M8 11V8a4 4 0 0 1 8 0v3"],
  download: ["M12 4v12", "M7 11l5 5 5-5", "M5 20h14"],
  check: ["M5 12l5 5L20 7"],
  alert: ["M12 3l9 16H3l9-16Z", "M12 10v4", "M12 17h.01"],
  building: ["M4 21V5l8-2v18", "M12 9h8v12", "M7 8h2", "M7 12h2", "M7 16h2", "M15 13h2", "M15 17h2"],
  wifiOff: ["M2 2l20 20", "M8.5 16.5a5 5 0 0 1 7 0", "M5 12.9a10 10 0 0 1 5.2-2.8", "M19 12.9a10 10 0 0 0-2.2-1.6", "M12 20h.01"],
  user: ["M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8", "M4 21c1-4 4-6 8-6s7 2 8 6"],
  logout: ["M15 4h4v16h-4", "M10 8l-4 4 4 4", "M6 12h11"],
  file: ["M14 3H6v18h12V7l-4-4Z", "M14 3v4h4"],
  sprout: ["M12 20v-8", "M12 12C12 8 9 6 5 6c0 4 3 6 7 6Z", "M12 12c0-4 3-6 7-6 0 4-3 6-7 6Z"],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 22,
  strokeWidth = 2,
  className,
  label,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  // Only for icons that carry meaning on their own.
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

// Weather condition key (lib/weather/tips.ts) -> icon.
export function weatherIcon(key: "clear" | "cloudy" | "fog" | "drizzle" | "rain" | "showers" | "storm"): IconName {
  return ({ clear: "sun", cloudy: "cloud", fog: "fog", drizzle: "rain", rain: "rain", showers: "rain", storm: "storm" } as const)[key];
}
