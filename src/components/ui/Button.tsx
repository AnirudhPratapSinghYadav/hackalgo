import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
  fullWidth?: boolean
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent-primary text-text-inverse hover:bg-accent-hover border-transparent',
  outline: 'bg-transparent text-text-secondary border-border-medium hover:border-accent-primary hover:text-text-primary',
  ghost: 'bg-transparent text-text-tertiary border-transparent hover:text-text-primary hover:bg-bg-elevated',
  danger: 'bg-alert-critical/20 text-alert-critical border-alert-critical/40 hover:bg-alert-critical/30',
}

export default function Button({
  variant = 'primary',
  children,
  fullWidth,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border transition-colors min-h-[44px] disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
