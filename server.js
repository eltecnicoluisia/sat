const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'frontend/dist');
const UPLOADS_DIR = path.join(__dirname, 'backend/uploads');
const BACKEND_URL = 'http://localhost:3001';
const PORT = 80;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
};

const http_module = require('http');

function proxyRequest(req, res, targetUrl) {
  const url = new URL(targetUrl);
  const options = {
    hostname: url.hostname,
    port: url.port || 3001,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: url.hostname + ':' + (url.port || 3001),
    },
  };

  const proxyReq = http_module.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502);
    res.end('Backend not available');
  });

  req.pipe(proxyReq, { end: true });
}

const server = http.createServer((req, res) => {
  // Proxy /api/ and /socket.io/ to backend
  if (req.url.startsWith('/api/') || req.url.startsWith('/socket.io/')) {
    return proxyRequest(req, res, BACKEND_URL);
  }

  // Serve uploaded files
  if (req.url.startsWith('/uploads/')) {
    const filePath = path.join(UPLOADS_DIR, req.url.replace('/uploads/', ''));
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  // Serve static frontend files
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

  // Remove query string
  filePath = filePath.split('?')[0];

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA fallback: serve index.html for all routes
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'text/plain';

  res.setHeader('Content-Type', contentType);
  // Cache static assets
  if (ext !== '.html') {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }

  fs.createReadStream(filePath)
    .on('error', () => {
      res.writeHead(404);
      res.end('Not found');
    })
    .pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SAT-FRONTEND] Servidor de produccion en puerto ${PORT}`);
});
