import type { GraphNode, ResolvedLink } from '../types';
import { getAvatarUrl } from '../types';

interface PersonDetailPanelProps {
  node: GraphNode | null;
  links: ResolvedLink[];
  allNodes: GraphNode[];
  timelineLabel?: string;
}

const sentimentBadge = {
  positive: 'bg-gossip-pink/20 text-gossip-pink',
  negative: 'bg-gossip-red/20 text-gossip-red',
  neutral: 'bg-gossip-muted/20 text-gossip-muted',
};

export default function PersonDetailPanel({ node, links, allNodes, timelineLabel }: PersonDetailPanelProps) {
  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center text-gossip-muted">
        <span className="text-3xl opacity-50">👤</span>
        <p className="text-sm">点击左侧图谱中的人物</p>
        <p className="text-xs opacity-60">即可查看八卦档案</p>
      </div>
    );
  }

  const relatedLinks = links.filter(
    (l) => l.source === node.id || l.target === node.id
  );

  const getOtherId = (link: ResolvedLink) =>
    link.source === node.id ? link.target : link.source;

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gossip-border px-4 py-3">
        <img
          src={getAvatarUrl(node.avatar || node.id)}
          alt={node.id}
          className="h-12 w-12 rounded-full border-2 border-gossip-purple bg-gossip-card"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-gossip-text">{node.id}</h3>
          <span className="inline-block rounded-full bg-gossip-pink/20 px-2 py-0.5 text-xs text-gossip-pink">
            {node.label}
          </span>
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto p-4">
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gossip-muted">
          关系网络 · {relatedLinks.length}
          {timelineLabel != null && (
            <span className="ml-1 normal-case text-gossip-purple">({timelineLabel})</span>
          )}
        </h4>

        {relatedLinks.length === 0 ? (
          <p className="text-sm text-gossip-muted">该时间点暂无关系记录</p>
        ) : (
          <div className="space-y-2">
            {relatedLinks.map((link, i) => {
              const otherId = getOtherId(link);
              const otherNode = allNodes.find((n) => n.id === otherId);
              return (
                <div
                  key={`${link.source}-${link.target}-${link.relation}-${i}`}
                  className="rounded-lg border border-gossip-border bg-gossip-bg/50 p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-gossip-text">{otherId}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${sentimentBadge[link.sentiment]}`}>
                      {link.relation}
                    </span>
                  </div>
                  {otherNode && (
                    <span className="text-xs text-gossip-muted">{otherNode.label}</span>
                  )}
                  {link.detail && (
                    <p className="mt-1 text-xs leading-relaxed text-gossip-muted/80">{link.detail}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
