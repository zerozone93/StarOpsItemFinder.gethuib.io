import { ReactNode } from 'react';

export function StatCard({ label, value, children }: { label: string; value: string | number; children?: ReactNode }) {
  return (
    <article className="panel stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {children ? <div className="muted small">{children}</div> : null}
    </article>
  );
}
