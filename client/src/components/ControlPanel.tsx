import { useState } from 'react';
import { SAMPLE_TEXT } from '../types';

interface ControlPanelProps {
  onGenerate: (text: string) => void;
  onAppend: (text: string) => void;
  loading: boolean;
  error: string | null;
  nodeCount: number;
  linkCount: number;
  pathTraceMode: boolean;
  onTogglePathTrace: () => void;
  appendMessage: string | null;
  quota: { limit: number; used: number; remaining: number };
  authRequired: boolean;
}

export default function ControlPanel({
  onGenerate,
  onAppend,
  loading,
  error,
  nodeCount,
  linkCount,
  pathTraceMode,
  onTogglePathTrace,
  appendMessage,
  quota,
  authRequired,
}: ControlPanelProps) {
  const [text, setText] = useState('');

  const handleGenerate = () => {
    if (text.trim()) {
      onGenerate(text.trim());
      setText('');
    }
  };

  const handleAppend = () => {
    if (text.trim()) {
      onAppend(text.trim());
      setText('');
    }
  };

  const loadSample = () => setText(SAMPLE_TEXT);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-gossip-border px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍉</span>
            <div>
              <h1 className="text-base font-bold text-gossip-text">GossipGraph</h1>
              <p className="text-xs text-gossip-muted">八卦关系图谱生成器</p>
            </div>
          </div>
          {authRequired && (
            <div
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-center text-xs ${
                quota.remaining <= 3
                  ? 'border border-gossip-red/30 bg-gossip-red/10 text-gossip-red'
                  : 'border border-gossip-purple/30 bg-gossip-purple/10 text-gossip-purple'
              }`}
            >
              <div className="font-bold">今日剩余 {quota.remaining} 次</div>
            </div>
          )}
        </div>
      </div>

      {(nodeCount > 0 || linkCount > 0) && (
        <div className="flex gap-3 border-b border-gossip-border px-5 py-2">
          <div className="flex-1 rounded-lg bg-gossip-bg/60 px-3 py-1.5 text-center">
            <div className="text-base font-bold text-gossip-purple">{nodeCount}</div>
            <div className="text-xs text-gossip-muted">人物</div>
          </div>
          <div className="flex-1 rounded-lg bg-gossip-bg/60 px-3 py-1.5 text-center">
            <div className="text-base font-bold text-gossip-pink">{linkCount}</div>
            <div className="text-xs text-gossip-muted">关系</div>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-5">
        <label className="text-xs font-medium text-gossip-muted">粘贴八卦文本</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="第一句：A和B结婚了…&#10;追加：震惊！C插足了A和B…"
          className="min-h-[120px] flex-1 resize-none rounded-lg border border-gossip-border bg-gossip-bg/60 px-4 py-3 text-sm leading-relaxed text-gossip-text placeholder:text-gossip-muted/50 focus:border-gossip-purple focus:outline-none focus:ring-1 focus:ring-gossip-purple/50"
          disabled={loading}
        />

        {error && (
          <div className="rounded-lg border border-gossip-red/30 bg-gossip-red/10 px-3 py-2 text-xs text-gossip-red">
            {error}
          </div>
        )}

        {appendMessage && (
          <div className="rounded-lg border border-gossip-purple/30 bg-gossip-purple/10 px-3 py-2 text-xs text-gossip-purple">
            {appendMessage}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={loading || !text.trim() || (authRequired && quota.remaining <= 0)}
            className="flex-1 rounded-lg bg-gradient-to-r from-gossip-purple to-gossip-pink px-4 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                吃瓜分析中...
              </span>
            ) : (
              '🔮 生成图谱'
            )}
          </button>
          <button
            onClick={handleAppend}
            disabled={loading || !text.trim() || (authRequired && quota.remaining <= 0)}
            title="在保留现有图谱的基础上追加新人物和关系"
            className="rounded-lg border border-gossip-border bg-gossip-card px-4 py-2.5 text-sm font-medium text-gossip-text transition-all hover:border-gossip-purple hover:bg-gossip-purple/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ➕ 追加八卦
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadSample}
            disabled={loading}
            className="flex-1 text-xs text-gossip-muted transition-colors hover:text-gossip-pink disabled:opacity-40"
          >
            📋 加载示例
          </button>
          <button
            onClick={onTogglePathTrace}
            disabled={nodeCount < 2}
            className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-40 ${
              pathTraceMode
                ? 'border-gossip-gold bg-gossip-gold/20 text-gossip-gold'
                : 'border-gossip-border text-gossip-muted hover:border-gossip-gold hover:text-gossip-gold'
            }`}
          >
            {pathTraceMode ? '🔗 路径模式 ON' : '🔗 吃瓜路径'}
          </button>
        </div>
      </div>

      <div className="border-t border-gossip-border px-5 py-3">
        <p className="text-xs leading-relaxed text-gossip-muted/70">
          💡 点击左侧人物查看详情；<strong>追加八卦</strong>保留原有结构并新增连线；<strong>吃瓜路径</strong>点两人追踪关系链
        </p>
      </div>
    </div>
  );
}
