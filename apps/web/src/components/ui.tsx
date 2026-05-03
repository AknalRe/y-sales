import type { ReactNode } from 'react';

// ─── Skeleton Components ──────────────────────────────────────────────────────

/** Animated skeleton bar for loading states */
export function Skeleton({ width = '100%', height = 16, radius = 8, className = '' }: {
  width?: string | number;
  height?: string | number;
  radius?: number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'rgba(255,255,255,.06)',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <div className="skeleton-shimmer" />
    </div>
  );
}

/** Skeleton row for table rows */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="skeleton-table-row">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '1rem .85rem' }}>
          <Skeleton height={14} width={i === 0 ? '70%' : i === cols - 1 ? '50%' : '85%'} />
        </td>
      ))}
    </tr>
  );
}

/** Full-table skeleton: renders N skeleton rows */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </>
  );
}

/** Card grid skeleton */
export function CardGridSkeleton({ count = 4, minWidth = 220 }: { count?: number; minWidth?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`, gap: '.75rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 20, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
          <Skeleton width={40} height={40} radius={12} />
          <Skeleton height={24} width="60%" />
          <Skeleton height={13} width="80%" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty State Component ─────────────────────────────────────────────────────

/** Reusable empty state for tables and pages */
export function EmptyState({
  icon,
  title,
  description,
  action,
  colSpan,
}: {
  icon?: string | ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  colSpan?: number; // when used inside <tbody><tr>
}) {
  const content = (
    <div className="empty-state">
      {icon && (
        <div className="empty-state-icon">
          {typeof icon === 'string' ? <span style={{ fontSize: '2.5rem' }}>{icon}</span> : icon}
        </div>
      )}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="empty-state-btn">
          {action.label}
        </button>
      )}
    </div>
  );

  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan} style={{ padding: 0 }}>
          {content}
        </td>
      </tr>
    );
  }

  return content;
}

/** Inline loading spinner */
export function Spinner({ size = 20, color = '#a78bfa' }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}30`,
      borderTop: `2px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 0.75s linear infinite',
      flexShrink: 0,
    }} />
  );
}

/** Full-page centered loading state */
export function PageLoader({ message = 'Memuat...' }: { message?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '1rem', minHeight: 280, color: '#64748b',
    }}>
      <Spinner size={32} />
      <p style={{ margin: 0, fontSize: '.875rem' }}>{message}</p>
    </div>
  );
}
