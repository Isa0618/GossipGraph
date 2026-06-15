import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractRelationships } from './llm.js';
import { requireInvite, isAuthEnabled, isValidInviteCode } from './auth.js';
import { getQuotaInfo, consumeQuota, checkQuotaAvailable } from './quota.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3456;
const clientDist = path.join(__dirname, '../client/dist');

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    provider: process.env.LLM_PROVIDER || 'mock',
    authRequired: isAuthEnabled(),
  });
});

app.post('/api/auth/verify', (req, res) => {
  const { code } = req.body || {};
  if (!isAuthEnabled()) {
    return res.json({ valid: true, authRequired: false, quota: { limit: 20, used: 0, remaining: 20 } });
  }
  if (!isValidInviteCode(code)) {
    return res.status(401).json({ valid: false, error: '邀请码无效' });
  }
  res.json({ valid: true, authRequired: true, quota: getQuotaInfo(code.trim()) });
});

app.get('/api/quota', requireInvite, (req, res) => {
  const code = req.inviteCode || '';
  res.json(getQuotaInfo(code));
});

app.post('/api/extract', requireInvite, async (req, res) => {
  try {
    const { text } = req.body;
    const code = req.inviteCode || 'dev';

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: '请提供有效的文本内容' });
    }

    if (text.length > 10000) {
      return res.status(400).json({ error: '文本长度不能超过 10000 字符' });
    }

    if (isAuthEnabled() && !checkQuotaAvailable(code)) {
      const quota = getQuotaInfo(code);
      return res.status(429).json({
        error: '今日额度已用完，明天再来吃瓜 🍉',
        quota,
      });
    }

    const graph = await extractRelationships(text.trim());

    let quota = getQuotaInfo(code);
    if (isAuthEnabled()) {
      const result = consumeQuota(code);
      quota = { limit: result.limit, used: result.used, remaining: result.remaining };
    }

    res.json({ ...graph, quota });
  } catch (err) {
    console.error('Extract error:', err);
    res.status(500).json({
      error: '关系提取失败',
      message: err.message,
    });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🍉 GossipGraph API running on http://localhost:${PORT}`);
  console.log(`   LLM Provider: ${process.env.LLM_PROVIDER || 'mock'}`);
  console.log(`   Auth: ${isAuthEnabled() ? 'enabled' : 'disabled (dev)'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`   Serving frontend from ${clientDist}`);
  }
});
