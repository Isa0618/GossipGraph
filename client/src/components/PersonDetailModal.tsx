import type { GraphNode, ResolvedLink } from '../types';
import { getAvatarUrl } from '../types';

interface PersonDetailModalProps {
  node: GraphNode;
  links: ResolvedLink[];
  allNodes: GraphNode[];
  timelineLabel?: string;
  onClose: () => void;
}

const sentimentBadge = {
  positive: 'bg-gossip-pink/20 text-gossip-pink',
  negative: 'bg-gossip-red/20 text-gossip-red',
  neutral: 'bg-gossip-muted/20 text-gossip-muted',
};

export default function PersonDetailModal({
  node,
  links,
  allNodes,
  timelineLabel,
  onClose,
}: PersonDetailModalProps) {
  const relatedLinks = links.filter(
    (l) => l.source === node.id || l.target === node.id
  );

  const getOtherId = (link: ResolvedLink) =>
    link.source === node.id ? link.target : link.source;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gossip-border bg-gossip-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gossip-border px-5 py-4">
          <div className="flex items-center gap-4">
            <img
              src={getAvatarUrl(node.avatar || node.id)}
              alt={node.id}
              className="h-16 w-16 rounded-full border-2 border-gossip-purple bg-gossip-surface"
            />
            <div>
              <h3 className="text-xl font-bold text-gossip-text">{node.id}</h3>
              <span className="mt-1 inline-block rounded-full bg-gossip-pink/20 px-3 py-0.5 text-sm text-gossip-pink">
                {node.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-gossip-muted transition-colors hover:bg-gossip-border hover:text-gossip-text"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gossip-muted">
            关系网络 · {relatedLinks.length}
            {timelineLabel != null && (
              <span className="ml-1 normal-case text-gossip-purple">({timelineLabel})</span>
            )}
          </h4>

          {relatedLinks.length === 0 ? (
            <p className="text-sm text-gossip-muted">该时间点暂无关系记录</p>
          ) : (
            <div className="space-y-3">
              {relatedLinks.map((link, i) => {
                const otherId = getOtherId(link);
                const otherNode = allNodes.find((n) => n.id === otherId);
                return (
                  <div
                    key={`${link.source}-${link.target}-${link.relation}-${i}`}
                    className="rounded-xl border border-gossip-border bg-gossip-bg/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gossip-text">{otherId}</span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${sentimentBadge[link.sentiment]}`}
                      >
                        {link.relation}
                      </span>
                    </div>
                    {otherNode && (
                      <span className="text-xs text-gossip-muted">{otherNode.label}</span>
                    )}
                    {link.detail && (
                      <p className="mt-2 text-sm leading-relaxed text-gossip-muted/90">
                        {link.detail}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
