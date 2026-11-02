import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function Mark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="14" fill="currentColor" opacity="0.12" />
      <path d="M12 18.5c0-4 3.4-7 8.2-7h7.6c4.8 0 8.2 3 8.2 7v4.2c0 4-3.4 7-8.2 7h-4.2L16 36.5v-6.6c-2.4-.8-4-2.8-4-5.2v-6.2Z" fill="currentColor" />
      <path d="M16 23.5h16M18.5 27h7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PayIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="8" width="22" height="16" rx="3" />
      <path d="M5 13h22M11 19h6" />
    </svg>
  );
}

export function RosterIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="6" y="7" width="20" height="18" rx="3" />
      <path d="M6 12h20M11 5v4M21 5v4M11 17h4M18 17h3" />
    </svg>
  );
}

export function RecordsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 6h10l6 6v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
      <path d="M19 6v6h6M11 17h10M11 21h7" />
    </svg>
  );
}

export function TeamIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="12" r="3" />
      <circle cx="21" cy="12" r="3" />
      <path d="M5.5 23c1.2-3 3.2-4.5 5.5-4.5S15.3 20 16.5 23M15.5 23c1-2.4 2.7-3.8 5.5-3.8 2.6 0 4.5 1.4 5.5 3.8" />
    </svg>
  );
}

export function PrivacyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="7" y="14" width="18" height="12" rx="2" />
      <path d="M11 14v-3a5 5 0 0 1 10 0v3" />
    </svg>
  );
}

export function ProgressIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 22h20" />
      <path d="M8 22V16M16 22V10M24 22V6" />
    </svg>
  );
}

export const FEATURE_ICONS = {
  records: RecordsIcon,
  progress: ProgressIcon,
  team: TeamIcon,
} as const;
