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
      <svg fill="#000000" version="1.1" id="Capa_1" width="800px" height="800px" viewBox="0 0 519.465 519.465">
        <g>
          <g>
            <path d="M118.917,519.465h281.63c16.897,0,30.6-13.701,30.6-30.6V30.6c0-16.897-13.702-30.6-30.6-30.6h-281.63    c-16.903,0-30.6,13.703-30.6,30.6v458.265C88.317,505.77,102.014,519.465,118.917,519.465z M239.365,393.645    c0,3.189-2.583,5.771-5.765,5.771h-33.458v33.457c0,3.189-2.583,5.771-5.765,5.771h-19.614c-3.188,0-5.771-2.582-5.771-5.771    v-33.457h-33.458c-3.188,0-5.765-2.582-5.765-5.771v-19.615c0-3.188,2.583-5.77,5.765-5.77h33.458v-33.459    c0-3.189,2.583-5.771,5.771-5.771h19.614c3.188,0,5.765,2.582,5.765,5.771v33.459H233.6c3.188,0,5.765,2.582,5.765,5.77V393.645    L239.365,393.645z M317.077,434.146c-13.696,0-24.799-11.102-24.799-24.799c0-13.695,11.102-24.797,24.799-24.797    c13.696,0,24.798,11.102,24.798,24.797C341.875,423.039,330.768,434.146,317.077,434.146z M395.608,355.615    c0,13.695-11.102,24.799-24.798,24.799s-24.798-11.104-24.798-24.799c0-13.697,11.102-24.799,24.798-24.799    S395.608,341.918,395.608,355.615z M127.357,45.533h259.377v228.479H127.357V45.533z"/>
          </g>
        </g>
        </svg>
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

export function IconPackageJson({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path
        d="M8 1.5 13.5 4.7V11.3L8 14.5 2.5 11.3V4.7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <g transform="translate(8 8) scale(0.82) translate(-8 -8)">
        <path
          d="M5.4 5.4h2.3v4.1c0 1.1-.7 1.9-1.9 1.9-.9 0-1.6-.5-1.8-1.3"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M10.8 6.1c-.3-.4-.8-.6-1.4-.6-.8 0-1.3.4-1.3 1 0 .6.6.8 1.4 1 .9.2 1.7.5 1.7 1.6 0 1.1-.9 1.8-2.2 1.8-.9 0-1.7-.3-2.2-.9"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="none"
        />
      </g>
    </svg>
  );
}