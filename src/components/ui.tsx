import Link from 'next/link';
import { pillClass } from '@/lib/pill-colors';

// Shared page furniture for the reskin. Server-safe (no hooks), so pages can use it directly.

// Small group label ("Sales"), 32px title, optional description, actions on the right.
export function PageHeader({
  group,
  title,
  description,
  actions,
  className = ''
}: {
  group?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {group && <div className="mb-1 text-[13px] text-ink-2">{group}</div>}
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Underlined tab links with optional count chips. Tabs are links, so Back works.
export function TabNav({
  label,
  items,
  className = 'mb-6 mt-5'
}: {
  label: string;
  items: { href: string; label: string; count?: number; active: boolean }[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={`flex flex-wrap gap-x-6 gap-y-1 border-b border-line ${className}`}>
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? 'page' : undefined}
          className={`-mb-px flex items-center gap-1.5 border-b-2 px-0.5 py-2.5 text-sm ${
            t.active ? 'border-ink font-medium text-ink' : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className="count-chip">{t.count.toLocaleString()}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function Pill({ value, children }: { value: string; children?: React.ReactNode }) {
  return <span className={`pill ${pillClass(value)}`}>{children ?? value}</span>;
}

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <section className={`card ${className}`}>{children}</section>;
}

// 15px semibold card heading with an optional right-hand note or link.
export function CardTitle({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {aside && <span className="text-[13px] text-ink-2">{aside}</span>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'neutral'
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'good' | 'warn';
}) {
  const subClass = tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-warn' : 'text-ink-2';
  return (
    <div className="card p-5">
      <div className="text-[13px] text-ink-2">{label}</div>
      <div className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.02em] text-ink">{value}</div>
      {sub && <div className={`mt-2 text-[13px] ${subClass}`}>{sub}</div>}
    </div>
  );
}
