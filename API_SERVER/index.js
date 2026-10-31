const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 60 }));

const read = (f, fb = {}) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch { return fb; }
};
const write = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));
const log = (msg) => {
  const ts = new Date().toISOString();
  fs.appendFileSync(path.join(__dirname, 'logUser.txt'), `[${ts}] ${msg}\n`);
};

// GET /status
app.get('/status', (_, res) => res.json({ status: 'online', app: 'AsasainPoll', version: '1.0.0' }));

// GET /version — cek update
app.get('/version', (_, res) => {
  const cfg = read(path.join(__dirname, 'vps.json'), {});
  res.json({ latest: cfg.latestVersion || '1.0.0', url: cfg.updateUrl || '' });
});

// POST /validate-key
app.post('/validate-key', (req, res) => {
  const { key } = req.body;
  if (!key) return res.json({ valid: false, message: 'Key diperlukan' });

  const keylist = read(path.join(__dirname, 'keylist.json'), { keys: [] });
  const found = keylist.keys.find(k => k.key === key.trim());

  if (!found) {
    log(`INVALID: ${key} from ${req.ip}`);
    return res.json({ valid: false, message: 'Key tidak ditemukan' });
  }
  if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
    log(`EXPIRED: ${key}`);
    return res.json({ valid: false, message: 'Key sudah expired' });
  }

  found.lastUsed = new Date().toISOString();
  found.lastIp = req.ip;
  write(path.join(__dirname, 'keylist.json'), keylist);
  log(`VALID: ${key} | ${found.username} | ${req.ip}`);

  res.json({ valid: true, username: found.username, expiresAt: found.expiresAt });
});

// POST /log
app.post('/log', (req, res) => {
  log(`ACTION: ${req.body.action} | ${req.ip} | ${req.body.ts}`);
  res.json({ ok: true });
});

// POST /admin/generate-key
app.post('/admin/generate-key', (req, res) => {
  const { adminToken, username, durationDays } = req.body;
  const cfg = read(path.join(__dirname, 'vps.json'), {});
  if (adminToken !== cfg.adminToken) return res.status(403).json({ error: 'Unauthorized' });

  const key = 'AP-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  const expiresAt = durationDays
    ? new Date(Date.now() + durationDays * 86400000).toISOString()
    : null;

  const keylist = read(path.join(__dirname, 'keylist.json'), { keys: [] });
  keylist.keys.push({ key, username: username || 'user', createdAt: new Date().toISOString(), expiresAt, lastUsed: null, lastIp: null });
  write(path.join(__dirname, 'keylist.json'), keylist);
  log(`NEW KEY: ${key} for ${username}`);

  res.json({ key, expiresAt, username });
});

// GET /admin/logs
app.get('/admin/logs', (req, res) => {
  const cfg = read(path.join(__dirname, 'vps.json'), {});
  if (req.query.token !== cfg.adminToken) return res.status(403).json({ error: 'Unauthorized' });
  try { res.type('text').send(fs.readFileSync(path.join(__dirname, 'logUser.txt'), 'utf8')); }
  catch { res.send('Log kosong'); }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[AsasainPoll API] Port ${PORT}`);
  log(`SERVER START port ${PORT}`);
});
