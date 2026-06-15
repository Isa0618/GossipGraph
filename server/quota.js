import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');

const DAILY_LIMIT = Number(process.env.DAILY_REQUEST_LIMIT) || 20;

function todayKey() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
}

function loadUsage() {
  try {
    if (fs.existsSync(USAGE_FILE)) {
      return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
    }
  } catch {
    /* reset on corrupt file */
  }
  return {};
}

function saveUsage(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2));
}

function getRecord(usage, code) {
  const today = todayKey();
  const rec = usage[code];
  if (!rec || rec.date !== today) {
    return { date: today, count: 0 };
  }
  return rec;
}

export function getQuotaInfo(code) {
  const usage = loadUsage();
  const rec = getRecord(usage, code);
  const used = rec.count;
  return {
    limit: DAILY_LIMIT,
    used,
    remaining: Math.max(0, DAILY_LIMIT - used),
  };
}

export function consumeQuota(code) {
  const usage = loadUsage();
  const rec = getRecord(usage, code);

  if (rec.count >= DAILY_LIMIT) {
    return { ok: false, ...getQuotaInfo(code) };
  }

  rec.count += 1;
  usage[code] = rec;
  saveUsage(usage);

  return { ok: true, ...getQuotaInfo(code) };
}

export function checkQuotaAvailable(code) {
  const info = getQuotaInfo(code);
  return info.remaining > 0;
}
