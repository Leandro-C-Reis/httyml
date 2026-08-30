type IconProps = { className?: string };

// Small, sharp-edged line icons — no external icon font, no rounded caps
// (matches the brutalist "everything is drawn" rule). Purely decorative:
// every button already carries a text label as its accessible name, so
// these stay aria-hidden.

export function IconPlus({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconFolder({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13h-12V7h4.49l.35-.15.86-.86H14v1.5l-.01 4zm0-6.49h-6.5l-.35.15-.86.86H2v-3h4.29l.85.85.36.15H14l-.01.99z" />
    </svg>
  );
}

export function IconEdit({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
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
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="10" height="10" fill="currentColor" />
    </svg>
  );
}

export function IconPlay({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path d="M4 2 14 8 4 14Z" fill="currentColor" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
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
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        d="M2 8.5 6 12.5 14 3.5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

export function IconX({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconArrowRight({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        d="M1 8h12M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

export function IconArrowLeft({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        d="M15 8H3M7 4 3 8l4 4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5" y="2.3" width="3" height="3.4" fill="currentColor" />
      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="6.3" width="3" height="3.4" fill="currentColor" />
      <line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="10.3" width="3" height="3.4" fill="currentColor" />
    </svg>
  );
}

export function IconDownload({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        d="M8 1v8.5M4.5 6.5 8 10l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M2.5 12.5h11v2h-11Z" fill="currentColor" />
    </svg>
  );
}

export function IconUpload({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        d="M8 10.5V2M4.5 5.5 8 2l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M2.5 12.5h11v2h-11Z" fill="currentColor" />
    </svg>
  );
}

export function IconGrip({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <circle cx="5" cy="3" r="1.4" fill="currentColor" />
      <circle cx="11" cy="3" r="1.4" fill="currentColor" />
      <circle cx="5" cy="8" r="1.4" fill="currentColor" />
      <circle cx="11" cy="8" r="1.4" fill="currentColor" />
      <circle cx="5" cy="13" r="1.4" fill="currentColor" />
      <circle cx="11" cy="13" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function IconArrowUp({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        d="M8 15V3M4 7l4-4 4 4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

export function IconArrowDown({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        d="M8 1v12M4 9l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

export function IconHome({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      enable-background="new 0 0 32 32"
      width="20"
      height="20"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeMiterlimit="10"
        points="3,17 16,4 29,17 "
      />
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeMiterlimit="10"
        points="6,14 6,27 13,27 13,17 19,17 19,27 26,27 
        26,14 "
      />
    </svg>
  );
}

export function IconBox({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        d="M2 2h12v12H2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M2 6h12" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function IconBolt({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        d="M9 1 3 9h4l-1 6 7-8H9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

export function IconStar({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        d="M8 1.5 10 6h4.5l-3.6 3 1.4 4.5L8 11l-4.3 2.5L5.1 9 1.5 6H6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

export function IconTerminal({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 0.6 0.6"
      version="1.1"
    >
      <title>terminal_fill</title>
      <g
        id="页面-1"
        stroke="none"
        strokeWidth="1"
        fill="none"
        fill-rule="evenodd"
      >
        <g id="Development" transform="translate(-432 -48)" fill-rule="nonzero">
          <g id="terminal_fill" transform="translate(432 48)">
            <path
              d="M0.6 0v0.6H0V0zM0.315 0.581l0 0 -0.002 0.001 -0.001 0 0 0 -0.002 -0.001q0 0 -0.001 0l0 0 0 0.011 0 0.001 0 0 0.003 0.002 0 0 0 0 0.003 -0.002 0 0 0 0 0 -0.011q0 0 0 0m0.007 -0.003 0 0 -0.005 0.002 0 0 0 0 0 0.011 0 0 0 0 0.005 0.002q0 0 0.001 0l0 0 -0.001 -0.015q0 0 -0.001 -0.001m-0.018 0a0.001 0.001 0 0 0 -0.001 0l0 0 -0.001 0.015q0 0 0 0.001l0 0 0.005 -0.002 0 0 0 0 0 -0.011 0 0 0 0z"
              id="MingCute"
              fill-rule="nonzero"
            />
            <path
              d="M0.5 0.413a0.038 0.038 0 0 1 0.004 0.075L0.5 0.488h-0.2a0.038 0.038 0 0 1 -0.004 -0.075L0.3 0.413zM0.082 0.132A0.038 0.038 0 0 1 0.132 0.13l0.003 0.003 0.141 0.141a0.038 0.038 0 0 1 0.003 0.05l-0.003 0.003 -0.141 0.141A0.038 0.038 0 0 1 0.08 0.418l0.003 -0.003L0.197 0.3 0.082 0.185a0.038 0.038 0 0 1 0 -0.053"
              id="形状"
              fill="currentColor"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}

export function IconDatabase({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <ellipse
        cx="8"
        cy="3.5"
        rx="5.5"
        ry="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M2.5 3.5V12.5C2.5 13.6 5 14.5 8 14.5C11 14.5 13.5 13.6 13.5 12.5V3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M2.5 7C2.5 8.1 5 9 8 9C11 9 13.5 8.1 13.5 7"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M2.5 10C2.5 11.1 5 12 8 12C11 12 13.5 11.1 13.5 10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

export function IconGamepad({ className }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24">
      <path d="M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z" />
    </svg>
  );
}

export function IconSmartphone({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="1.5"
        width="8"
        height="13"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M6 3h4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="12.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function IconDice({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        d="M2 2h12v12H2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
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
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
    >
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

export function IconBitcoin({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <path d="M23.388 15.165c1.733-0.886 2.836-2.462 2.58-5.081-0.335-3.585-3.279-4.786-7.178-5.121v-4.963h-3.033v4.825c-0.788 0-1.595 0.020-2.403 0.039v-4.864h-3.033v4.963c-1.115 0.034-2.414 0.017-6.085 0v3.23c2.394-0.042 3.651-0.196 3.939 1.339v13.589c-0.183 1.218-1.158 1.043-3.328 1.005l-0.61 3.604c5.53 0 6.086 0.020 6.086 0.020v4.25h3.033v-4.191c0.827 0.020 1.634 0.020 2.403 0.020v4.172h3.033v-4.25c5.081-0.276 8.478-1.556 8.931-6.342 0.354-3.84-1.457-5.554-4.333-6.243zM13.413 8.41c1.713 0 7.070-0.532 7.070 3.033 0 3.407-5.357 3.013-7.070 3.013zM13.413 24.145v-6.657c2.048 0 8.32-0.571 8.32 3.328 0 3.762-6.272 3.328-8.32 3.328z" />
    </svg>
  );
}

export function IconGanesha({ className }: IconProps) {
  return (
    <svg
      className={className}
      x="0px"
      y="0px"
      viewBox="0 0 20 20"
      xmlSpace="preserve"
      width="20"
      height="20"
    >
      <g>
        <g>
          <path d="M15.946 3.784H4.054c-1.639 0 -2.973 1.334 -2.973 2.973v4.324c0 0.448 0.363 0.811 0.811 0.811h3.514v0.811c0 0.448 0.363 0.811 0.811 0.811h3.514v1.622H7.297c-0.448 0 -0.811 0.363 -0.811 0.811v3.243c0 0.448 0.363 0.811 0.811 0.811h3.784c1.937 0 3.514 -1.576 3.514 -3.514V11.892h3.514c0.448 0 0.811 -0.363 0.811 -0.811V6.757c0 -1.639 -1.334 -2.973 -2.973 -2.973" />
        </g>
      </g>
      <g>
        <g>
          <path d="M10.331 0.071a0.811 0.811 0 0 0 -0.663 0c-0.278 0.124 -1.929 0.893 -3.093 2.091h6.848c-1.164 -1.198 -2.815 -1.967 -3.092 -2.091" />
        </g>
      </g>
    </svg>
  );
}

export function IconVisualStudioCode({ className }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 0.8 0.8">
      <title>file_type_vscode</title>
      <path
        d="m0.725 0.126 -0.144 -0.069a0.044 0.044 0 0 0 -0.05 0.008L0.059 0.495a0.029 0.029 0 0 0 -0.002 0.041q0.001 0.001 0.002 0.002l0.039 0.035a0.029 0.029 0 0 0 0.037 0.002L0.704 0.144A0.029 0.029 0 0 1 0.75 0.167v-0.002a0.044 0.044 0 0 0 -0.025 -0.039"
        style={{ fill: "#0065a9" }}
      />
      <path
        d="m0.725 0.674 -0.144 0.069a0.044 0.044 0 0 1 -0.05 -0.008L0.059 0.305a0.029 0.029 0 0 1 -0.002 -0.041q0.001 -0.001 0.002 -0.002l0.039 -0.035A0.029 0.029 0 0 1 0.135 0.225l0.568 0.431A0.029 0.029 0 0 0 0.75 0.633v0.002a0.044 0.044 0 0 1 -0.025 0.039"
        style={{ fill: "#007acc" }}
      />
      <path
        d="M0.581 0.744a0.044 0.044 0 0 1 -0.05 -0.008A0.026 0.026 0 0 0 0.575 0.717V0.083a0.026 0.026 0 0 0 -0.044 -0.018 0.044 0.044 0 0 1 0.05 -0.008l0.144 0.069A0.044 0.044 0 0 1 0.75 0.165v0.47a0.044 0.044 0 0 1 -0.025 0.039Z"
        style={{ fill: "#1f9cf0" }}
      />
    </svg>
  );
}
