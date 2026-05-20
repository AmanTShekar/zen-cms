import React from 'react'

/**
 * Strapi-to-Zenith UI Translation Adapter
 * ───────────────────────────────────────
 * Provides lightweight React 19 polyfills and high-fidelity styling mappings
 * for Strapi Design System components. Automatically wraps flat elements in
 * Zenith's custom cyber-obsidian glassmorphism design tokens.
 */

// ── 1. Glassmorphism Design Token Injector ────────────────────────────────────
const glassmorphicStyle: React.CSSProperties = {
  backgroundColor: 'rgba(17, 24, 39, 0.65)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
}

// ── 2. Mock Design System Components ──────────────────────────────────────────

export const Box: React.FC<React.HTMLAttributes<HTMLDivElement> & { hasRadius?: boolean; background?: string }> = ({
  children,
  style,
  hasRadius,
  background,
  ...props
}) => {
  const mergedStyle = {
    padding: '16px',
    ...(hasRadius || background === 'neutral0' ? glassmorphicStyle : {}),
    ...style,
  }

  return (
    <div style={mergedStyle} {...props}>
      {children}
    </div>
  )
}

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'secondary' | 'danger' }> = ({
  children,
  style,
  variant,
  ...props
}) => {
  const isDanger = variant === 'danger'
  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.2s ease',
    backgroundColor: isDanger ? '#EF4444' : 'rgba(139, 92, 246, 0.2)',
    color: '#F9FAFB',
    backdropFilter: 'blur(4px)',
    outline: 'none',
    ...style,
  }

  return (
    <button
      style={buttonStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.04)'
        e.currentTarget.style.boxShadow = '0 0 12px rgba(139, 92, 246, 0.4)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      {...props}
    >
      {children}
    </button>
  )
}

export const Stack: React.FC<React.HTMLAttributes<HTMLDivElement> & { spacing?: number; horizontal?: boolean }> = ({
  children,
  style,
  spacing = 4,
  horizontal = false,
  ...props
}) => {
  const stackStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: horizontal ? 'row' : 'column',
    gap: `${spacing * 4}px`,
    ...style,
  }

  return (
    <div style={stackStyle} {...props}>
      {children}
    </div>
  )
}

export const Grid: React.FC<React.HTMLAttributes<HTMLDivElement> & { gap?: number }> = ({
  children,
  style,
  gap = 4,
  ...props
}) => {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: `${gap * 4}px`,
    ...style,
  }

  return (
    <div style={gridStyle} {...props}>
      {children}
    </div>
  )
}

export const GridItem: React.FC<React.HTMLAttributes<HTMLDivElement> & { col?: number }> = ({
  children,
  style,
  col = 12,
  ...props
}) => {
  const itemStyle: React.CSSProperties = {
    gridColumn: `span ${col}`,
    ...style,
  }

  return (
    <div style={itemStyle} {...props}>
      {children}
    </div>
  )
}

export const Typography: React.FC<React.HTMLAttributes<HTMLSpanElement> & { variant?: 'alpha' | 'beta' | 'omega' | 'pi'; textColor?: string }> = ({
  children,
  style,
  variant,
  textColor,
  ...props
}) => {
  let fontSize = '14px'
  let fontWeight = 400
  
  if (variant === 'alpha') {
    fontSize = '24px'
    fontWeight = 700
  } else if (variant === 'beta') {
    fontSize = '20px'
    fontWeight = 600
  } else if (variant === 'omega') {
    fontSize = '16px'
    fontWeight = 500
  }

  const textStyle: React.CSSProperties = {
    fontSize,
    fontWeight,
    color: textColor || '#E5E7EB',
    fontFamily: '"Outfit", "Inter", sans-serif',
    ...style,
  }

  return (
    <span style={textStyle} {...props}>
      {children}
    </span>
  )
}

// ── 3. Mock Helper Hooks ──────────────────────────────────────────────────────

export function useNotification() {
  return (config: { type: 'success' | 'warning' | 'info'; message: string }) => {
    console.log(`[Zenith UI Alert] ${config.type.toUpperCase()}: ${config.message}`)
    // Integrate with native Zenith notifications under the hood
  }
}

export function useFetchClient() {
  return {
    get: async (url: string) => {
      const res = await fetch(`/api/v1${url}`)
      return { data: await res.json() }
    },
    post: async (url: string, data: any) => {
      const res = await fetch(`/api/v1${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return { data: await res.json() }
    },
  }
}

export function useCMEditViewDataManager() {
  return {
    slug: 'article',
    initialData: {},
    modifiedData: {},
    onChange: () => {},
  }
}
