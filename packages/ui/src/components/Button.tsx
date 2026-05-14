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
  cursor: 'pointer',
  display: 'inline-flex',
  fontWeight: tokens.typography.fontWeight.semibold,
  gap: tokens.spacing.sm,
  justifyContent: 'center',
  letterSpacing: 0,
  textDecoration: 'none'
};

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: {
    fontSize: tokens.typography.fontSize.sm,
    minHeight: 36,
    padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`
  },
  md: {
    fontSize: tokens.typography.fontSize.md,
    minHeight: 44,
    padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`
  }
};

function getVariantStyle(
  variant: ButtonVariant,
  isActive: boolean
): CSSProperties {
  if (variant === 'primary') {
    return {
      background: tokens.colors.primary,
      border: `1px solid ${tokens.colors.primary}`,
      boxShadow: '0 1px 0 rgba(255, 255, 255, 0.12) inset',
      color: tokens.colors.onPrimary
    };
  }

  if (variant === 'secondary') {
    return {
      background: tokens.colors.surfaceMuted,
      border: `1px solid ${tokens.colors.border}`,
      color: tokens.colors.text
    };
  }

  if (variant === 'sidebar') {
    return {
      background: isActive
        ? tokens.colors.sidebarNavActiveBg
        : 'transparent',
      border: `1px solid ${
        isActive ? tokens.colors.sidebarNavActiveBorder : 'transparent'
      }`,
      color: isActive
        ? tokens.colors.sidebarTextStrong
        : tokens.colors.sidebarText,
      justifyContent: 'flex-start'
    };
  }

  return {
    background: isActive ? tokens.colors.surfaceMuted : 'transparent',
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
  const composedClassName = [
    'ti-button',
    `ti-button--${variant}`,
    fullWidth ? 'ti-button--full' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...buttonProps}
      className={composedClassName}
      disabled={disabled}
      style={{
        ...baseButtonStyle,
        ...sizeStyles[size],
        ...getVariantStyle(variant, isActive),
        opacity: disabled ? 0.58 : undefined,
        pointerEvents: disabled ? 'none' : undefined,
        width: fullWidth ? '100%' : undefined,
        ...style
      }}
    >
      {children}
    </button>
  );
}
