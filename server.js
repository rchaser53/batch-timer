const express = require('express');
const fs = require('fs');
const path = require('path');
const plist = require('plist');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Directory where plist files are managed (LaunchAgents for current user)
// 対象はこのワークスペース配下のみ
const WORKSPACE_DIR = __dirname;

function resolvePlistPath(name) {
  // ワークスペース直下のファイルのみ対象
  return path.join(WORKSPACE_DIR, name);
}

function listPlists(dir) {
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.plist'));
    return files.map(f => ({ name: f, path: path.join(dir, f) }));
  } catch (e) {
    return [];
  }
}

function safeReadPlist(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8');
  return plist.parse(xml);
}

function safeWritePlist(filePath, obj) {
  const xml = plist.build(obj);
  fs.writeFileSync(filePath, xml, 'utf8');
}

// API: list all plist jobs from workspace root only
app.get('/api/jobs', (req, res) => {
  const workspace = listPlists(WORKSPACE_DIR);
  res.json(workspace);
});

// API: get a plist by name
app.get('/api/jobs/:name', (req, res) => {
  const name = req.params.name;
  const filePath = resolvePlistPath(name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  try {
    const data = safeReadPlist(filePath);
    res.json({ name, path: filePath, data });
  } catch (e) {
    res.status(400).json({ error: 'Failed to parse plist', details: String(e) });
  }
});

// API: create a new plist (workspace only)
app.post('/api/jobs', (req, res) => {
  const { name, data } = req.body;
  if (!name || !name.endsWith('.plist')) {
    return res.status(400).json({ error: 'name must end with .plist' });
  }
  const dir = WORKSPACE_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, name);
  if (fs.existsSync(filePath)) return res.status(409).json({ error: 'Already exists' });
  try {
    safeWritePlist(filePath, data);
    res.status(201).json({ name, path: filePath });
  } catch (e) {
    res.status(400).json({ error: 'Failed to write plist', details: String(e) });
  }
});

// API: update an existing plist
app.put('/api/jobs/:name', (req, res) => {
  const name = req.params.name;
  const filePath = resolvePlistPath(name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  try {
    safeWritePlist(filePath, req.body.data);
    res.json({ name, path: filePath });
  } catch (e) {
    res.status(400).json({ error: 'Failed to write plist', details: String(e) });
  }
});

// API: delete plist
app.delete('/api/jobs/:name', (req, res) => {
  const name = req.params.name;
  const filePath = resolvePlistPath(name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  try {
    fs.unlinkSync(filePath);
    res.json({ deleted: name });
  } catch (e) {
    res.status(400).json({ error: 'Failed to delete plist', details: String(e) });
  }
});

// Optional: launchctl actions (no-op if not available / permission issues)
const { execFile } = require('child_process');
function runLaunchctl(args) {
  return new Promise((resolve) => {
    execFile('launchctl', args, { timeout: 5000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout, stderr, error: err ? String(err) : undefined });
    });
  });
}

app.post('/api/launchctl/load', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const filePath = resolvePlistPath(name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'plist not found' });
  const result = await runLaunchctl(['load', '-w', filePath]);
  res.json(result);
});

app.post('/api/launchctl/unload', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const filePath = resolvePlistPath(name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'plist not found' });
  const result = await runLaunchctl(['unload', filePath]);
  res.json(result);
});

// Serve index
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Batch Timer GUI listening on http://localhost:${PORT}`);
});
