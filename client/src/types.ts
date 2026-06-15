export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface TimelineEntry {
  year: number;
  month?: number;
  relation: string;
  sentiment: Sentiment;
  detail?: string;
}

/** Encode year+month as sortable integer, e.g. 202306 = 2023年6月 */
export function toTimeValue(year: number, month = 6): number {
  return year * 100 + month;
}

export function parseTimeValue(value: number): { year: number; month: number } {
  return { year: Math.floor(value / 100), month: value % 100 };
}

export function formatTimeValue(value: number): string {
  const { year, month } = parseTimeValue(value);
  if (month < 1 || month > 12) return `${year} 年`;
  return month === 6 ? `${year} 年` : `${year} 年 ${month} 月`;
}

export function snapToMarker(markers: number[], time: number): number {
  if (markers.length === 0) return time;
  if (markers.includes(time)) return time;
  let closest = markers[0];
  let minDist = Math.abs(time - closest);
  for (const m of markers) {
    const dist = Math.abs(time - m);
    if (dist < minDist) {
      minDist = dist;
      closest = m;
    }
  }
  return closest;
}

export interface GraphNode {
  id: string;
  label: string;
  avatar: string;
}

export interface GraphLink {
  source: string;
  target: string;
  relation: string;
  sentiment: Sentiment;
  detail?: string;
  timeline?: TimelineEntry[];
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ForceNode extends GraphNode {
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

export interface ForceLink {
  source: string | ForceNode;
  target: string | ForceNode;
  relation: string;
  sentiment: Sentiment;
  detail?: string;
  timeline?: TimelineEntry[];
  _key?: string;
}

export interface ResolvedLink extends GraphLink {
  _key: string;
  activeTime?: number;
}

export interface PathStep {
  from: string;
  to: string;
  relation: string;
  sentiment: Sentiment;
  detail?: string;
}

export interface AppendResult {
  newNodes: string[];
  newLinks: number;
}

export function getAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

export function linkKey(l: Pick<GraphLink, 'source' | 'target'>) {
  return `${l.source}::${l.target}`;
}

export function mergeGraphData(existing: GraphData, incoming: GraphData): { data: GraphData; append: AppendResult } {
  const nodeMap = new Map<string, GraphNode>();
  const existingIds = new Set(existing.nodes.map((n) => n.id));
  existing.nodes.forEach((n) => nodeMap.set(n.id, n));

  const newNodes: string[] = [];
  incoming.nodes.forEach((n) => {
    if (!existingIds.has(n.id)) newNodes.push(n.id);
    nodeMap.set(n.id, n);
  });

  const linkMap = new Map<string, GraphLink>();
  const existingLinkKeys = new Set(existing.links.map(linkKey));

  const mergeLink = (l: GraphLink) => {
    const key = linkKey(l);
    const prev = linkMap.get(key);
    if (!prev) {
      linkMap.set(key, { ...l });
      return;
    }
    if (l.timeline?.length) {
      const seen = new Set((prev.timeline || []).map((t) => toTimeValue(t.year, t.month)));
      const merged = [...(prev.timeline || [])];
      l.timeline.forEach((t) => {
        const v = toTimeValue(t.year, t.month);
        if (!seen.has(v)) merged.push(t);
      });
      merged.sort((a, b) => toTimeValue(a.year, a.month) - toTimeValue(b.year, b.month));
      linkMap.set(key, {
        ...prev,
        ...l,
        timeline: merged,
        relation: l.relation || prev.relation,
        sentiment: l.sentiment || prev.sentiment,
      });
    } else if (l.relation !== prev.relation) {
      linkMap.set(key, { ...prev, ...l });
    }
  };

  existing.links.forEach((l) => mergeLink(l));

  let newLinks = 0;
  incoming.links.forEach((l) => {
    if (!existingLinkKeys.has(linkKey(l))) newLinks++;
    mergeLink(l);
  });

  return {
    data: {
      nodes: Array.from(nodeMap.values()),
      links: Array.from(linkMap.values()),
    },
    append: { newNodes, newLinks },
  };
}

export const SAMPLE_TEXT = `据知情人士爆料，2022年顶流女星林小雨与陈浩然还是恩爱夫妻，频繁公开秀恩爱。

但2023年两人突然公开离婚，互相指责对方出轨，粉丝大战持续三个月，彻底撕破脸。

林小雨的闺蜜苏婉儿表面姐妹情深，实则暗中较劲。2023年红毯两人故意撞衫，被扒出苏婉儿早就暗恋林小雨的绯闻男友赵明。

2024年更有狗仔拍到林小雨深夜与神秘富豪王总同进酒店，疑似金主包养传闻，但双方均予以否认。

不过2024年下半年林小雨和赵明被拍到牵手逛街，工作室发糖官宣，疑似正式恋爱。`;
