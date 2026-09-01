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
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        <span className="text-slate-500">
          {Math.round(value)} / {Math.round(target)} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {variant === 'average' && <p className="mt-0.5 text-xs text-slate-400">средняя норма, не персональная цель</p>}
    </div>
  );
}
