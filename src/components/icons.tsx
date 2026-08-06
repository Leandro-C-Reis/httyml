type IconProps = { className?: string };

// Small, sharp-edged line icons — no external icon font, no rounded caps
// (matches the brutalist "everything is drawn" rule). Purely decorative:
// every button already carries a text label as its accessible name, so
// these stay aria-hidden.

export function IconPlus({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconFolder({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
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
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
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
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10" fill="currentColor" />
    </svg>
  );
}

export function IconPlay({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M4 2 14 8 4 14Z" fill="currentColor" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
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
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M2 8.5 6 12.5 14 3.5" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function IconX({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconArrowRight({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M1 8h12M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function IconTerminal({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M2 3h12v10H2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M4 6l2 2-2 2M7.5 10h4" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
