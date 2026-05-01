const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const ROOT = __dirname;
const DS_DIR = path.join(ROOT, 'node_modules/anentrypoint-design/dist');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  let filePath;
  if (urlPath.startsWith('/ds/')) {
    filePath = path.join(DS_DIR, urlPath.slice(4));
  } else {
    filePath = path.join(ROOT, urlPath);
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Dashboard: http://localhost:${PORT}`);
});
