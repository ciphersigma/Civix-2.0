import React from 'react';

// Shared themed styles using CSS variables
// These work because CSS var() is resolved by the browser, not React
export const themed = {
  card: {
    background: 'var(--bg-secondary)',
    borderRadius: 16,
    padding: 24,
    border: '1px solid var(--border-primary)',
    transition: 'background 0.3s, border-color 0.3s',
  } as React.CSSProperties,

  statCard: {
    background: 'var(--bg-secondary)',
    borderRadius: 16,
    padding: '22px 20px',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 16,
    border: '1px solid var(--border-primary)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'default' as const,
  } as React.CSSProperties,

  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  } as React.CSSProperties,

  subtitle: {
    margin: '4px 0 0',
    color: 'var(--text-faint)',
    fontSize: 14,
  } as React.CSSProperties,

  cardTitle: {
    margin: '0 0 20px',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-faint)',
    letterSpacing: '0.8px',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,

  th: {
    textAlign: 'left' as const,
    padding: '10px 14px',
    borderBottom: '1px solid var(--border-primary)',
    fontSize: 11,
    color: 'var(--text-faint)',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
  } as React.CSSProperties,

  td: {
    padding: '12px 14px',
    borderBottom: '1px solid var(--border-secondary)',
    fontSize: 14,
    color: 'var(--text-secondary)',
  } as React.CSSProperties,

  select: {
    padding: '9px 14px',
    border: '1px solid var(--border-input)',
    borderRadius: 10,
    fontSize: 14,
    background: 'var(--bg-input)',
    color: 'var(--text-secondary)',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties,

  input: {
    padding: '10px 14px',
    border: '1px solid var(--border-input)',
    borderRadius: 10,
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box' as const,
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  paginationRow: {
    display: 'flex' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 16,
    marginTop: 20,
    paddingTop: 16,
    borderTop: '1px solid var(--border-secondary)',
  } as React.CSSProperties,

  paginationBtn: {
    padding: '7px 18px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-input)',
    borderRadius: 8,
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.15s',
  } as React.CSSProperties,

  empty: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: 'var(--text-faint)',
  } as React.CSSProperties,

  barTrack: {
    background: 'var(--bg-hover)',
    borderRadius: 6,
    height: 8,
    overflow: 'hidden' as const,
  } as React.CSSProperties,

  metricCard: {
    background: 'var(--bg-tertiary)',
    borderRadius: 14,
    padding: 20,
    textAlign: 'center' as const,
    border: '1px solid var(--border-secondary)',
    transition: 'all 0.2s',
  } as React.CSSProperties,
};
