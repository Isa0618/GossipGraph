import { useRef, useCallback, useEffect, useState, useMemo, type ReactNode } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import type { ForceNode, ForceLink, ResolvedLink, GraphNode } from '../types';
import { getAvatarUrl, linkKey } from '../types';
import { useTimelineTransition } from '../hooks/useTimelineTransition';
import { spawnEnteringNodes } from '../utils/timelineAnimation';
import type { LinkAnim } from '../utils/timelineAnimation';
import TimelineSlider from './TimelineSlider';

interface GossipGraphProps {
  targetNodes: GraphNode[];
  targetLinks: ResolvedLink[];
  nodePositions: Record<string, { x: number; y: number }>;
  selectedNodeId: string | null;
  traceStartId: string | null;
  traceEndId: string | null;
  highlightNodeIds: Set<string>;
  highlightLinkKeys: Set<string>;
  onNodeClick: (nodeId: string) => void;
  hoveredLink: ForceLink | null;
  onLinkHover: (link: ForceLink | null) => void;
  onNodePositionChange: (id: string, pos: { x: number; y: number }) => void;
  timelineMarkers: number[];
  timelineTime: number;
  onTimelineChange: (time: number) => void;
  pathTraceMode: boolean;
  children?: ReactNode;
}

const SENTIMENT_COLORS = {
  positive: '#ff6b9d',
  negative: '#ff4757',
  neutral: '#9b8ab8',
} as const;

const avatarCache = new Map<string, HTMLImageElement>();

function loadAvatar(seed: string): Promise<HTMLImageElement> {
  if (avatarCache.has(seed)) {
    return Promise.resolve(avatarCache.get(seed)!);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      avatarCache.set(seed, img);
      resolve(img);
    };
    img.onerror = () => resolve(img);
    img.src = getAvatarUrl(seed);
  });
}

export default function GossipGraph({
  targetNodes,
  targetLinks,
  nodePositions,
  selectedNodeId,
  traceStartId,
  traceEndId,
  highlightNodeIds,
  highlightLinkKeys,
  onNodeClick,
  hoveredLink,
  onLinkHover,
  onNodePositionChange,
  timelineMarkers,
  timelineTime,
  onTimelineChange,
  pathTraceMode,
  children,
}: GossipGraphProps) {
  const graphRef = useRef<ForceGraphMethods<ForceNode, ForceLink>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const spawnRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [, setTick] = useState(0);

  const { renderNodes, renderLinks, snapshot, isAnimating } = useTimelineTransition(
    targetNodes,
    targetLinks
  );

  useEffect(() => {
    if (!isAnimating) return;
    const anchors = new Map<string, { x: number; y: number }>();
    Object.entries(nodePositions).forEach(([id, p]) => anchors.set(id, p));
    spawnRef.current = spawnEnteringNodes(
      renderNodes,
      renderLinks,
      snapshot.nodeAnims,
      anchors,
      { x: dimensions.width / 2, y: dimensions.height / 2 }
    );
  }, [isAnimating, renderNodes, renderLinks, snapshot.nodeAnims, nodePositions, dimensions]);

  useEffect(() => {
    if (!isAnimating) return;
    let raf = 0;
    const loop = () => {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isAnimating]);

  useEffect(() => {
    renderNodes.forEach((n) => loadAvatar(n.avatar || n.id));
  }, [renderNodes]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const graphNodes: ForceNode[] = useMemo(() => {
    return renderNodes.map((n) => {
      const anim = snapshot.nodeAnims.get(n.id);
      const saved = nodePositions[n.id];
      const spawn = spawnRef.current.get(n.id);

      if (anim?.phase === 'exit' && saved) {
        return { ...n, x: saved.x, y: saved.y, fx: saved.x, fy: saved.y };
      }
      if (saved) {
        return { ...n, x: saved.x, y: saved.y, fx: saved.x, fy: saved.y };
      }
      if (spawn) {
        return { ...n, x: spawn.x, y: spawn.y };
      }
      return { ...n };
    });
  }, [renderNodes, nodePositions, snapshot.nodeAnims]);

  const paintNode = useCallback(
    (node: ForceNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const anim = snapshot.nodeAnims.get(node.id);
      if (anim && anim.opacity < 0.02) return;

      const opacity = anim?.opacity ?? 1;
      const scale = anim?.scale ?? 1;
      const isSelected = node.id === selectedNodeId;
      const isTraceStart = node.id === traceStartId;
      const isTraceEnd = node.id === traceEndId;
      const isOnPath = highlightNodeIds.has(node.id);
      const baseRadius = isSelected || isOnPath ? 17 : 14;
      const radius = baseRadius * scale;
      const x = node.x ?? 0;
      const y = node.y ?? 0;

      ctx.save();
      ctx.globalAlpha = opacity;

      if (anim?.phase === 'enter') {
        ctx.beginPath();
        ctx.arc(x, y, radius + 8, 0, 2 * Math.PI);
        const g = ctx.createRadialGradient(x, y, radius, x, y, radius + 8);
        g.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
        g.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = g;
        ctx.fill();
      }

      if (isOnPath) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
        ctx.fill();
      }

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 6, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.fill();
      }

      if (isTraceStart || isTraceEnd) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isOnPath ? '#3d2e10' : '#2e2240';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#a855f7' : isOnPath ? '#fbbf24' : '#4a3560';
      ctx.lineWidth = isSelected || isOnPath ? 3 : 2;
      ctx.stroke();

      const img = avatarCache.get(node.avatar || node.id);
      if (img?.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius - 2, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(img, x - radius + 2, y - radius + 2, (radius - 2) * 2, (radius - 2) * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = '#f3e8ff';
        ctx.font = `bold ${14 / globalScale}px "Noto Sans SC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.id.charAt(0), x, y);
      }

      if (opacity > 0.4) {
      ctx.font = `600 ${11 / globalScale}px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isOnPath ? '#fbbf24' : '#f3e8ff';
      ctx.fillText(node.id, x, y + radius + 3);

      ctx.font = `400 ${9 / globalScale}px "Noto Sans SC", sans-serif`;
      ctx.fillStyle = '#ff6b9d';
      ctx.fillText(node.label, x, y + radius + 15);
      }

      ctx.restore();
    },
    [selectedNodeId, traceStartId, traceEndId, highlightNodeIds, snapshot.nodeAnims]
  );

  const paintLink = useCallback(
    (link: ForceLink, ctx: CanvasRenderingContext2D) => {
      const source = link.source as ForceNode;
      const target = link.target as ForceNode;
      if (source.x == null || source.y == null || target.x == null || target.y == null) return;

      const key = link._key || linkKey({ source: source.id, target: target.id });
      const anim: LinkAnim | undefined = snapshot.linkAnims.get(key);
      if (anim && anim.opacity < 0.02) return;

      const progress = anim?.progress ?? 1;
      const opacity = anim?.opacity ?? 1;
      const isOnPath = highlightLinkKeys.has(key);
      const isHovered =
        hoveredLink &&
        (hoveredLink.source as ForceNode).id === source.id &&
        (hoveredLink.target as ForceNode).id === target.id;

      const color = isOnPath
        ? '#fbbf24'
        : SENTIMENT_COLORS[link.sentiment] || SENTIMENT_COLORS.neutral;

      const endX = source.x + (target.x - source.x) * progress;
      const endY = source.y + (target.y - source.y) * progress;

      ctx.save();
      ctx.globalAlpha = opacity * (highlightLinkKeys.size > 0 && !isOnPath ? 0.15 : 1);

      if (anim?.phase === 'morph' && anim.pulse > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12 * anim.pulse;
      }

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = color;
      ctx.lineWidth = isOnPath ? 5 : isHovered ? 4 : anim?.phase === 'enter' ? 3.5 : 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      if (anim?.phase === 'enter' && progress > 0.05 && progress < 0.98) {
        ctx.beginPath();
        ctx.arc(endX, endY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (anim?.phase === 'exit' && progress < 0.95) {
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = `${color}55`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (progress > 0.55 && opacity > 0.35) {
        const labelX = source.x + (target.x - source.x) * Math.min(progress, 0.85);
        const labelY = source.y + (target.y - source.y) * Math.min(progress, 0.85);
        const label = link.relation;

        ctx.font = '500 11px "Noto Sans SC", sans-serif';
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = isOnPath || isHovered || anim?.phase === 'morph' ? color : '#251a35';
        ctx.beginPath();
        ctx.roundRect(labelX - textWidth / 2 - 6, labelY - 9, textWidth + 12, 18, 4);
        ctx.fill();

        ctx.fillStyle = isOnPath || isHovered || anim?.phase === 'morph' ? '#fff' : color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelX, labelY);
      }

      ctx.restore();
    },
    [hoveredLink, highlightLinkKeys, snapshot.linkAnims]
  );

  const graphData = useMemo(
    () => ({
      nodes: graphNodes,
      links: renderLinks.map((l) => ({ ...l })),
    }),
    [graphNodes, renderLinks]
  );

  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    fg.d3Force('charge')?.strength(-280);
    fg.d3Force('link')?.distance(110);
  }, [graphNodes.length]);

  useEffect(() => {
    if (isAnimating) {
      graphRef.current?.d3ReheatSimulation();
    }
  }, [isAnimating, renderNodes.length, renderLinks.length]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {targetNodes.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-gossip-muted">
          <span className="text-6xl">🍉</span>
          <p className="text-lg">输入八卦文本，生成关系图谱</p>
          <p className="text-sm opacity-60">点击人物查看详情 · 拖拽缩放 · 悬停看八卦</p>
        </div>
      ) : (
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => 'replace'}
          linkCanvasObject={paintLink}
          linkCanvasObjectMode={() => 'replace'}
          onNodeClick={(node) => {
            const anim = snapshot.nodeAnims.get(node.id);
            if (anim && anim.opacity < 0.3) return;
            onNodeClick(node.id);
          }}
          onNodeDragEnd={(node) => {
            if (node.x != null && node.y != null) {
              node.fx = node.x;
              node.fy = node.y;
              onNodePositionChange(node.id, { x: node.x, y: node.y });
            }
          }}
          onLinkHover={(link) => onLinkHover(link as ForceLink | null)}
          onEngineStop={() => setTick((t) => t + 1)}
          cooldownTicks={isAnimating ? 30 : 100}
          d3AlphaDecay={0.025}
          d3VelocityDecay={0.35}
          nodeRelSize={5}
          linkDirectionalParticles={
            highlightLinkKeys.size > 0 ? 4 : isAnimating ? 2 : 0
          }
          linkDirectionalParticleWidth={(link) => {
            const key = (link as ForceLink)._key || '';
            if (highlightLinkKeys.has(key)) return 3;
            const anim = snapshot.linkAnims.get(key);
            return anim?.phase === 'enter' ? 2 : 0;
          }}
          autoPauseRedraw={isAnimating ? false : true}
          backgroundColor="transparent"
        />
      )}

      {pathTraceMode && targetNodes.length > 0 && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-gossip-gold/30 bg-gossip-surface/90 px-3 py-2 text-xs text-gossip-gold backdrop-blur-sm">
          🔗 路径模式：点击两个人物，追踪吃瓜链
        </div>
      )}

      {targetNodes.length > 0 && (
        <div
          className={`absolute left-4 flex gap-3 rounded-lg border border-gossip-border bg-gossip-surface/90 px-4 py-2 text-xs backdrop-blur-sm ${pathTraceMode ? 'top-14' : 'top-4'}`}
        >
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-6 rounded-full bg-gossip-pink" />
            恋爱/绯闻
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-6 rounded-full bg-gossip-red" />
            撕逼/不和
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-6 rounded-full bg-gossip-gold" />
            路径高亮
          </span>
        </div>
      )}

      {hoveredLink && (
        <div className="pointer-events-none absolute right-4 top-4 max-w-xs rounded-lg border border-gossip-border bg-gossip-card/95 p-3 text-sm shadow-xl backdrop-blur-sm">
          <div className="mb-1 font-medium text-gossip-pink">{hoveredLink.relation}</div>
          {hoveredLink.detail && (
            <p className="leading-relaxed text-gossip-muted">{hoveredLink.detail}</p>
          )}
        </div>
      )}

      <TimelineSlider
        time={timelineTime}
        markers={timelineMarkers}
        onChange={onTimelineChange}
        hasTimeline={timelineMarkers.length > 0}
        isAnimating={isAnimating}
      />

      {children}
    </div>
  );
}
