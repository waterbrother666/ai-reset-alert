import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { RefreshIcon } from './Icon'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
  icon?: ReactNode
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-brand)] text-black hover:bg-[var(--color-brand-hover)] border-transparent',
  secondary: 'bg-[var(--color-surface-2)] text-[var(--color-text)] hover:bg-[var(--color-elevated)] border-[var(--color-border)]',
  ghost: 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] border-transparent',
}

export function Button({ variant = 'secondary', loading, icon, children,
  className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button {...rest} disabled={disabled || loading}
      className={`inline-flex h-9 min-h-[36px] items-center justify-center gap-2 rounded-full border px-4 text-[14px] font-bold disabled:cursor-not-allowed disabled:opacity-55 enabled:hover:-translate-y-0.5 ${buttonVariants[variant]} ${className}`}>
      {loading ? <RefreshIcon size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-[border-color,transform,box-shadow] duration-200 hover:border-[var(--color-border-strong)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.28)] ${className}`}>{children}</div>
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-faint)]">{children}</div>
}

export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
      {options.map((option) => (
        <button key={option.value} onClick={() => onChange(option.value)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 text-[13.5px] font-medium transition-colors ${value === option.value ? 'bg-[var(--color-elevated)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
          {option.label}
          {option.count != null && <span className="tnum text-[var(--color-text-faint)]">{option.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, desc }: { icon: ReactNode; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-faint)]">{icon}</div>
      <div className="space-y-1">
        <div className="text-[15px] font-medium text-[var(--color-text)]">{title}</div>
        {desc && <div className="max-w-sm text-[14px] leading-relaxed text-[var(--color-text-muted)]">{desc}</div>}
      </div>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--radius)] bg-[var(--color-surface-2)] ${className}`} />
}

export function Banner({ icon, title, children, actions }: {
  icon?: ReactNode
  title: string
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-danger)]/40 bg-[var(--color-danger-soft)] px-4 py-3">
      <span className="mt-0.5 text-[var(--color-danger)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-[var(--color-text)]">{title}</div>
        {children && <div className="mt-0.5 text-[13.5px] leading-relaxed text-[var(--color-text-muted)]">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
