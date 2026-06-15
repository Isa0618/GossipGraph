const INVITE_CODES = (process.env.INVITE_CODES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function isAuthEnabled() {
  return INVITE_CODES.length > 0;
}

export function isValidInviteCode(code) {
  if (!isAuthEnabled()) return true;
  if (!code || typeof code !== 'string') return false;
  return INVITE_CODES.includes(code.trim());
}

export function requireInvite(req, res, next) {
  if (!isAuthEnabled()) return next();

  const code = req.headers['x-invite-code'];
  if (!isValidInviteCode(code)) {
    return res.status(401).json({ error: '邀请码无效，请重新输入' });
  }

  req.inviteCode = code.trim();
  next();
}
