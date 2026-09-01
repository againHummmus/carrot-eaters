interface ProgressBarProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  variant?: 'personal' | 'average';
}

export function ProgressBar({ label, value, target, unit, variant = 'personal' }: ProgressBarProps) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const over = value > target;
  const barColor = over ? 'bg-amber-500' : variant === 'personal' ? 'bg-emerald-500' : 'bg-slate-400';

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">
          {Math.round(value)} <span className="text-slate-300">/</span> {Math.round(target)} {unit}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 shadow-inner">
        <div
          className={`h-full rounded-full ${barColor} transition-[width] duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {variant === 'average' && <p className="mt-1 text-xs text-slate-400">средняя норма, не персональная цель</p>}
    </div>
  );
}
