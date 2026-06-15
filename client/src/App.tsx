import { useState, useCallback, useMemo, useEffect } from 'react';
import GossipGraph from './components/GossipGraph';
import ControlPanel from './components/ControlPanel';
import PersonDetailModal from './components/PersonDetailModal';
import PathTracePanel from './components/PathTracePanel';
import InviteGate from './components/InviteGate';
import type { GraphData, ForceLink, PathStep } from './types';
import { mergeGraphData, formatTimeValue, snapToMarker } from './types';
import {
  getTimelineMarkers,
  filterGraphAtTime,
  findShortestPath,
  pathToNodeIds,
  pathToLinkKeys,
} from './utils/graph';
import {
  fetchGraph,
  fetchQuota,
  checkAuthRequired,
  getStoredInviteCode,
  verifyInviteCode,
  type QuotaInfo,
} from './api';

function stripQuota(data: GraphData & { quota?: QuotaInfo }): GraphData {
  const { nodes, links } = data;
  return { nodes, links };
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [quota, setQuota] = useState<QuotaInfo>({ limit: 20, used: 0, remaining: 20 });

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<ForceLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appendMessage, setAppendMessage] = useState<string | null>(null);

  const [pathTraceMode, setPathTraceMode] = useState(false);
  const [traceStartId, setTraceStartId] = useState<string | null>(null);
  const [traceEndId, setTraceEndId] = useState<string | null>(null);
  const [pathSteps, setPathSteps] = useState<PathStep[] | null>(null);

  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  const timelineMarkers = useMemo(() => getTimelineMarkers(graphData.links), [graphData.links]);
  const [timelineTime, setTimelineTime] = useState<number>(202409);

  const hasTimeline = timelineMarkers.length > 0;

  const visibleGraph = useMemo(() => {
    if (hasTimeline) {
      return filterGraphAtTime(graphData, timelineTime);
    }
    return {
      nodes: graphData.nodes,
      links: graphData.links.map((l) => ({ ...l, _key: `${l.source}::${l.target}` })),
    };
  }, [graphData, timelineTime, hasTimeline]);

  const highlightNodeIds = useMemo(() => {
    if (!pathSteps || !traceStartId || !traceEndId) return new Set<string>();
    return new Set(pathToNodeIds(pathSteps, traceStartId, traceEndId));
  }, [pathSteps, traceStartId, traceEndId]);

  const highlightLinkKeys = useMemo(() => {
    if (!pathSteps) return new Set<string>();
    return pathToLinkKeys(pathSteps);
  }, [pathSteps]);

  const refreshQuota = useCallback(async () => {
    try {
      const q = await fetchQuota();
      setQuota(q);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    (async () => {
      const required = await checkAuthRequired();
      setAuthRequired(required);

      if (!required) {
        setReady(true);
        return;
      }

      const stored = getStoredInviteCode();
      if (stored) {
        const result = await verifyInviteCode(stored);
        if (result.valid) {
          if (result.quota) setQuota(result.quota);
          setReady(true);
          return;
        }
      }
      setReady(false);
    })();
  }, []);

  const clearPathTrace = useCallback(() => {
    setTraceStartId(null);
    setTraceEndId(null);
    setPathSteps(null);
  }, []);

  const setTimelineToLatest = useCallback((links: GraphData['links']) => {
    const markers = getTimelineMarkers(links);
    if (markers.length > 0) setTimelineTime(markers[markers.length - 1]);
  }, []);

  const handleGenerate = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    setAppendMessage(null);
    clearPathTrace();
    setSelectedNodeId(null);
    try {
      const data = await fetchGraph(text);
      if (data.quota) setQuota(data.quota);
      setGraphData(stripQuota(data));
      setNodePositions({});
      setTimelineToLatest(data.links);
    } catch (e) {
      const err = e as Error & { quota?: QuotaInfo };
      if (err.quota) setQuota(err.quota);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clearPathTrace, setTimelineToLatest]);

  const handleAppend = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    setAppendMessage(null);
    try {
      const incoming = await fetchGraph(text);
      if (incoming.quota) setQuota(incoming.quota);
      const { data, append } = mergeGraphData(graphData, stripQuota(incoming));

      const parts: string[] = [];
      if (append.newNodes.length > 0) {
        parts.push(`新增人物：${append.newNodes.join('、')}`);
      }
      if (append.newLinks > 0) {
        parts.push(`新增 ${append.newLinks} 条关系`);
      }
      if (parts.length === 0) {
        parts.push('没有新内容，可能是重复八卦');
      } else {
        parts.push('原有结构已保留 ✓');
      }
      setAppendMessage(parts.join(' · '));
      setGraphData(data);
      setTimelineToLatest(data.links);
    } catch (e) {
      const err = e as Error & { quota?: QuotaInfo };
      if (err.quota) setQuota(err.quota);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [graphData, setTimelineToLatest]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (pathTraceMode) {
        if (!traceStartId) {
          setTraceStartId(nodeId);
          setTraceEndId(null);
          setPathSteps(null);
        } else if (traceStartId === nodeId) {
          clearPathTrace();
        } else {
          setTraceEndId(nodeId);
          const steps = findShortestPath(graphData.links, traceStartId, nodeId);
          setPathSteps(steps);
        }
        return;
      }

      setSelectedNodeId(nodeId);
      clearPathTrace();
    },
    [pathTraceMode, traceStartId, graphData.links, clearPathTrace]
  );

  const handleTogglePathTrace = useCallback(() => {
    setPathTraceMode((prev) => !prev);
    clearPathTrace();
    setSelectedNodeId(null);
  }, [clearPathTrace]);

  const handleNodePositionChange = useCallback((id: string, pos: { x: number; y: number }) => {
    setNodePositions((prev) => ({ ...prev, [id]: pos }));
  }, []);

  const handleTimelineChange = useCallback(
    (time: number) => {
      setTimelineTime(snapToMarker(timelineMarkers, time));
    },
    [timelineMarkers]
  );

  const handleInviteSuccess = useCallback(async () => {
    setReady(true);
    await refreshQuota();
  }, [refreshQuota]);

  const selectedNode = graphData.nodes.find((n) => n.id === selectedNodeId) ?? null;

  if (authRequired && !ready) {
    return <InviteGate onSuccess={handleInviteSuccess} />;
  }

  return (
    <div className="flex h-screen bg-gossip-bg">
      <div className="relative w-[70%] border-r border-gossip-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#2e2240_0%,_#1a1025_70%)]" />
        <div className="relative h-full">
          <GossipGraph
            targetNodes={visibleGraph.nodes}
            targetLinks={visibleGraph.links}
            nodePositions={nodePositions}
            selectedNodeId={selectedNodeId}
            traceStartId={traceStartId}
            traceEndId={traceEndId}
            highlightNodeIds={highlightNodeIds}
            highlightLinkKeys={highlightLinkKeys}
            onNodeClick={handleNodeClick}
            hoveredLink={hoveredLink}
            onLinkHover={setHoveredLink}
            onNodePositionChange={handleNodePositionChange}
            timelineMarkers={timelineMarkers}
            timelineTime={timelineTime}
            onTimelineChange={handleTimelineChange}
            pathTraceMode={pathTraceMode}
          >
            {selectedNode && !pathTraceMode && (
              <PersonDetailModal
                node={selectedNode}
                links={visibleGraph.links}
                allNodes={graphData.nodes}
                timelineLabel={hasTimeline ? formatTimeValue(timelineTime) : undefined}
                onClose={() => setSelectedNodeId(null)}
              />
            )}
          </GossipGraph>
        </div>
      </div>

      <div className="flex w-[30%] flex-col bg-gossip-surface">
        <PathTracePanel
          start={traceStartId || ''}
          end={traceEndId || ''}
          steps={pathSteps}
          onClear={clearPathTrace}
        />

        <ControlPanel
          onGenerate={handleGenerate}
          onAppend={handleAppend}
          loading={loading}
          error={error}
          nodeCount={graphData.nodes.length}
          linkCount={graphData.links.length}
          pathTraceMode={pathTraceMode}
          onTogglePathTrace={handleTogglePathTrace}
          appendMessage={appendMessage}
          quota={quota}
          authRequired={authRequired}
        />
      </div>
    </div>
  );
}
