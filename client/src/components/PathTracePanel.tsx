import type { PathStep } from '../types';

interface PathTracePanelProps {
  start: string;
  end: string;
  steps: PathStep[] | null;
  onClear: () => void;
}

const sentimentColor = {
  positive: 'text-gossip-pink',
  negative: 'text-gossip-red',
  neutral: 'text-gossip-muted',
};

export default function PathTracePanel({ start, end, steps, onClear }: PathTracePanelProps) {
  if (!start && !end) return null;

  return (
    <div className="border-b border-gossip-border bg-gossip-bg/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wider text-gossip-gold">
          🔗 吃瓜路径
        </h4>
        <button
          onClick={onClear}
          className="text-xs text-gossip-muted transition-colors hover:text-gossip-pink"
        >
          清除
        </button>
      </div>

      {!end ? (
        <p className="text-sm text-gossip-muted">
          已选 <span className="font-medium text-gossip-gold">{start}</span>，再点另一个人物追踪关系链
        </p>
      ) : steps === null ? (
        <p className="text-sm text-gossip-red">
          <span className="font-medium text-gossip-gold">{start}</span> 和{' '}
          <span className="font-medium text-gossip-gold">{end}</span>{' '}
          之间居然没有直接关系… 瓜还没串起来！
        </p>
      ) : steps.length === 0 ? (
        <p className="text-sm text-gossip-pink">同一个人，不用追踪啦～</p>
      ) : (
        <div>
          <p className="mb-3 text-sm leading-relaxed text-gossip-text">
            天哪！<span className="font-medium text-gossip-gold">{start}</span> 和{' '}
            <span className="font-medium text-gossip-gold">{end}</span> 竟然能扯上关系！
          </p>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div
                key={`${step.from}-${step.to}-${i}`}
                className="flex items-start gap-2 rounded-lg border border-gossip-gold/20 bg-gossip-card/50 px-3 py-2 text-xs"
              >
                <span className="mt-0.5 text-gossip-gold">{i + 1}.</span>
                <div>
                  <span className="font-medium text-gossip-text">{step.from}</span>
                  <span className="mx-1 text-gossip-muted">→</span>
                  <span className={`font-medium ${sentimentColor[step.sentiment]}`}>
                    {step.relation}
                  </span>
                  <span className="mx-1 text-gossip-muted">→</span>
                  <span className="font-medium text-gossip-text">{step.to}</span>
                  {step.detail && (
                    <p className="mt-1 text-gossip-muted/70">{step.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gossip-muted">
            共 {steps.length} 跳，{steps.length + 1} 人牵连
          </p>
        </div>
      )}
    </div>
  );
}
