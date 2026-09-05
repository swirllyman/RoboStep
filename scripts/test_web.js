// test_web.js - Server and asset delivery integration test
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(ROOT_DIR, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found: ' + reqPath);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(0, async () => {
  const port = server.address().port;
  console.log(`Test server started on http://localhost:${port}`);

  const filesToTest = [
    '/',
    '/css/style.css',
    '/js/audio.js',
    '/js/voice.js',
    '/js/robotRenderer.js',
    '/js/levels.js',
    '/js/customizer.js',
    '/js/game.js'
  ];

  let allOk = true;

  for (const urlPath of filesToTest) {
    try {
      const res = await fetch(`http://localhost:${port}${urlPath}`);
      if (res.status === 200) {
        const text = await res.text();
        console.log(`[PASS] ${urlPath} (${res.status} OK - ${text.length} bytes)`);
      } else {
        console.error(`[FAIL] ${urlPath} returned status ${res.status}`);
        allOk = false;
      }
    } catch (e) {
      console.error(`[ERROR] Fetching ${urlPath}: ${e.message}`);
      allOk = false;
    }
  }

  // Check index.html contents
  const htmlRes = await fetch(`http://localhost:${port}/`);
  const html = await htmlRes.text();

  const requiredSelectors = [
    'id="game-grid"',
    'id="command-tape"',
    'id="btn-run"',
    'id="btn-step"',
    'id="btn-reset"',
    'id="btn-clear"',
    'id="btn-clear-tape"',
    'id="btn-up"',
    'id="btn-down"',
    'id="btn-left"',
    'id="btn-right"',
    'id="btn-voice"',
    'id="wardrobe-modal"',
    'id="voice-modal"',
    'id="level-select-modal"',
    'id="win-modal"',
    'id="milestone-modal"',
    'id="voice-pitch"',
    'id="voice-rate"'
  ];

  for (const sel of requiredSelectors) {
    if (html.includes(sel)) {
      console.log(`[PASS] HTML contains ${sel}`);
    } else {
      console.error(`[FAIL] HTML missing ${sel}`);
      allOk = false;
    }
  }

  server.close(() => {
    console.log('Test server closed.');
    if (allOk) {
      console.log('\n🎉 ALL WEB ASSETS & INTEGRATION TESTS PASSED PERFECTLY!');
    } else {
      process.exitCode = 1;
    }
  });
});
