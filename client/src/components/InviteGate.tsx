import { useState } from 'react';
import { verifyInviteCode, setStoredInviteCode } from '../api';

interface InviteGateProps {
  onSuccess: () => void;
}

export default function InviteGate({ onSuccess }: InviteGateProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const result = await verifyInviteCode(code.trim());
      if (!result.valid) {
        setError(result.error || '邀请码无效');
        return;
      }
      setStoredInviteCode(code.trim());
      onSuccess();
    } catch {
      setError('验证失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gossip-bg p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-gossip-border bg-gossip-surface p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <span className="text-5xl">🍉</span>
          <h1 className="mt-3 text-xl font-bold text-gossip-text">GossipGraph</h1>
          <p className="mt-1 text-sm text-gossip-muted">输入邀请码，开始吃瓜</p>
        </div>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="GOSSIP-XXXXXXXX"
          className="mb-4 w-full rounded-lg border border-gossip-border bg-gossip-bg px-4 py-3 text-center font-mono text-sm tracking-wider text-gossip-text placeholder:text-gossip-muted/40 focus:border-gossip-purple focus:outline-none focus:ring-1 focus:ring-gossip-purple/50"
          disabled={loading}
          autoFocus
        />

        {error && (
          <p className="mb-4 text-center text-sm text-gossip-red">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full rounded-lg bg-gradient-to-r from-gossip-purple to-gossip-pink py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {loading ? '验证中…' : '进入瓜田'}
        </button>

        <p className="mt-4 text-center text-xs text-gossip-muted/60">
          每人每日 20 次生成额度
        </p>
      </form>
    </div>
  );
}
