// A stand-in for the container, for a machine with no Docker:   node deploy/stand-in.mjs [port]      (IT_CONSOLE=1 for IT's console)
//
// It serves the same folders with the same rules as deploy/nginx.conf, and takes its headers FROM that file
// (every add_header line), so the two can't drift apart.  It is for checking, on your own machine, that
//   - bash deploy/smoke.sh http://127.0.0.1:8080   passes, and
//   - the app works in a browser under the image's security headers.
// It is not the deploy: the image is.  It listens on this computer only.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || 8080);
const FOLDERS = ['DataPage'].concat(process.env.IT_CONSOLE === '1' ? ['it-console'] : []);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.ico': 'image/x-icon', '.png': 'image/png', '.svg': 'image/svg+xml' };
const NEVER = ['flogic', 'flogic-key', 'flogic-keyring', 'flogic-signer', 'flogic-id', 'csv', 'xlsx', 'sql', 'db', 'zip'];

// add_header Name "value" always;
const headers = {};
for (const line of readFileSync(path.join(REPO, 'deploy', 'nginx.conf'), 'utf8').split('\n')) {
    const m = line.trim().match(/^add_header\s+(\S+)\s+"(.*)"\s+always;$/);
    if (m) headers[m[1]] = m[2];
}

createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const send = (code, type, body, extra) => { res.writeHead(code, Object.assign({}, headers, type ? { 'Content-Type': type } : {}, extra || {})); res.end(req.method === 'HEAD' ? undefined : body); };
    if (url === '/') return send(302, null, '', { Location: '/DataPage/flogic.html' });
    if (url === '/healthz') return send(200, 'text/plain', 'ok\n');
    if (url === '/favicon.ico') return send(204, null, '');
    const ext = path.extname(url).toLowerCase();
    const parts = url.split('/').filter(Boolean);
    if (NEVER.includes(ext.slice(1)) || parts.includes('..') || !FOLDERS.includes(parts[0])) return send(404, 'text/plain', 'not found\n');
    //  TRUST=<a trust file>:  served as DataPage/it-signerI.js   (what the volume in docker-compose.yml does)
    const file = process.env.TRUST && url === '/DataPage/it-signerI.js' ? process.env.TRUST : path.join(REPO, ...parts);
    if (!TYPES[ext] || !existsSync(file) || !statSync(file).isFile()) return send(404, 'text/plain', 'not found\n');
    send(200, TYPES[ext], readFileSync(file));
}).listen(PORT, '127.0.0.1', () => console.log('Flogic stand-in on http://127.0.0.1:' + PORT + '   folders: ' + FOLDERS.join(', ') + '   headers from nginx.conf: ' + Object.keys(headers).length));
