import type { GraphData, GraphLink, ResolvedLink, PathStep, TimelineEntry } from '../types';
import { linkKey, toTimeValue, parseTimeValue } from '../types';

export interface TimelineRange {
  min: number;
  max: number;
}

export function getTimelineRange(links: GraphLink[]): TimelineRange | null {
  const values: number[] = [];
  links.forEach((l) => {
    l.timeline?.forEach((t) => values.push(toTimeValue(t.year, t.month)));
  });
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function resolveTimelineEntry(timeline: TimelineEntry[], time: number): TimelineEntry | null {
  const sorted = [...timeline].sort(
    (a, b) => toTimeValue(a.year, a.month) - toTimeValue(b.year, b.month)
  );
  let active: TimelineEntry | null = null;
  for (const entry of sorted) {
    if (toTimeValue(entry.year, entry.month) <= time) active = entry;
    else break;
  }
  return active;
}

export function resolveLinkAtTime(link: GraphLink, time: number): ResolvedLink | null {
  const key = linkKey(link);

  if (!link.timeline?.length) {
    return { ...link, _key: key };
  }

  const entry = resolveTimelineEntry(link.timeline, time);
  if (!entry) return null;

  return {
    ...link,
    _key: key,
    relation: entry.relation,
    sentiment: entry.sentiment,
    detail: entry.detail || link.detail,
    activeTime: toTimeValue(entry.year, entry.month),
  };
}

export function filterGraphAtTime(
  data: GraphData,
  time: number
): { nodes: GraphData['nodes']; links: ResolvedLink[] } {
  const activeLinks: ResolvedLink[] = [];

  data.links.forEach((l) => {
    const resolved = resolveLinkAtTime(l, time);
    if (resolved) activeLinks.push(resolved);
  });

  const activeNodeIds = new Set<string>();
  activeLinks.forEach((l) => {
    activeNodeIds.add(l.source);
    activeNodeIds.add(l.target);
  });

  return {
    nodes: data.nodes.filter((n) => activeNodeIds.has(n.id)),
    links: activeLinks,
  };
}

/** @deprecated use filterGraphAtTime */
export function filterGraphAtYear(data: GraphData, year: number) {
  return filterGraphAtTime(data, year * 100 + 6);
}

export function findShortestPath(links: GraphLink[], start: string, end: string): PathStep[] | null {
  if (start === end) return [];

  const adj = new Map<string, { neighbor: string; link: GraphLink }[]>();

  links.forEach((l) => {
    const a = l.source;
    const b = l.target;
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push({ neighbor: b, link: l });
    adj.get(b)!.push({ neighbor: a, link: l });
  });

  const queue: string[] = [start];
  const visited = new Set([start]);
  const parent = new Map<string, { from: string; link: GraphLink }>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === end) break;

    for (const { neighbor, link } of adj.get(current) || []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent.set(neighbor, { from: current, link });
      queue.push(neighbor);
    }
  }

  if (!parent.has(end)) return null;

  const steps: PathStep[] = [];
  let cur = end;
  while (cur !== start) {
    const p = parent.get(cur)!;
    steps.unshift({
      from: p.from,
      to: cur,
      relation: p.link.relation,
      sentiment: p.link.sentiment,
      detail: p.link.detail,
    });
    cur = p.from;
  }

  return steps;
}

export function pathToNodeIds(steps: PathStep[], start: string, end: string): string[] {
  const ids = [start];
  steps.forEach((s) => ids.push(s.to));
  if (ids[ids.length - 1] !== end) ids.push(end);
  return [...new Set(ids)];
}

export function pathToLinkKeys(steps: PathStep[]): Set<string> {
  return new Set(steps.map((s) => linkKey({ source: s.from, target: s.to })));
}

export function formatTimeLabel(time: number): string {
  const { year, month } = parseTimeValue(time);
  return month === 6 ? `${year} 年` : `${year} 年 ${month} 月`;
}

export function getTimelineMarkers(links: GraphLink[]): number[] {
  const set = new Set<number>();
  links.forEach((l) => {
    l.timeline?.forEach((t) => set.add(toTimeValue(t.year, t.month)));
  });
  return Array.from(set).sort((a, b) => a - b);
}
