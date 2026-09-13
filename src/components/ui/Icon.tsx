type IconProps = { size?: number; className?: string; strokeWidth?: number }

function base(size = 18, strokeWidth = 1.6, className = '') {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }
}

export const HistoryIcon = ({ size, className, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth, className)}><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l3 2" /></svg>
)

export const RefreshIcon = ({ size, className, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth, className)}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
)

export const AlertIcon = ({ size, className, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth, className)}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
)

export const XCircleIcon = ({ size, className, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth, className)}><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></svg>
)

export const ExternalIcon = ({ size, className, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth, className)}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
)

export const ChevronDownIcon = ({ size, className, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth, className)}><path d="m6 9 6 6 6-6" /></svg>
)

export const ChevronLeftIcon = ({ size, className, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth, className)}><path d="m15 18-6-6 6-6" /></svg>
)

export const BellIcon = ({ size, className, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth, className)}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
)

export const InboxIcon = ({ size, className, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth, className)}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" /></svg>
)

export const SearchIcon = ({ size, className, strokeWidth }: IconProps) => (
  <svg {...base(size, strokeWidth, className)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
)
