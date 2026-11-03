import * as React from 'react';
import { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  CountUp: Animated numerical counter with cubic-bezier easing      */
/* ------------------------------------------------------------------ */

function formatPtBr(n: number): string {
  return Math.round(n).toLocaleString('pt-BR');
}

export function CountUp({
  value,
  prefix = '',
  suffix = '',
  duration = 900,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const fromRef = React.useRef(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const startVal = fromRef.current;
    const endVal = value;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;
      el.textContent = `${prefix}${formatPtBr(current)}${suffix}`;

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        el.textContent = `${prefix}${formatPtBr(endVal)}${suffix}`;
        fromRef.current = endVal;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, prefix, suffix, duration]);

  return <span ref={ref}>{prefix}{formatPtBr(value)}{suffix}</span>;
}

/* ------------------------------------------------------------------ */
/*  BentoMiniSparkline: SVG trend curve for KPI cards                 */
/* ------------------------------------------------------------------ */

export function BentoMiniSparkline({
  data,
  color = '#174675',
  width = 96,
  height = 32,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 4) + 2;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible opacity-80 transition-opacity duration-200 group-hover:opacity-100"
    >
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L ${width - 2},${height} L 2,${height} Z`}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  BentoCard: Single interactive metric card with shadcn / dark mode */
/* ------------------------------------------------------------------ */

export interface BentoCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral' | 'danger';
  subtitle?: string;
  icon?: LucideIcon;
  sparklineData?: number[];
  sparklineColor?: string;
  accentColor?: string;
  onClick?: () => void;
  className?: string;
}

export function BentoCard({
  title,
  value,
  prefix = '',
  suffix = '',
  delta,
  deltaType = 'neutral',
  subtitle,
  icon: Icon,
  sparklineData,
  sparklineColor = '#174675',
  accentColor,
  onClick,
  className = '',
}: BentoCardProps) {
  const deltaColors = {
    positive: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    negative: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    neutral: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  };

  return (
    <article
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 [transition-timing-function:cubic-bezier(0.2,0.9,0.25,1)] hover:-translate-y-1 hover:shadow-lg dark:bg-card/90 ${
        onClick ? 'cursor-pointer hover:border-primary/50' : ''
      } ${className}`}
      style={accentColor ? { borderTop: `3px solid ${accentColor}` } : undefined}
    >
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-20"
        style={{ backgroundColor: accentColor || sparklineColor }}
      />

      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {Icon && (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
            style={{
              backgroundColor: accentColor ? `${accentColor}18` : 'var(--primary-soft)',
              color: accentColor || 'var(--primary)',
            }}
          >
            <Icon size={18} strokeWidth={2.2} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          <CountUp value={value} prefix={prefix} suffix={suffix} />
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="shrink-0">
            <BentoMiniSparkline data={sparklineData} color={sparklineColor} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        {subtitle && <span>{subtitle}</span>}
        {delta && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${
              deltaColors[deltaType]
            }`}
          >
            {delta}
          </span>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  ModuleBentoGrid: Container for 2, 3 or 4 bento cards             */
/* ------------------------------------------------------------------ */

export function ModuleBentoGrid({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-2 duration-500 ${className}`}
    >
      {children}
    </div>
  );
}
