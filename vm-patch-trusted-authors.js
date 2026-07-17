// Run on the VM: node vm-patch-trusted-authors.js
// Then: pm2 restart tracksnack-likes

const fs = require('fs');
const path = require('path');
const serverPath = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverPath, 'utf8');

if (code.includes('trusted-authors')) {
  console.log('Already patched.');
  process.exit(0);
}

const patch = `
const TRUSTED_AUTHORS_FILE = path.join(__dirname, 'trusted-authors.json');

app.get('/trusted-authors', (req, res) => {
  res.json(readJSON(TRUSTED_AUTHORS_FILE, []));
});

app.post('/trusted-authors', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });
  const { handle } = req.body;
  if (!handle) return res.status(400).json({ error: 'handle required' });
  const authors = readJSON(TRUSTED_AUTHORS_FILE, []);
  if (authors.find(a => a.handle === handle)) return res.json({ ok: true, existing: true });
  authors.push({ handle, addedAt: new Date().toISOString(), lastChecked: null, tracksAdded: 0 });
  writeJSON(TRUSTED_AUTHORS_FILE, authors);
  res.json({ ok: true });
});

app.delete('/trusted-authors/:handle', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });
  const filtered = readJSON(TRUSTED_AUTHORS_FILE, []).filter(a => a.handle !== req.params.handle);
  writeJSON(TRUSTED_AUTHORS_FILE, filtered);
  res.json({ ok: true });
});

app.post('/trusted-authors/:handle/checked', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });
  const authors = readJSON(TRUSTED_AUTHORS_FILE, []);
  const a = authors.find(x => x.handle === req.params.handle);
  if (a) {
    a.lastChecked = new Date().toISOString();
    a.tracksAdded = (a.tracksAdded || 0) + (req.body.tracksAdded || 0);
    writeJSON(TRUSTED_AUTHORS_FILE, authors);
  }
  res.json({ ok: true });
});

`;

// Insert before app.listen(
code = code.replace('app.listen(', patch + 'app.listen(');
fs.writeFileSync(serverPath, code);
console.log('Patched! Run: pm2 restart tracksnack-likes');
