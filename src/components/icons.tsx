type IconProps = { className?: string };

// Small, sharp-edged line icons — no external icon font, no rounded caps
// (matches the brutalist "everything is drawn" rule). Purely decorative:
// every button already carries a text label as its accessible name, so
// these stay aria-hidden.

export function IconPlus({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconFolder({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path
        d="M1 4h4.5L7 5.5H15V13H1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  );
}

export function IconEdit({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path
        d="M10.5 2 14 5.5 5.5 14H2v-3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  );
}

export function IconStop({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10" fill="currentColor" />
    </svg>
  );
}

export function IconPlay({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M4 2 14 8 4 14Z" fill="currentColor" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path
        d="M2.5 4h11M6 4V2h4v2M4 4l1 10h6l1-10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M2 8.5 6 12.5 14 3.5" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function IconX({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconArrowRight({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M1 8h12M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function IconArrowLeft({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M15 8H3M7 4 3 8l4 4" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function IconHome({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M1 7.5 8 2l7 5.5V14H1Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function IconBox({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M2 2h12v12H2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2 6h12" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function IconBolt({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M9 1 3 9h4l-1 6 7-8H9Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function IconStar({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M8 1.5 10 6h4.5l-3.6 3 1.4 4.5L8 11l-4.3 2.5L5.1 9 1.5 6H6Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function IconTerminal({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M2 3h12v10H2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M4 6l2 2-2 2M7.5 10h4" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function IconDatabase({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <ellipse cx="8" cy="3.5" rx="5.5" ry="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2.5 3.5V12.5C2.5 13.6 5 14.5 8 14.5C11 14.5 13.5 13.6 13.5 12.5V3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2.5 7C2.5 8.1 5 9 8 9C11 9 13.5 8.1 13.5 7" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2.5 10C2.5 11.1 5 12 8 12C11 12 13.5 11.1 13.5 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function IconGamepad({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path
        d="M4 6h8l2 3.5-1.5 3-2.5-2H6l-2.5 2L2 9.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M5.2 8.8h2M6.2 7.8v2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M10.6 8.3h.01M12 9.3h.01" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconSmartphone({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <rect x="4" y="1.5" width="8" height="13" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M6 3h4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="12.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function IconDice({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M2 2h12v12H2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="5" cy="5" r="0.8" fill="currentColor" />
      <circle cx="11" cy="5" r="0.8" fill="currentColor" />
      <circle cx="8" cy="8" r="0.8" fill="currentColor" />
      <circle cx="5" cy="11" r="0.8" fill="currentColor" />
      <circle cx="11" cy="11" r="0.8" fill="currentColor" />
    </svg>
  );
}
