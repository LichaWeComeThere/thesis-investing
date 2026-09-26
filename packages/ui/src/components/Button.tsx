import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { tokens } from '../tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'sidebar';
export type ButtonSize = 'sm' | 'md';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isActive?: boolean;
  fullWidth?: boolean;
};

const baseButtonStyle: CSSProperties = {
  alignItems: 'center',
  borderRadius: tokens.radii.sm,
  cursor: 'pointer',
  display: 'inline-flex',
  fontWeight: tokens.typography.fontWeight.semibold,
  gap: tokens.spacing.sm,
  justifyContent: 'center',
  letterSpacing: 0,
  textDecoration: 'none',
  transition:
    'background 160ms ease, border-color 160ms ease, color 160ms ease'
};

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: {
    fontSize: tokens.typography.fontSize.sm,
    minHeight: 36,
    padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`
  },
  md: {
    fontSize: tokens.typography.fontSize.sm,
    minHeight: 40,
    padding: `9px ${tokens.spacing.lg}px`
  }
};

function getVariantStyle(
  variant: ButtonVariant,
  isActive: boolean
): CSSProperties {
  if (variant === 'primary') {
    return {
      background: `var(--ti-button-background, ${tokens.colors.primary})`,
      border: `1px solid ${tokens.colors.primary}`,
      boxShadow: 'none',
      color: tokens.colors.onPrimary
    };
  }

  if (variant === 'secondary') {
    return {
      background: `var(--ti-button-background, ${tokens.colors.surface})`,
      border: `1px solid ${tokens.colors.border}`,
      color: tokens.colors.text
    };
  }

  if (variant === 'sidebar') {
    return {
      background: isActive
        ? tokens.colors.surfaceSoft
        : 'var(--ti-button-background, transparent)',
      border: '1px solid transparent',
      boxShadow: 'none',
      color: isActive ? tokens.colors.sidebarTextStrong : tokens.colors.sidebarText,
      fontSize: 13,
      fontWeight: tokens.typography.fontWeight.semibold,
      padding: '9px 10px',
      justifyContent: 'flex-start'
    };
  }

  return {
    background: isActive
      ? tokens.colors.surfaceSoft
      : 'var(--ti-button-background, transparent)',
    border: '1px solid transparent',
    color: tokens.colors.textMuted
  };
}

export function Button({
  children,
  className,
  disabled,
  fullWidth = false,
  isActive = false,
  size = 'md',
  style,
  variant = 'primary',
  ...buttonProps
}: ButtonProps): JSX.Element {
  const buttonClassName = [
    'ti-button',
    `ti-button--${variant}`,
    isActive ? 'ti-button--active' : '',
    fullWidth ? 'ti-button--full' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...buttonProps}
      className={buttonClassName}
      disabled={disabled}
      style={{
        ...baseButtonStyle,
        ...sizeStyles[size],
        ...getVariantStyle(variant, isActive),
        opacity: disabled ? 0.55 : undefined,
        pointerEvents: disabled ? 'none' : undefined,
        width: fullWidth ? '100%' : undefined,
        ...style
      }}
    >
      {children}
    </button>
  );
}
