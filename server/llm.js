import { buildPrompt } from './prompt.js';

const MOCK_RESPONSE = {
  nodes: [
    { id: '林小雨', label: '顶流女星', avatar: 'linxiaoyu' },
    { id: '陈浩然', label: '前夫', avatar: 'chenhaoran' },
    { id: '苏婉儿', label: '闺蜜', avatar: 'suwaner' },
    { id: '王总', label: '金主', avatar: 'wangzong' },
    { id: '赵明', label: '绯闻男友', avatar: 'zhaoming' },
  ],
  links: [
    {
      source: '林小雨',
      target: '陈浩然',
      relation: '离婚撕逼',
      sentiment: 'negative',
      detail: '2023年公开离婚，互相爆料出轨',
      timeline: [
        { year: 2022, month: 6, relation: '恩爱夫妻', sentiment: 'positive', detail: '频繁公开秀恩爱，圈内模范夫妻' },
        { year: 2023, month: 3, relation: '离婚撕逼', sentiment: 'negative', detail: '公开离婚，互相指责出轨，粉丝大战三个月' },
      ],
    },
    {
      source: '林小雨',
      target: '苏婉儿',
      relation: '塑料闺蜜',
      sentiment: 'negative',
      detail: '表面姐妹，暗地里抢资源，红毯故意撞衫',
      timeline: [
        { year: 2022, month: 6, relation: '好闺蜜', sentiment: 'positive', detail: '经常同框互称姐妹' },
        { year: 2023, month: 9, relation: '塑料闺蜜', sentiment: 'negative', detail: '红毯故意撞衫，暗中较劲' },
      ],
    },
    {
      source: '林小雨',
      target: '王总',
      relation: '被包养传闻',
      sentiment: 'neutral',
      detail: '2024年狗仔拍到深夜同进酒店，双方均否认',
      timeline: [
        { year: 2024, month: 3, relation: '被包养传闻', sentiment: 'neutral', detail: '狗仔拍到深夜同进酒店' },
      ],
    },
    {
      source: '林小雨',
      target: '赵明',
      relation: '热恋中',
      sentiment: 'positive',
      detail: '2024年被拍到牵手逛街，工作室发糖官宣',
      timeline: [
        { year: 2023, month: 6, relation: '绯闻男友', sentiment: 'positive', detail: '合作拍戏传出绯闻' },
        { year: 2024, month: 9, relation: '热恋中', sentiment: 'positive', detail: '牵手逛街，工作室官宣' },
      ],
    },
    {
      source: '苏婉儿',
      target: '赵明',
      relation: '暗恋',
      sentiment: 'positive',
      detail: '早年合作时一见钟情，至今未表白',
    },
  ],
};

async function callOpenAI(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'deepseek-chat';
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: buildPrompt(text),
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  return parseGraphJSON(content);
}

async function callAnthropic(text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: buildPrompt(text),
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text;
  return parseGraphJSON(content);
}

function parseGraphJSON(raw) {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(cleaned);

  if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
    throw new Error('Invalid response: missing nodes array');
  }
  if (!parsed.links || !Array.isArray(parsed.links)) {
    throw new Error('Invalid response: missing links array');
  }

  // Normalize and validate
  const nodes = parsed.nodes.map((n) => ({
    id: String(n.id),
    label: String(n.label || '未知'),
    avatar: String(n.avatar || n.id),
  }));

  const nodeIds = new Set(nodes.map((n) => n.id));

  const links = parsed.links
    .filter((l) => nodeIds.has(String(l.source)) && nodeIds.has(String(l.target)))
    .map((l) => {
      const link = {
        source: String(l.source),
        target: String(l.target),
        relation: String(l.relation || '关系未知'),
        sentiment: ['positive', 'negative', 'neutral'].includes(l.sentiment)
          ? l.sentiment
          : 'neutral',
        detail: l.detail ? String(l.detail) : '',
      };

      if (Array.isArray(l.timeline) && l.timeline.length > 0) {
        link.timeline = l.timeline
          .map((t) => ({
            year: Number(t.year),
            month: t.month != null ? Number(t.month) : 6,
            relation: String(t.relation || link.relation),
            sentiment: ['positive', 'negative', 'neutral'].includes(t.sentiment)
              ? t.sentiment
              : link.sentiment,
            detail: t.detail ? String(t.detail) : '',
          }))
          .filter((t) => !Number.isNaN(t.year))
          .sort((a, b) => a.year * 100 + (a.month || 6) - (b.year * 100 + (b.month || 6)));
      }

      return link;
    });

  return { nodes, links };
}

/**
 * Extract relationship graph from gossip text.
 * Provider is controlled by LLM_PROVIDER env var.
 */
export async function extractRelationships(text) {
  const provider = process.env.LLM_PROVIDER || 'mock';

  switch (provider) {
    case 'openai':
      return callOpenAI(text);
    case 'anthropic':
      return callAnthropic(text);
    case 'mock':
      // Simulate API latency
      await new Promise((r) => setTimeout(r, 800));
      return MOCK_RESPONSE;
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}
