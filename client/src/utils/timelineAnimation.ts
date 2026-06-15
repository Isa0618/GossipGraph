import type { GraphNode, ResolvedLink } from '../types';

export const ANIM_DURATION = 750;

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export interface NodeAnim {
  opacity: number;
  scale: number;
  phase: 'enter' | 'stay' | 'exit';
}

export interface LinkAnim {
  progress: number;
  opacity: number;
  phase: 'enter' | 'stay' | 'exit' | 'morph';
  pulse: number;
}

export interface AnimSnapshot {
  nodeAnims: Map<string, NodeAnim>;
  linkAnims: Map<string, LinkAnim>;
}

export function createSnapshot(
  nodeIds: Iterable<string>,
  linkKeys: Iterable<string>,
  phase: 'enter' | 'stay' | 'exit',
  linkPhase: LinkAnim['phase'] = phase as LinkAnim['phase']
): AnimSnapshot {
  const nodeAnims = new Map<string, NodeAnim>();
  const linkAnims = new Map<string, LinkAnim>();

  for (const id of nodeIds) {
    nodeAnims.set(id, {
      opacity: phase === 'enter' ? 0 : phase === 'exit' ? 1 : 1,
      scale: phase === 'enter' ? 0.2 : 1,
      phase,
    });
  }
  for (const key of linkKeys) {
    linkAnims.set(key, {
      progress: phase === 'enter' ? 0 : 1,
      opacity: phase === 'enter' ? 0 : 1,
      phase: linkPhase,
      pulse: 0,
    });
  }
  return { nodeAnims, linkAnims };
}

export function interpolateSnapshots(
  from: AnimSnapshot,
  to: AnimSnapshot,
  t: number
): AnimSnapshot {
  const eased = easeInOutCubic(t);
  const nodeAnims = new Map<string, NodeAnim>();
  const linkAnims = new Map<string, LinkAnim>();

  const allNodeIds = new Set([...from.nodeAnims.keys(), ...to.nodeAnims.keys()]);
  allNodeIds.forEach((id) => {
    const a = from.nodeAnims.get(id) ?? { opacity: 0, scale: 0.2, phase: 'enter' as const };
    const b = to.nodeAnims.get(id) ?? { opacity: 0, scale: 0.2, phase: 'exit' as const };
    const scaleFrom = a.phase === 'exit' ? easeInOutCubic(t) : a.scale;
    const scaleTo = b.phase === 'enter' ? easeOutBack(Math.min(1, t * 1.2)) : b.scale;
    nodeAnims.set(id, {
      opacity: a.opacity + (b.opacity - a.opacity) * eased,
      scale: scaleFrom + (scaleTo - scaleFrom) * eased,
      phase: t < 1 ? a.phase : b.phase,
    });
  });

  const allLinkKeys = new Set([...from.linkAnims.keys(), ...to.linkAnims.keys()]);
  allLinkKeys.forEach((key) => {
    const a = from.linkAnims.get(key) ?? { progress: 0, opacity: 0, phase: 'enter' as const, pulse: 0 };
    const b = to.linkAnims.get(key) ?? { progress: 0, opacity: 0, phase: 'exit' as const, pulse: 0 };
    const progress =
      a.phase === 'exit'
        ? a.progress * (1 - easeInOutCubic(t))
        : b.phase === 'enter'
          ? b.progress * easeOutBack(Math.min(1, t * 1.15))
          : a.progress + (b.progress - a.progress) * eased;

    linkAnims.set(key, {
      progress,
      opacity: a.opacity + (b.opacity - a.opacity) * eased,
      phase: b.phase === 'morph' ? 'morph' : t < 1 ? a.phase : b.phase,
      pulse: b.phase === 'morph' ? Math.sin(t * Math.PI) * 0.6 : 0,
    });
  });

  return { nodeAnims, linkAnims };
}

export function buildTargetSnapshot(
  targetNodes: GraphNode[],
  targetLinks: ResolvedLink[]
): AnimSnapshot {
  return createSnapshot(
    targetNodes.map((n) => n.id),
    targetLinks.map((l) => l._key),
    'stay'
  );
}

export function diffTransition(
  prevNodes: GraphNode[],
  prevLinks: ResolvedLink[],
  nextNodes: GraphNode[],
  nextLinks: ResolvedLink[]
): { from: AnimSnapshot; to: AnimSnapshot; renderNodes: GraphNode[]; renderLinks: ResolvedLink[] } {
  const prevNodeIds = new Set(prevNodes.map((n) => n.id));
  const nextNodeIds = new Set(nextNodes.map((n) => n.id));
  const prevLinkMap = new Map(prevLinks.map((l) => [l._key, l]));
  const nextLinkMap = new Map(nextLinks.map((l) => [l._key, l]));

  const fromNodes = new Map<string, NodeAnim>();
  const toNodes = new Map<string, NodeAnim>();
  const fromLinks = new Map<string, LinkAnim>();
  const toLinks = new Map<string, LinkAnim>();

  prevNodeIds.forEach((id) => {
    fromNodes.set(id, { opacity: 1, scale: 1, phase: 'stay' });
    if (!nextNodeIds.has(id)) {
      toNodes.set(id, { opacity: 0, scale: 0.15, phase: 'exit' });
    }
  });

  nextNodeIds.forEach((id) => {
    toNodes.set(id, { opacity: 1, scale: 1, phase: 'stay' });
    if (!prevNodeIds.has(id)) {
      fromNodes.set(id, { opacity: 0, scale: 0.2, phase: 'enter' });
    }
  });

  const allLinkKeys = new Set([...prevLinkMap.keys(), ...nextLinkMap.keys()]);
  allLinkKeys.forEach((key) => {
    const prev = prevLinkMap.get(key);
    const next = nextLinkMap.get(key);

    if (prev && next) {
      const morphed =
        prev.relation !== next.relation ||
        prev.sentiment !== next.sentiment;
      fromLinks.set(key, { progress: 1, opacity: 1, phase: 'stay', pulse: 0 });
      toLinks.set(key, {
        progress: 1,
        opacity: 1,
        phase: morphed ? 'morph' : 'stay',
        pulse: morphed ? 1 : 0,
      });
    } else if (prev && !next) {
      fromLinks.set(key, { progress: 1, opacity: 1, phase: 'stay', pulse: 0 });
      toLinks.set(key, { progress: 0, opacity: 0, phase: 'exit', pulse: 0 });
    } else if (!prev && next) {
      fromLinks.set(key, { progress: 0, opacity: 0, phase: 'enter', pulse: 0 });
      toLinks.set(key, { progress: 1, opacity: 1, phase: 'enter', pulse: 0 });
    }
  });

  const nodeById = new Map<string, GraphNode>();
  [...prevNodes, ...nextNodes].forEach((n) => nodeById.set(n.id, n));

  const renderNodes = [...new Set([...prevNodeIds, ...nextNodeIds])]
    .map((id) => nodeById.get(id)!)
    .filter(Boolean);

  const renderLinks: ResolvedLink[] = [];
  allLinkKeys.forEach((key) => {
    const link = nextLinkMap.get(key) ?? prevLinkMap.get(key);
    if (link) renderLinks.push({ ...link });
  });

  return {
    from: { nodeAnims: fromNodes, linkAnims: fromLinks },
    to: { nodeAnims: toNodes, linkAnims: toLinks },
    renderNodes,
    renderLinks,
  };
}

export function spawnEnteringNodes(
  renderNodes: GraphNode[],
  renderLinks: ResolvedLink[],
  nodeAnims: Map<string, NodeAnim>,
  anchorPositions: Map<string, { x: number; y: number }>,
  center: { x: number; y: number }
): Map<string, { x: number; y: number }> {
  const spawn = new Map<string, { x: number; y: number }>();

  renderNodes.forEach((node) => {
    const anim = nodeAnims.get(node.id);
    if (!anim || anim.phase !== 'enter') return;

    const connected = renderLinks.find(
      (l) =>
        (l.source === node.id || l.target === node.id) &&
        nodeAnims.get(l.source === node.id ? l.target : l.source)?.phase !== 'enter'
    );

    if (connected) {
      const anchorId = connected.source === node.id ? connected.target : connected.source;
      const pos = anchorPositions.get(anchorId);
      if (pos) {
        spawn.set(node.id, { x: pos.x, y: pos.y });
        return;
      }
    }
    spawn.set(node.id, center);
  });

  return spawn;
}
