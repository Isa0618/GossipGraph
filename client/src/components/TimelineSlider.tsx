import { formatTimeValue } from '../types';

interface TimelineSliderProps {
  markers: number[];
  time: number;
  onChange: (time: number) => void;
  hasTimeline: boolean;
  isAnimating?: boolean;
}

export default function TimelineSlider({
  markers,
  time,
  onChange,
  hasTimeline,
  isAnimating,
}: TimelineSliderProps) {
  if (!hasTimeline || markers.length === 0) return null;

  const currentIndex = Math.max(0, markers.indexOf(time));
  const min = 0;
  const max = markers.length - 1;
  const pct = max === 0 ? 100 : (currentIndex / max) * 100;

  const handleIndexChange = (index: number) => {
    const clamped = Math.max(0, Math.min(markers.length - 1, index));
    onChange(markers[clamped]);
  };

  return (
    <div className="absolute bottom-4 right-4 left-4 rounded-xl border border-gossip-border bg-gossip-surface/95 px-5 py-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">🕐</span>
          <span className="text-sm font-medium text-gossip-text">吃瓜进度条</span>
          {isAnimating && (
            <span className="animate-pulse text-xs text-gossip-pink">蔓延中…</span>
          )}
        </div>
        <span className="rounded-full bg-gossip-purple/20 px-3 py-1 text-sm font-bold text-gossip-purple">
          {formatTimeValue(time)}
        </span>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full bg-gossip-border/60" />
        <div
          className="pointer-events-none absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-gossip-purple to-gossip-pink transition-all duration-150"
          style={{ width: `${pct}%` }}
        />
        {markers.map((m, i) => {
          const mp = max === 0 ? 0 : (i / max) * 100;
          return (
            <div
              key={m}
              className="pointer-events-none absolute top-1/2 h-2 w-0.5 -translate-y-1/2 rounded-full bg-gossip-gold/60"
              style={{ left: `${mp}%` }}
              title={formatTimeValue(m)}
            />
          );
        })}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={currentIndex}
          onChange={(e) => handleIndexChange(Number(e.target.value))}
          className="timeline-slider relative z-10 w-full cursor-pointer"
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-gossip-muted">
        <span>{formatTimeValue(markers[0])}</span>
        <span className="text-gossip-muted/60">逐步拖动 · 看关系生长 / 断裂 / 重组</span>
        <span>{formatTimeValue(markers[markers.length - 1])}</span>
      </div>
    </div>
  );
}
