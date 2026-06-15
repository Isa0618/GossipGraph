# 🍉 GossipGraph · 八卦关系图谱

输入八卦文本，AI 自动提取人物关系，以动态网络图可视化展示。

## 功能

- **文本 → 图谱**：粘贴八卦文本，一键生成人物关系网络
- **追加模式**：新文本与已有图谱合并，不断扩展瓜田
- **时间轴动画**：拖动吃瓜进度条，看关系生长 / 断裂 / 重组
- **邀请码 + 每日限额**：每人每天 20 次，防止 API 费用失控
- **交互图谱**：拖拽节点、滚轮缩放、悬停查看关系详情
- **人物弹窗**：点击节点查看八卦档案
- **吃瓜路径**：追踪两人之间的最短关系链

## 快速开始（本地开发）

```bash
npm run install:all
cp server/.env.example server/.env   # 编辑 API Key 等
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3456

本地若 `INVITE_CODES` 留空，则跳过邀请码验证。

## 邀请码管理

邀请码写在本地文件 **`INVITE_CODES.local.md`**（已 gitignore，不会提交 GitHub）。

复制模板后填写：

```bash
cp INVITE_CODES.local.example.md INVITE_CODES.local.md
```

## 配置环境变量

`server/.env` 示例：

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat

INVITE_CODES=CODE1,CODE2,CODE3
DAILY_REQUEST_LIMIT=20
```

| 变量 | 说明 |
|------|------|
| `INVITE_CODES` | 逗号分隔的邀请码，留空则关闭验证 |
| `DAILY_REQUEST_LIMIT` | 每个邀请码每日请求上限（默认 20） |

## Zeabur 部署（单服务）

1. 推送代码到 GitHub（确保 `.env` 和 `INVITE_CODES.local.md` 未提交）
2. Zeabur → New Project → 连接仓库
3. 配置：

| 项 | 值 |
|----|-----|
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Root Directory** | `/` |

4. 环境变量（Zeabur 控制台）：

```
NODE_ENV=production
LLM_PROVIDER=openai
OPENAI_API_KEY=你的Key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
INVITE_CODES=你的邀请码,逗号分隔
DAILY_REQUEST_LIMIT=20
```

5. 部署完成后，将链接和对应邀请码私下发给朋友。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/auth/verify` | 验证邀请码 |
| GET | `/api/quota` | 查询剩余次数（需 `X-Invite-Code` 头） |
| POST | `/api/extract` | 提取关系图谱（需邀请码，计入额度） |

## 技术栈

- **前端**：React + TypeScript + Vite + Tailwind CSS + react-force-graph-2d
- **后端**：Express + DeepSeek（OpenAI 兼容）+ 邀请码限额

## 项目结构

```
├── client/              # React 前端
├── server/
│   ├── index.js         # API + 生产环境静态托管
│   ├── auth.js          # 邀请码验证
│   ├── quota.js         # 每日限额
│   ├── llm.js           # LLM 调用
│   └── data/            # 用量记录（gitignore）
├── INVITE_CODES.local.md  # 邀请码文档（gitignore）
└── package.json
```
