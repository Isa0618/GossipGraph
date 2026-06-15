import { useState, useEffect, useRef, useCallback } from 'react';
import type { GraphNode, ResolvedLink } from '../types';
import {
  ANIM_DURATION,
  type AnimSnapshot,
  buildTargetSnapshot,
  diffTransition,
  interpolateSnapshots,
} from '../utils/timelineAnimation';

interface UseTimelineTransitionResult {
  renderNodes: GraphNode[];
  renderLinks: ResolvedLink[];
  snapshot: AnimSnapshot;
  isAnimating: boolean;
}

function graphEqual(
  a: { nodes: GraphNode[]; links: ResolvedLink[] },
  b: { nodes: GraphNode[]; links: ResolvedLink[] }
) {
  const nodeIdsEqual =
    a.nodes.length === b.nodes.length &&
    a.nodes.every((n) => b.nodes.some((t) => t.id === n.id));
  const linksEqual =
    a.links.length === b.links.length &&
    a.links.every((l) =>
      b.links.some(
        (t) => t._key === l._key && t.relation === l.relation && t.sentiment === l.sentiment
      )
    );
  return nodeIdsEqual && linksEqual;
}

export function useTimelineTransition(
  targetNodes: GraphNode[],
  targetLinks: ResolvedLink[]
): UseTimelineTransitionResult {
  const [renderNodes, setRenderNodes] = useState<GraphNode[]>(targetNodes);
  const [renderLinks, setRenderLinks] = useState<ResolvedLink[]>(targetLinks);
  const [snapshot, setSnapshot] = useState<AnimSnapshot>(() =>
    buildTargetSnapshot(targetNodes, targetLinks)
  );
  const [isAnimating, setIsAnimating] = useState(false);

  const settledRef = useRef({ nodes: targetNodes, links: targetLinks });
  const renderRef = useRef({ nodes: targetNodes, links: targetLinks });
  const targetRef = useRef({ nodes: targetNodes, links: targetLinks });
  const animatingRef = useRef(false);
  const animRef = useRef<{ from: AnimSnapshot; to: AnimSnapshot; start: number } | null>(null);
  const isFirst = useRef(true);

  renderRef.current = { nodes: renderNodes, links: renderLinks };
  targetRef.current = { nodes: targetNodes, links: targetLinks };
  animatingRef.current = isAnimating;

  const runAnimation = useCallback(
    (fromNodes: GraphNode[], fromLinks: ResolvedLink[], toNodes: GraphNode[], toLinks: ResolvedLink[]) => {
      const { from, to, renderNodes: rn, renderLinks: rl } = diffTransition(
        fromNodes,
        fromLinks,
        toNodes,
        toLinks
      );

      setRenderNodes(rn);
      setRenderLinks(rl);
      animRef.current = { from, to, start: performance.now() };
      animatingRef.current = true;
      setIsAnimating(true);
    },
    []
  );

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      settledRef.current = { nodes: targetNodes, links: targetLinks };
      setRenderNodes(targetNodes);
      setRenderLinks(targetLinks);
      setSnapshot(buildTargetSnapshot(targetNodes, targetLinks));
      return;
    }

    if (graphEqual(settledRef.current, { nodes: targetNodes, links: targetLinks })) return;

    const fromNodes = animatingRef.current ? renderRef.current.nodes : settledRef.current.nodes;
    const fromLinks = animatingRef.current ? renderRef.current.links : settledRef.current.links;

    runAnimation(fromNodes, fromLinks, targetNodes, targetLinks);
  }, [targetNodes, targetLinks, runAnimation]);

  useEffect(() => {
    if (!isAnimating || !animRef.current) return;

    let raf = 0;
    const tick = (now: number) => {
      const { from, to, start } = animRef.current!;
      const t = Math.min(1, (now - start) / ANIM_DURATION);
      setSnapshot(interpolateSnapshots(from, to, t));

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        const target = targetRef.current;
        setSnapshot(to);
        setRenderNodes(target.nodes);
        setRenderLinks(target.links);
        settledRef.current = { nodes: target.nodes, links: target.links };
        animatingRef.current = false;
        setIsAnimating(false);
        animRef.current = null;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isAnimating]);

  return { renderNodes, renderLinks, snapshot, isAnimating };
}
