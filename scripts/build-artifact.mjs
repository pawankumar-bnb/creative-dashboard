// Generates dist/artifact.html — the same app as index.html, but as the body fragment
// the claude.ai Artifact viewer expects (it supplies its own <html>/<head>/<body>).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<!-- artifact:start -->([\s\S]*?)<!-- artifact:end -->/)[1].replace(/<!-- site:start[\s\S]*?<!-- site:end -->\n?/g, '');
const keep = head.split('\n').filter((l) => /<title>|<link rel="stylesheet"|<link rel="preconnect"/.test(l)).join('\n');
mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/artifact.html', import.meta.url), `${keep}\n${body.trim()}\n`);
console.log('wrote dist/artifact.html');
