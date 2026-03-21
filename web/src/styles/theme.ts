import React from 'react';

export const themed = {
  card: {
    background: 'var(--bg-secondary)',
    borderRadius: 14,
    padding: 22,
    border: '1px solid var(--border-primary)',
    transition: 'background 0.3s, border-color 0.3s',
  } as React.CSSProperties,

  statCard: {
    background: 'var(--bg-secondary)',
    borderRadius: 14,
    padding: '18px 18px',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 14,
    border: '1px solid var(--border-primary)',
    transition: 'all 0.15s ease',
    cursor: 'default' as const,
  } as React.CSSProperties,

  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  } as React.CSSProperties,

  subtitle: {
    margin: '3px 0 0',
    color: 'var(--text-faint)',
    fontSize: 13,
  } as React.CSSProperties,

  cardTitle: {
    margin: '0 0 18px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-faint)',
    letterSpacing: '0.8px',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,

  th: {
    textAlign: 'left' as const,
    padding: '8px 12px',
    borderBottom: '1px solid var(--border-primary)',
    fontSize: 11,
    color: 'var(--text-faint)',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.6px',
  } as React.CSSProperties,

  td: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--border-secondary)',
    fontSize: 13,
    color: 'var(--text-secondary)',
  } as React.CSSProperties,

  select: {
    padding: '8px 12px',
    border: '1px solid var(--border-input)',
    borderRadius: 8,
    fontSize: 13,
    background: 'var(--bg-input)',
    color: 'var(--text-secondary)',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties,

  input: {
    padding: '9px 12px',
    border: '1px solid var(--border-input)',
    borderRadius: 8,
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box' as const,
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'all 0.15s',
  } as React.CSSProperties,

  paginationRow: {
    display: 'flex' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 14,
    marginTop: 16,
    paddingTop: 14,
    borderTop: '1px solid var(--border-secondary)',
  } as React.CSSProperties,

  paginationBtn: {
    padding: '6px 16px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-input)',
    borderRadius: 6,
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.15s',
  } as React.CSSProperties,

  empty: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: 'var(--text-faint)',
    fontSize: 13,
  } as React.CSSProperties,

  barTrack: {
    background: 'var(--bg-hover)',
    borderRadius: 4,
    height: 6,
    overflow: 'hidden' as const,
  } as React.CSSProperties,

  metricCard: {
    background: 'var(--bg-tertiary)',
    borderRadius: 12,
    padding: 16,
    textAlign: 'center' as const,
    border: '1px solid var(--border-secondary)',
    transition: 'all 0.15s',
  } as React.CSSProperties,
};
