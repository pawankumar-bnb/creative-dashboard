/* ============================================================
   Creative Request Ops — Brick&Bolt's branding team
   Requested → Brief & assign (coordinator) → In production (design /
   video team, per-task TAT) → QC (coordinator) → Final approval
   (requester or admin) → Approved. Every stage is timed; SLA and TAT
   breaches are flagged; the assignee's TAT is stored on approval.
   ============================================================ */
(() => {
'use strict';

/* ---------------- constants ---------------- */
const APP = { name: 'Creative Request Ops', ownerEmail: 'pawankumar@bricknbolt.com', ownerName: 'Pawan Kumar' };
const CFG = window.RELAY_CONFIG || {};
const inArtifact = () => !!(window.claude && typeof window.claude.use === 'function');
const LS = { me: 'relay.me', boardMode: 'relay.boardMode', local: 'relay.local.v2' };
const H = 3600e3, D = 24 * H, MIN = 60e3;

const DEFAULT_ROLES = [
  { id: 'admin',       name: 'Admin',          color: '#1F4FD1', desc: 'Final approver on every task; manages the team, the flow and settings' },
  { id: 'coordinator', name: 'Coordinator',    color: '#eb6834', desc: 'Receives every request, writes the brief with the requester, assigns it, sets the TAT and does QC' },
  { id: 'requester',   name: 'Requester',      color: '#64748B', desc: 'Anyone at Brick&Bolt — raises requests and gives the final approval on their own' },
  { id: 'design',      name: 'Graphic design', color: '#4a3aa7', desc: 'Designers — banners, creatives, collaterals, decks' },
  { id: 'video',       name: 'Video editing',  color: '#0E9384', desc: 'Video editors — GIFs, reels, event and testimonial shoots' },
];
const TEAMS = [{ id: 'design', name: 'Graphic design team' }, { id: 'video', name: 'Video editing team' }];
const DEFAULT_TYPES = [
  { id: 'lp-banners',   name: 'LP / Website banners',            team: 'design', tatHours: 24,  from: 'Abhinav / Kunal',    goesTo: 'Manju',              note: 'High priority' },
  { id: 'crm',          name: 'CRM creatives',                   team: 'design', tatHours: 72,  from: 'Siddharth',          goesTo: 'Yogesh',             note: '2–3 days' },
  { id: 'performance',  name: 'Performance creatives',           team: 'design', tatHours: 72,  from: 'Abhinav',            goesTo: 'Manju',              note: '2–3 days' },
  { id: 'social-design', name: 'Social media creatives',         team: 'design', tatHours: 24,  from: 'Sakshi / Dishika',   goesTo: 'Yogesh',             note: '1 day' },
  { id: 'atl-btl',      name: 'ATL / BTL / Event collaterals',   team: 'design', tatHours: 240, from: 'External team',      goesTo: 'Manju',              note: '7–10 days' },
  { id: 'decks',        name: 'Decks / Pitch brochures',         team: 'design', tatHours: 96,  from: 'External team',      goesTo: 'Manju',              note: '3–4 days' },
  { id: 'perf-video',   name: 'Performance GIFs / videos',       team: 'video',  tatHours: 24,  from: 'Abhinav',            goesTo: 'Pratyush',           note: 'High priority' },
  { id: 'social-video', name: 'Social media videos',             team: 'video',  tatHours: 24,  from: 'Sakshi / Dishika',   goesTo: 'Dhanraj',            note: '1 day' },
  { id: 'hr-events',    name: 'HR event shoots (in-house)',      team: 'video',  tatHours: 24,  from: 'Preety',             goesTo: 'Pratyush',           note: '1 day' },
  { id: 'testimonials', name: 'Testimonial & home-tour shoots',  team: 'video',  tatHours: 72,  from: 'OPS / Sakshi',       goesTo: 'Pratyush / Dhanraj', note: '2–3 days' },
];
const DEFAULT_FLOW = {
  version: 2,
  stages: [
    { id: 'intake',     name: 'Requested',      kind: 'start',  role: 'requester',   slaHours: 0,  color: '#64748B' },
    { id: 'brief',      name: 'Brief & assign', kind: 'triage', role: 'coordinator', slaHours: 24, color: '#1baf7a' },
    { id: 'production', name: 'In production',  kind: 'work',   role: 'team',        slaHours: 0,  slaFrom: 'task', needsFile: true, color: '#4a3aa7' },
    { id: 'qc',         name: 'QC',             kind: 'review', reviewers: ['role:coordinator'],    slaHours: 24, editsTo: 'production', color: '#eb6834' },
    { id: 'approval',   name: 'Final approval', kind: 'review', reviewers: ['requester', 'role:admin'], slaHours: 24, editsTo: 'production', color: '#2a78d6' },
    { id: 'done',       name: 'Approved',       kind: 'end',    role: '',            slaHours: 0,  color: '#0ca30c' },
  ],
};
const DEFAULT_SETTINGS = {
  prefix: 'BB',
  types: DEFAULT_TYPES,
  priorities: ['Low', 'Normal', 'High', 'Urgent'],
  workHours: { enabled: false, start: 10, end: 19, days: [1, 2, 3, 4, 5, 6] },
  slaWarnAt: 0.75,
  roles: DEFAULT_ROLES,
  allowedDomains: ['bricknbolt.com'],
};
/* Dark-theme steps of the stage colours (validated as a set). */
const DARK_COLORS = { '#1baf7a': '#199e70', '#4a3aa7': '#9085e9', '#eb6834': '#d95926', '#2a78d6': '#3987e5', '#0ca30c': '#3dbe3d', '#64748b': '#8b98ac', '#0e9384': '#2dd4bf', '#1f4fd1': '#7b98ff', '#c11574': '#ee5ea6' };

/* ---------------- tiny utils ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const attr = esc;
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const now = () => Date.now();
const clone = (o) => JSON.parse(JSON.stringify(o));
const lower = (s) => String(s || '').trim().toLowerCase();
const sameEmail = (a, b) => !!a && !!b && lower(a) === lower(b);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const plural = (n, s, p) => `${n} ${n === 1 ? s : (p || s + 's')}`;
const slug = (s) => lower(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item';
const isUrl = (s) => /^https?:\/\/\S+$/i.test(String(s || '').trim());
const emailDomain = (e) => lower(e).split('@')[1] || '';
const isDark = () => document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
const themed = (hex) => { const k = lower(hex); return isDark() && DARK_COLORS[k] ? DARK_COLORS[k] : hex || '#64748B'; };

const AV_COLORS = ['#1F4FD1', '#0E9384', '#7A5AF8', '#C11574', '#B54708', '#087443', '#175CD3', '#6941C6', '#A15C07', '#3E4784'];
function avatarColor(key) { let h = 0; for (const c of String(key || '?')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV_COLORS[h % AV_COLORS.length]; }
function initials(name) { const p = String(name || '?').trim().split(/\s+/); return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?'; }
function personHtml(p, size = '') {
  if (!p) return `<span class="avatar ${size} empty" title="Unassigned">?</span>`;
  const cls = p.sample ? 'sample' : '';
  const bg = p.sample ? '' : `style="background:${avatarColor(p.email || p.name)}"`;
  return `<span class="avatar ${size} ${cls}" ${bg} title="${attr(p.name)}${p.email ? ' · ' + attr(p.email) : ''}">${esc(initials(p.name))}</span>`;
}
function whoHtml(p, size = 'sm', emptyText = 'Unassigned') {
  if (!p) return `<span class="who">${personHtml(null, size)}<span class="name muted">${esc(emptyText)}</span></span>`;
  return `<span class="who">${personHtml(p, size)}<span class="name">${esc(p.name)}</span></span>`;
}
const pick = (p) => p ? { email: p.email || null, name: p.name, ...(p.authId ? { authId: p.authId } : {}), ...(p.sample ? { sample: true } : {}) } : null;
const firstName = (p) => (p && p.name ? p.name.split(' ')[0] : '');

/* ---------------- time ---------------- */
function fmtDur(ms) {
  if (ms == null || isNaN(ms)) return '—';
  ms = Math.max(0, ms);
  const d = Math.floor(ms / D), h = Math.floor((ms % D) / H), m = Math.floor((ms % H) / MIN);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '<1m';
}
function fmtTat(hours) { if (!hours) return '—'; if (hours % 24 === 0) return plural(hours / 24, 'day'); if (hours > 24) return `${(hours / 24).toFixed(1)} days`; return `${hours}h`; }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function fmtDate(ts) { if (!ts) return '—'; const d = new Date(ts); const y = d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''; return `${d.getDate()} ${MONTHS[d.getMonth()]}${y}`; }
function fmtDateTime(ts) { const d = new Date(ts); return `${fmtDate(ts)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function fmtDeadline(ts) { const d = new Date(ts); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function fmtRel(ts) {
  const diff = now() - ts;
  if (diff < MIN) return 'just now';
  if (diff < H) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < D) return `${Math.floor(diff / H)}h ago`;
  if (diff < 7 * D) return `${Math.floor(diff / D)}d ago`;
  return fmtDate(ts);
}
function parseDate(iso) { if (!iso) return null; const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 23, 59, 59).getTime(); }
function isoToday(offsetDays = 0) { const d = new Date(); d.setDate(d.getDate() + offsetDays); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function fmtDue(iso, status) {
  if (!iso) return { text: 'No due date', cls: 'muted' };
  const due = parseDate(iso); const days = Math.ceil((due - now()) / D);
  if (status !== 'open') return { text: `Due ${fmtDate(due)}`, cls: 'muted' };
  if (days < 0) return { text: `Overdue by ${plural(-days, 'day')}`, cls: 'crit' };
  if (days === 0) return { text: 'Due today', cls: 'warn' };
  if (days === 1) return { text: 'Due tomorrow', cls: 'warn' };
  return { text: `Due in ${days} days`, cls: '' };
}
/* Elapsed time between two instants, optionally counting only working hours. */
function elapsedMs(from, to, wh) {
  if (!from) return 0;
  to = to || now();
  if (!wh || !wh.enabled) return Math.max(0, to - from);
  let total = 0, guard = 0;
  const cursor = new Date(from); cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() < to && guard++ < 800) {
    if (wh.days.includes(cursor.getDay())) {
      const s = new Date(cursor); s.setHours(wh.start, 0, 0, 0);
      const e = new Date(cursor); e.setHours(wh.end, 0, 0, 0);
      const a = Math.max(from, s.getTime()), b = Math.min(to, e.getTime());
      if (b > a) total += b - a;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}
/* The instant `ms` of (working) time after `from`. */
function addWorkMs(from, ms, wh) {
  if (!wh || !wh.enabled) return from + ms;
  let cursor = from, left = ms, guard = 0;
  while (left > 0 && guard++ < 2000) {
    const d = new Date(cursor); const s = new Date(d); s.setHours(wh.start, 0, 0, 0); const e = new Date(d); e.setHours(wh.end, 0, 0, 0);
    if (wh.days.includes(d.getDay()) && cursor < e.getTime()) { const start = Math.max(cursor, s.getTime()); const avail = e.getTime() - start; if (avail >= left) return start + left; left -= avail; }
    const n = new Date(d); n.setDate(n.getDate() + 1); n.setHours(0, 0, 0, 0); cursor = n.getTime();
  }
  return cursor;
}

/* ---------------- icons (Lucide-style, inline) ---------------- */
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  board: '<rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="9.5" y="3" width="5" height="12" rx="1.5"/><rect x="16" y="3" width="5" height="8" rx="1.5"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  flow: '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.5 6h9"/><path d="M5 8.5c0 5 7 4 7 7"/><path d="M19 8.5c0 5-7 4-7 7"/>',
  settings: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.2a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.2a2 2 0 0 1 1 1.7V20a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.2a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.2a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  up: '<polyline points="18 15 12 9 6 15"/>',
  down: '<polyline points="6 9 12 15 18 9"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  rotate: '<path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 3 3 9 9 9"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.8L3 14.2a2 2 0 0 1 3.3-2.2L8 14"/>',
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  relay: '<path d="M4 17 9 7l3 6 3-6 5 10"/><circle cx="12" cy="13" r="1"/>',
  sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/>',
  filter: '<polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
  timer: '<line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="15" y2="11"/><circle cx="12" cy="14" r="8"/>',
};
const ic = (n, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------------- stores ---------------- */
class LocalStore {
  constructor() {
    this.subs = {};
    let data = null;
    try { data = JSON.parse(localStorage.getItem(LS.local) || 'null'); } catch (e) { data = null; }
    if (!data || !data.requests) data = LocalStore.seed();
    this.data = data;
  }
  static seed() {
    const S = window.RelaySamples;
    const data = { members: {}, requests: {}, config: {} };
    if (S) {
      S.roster.forEach((m) => { data.members[lower(m.email)] = { ...m, addedAt: now() }; });
      S.build(now()).requests.forEach((r) => { data.requests[r.id] = r; });
    }
    return data;
  }
  persist() { try { localStorage.setItem(LS.local, JSON.stringify(this.data)); } catch (e) { /* storage may be unavailable */ } }
  list(col) { return Object.entries(this.data[col] || {}).map(([id, d]) => ({ ...d, id })); }
  emit(col) { (this.subs[col] || []).forEach((cb) => cb(this.list(col))); }
  subscribe(col, cb) { (this.subs[col] ||= []).push(cb); setTimeout(() => cb(this.list(col)), 0); return () => { this.subs[col] = (this.subs[col] || []).filter((f) => f !== cb); }; }
  async get(col, id) { const d = (this.data[col] || {})[id]; return d ? { ...d, id } : null; }
  async set(col, id, doc) { (this.data[col] ||= {})[id] = stripId(doc); this.persist(); this.emit(col); }
  async update(col, id, patch) { const cur = (this.data[col] || {})[id]; if (!cur) throw { code: 'invalid_argument', message: 'missing' }; this.data[col][id] = { ...cur, ...stripId(patch) }; this.persist(); this.emit(col); }
  async del(col, id) { if (this.data[col]) delete this.data[col][id]; this.persist(); this.emit(col); }
  async add(col, doc) { const id = uid(); await this.set(col, id, doc); return id; }
  async nextNumber(maxExisting) { return maxExisting + 1; }
  reset() { this.data = LocalStore.seed(); this.persist(); Object.keys(this.data).forEach((c) => this.emit(c)); }
}
class DbStore {
  constructor(db) { this.db = db; }
  subscribe(col, cb, onErr) {
    return this.db.collection(col).onSnapshot(
      (snap) => cb(snap.docs.filter((d) => d.exists).map((d) => ({ ...d.data(), id: d.id }))),
      (e) => { console.warn('db subscription error', col, e); onErr && onErr(e); },
    );
  }
  async get(col, id) { const s = await this.db.doc(`${col}/${id}`).get(); return s.exists ? { ...s.data(), id: s.id } : null; }
  set(col, id, doc) { return this.db.doc(`${col}/${id}`).set(stripId(doc)); }
  update(col, id, patch) { return this.db.doc(`${col}/${id}`).update(stripId(patch)); }
  del(col, id) { return this.db.doc(`${col}/${id}`).delete(); }
  async add(col, doc) { const ref = await this.db.collection(col).add(stripId(doc)); return ref.id; }
  async nextNumber(maxExisting) {
    try {
      const ref = this.db.doc('config/counter');
      const lease = await ref.acquire({ holder: (S.me && S.me.email) || 'anon', ttlMs: 4000 });
      if (lease.acquired) {
        const s = await ref.get();
        const cur = s.exists ? Number(s.data().next || 1) : 1;
        const n = Math.max(cur, maxExisting + 1);
        await ref.set({ next: n + 1 });
        return n;
      }
    } catch (e) { console.warn('counter fallback', e); }
    return maxExisting + 1;
  }
}
/* Supabase-backed store: one `docs` table (collection, id, data) with row-level security
   keyed on the Clerk session token. Realtime keeps every open tab in sync; if the
   realtime channel cannot connect it falls back to polling. */
class SupabaseStore {
  constructor(client) { this.sb = client; this.cache = {}; this.subs = {}; this.loaded = {}; this.channel = null; this.poll = null; }
  list(col) { return Object.values(this.cache[col] || {}); }
  emit(col) { (this.subs[col] || []).forEach((cb) => cb(this.list(col))); }
  async load(col) {
    const { data, error } = await this.sb.from('docs').select('id,data').eq('collection', col);
    if (error) throw { code: error.code === '42501' ? 'not_granted' : 'unavailable', message: error.message };
    const map = {}; (data || []).forEach((row) => { map[row.id] = { ...(row.data || {}), id: row.id }; });
    this.cache[col] = map; this.loaded[col] = true; this.emit(col);
  }
  subscribe(col, cb, onErr) {
    (this.subs[col] ||= []).push(cb);
    this.load(col).catch((e) => onErr && onErr(e));
    this.ensureRealtime();
    return () => { this.subs[col] = (this.subs[col] || []).filter((f) => f !== cb); };
  }
  ensureRealtime() {
    if (this.channel) return;
    const apply = (payload) => {
      const row = payload.new && payload.new.collection ? payload.new : payload.old; if (!row || !row.collection) { this.refreshAll(); return; }
      const col = row.collection; this.cache[col] ||= {};
      if (payload.eventType === 'DELETE') delete this.cache[col][row.id]; else this.cache[col][row.id] = { ...(row.data || {}), id: row.id };
      this.emit(col);
    };
    this.channel = this.sb.channel('docs-live').on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, apply)
      .subscribe((status) => { if (status === 'SUBSCRIBED') { if (this.poll) { clearInterval(this.poll); this.poll = null; } this.refreshAll(); } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { if (!this.poll) this.poll = setInterval(() => this.refreshAll(), 30000); } });
  }
  refreshAll() { Object.keys(this.subs).forEach((col) => { if (this.subs[col].length) this.load(col).catch(() => {}); }); }
  async get(col, id) { const { data, error } = await this.sb.from('docs').select('id,data').eq('collection', col).eq('id', id).maybeSingle(); if (error) throw { code: 'unavailable', message: error.message }; return data ? { ...(data.data || {}), id: data.id } : null; }
  async set(col, id, doc) { const body = stripId(doc); const { error } = await this.sb.from('docs').upsert({ collection: col, id, data: body }, { onConflict: 'collection,id' }); if (error) throw this.err(error); (this.cache[col] ||= {})[id] = { ...body, id }; this.emit(col); }
  async update(col, id, patch) { const cur = (this.cache[col] || {})[id] || await this.get(col, id); if (!cur) throw { code: 'invalid_argument', message: 'missing' }; await this.set(col, id, { ...cur, ...stripId(patch) }); }
  async del(col, id) { const { error } = await this.sb.from('docs').delete().eq('collection', col).eq('id', id); if (error) throw this.err(error); if (this.cache[col]) delete this.cache[col][id]; this.emit(col); }
  async add(col, doc) { const id = uid(); await this.set(col, id, doc); return id; }
  async nextNumber(maxExisting) { try { const { data, error } = await this.sb.rpc('next_task_number'); if (!error && data) return Math.max(Number(data), maxExisting + 1); } catch (e) { /* fall through */ } return maxExisting + 1; }
  err(error) { const code = error && (error.code === '42501' || /row-level security/i.test(error.message || '')) ? 'not_granted' : 'unavailable'; return { code, message: error ? error.message : 'unknown' }; }
  dispose() { if (this.channel) { try { this.sb.removeChannel(this.channel); } catch (e) { /* ignore */ } this.channel = null; } if (this.poll) clearInterval(this.poll); this.cache = {}; this.subs = {}; }
}
function stripId(doc) { const d = clone(doc); delete d.id; return d; }

/* ---------------- state ---------------- */
const S = {
  store: null, mode: 'loading', downloads: null,
  me: null, members: [], requests: [], flow: clone(DEFAULT_FLOW), settings: clone(DEFAULT_SETTINGS),
  loaded: { members: false, requests: false, config: false },
  route: { view: 'dashboard', id: null },
  q: '', filters: { type: '', prio: '', team: '', mine: false, breached: false, stage: '' }, sort: { key: 'updatedAt', dir: 'desc' },
  boardMode: localStorage.getItem(LS.boardMode) || 'board',
  drawer: null, modal: null, gateError: '', gatePending: null, bootstrap: false, dbError: null,
  authMode: 'roster', clerk: null, identity: null, backend: 'local', clerkState: 'loading',
};
const roles = () => (S.settings.roles && S.settings.roles.length ? S.settings.roles : DEFAULT_ROLES);
const roleById = (id) => roles().find((r) => r.id === id);
const roleName = (id) => id === 'team' ? 'Design / video team' : ((roleById(id) || {}).name || id || '—');
const roleColor = (id) => (roleById(id) || {}).color || '#64748B';
const teamName = (id) => (TEAMS.find((t) => t.id === id) || {}).name || roleName(id);
const types = () => S.settings.types || [];
const typeById = (id) => types().find((t) => t.id === id);
const stages = () => S.flow.stages;
const stageById = (id) => stages().find((s) => s.id === id);
const stageIdx = (id) => stages().findIndex((s) => s.id === id);
const nextStage = (id) => stages()[stageIdx(id) + 1];
const prevStage = (id) => stages()[stageIdx(id) - 1];
const boardStages = () => stages().filter((s) => s.kind !== 'start');
const firstStage = () => stages().find((s) => s.kind !== 'start') || stages()[1];
const workStage = () => stages().find((s) => s.kind === 'work');
const wh = () => S.settings.workHours;
const hasRole = (m, r) => !!m && Array.isArray(m.roles) && m.roles.includes(r);
const isAdmin = (m = S.me) => hasRole(m, 'admin') || (m && sameEmail(m.email, APP.ownerEmail));
const isCoordinator = (m = S.me) => hasRole(m, 'coordinator');
const isRequester = (r, m = S.me) => !!m && !!r.requester && sameEmail(r.requester.email, m.email);
const isMe = (p) => !!p && !!S.me && sameEmail(p.email, S.me.email);
const activeMembers = () => S.members.filter((m) => m.active !== false);
const membersWithRole = (role) => activeMembers().filter((m) => hasRole(m, role));
const coordinators = () => membersWithRole('coordinator');
const coordinatorNames = () => coordinators().map((m) => m.name).join(' / ') || 'the coordinator';
const stageOwnerRole = (st, r) => (st.role === 'team' ? (r && r.team) || 'design' : st.role);
const assigneeOf = (r) => { const w = workStage(); return w ? (r.assignees || {})[w.id] || null : null; };

/* ---------------- request metrics ---------------- */
const currentVisit = (r) => (r.visits || []).find((v) => !v.exitedAt) || null;
const visitElapsed = (v) => elapsedMs(v.enteredAt, v.exitedAt || now(), wh());
/* The time limit for a stage on a given request: the per-task TAT for the work stage, else the stage SLA. */
function stageLimitMs(st, r) { if (!st) return 0; if (st.slaFrom === 'task') return (Number(r && r.tatHours) || 0) * H; return (Number(st.slaHours) || 0) * H; }
const visitBreached = (v, r) => { const st = stageById(v.stage); const lim = stageLimitMs(st, r); return lim > 0 && visitElapsed(v) > lim; };
function stageTat(r, stageId) { return (r.visits || []).filter((v) => v.stage === stageId).reduce((a, v) => a + visitElapsed(v), 0); }
function slaState(r) {
  const st = stageById(r.stage), v = currentVisit(r);
  if (!st || !v || r.status !== 'open') return { ratio: null, state: 'none', elapsed: v ? visitElapsed(v) : 0, limit: 0 };
  const limit = stageLimitMs(st, r), elapsed = visitElapsed(v);
  if (!limit) return { ratio: null, state: 'none', elapsed, limit: 0 };
  const ratio = elapsed / limit;
  return { ratio, elapsed, limit, remaining: limit - elapsed, deadline: addWorkMs(v.enteredAt, limit, wh()), state: ratio >= 1 ? 'crit' : ratio >= (S.settings.slaWarnAt || 0.75) ? 'warn' : 'ok' };
}
const anyBreach = (r) => (r.visits || []).some((v) => visitBreached(v, r));
const isBreachedNow = (r) => slaState(r).state === 'crit';
const totalTat = (r) => elapsedMs(r.createdAt, r.completedAt || (r.status === 'open' ? now() : r.updatedAt), wh());
const isOverdue = (r) => r.status === 'open' && r.dueDate && parseDate(r.dueDate) < now();
/* Production TAT of the assignee: every visit to the work stage, all rounds. */
function productionTat(r) { const w = workStage(); return w ? stageTat(r, w.id) : 0; }
function reviewerMatch(spec, r, m = S.me) { if (!m) return false; if (spec === 'requester') return isRequester(r, m); if (String(spec).startsWith('role:')) return hasRole(m, spec.slice(5)); return false; }
function reviewerLabel(spec, r) { if (spec === 'requester') return r && r.requester ? r.requester.name : 'the requester'; if (String(spec).startsWith('role:')) { const role = spec.slice(5); const ms = membersWithRole(role); return ms.length && ms.length <= 3 ? ms.map((m) => m.name).join(' / ') : roleName(role); } return spec; }
function needsMe(r) {
  if (!S.me || r.status !== 'open') return null;
  const st = stageById(r.stage); if (!st) return null;
  if (st.kind === 'triage') return hasRole(S.me, st.role) ? 'triage' : null;
  if (st.kind === 'work') { const a = (r.assignees || {})[st.id]; return a && isMe(a) ? 'work' : null; }
  if (st.kind === 'review') return (st.reviewers || []).some((spec) => reviewerMatch(spec, r)) ? 'review' : null;
  return null;
}
/* ---------------- permissions ---------------- */
const canCreate = () => !!S.me;
const canTriage = (r, st) => isAdmin() || hasRole(S.me, st.role);
const canManageAssignment = (r) => isAdmin() || isCoordinator();
const canSubmitWork = (r, st) => { const a = (r.assignees || {})[st.id]; return isAdmin() || isMe(a); };
const canReview = (r, st) => isAdmin() || (st.reviewers || []).some((spec) => reviewerMatch(spec, r));
const canEditRequest = (r) => isAdmin() || isRequester(r) || isCoordinator();
const canAddDeliverable = (r) => !!S.me;
const canManageTeam = () => isAdmin();

/* ---------------- request actions ---------------- */
function sysMsg(text) { return { at: now(), by: pick(S.me), kind: 'system', text }; }
function closeVisit(r, action) { const v = currentVisit(r); if (v) { v.exitedAt = now(); v.by = pick(S.me); v.action = action; } }
function enterStage(r, stageId) {
  const st = stageById(stageId); const t = now();
  r.stage = stageId;
  r.visits.push({ stage: stageId, enteredAt: t, exitedAt: null, round: r.round, assignee: pick((r.assignees || {})[stageId]) || null });
  if (st && st.kind === 'end') { r.status = 'done'; r.completedAt = t; finalizeResult(r); } else { r.status = 'open'; delete r.completedAt; }
  r.updatedAt = t;
}
/* Step 11 — on final approval, store the assignee's turnaround on the task. */
function finalizeResult(r) {
  const w = workStage(); const a = w ? (r.assignees || {})[w.id] : null;
  const prod = w ? (r.visits || []).filter((v) => v.stage === w.id) : [];
  const actualMs = prod.reduce((s, v) => s + visitElapsed(v), 0);
  const firstMs = prod.length ? visitElapsed(prod[0]) : 0;
  const stageHours = {}; stages().forEach((s) => { if (s.kind !== 'start' && s.kind !== 'end') stageHours[s.id] = Math.round(stageTat(r, s.id) / H * 10) / 10; });
  r.result = {
    assignee: pick(a), team: r.team || null, targetHours: Number(r.tatHours) || 0,
    actualHours: Math.round(actualMs / H * 10) / 10, firstRoundHours: Math.round(firstMs / H * 10) / 10, rounds: r.round || 1,
    met: !(Number(r.tatHours) > 0) || actualMs <= Number(r.tatHours) * H,
    approvedAt: now(), approvedBy: pick(S.me), stageHours, totalHours: Math.round(elapsedMs(r.createdAt, now(), wh()) / H * 10) / 10,
  };
}
async function saveRequest(r, toastMsg) {
  r.updatedAt = now();
  const i = S.requests.findIndex((x) => x.id === r.id);
  if (i >= 0) S.requests[i] = r; else S.requests.push(r);
  renderAll(false);
  try { await S.store.set('requests', r.id, r); if (toastMsg) toast(toastMsg); }
  catch (e) { console.error(e); toast(friendlyError(e), 'crit'); }
}
function friendlyError(e) {
  const code = e && e.code;
  if (code === 'quota_exceeded') return 'Storage is full — remove old requests before adding more.';
  if (code === 'resource_exhausted') return 'Too many changes at once — wait a moment and try again.';
  if (code === 'revoked' || code === 'not_granted') return 'You no longer have access to this workspace.';
  return 'Could not save that change. Check your connection and try again.';
}
async function createRequest(f) {
  const maxNum = S.requests.reduce((m, r) => Math.max(m, Number(r.num) || 0), 0);
  const num = await S.store.nextNumber(maxNum);
  const prefix = (S.settings.prefix || 'BB').toUpperCase();
  const id = `${prefix}-${String(num).padStart(4, '0')}`;
  const ty = typeById(f.typeId) || types()[0]; const first = firstStage(); const start = stages()[0]; const t = now();
  const r = {
    id, num, title: f.title, typeId: ty ? ty.id : null, type: ty ? ty.name : f.typeId, team: ty ? ty.team : 'design', priority: f.priority, dueDate: f.dueDate || null,
    request: f.request, brief: '', refs: f.refs, tatHours: ty ? ty.tatHours : 72,
    requester: pick(S.me), createdAt: t, updatedAt: t, stage: first.id, status: 'open', round: 1,
    assignees: {}, visits: [], deliverables: [], thread: [],
  };
  if (start && start.kind === 'start') r.visits.push({ stage: start.id, enteredAt: t, exitedAt: t, by: pick(S.me), action: 'submitted', round: 1 });
  enterStage(r, first.id);
  await saveRequest(r, `${id} raised — with ${coordinatorNames()} for the brief`);
  return r;
}
/* Steps 4, 5, 7 — the coordinator writes the brief, picks the team and person, and sets the TAT. */
async function actSaveBrief(id, f) {
  const r = clone(getReq(id));
  r.brief = f.brief; if (f.team) r.team = f.team; if (f.tatHours > 0) r.tatHours = f.tatHours;
  r.thread.push(sysMsg('updated the creative brief'));
  await saveRequest(r, 'Brief saved');
}
async function actAssign(id, f) {
  const r = clone(getReq(id)); const st = stageById(r.stage); const w = workStage();
  if (!w) return toast('The flow has no production stage — check Flow.', 'crit');
  const m = activeMembers().find((x) => sameEmail(x.email, f.email));
  if (!m) return toast('Choose who will work on it.', 'crit');
  if (!String(f.brief || '').trim()) return toast('Write the creative brief before assigning.', 'crit');
  if (!(f.tatHours > 0)) return toast('Set the TAT for this task.', 'crit');
  r.brief = f.brief.trim(); r.team = f.team || r.team; r.tatHours = f.tatHours;
  r.assignees ||= {}; r.assignees[w.id] = pick(m); r.assignedAt = now();
  if (st.kind === 'triage') { closeVisit(r, 'assigned'); enterStage(r, w.id); }
  r.thread.push(sysMsg(`briefed and assigned to ${m.name} · TAT ${fmtTat(f.tatHours)}`));
  await saveRequest(r, `${r.id} assigned to ${m.name} · TAT ${fmtTat(f.tatHours)}`);
}
async function actReassign(id, email) {
  const r = clone(getReq(id)); const w = workStage();
  const m = email ? activeMembers().find((x) => sameEmail(x.email, email)) : null;
  if (!m) return toast('That teammate is not on the roster.', 'crit');
  r.assignees ||= {}; r.assignees[w.id] = pick(m); const v = currentVisit(r); if (v && v.stage === w.id) v.assignee = pick(m);
  r.thread.push(sysMsg(`reassigned production to ${m.name}`));
  await saveRequest(r, `Reassigned to ${m.name}`);
}
async function actSetTat(id, hours) {
  const r = clone(getReq(id)); if (!(hours > 0)) return toast('TAT must be more than zero.', 'crit');
  r.tatHours = hours; r.thread.push(sysMsg(`set the TAT to ${fmtTat(hours)}`));
  await saveRequest(r, `TAT set to ${fmtTat(hours)}`);
}
/* Step 8 — the assignee submits; the QC task appears for the coordinator. */
async function actSubmit(id) {
  const r = clone(getReq(id)); const st = stageById(r.stage); const nx = nextStage(r.stage);
  if (!nx) return toast('This is the last stage of the flow.', 'crit');
  if (st.needsFile && !(r.deliverables || []).some((d) => d.round === r.round)) return toast('Add the final file link before submitting.', 'crit');
  closeVisit(r, 'submitted'); enterStage(r, nx.id);
  r.thread.push(sysMsg(`submitted ${st.name} → ${nx.name}`));
  await saveRequest(r, `Submitted — now in ${nx.name}`);
}
/* Steps 9, 10 — approvals; edits loop back to production as a new round. */
async function actApprove(id, note) {
  const r = clone(getReq(id)); const st = stageById(r.stage); const nx = nextStage(r.stage);
  if (!nx) return toast('No stage after this one — check the flow.', 'crit');
  closeVisit(r, 'approved'); enterStage(r, nx.id);
  r.thread.push({ at: now(), by: pick(S.me), kind: 'approval', text: note || `${st.name} approved.` });
  await saveRequest(r, nx.kind === 'end' ? `${r.id} approved — TAT ${fmtDur(productionTat(r))} recorded for ${assigneeOf(r) ? assigneeOf(r).name : 'the assignee'}` : `${st.name} approved — now in ${nx.name}`);
}
async function actRequestEdits(id, note) {
  const r = clone(getReq(id)); const st = stageById(r.stage);
  const target = stageById(st.editsTo) || workStage();
  if (!target) return toast('No stage to send edits to — check the flow.', 'crit');
  r.round = (r.round || 1) + 1;
  closeVisit(r, 'edits'); enterStage(r, target.id);
  r.thread.push({ at: now(), by: pick(S.me), kind: 'edit', text: note });
  await saveRequest(r, `Sent back to ${target.name} (round ${r.round})`);
}
async function actReopen(id) {
  const r = clone(getReq(id)); const target = workStage() || firstStage();
  r.round = (r.round || 1) + 1; delete r.result;
  closeVisit(r, 'reopened'); enterStage(r, target.id);
  r.thread.push(sysMsg(`reopened the request → ${target.name}`));
  await saveRequest(r, `Reopened — now in ${target.name}`);
}
async function actCancel(id, note) {
  const r = clone(getReq(id));
  closeVisit(r, 'cancelled'); r.status = 'cancelled'; r.updatedAt = now();
  r.thread.push({ at: now(), by: pick(S.me), kind: 'system', text: `cancelled the request${note ? ': ' + note : ''}` });
  await saveRequest(r, 'Request cancelled');
}
async function actComment(id, text) { const r = clone(getReq(id)); r.thread.push({ at: now(), by: pick(S.me), kind: 'comment', text }); await saveRequest(r); }
async function actAddDeliverable(id, url, label) {
  const r = clone(getReq(id)); r.deliverables ||= [];
  r.deliverables.push({ url, label: label || url.replace(/^https?:\/\//, '').slice(0, 60), by: pick(S.me), at: now(), round: r.round || 1 });
  r.thread.push(sysMsg(`added a file link${label ? ': ' + label : ''}`));
  await saveRequest(r, 'File link added');
}
async function actEdit(id, f) {
  const r = clone(getReq(id)); const ty = typeById(f.typeId);
  Object.assign(r, { title: f.title, request: f.request, typeId: ty ? ty.id : r.typeId, type: ty ? ty.name : r.type, priority: f.priority, dueDate: f.dueDate || null, refs: f.refs });
  if (ty && stageById(r.stage) && stageById(r.stage).kind === 'triage') { r.team = ty.team; if (!r.assignedAt) r.tatHours = ty.tatHours; }
  r.thread.push(sysMsg('updated the request details'));
  await saveRequest(r, 'Request updated');
}
async function actDelete(id) {
  S.requests = S.requests.filter((r) => r.id !== id); if (S.drawer === id) S.drawer = null; renderAll(false);
  try { await S.store.del('requests', id); toast('Request deleted'); } catch (e) { toast(friendlyError(e), 'crit'); }
}
const getReq = (id) => S.requests.find((r) => r.id === id);

/* ---------------- team / config actions ---------------- */
async function saveMember(m, isNew) {
  const id = lower(m.email);
  const doc = { email: lower(m.email), name: m.name.trim(), roles: m.roles, active: m.active !== false, addedAt: m.addedAt || now(), addedBy: m.addedBy || (S.me && S.me.email) || null };
  if (m.selfRegistered) doc.selfRegistered = true; if (m.authId) doc.authId = m.authId; if (m.emailUnconfirmed) doc.emailUnconfirmed = true;
  const i = S.members.findIndex((x) => x.id === id);
  if (i >= 0) S.members[i] = { ...doc, id }; else S.members.push({ ...doc, id });
  renderAll(false);
  try { await S.store.set('members', id, doc); if (isNew !== 'quiet') toast(isNew ? `${doc.name} added to the team` : 'Teammate updated'); }
  catch (e) { toast(friendlyError(e), 'crit'); }
}
async function removeMember(id) {
  S.members = S.members.filter((m) => m.id !== id); renderAll(false);
  try { await S.store.del('members', id); toast('Removed from the team'); } catch (e) { toast(friendlyError(e), 'crit'); }
}
async function saveFlow(flow) {
  flow.version = (S.flow.version || 0) + 1; flow.updatedAt = now(); flow.updatedBy = S.me && S.me.email;
  S.flow = flow; renderAll(false);
  try { await S.store.set('config', 'flow', flow); toast(`Flow saved (v${flow.version})`); } catch (e) { toast(friendlyError(e), 'crit'); }
}
async function saveSettings(settings, msg = 'Settings saved') {
  S.settings = settings; renderAll(false);
  try { await S.store.set('config', 'settings', settings); toast(msg); } catch (e) { toast(friendlyError(e), 'crit'); }
}
async function removeSamples() {
  const ids = S.requests.filter((r) => r.sample).map((r) => r.id);
  S.requests = S.requests.filter((r) => !r.sample); renderAll(false);
  try { for (const id of ids) await S.store.del('requests', id); toast('Sample requests removed'); }
  catch (e) { toast(friendlyError(e), 'crit'); }
}

/* ---------------- dashboard metrics ---------------- */
function metrics() {
  const open = S.requests.filter((r) => r.status === 'open');
  const done = S.requests.filter((r) => r.status === 'done');
  const cutoff = now() - 30 * D;
  const recentDone = done.filter((r) => (r.completedAt || 0) >= cutoff);
  const avgE2E = recentDone.length ? recentDone.reduce((a, r) => a + totalTat(r), 0) / recentDone.length : null;
  const withResult = recentDone.filter((r) => r.result && r.result.targetHours > 0);
  const tatMet = withResult.length ? withResult.filter((r) => r.result.met).length / withResult.length : null;
  const wip = boardStages().filter((s) => s.kind !== 'end').map((s) => ({ stage: s, count: open.filter((r) => r.stage === s.id).length, breached: open.filter((r) => r.stage === s.id && isBreachedNow(r)).length }));
  const tat = stages().filter((s) => s.kind === 'triage' || s.kind === 'work' || s.kind === 'review').map((s) => {
    const vs = [], lims = []; S.requests.forEach((r) => (r.visits || []).forEach((v) => { if (v.stage === s.id && v.exitedAt) { vs.push(visitElapsed(v)); lims.push(stageLimitMs(s, r)); } }));
    const avg = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
    const limit = s.slaFrom === 'task' ? (lims.length ? lims.reduce((a, b) => a + b, 0) / lims.length : 0) : stageLimitMs(s, null);
    return { stage: s, avg, n: vs.length, limit, limitLabel: s.slaFrom === 'task' ? 'avg TAT' : 'SLA' };
  });
  const weeks = []; const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - start.getDay() + 1 - 7 * 7);
  for (let i = 0; i < 8; i++) { const a = new Date(start); a.setDate(a.getDate() + i * 7); const b = new Date(a); b.setDate(b.getDate() + 7); weeks.push({ label: `${a.getDate()} ${MONTHS[a.getMonth()]}`, from: a.getTime(), to: b.getTime(), raised: 0, approved: 0 }); }
  S.requests.forEach((r) => { weeks.forEach((w) => { if (r.createdAt >= w.from && r.createdAt < w.to) w.raised++; if (r.completedAt && r.completedAt >= w.from && r.completedAt < w.to) w.approved++; }); });
  const weekAgo = now() - 7 * D;
  // Step 11 — per-person performance from stored results
  const people = {};
  const keyOf = (p) => { if (!p) return null; const m = p.email ? S.members.find((x) => sameEmail(x.email, p.email)) : S.members.find((x) => lower(x.name) === lower(p.name)); return m ? lower(m.email) : lower(p.email || p.name); };
  done.forEach((r) => { const res = r.result; if (!res || !res.assignee) return; const k = keyOf(res.assignee); const p = (people[k] ||= { person: res.assignee, team: res.team, done: 0, recent: 0, actual: 0, target: 0, met: 0, rounds: 0, open: 0 }); p.done++; if ((res.approvedAt || r.completedAt || 0) >= cutoff) { p.recent++; p.actual += res.actualHours || 0; p.target += res.targetHours || 0; p.met += res.met ? 1 : 0; p.rounds += res.rounds || 1; } });
  open.forEach((r) => { const a = assigneeOf(r); if (!a) return; const k = keyOf(a); const p = (people[k] ||= { person: a, team: r.team, done: 0, recent: 0, actual: 0, target: 0, met: 0, rounds: 0, open: 0 }); p.open++; });
  membersWithRole('design').concat(membersWithRole('video')).forEach((m) => { const k = keyOf(m); if (!people[k]) people[k] = { person: pick(m), team: hasRole(m, 'video') ? 'video' : 'design', done: 0, recent: 0, actual: 0, target: 0, met: 0, rounds: 0, open: 0 }; });
  const performance = Object.values(people).map((p) => ({ ...p, avgActual: p.recent ? p.actual / p.recent : null, avgTarget: p.recent ? p.target / p.recent : null, onTime: p.recent ? p.met / p.recent : null, avgRounds: p.recent ? p.rounds / p.recent : null })).sort((a, b) => b.recent - a.recent || b.open - a.open || a.person.name.localeCompare(b.person.name));
  return {
    open: open.length, raisedThisWeek: S.requests.filter((r) => r.createdAt >= weekAgo).length, approvedThisWeek: done.filter((r) => (r.completedAt || 0) >= weekAgo).length,
    mine: S.requests.filter((r) => needsMe(r)).length, breached: open.filter(isBreachedNow).length, overdue: open.filter(isOverdue).length,
    avgE2E, recentDoneN: recentDone.length, tatMet, tatMetN: withResult.length, wip, tat, weeks, performance,
  };
}
function activityFeed(limit = 12) {
  const ev = [];
  S.requests.forEach((r) => {
    ev.push({ at: r.createdAt, by: r.requester, r, icon: 'plus', cls: 'accent', text: `raised <b>${esc(r.id)}</b> ${esc(r.title)}` });
    (r.visits || []).forEach((v) => { if (v.exitedAt && v.action && v.action !== 'submitted' || (v.action === 'submitted' && stageById(v.stage) && stageById(v.stage).kind === 'work')) { const st = stageById(v.stage); const map = { assigned: [`briefed and assigned <b>${esc(r.id)}</b>`, 'clipboard', ''], submitted: [`submitted <b>${esc(r.id)}</b> for QC`, 'send', ''], approved: [st && st.kind === 'review' && nextStage(v.stage) && nextStage(v.stage).kind === 'end' ? `gave final approval on <b>${esc(r.id)}</b>` : `passed <b>${esc(st ? st.name : v.stage)}</b> on <b>${esc(r.id)}</b>`, 'check', 'good'], edits: [`sent <b>${esc(r.id)}</b> back for changes (round ${(v.round || 1) + 1})`, 'rotate', 'crit'], cancelled: [`cancelled <b>${esc(r.id)}</b>`, 'x', ''], reopened: [`reopened <b>${esc(r.id)}</b>`, 'rotate', ''] }[v.action]; if (map) ev.push({ at: v.exitedAt, by: v.by, r, icon: map[1], cls: map[2], text: map[0] }); } });
    (r.deliverables || []).forEach((d) => ev.push({ at: d.at, by: d.by, r, icon: 'link', cls: '', text: `added a file on <b>${esc(r.id)}</b>: ${esc(d.label)}` }));
    (r.thread || []).forEach((m) => { if (m.kind === 'comment') ev.push({ at: m.at, by: m.by, r, icon: 'message', cls: '', text: `commented on <b>${esc(r.id)}</b>: ${esc(m.text.slice(0, 80))}${m.text.length > 80 ? '…' : ''}` }); });
  });
  return ev.sort((a, b) => b.at - a.at).slice(0, limit);
}

/* ---------------- shared components ---------------- */
function stageChip(st) { return st ? `<span class="chip stage" style="--stage:${attr(themed(st.color))}"><span class="dot"></span>${esc(st.name)}</span>` : '<span class="chip">—</span>'; }
function teamChip(id) { return id ? `<span class="chip outline">${esc(teamName(id).replace(' team', ''))}</span>` : ''; }
function prioHtml(p) { const k = lower(p); return `<span class="prio p-${attr(k)}"><i></i>${esc(p || 'Normal')}</span>`; }
/* Who the ball is with, per stage kind. */
function personFor(r) {
  const st = stageById(r.stage); if (!st) return null;
  if (st.kind === 'triage') { const cs = membersWithRole(st.role); return cs.length === 1 ? pick(cs[0]) : cs.length ? { name: roleName(st.role) } : null; }
  if (st.kind === 'work') return (r.assignees || {})[st.id] || null;
  if (st.kind === 'review') { const specs = st.reviewers || []; if (specs.includes('requester')) return r.requester || null; const role = (specs.find((s) => String(s).startsWith('role:')) || '').slice(5); const cs = membersWithRole(role); return cs.length === 1 ? pick(cs[0]) : cs.length ? { name: roleName(role) } : null; }
  return r.requester || null;
}
function slaLine(r, compact = false) {
  const s = slaState(r); const st = stageById(r.stage);
  if (r.status !== 'open') { const res = r.result; return `<div class="sla-line"><span>${r.status === 'done' ? (res ? `TAT ${fmtDur((res.actualHours || 0) * H)} / ${fmtTat(res.targetHours)}` : 'Approved') : 'Cancelled'}</span>${res ? `<span class="${res.met ? 'good' : 'crit'}" style="font-weight:600;color:var(--${res.met ? 'good' : 'crit'})">${res.met ? 'on time' : 'late'}</span>` : ''}</div>`; }
  if (s.state === 'none') return `<div class="meter none"></div><div class="sla-line"><span>${compact ? 'In stage' : 'In ' + esc(st ? st.name : '')}</span><span class="t">${fmtDur(s.elapsed)} · no limit</span></div>`;
  const pct = clamp(s.ratio * 100, 0, 100); const isTat = st && st.slaFrom === 'task';
  const label = s.state === 'crit' ? `<span class="crit">${isTat ? 'TAT' : 'SLA'} over by ${fmtDur(-s.remaining)}</span>` : s.state === 'warn' ? `<span class="warn">${fmtDur(s.remaining)} left</span>` : `<span>${fmtDur(s.remaining)} left</span>`;
  return `<div class="meter ${s.state === 'ok' ? '' : s.state}"><i style="width:${pct.toFixed(1)}%"></i></div><div class="sla-line"><span class="t">${fmtDur(s.elapsed)} / ${isTat ? fmtTat(r.tatHours) : st.slaHours + 'h'}</span>${label}</div>`;
}
function cardHtml(r) {
  const st = stageById(r.stage); const a = personFor(r); const breached = isBreachedNow(r); const due = fmtDue(r.dueDate, r.status);
  return `<article class="card ${breached ? 'breached' : ''}" data-open="${attr(r.id)}" data-flip-id="${attr(r.id)}" style="--stage:${attr(themed(st ? st.color : '#888'))}" tabindex="0" role="button" aria-label="${attr(r.id + ' ' + r.title)}">
    <div class="c-top"><span class="c-id">${esc(r.id)}</span>${r.round > 1 ? `<span class="round" title="Revision round">R${r.round}</span>` : ''}${r.sample ? '<span class="chip tiny" title="Sample data">sample</span>' : ''}<span style="flex:1"></span>${breached ? `<span class="breach-flag pulse">${ic('alert')}${st && st.slaFrom === 'task' ? 'TAT' : 'SLA'}</span>` : ''}</div>
    <div class="c-title">${esc(r.title)}</div>
    <div class="c-meta"><span class="chip outline">${esc(r.type)}</span>${prioHtml(r.priority)}<span class="tiny ${due.cls}" style="margin-left:auto">${esc(due.text)}</span></div>
    ${slaLine(r, true)}
    <div class="c-foot">${whoHtml(a, 'sm', st && st.kind === 'triage' ? 'No coordinator yet' : 'Unassigned')}<span class="tiny muted" title="Raised by ${attr(r.requester ? r.requester.name : '')}">by ${esc(firstName(r.requester) || '?')}</span></div>
  </article>`;
}
function emptyHtml(icon, text) { return `<div class="empty">${ic(icon)}${esc(text)}</div>`; }

/* ---------------- charts (inline SVG) ---------------- */
function chartBarsH(rows, opts = {}) {
  const w = 420, rowH = 30, left = 96, right = 96, top = 4; const h = top + rows.length * rowH + 4;
  const max = Math.max(1, ...rows.map((r) => r.value)); const plotW = w - left - right;
  const ticks = niceTicks(max, 4);
  let out = `<div class="chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${attr(opts.aria || '')}">`;
  ticks.forEach((t) => { const x = left + (t / ticks[ticks.length - 1]) * plotW; out += `<line class="grid-line" x1="${x}" y1="${top}" x2="${x}" y2="${h - 4}"/>`; if (t > 0) out += `<text x="${x}" y="${h + 10}" text-anchor="middle">${t}</text>`; });
  rows.forEach((r, i) => {
    const y = top + i * rowH + 6, bw = (r.value / ticks[ticks.length - 1]) * plotW, bh = 18;
    out += `<text class="lbl" x="${left - 10}" y="${y + 13}" text-anchor="end">${esc(r.label)}</text>`;
    out += `<rect class="hit" x="${left}" y="${y - 4}" width="${plotW}" height="${bh + 8}" tabindex="0" data-tip="${attr(r.tip || r.label + ': ' + r.value)}"></rect>`;
    out += `<path class="bar" d="${barPath(left, y, Math.max(bw, r.value ? 3 : 0), bh, 4)}" fill="${attr(r.color)}"/>`;
    out += `<text class="val" x="${left + Math.max(bw, r.value ? 3 : 0) + 8}" y="${y + 13}">${r.value}${r.extra ? ` <tspan style="fill:var(--crit);font-weight:600">${esc(r.extra)}</tspan>` : ''}</text>`;
  });
  out += `<line class="axis" x1="${left}" y1="${top}" x2="${left}" y2="${h - 4}"/></svg></div>`;
  return out;
}
function barPath(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); if (w <= 0) return ''; return `M${x},${y} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${h - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - r} z`; }
function niceTicks(max, n) { if (max <= 4) return Array.from({ length: Math.ceil(max) + 1 }, (_, i) => i); if (max <= 10) { const t = []; for (let v = 0; v <= Math.ceil(max / 2) * 2; v += 2) t.push(v); return t; } const raw = max / n; const mag = Math.pow(10, Math.floor(Math.log10(raw))); const norm = raw / mag; const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag; const top = Math.ceil(max / step) * step; const t = []; for (let v = 0; v <= top + 1e-9; v += step) t.push(Math.round(v * 100) / 100); return t; }
function chartBullet(rows) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.avg || 0, r.limit || 0))) * 1.12;
  return `<div class="stack" style="gap:2px">${rows.map((r) => {
    const over = r.limit > 0 && r.avg != null && r.avg > r.limit;
    const fill = r.avg == null ? 0 : (r.avg / max) * 100; const tgt = r.limit ? (r.limit / max) * 100 : null;
    const tip = `${r.stage.name}: avg ${r.avg == null ? 'no data' : fmtDur(r.avg)}${r.limit ? ` · ${r.limitLabel} ${fmtDur(r.limit)}` : ''} · ${plural(r.n, 'completed visit')}`;
    return `<div class="bullet-row" data-tip="${attr(tip)}" tabindex="0"><div class="b-label" style="--c:${attr(themed(r.stage.color))}"><i></i>${esc(r.stage.name)}</div><div class="bullet-track"><div class="fill ${over ? 'over' : ''}" data-w="${fill.toFixed(1)}"></div>${tgt != null ? `<div class="tgt" style="left:${tgt.toFixed(1)}%" title="${attr(r.limitLabel + ' ' + fmtDur(r.limit))}"></div>` : ''}</div><div class="b-val ${over ? 'over' : ''}"><b>${r.avg == null ? '—' : fmtDur(r.avg)}</b>${r.limit ? ` <span class="muted">/ ${fmtDur(r.limit)}</span>` : ''}</div></div>`;
  }).join('')}</div>`;
}
function chartLines(weeks) {
  const w = 460, h = 170, left = 30, right = 50, top = 12, bottom = 26; const plotW = w - left - right, plotH = h - top - bottom;
  const series = [{ key: 'raised', name: 'Raised', color: 'var(--series-1)' }, { key: 'approved', name: 'Approved', color: 'var(--series-2)' }];
  const max = Math.max(1, ...weeks.flatMap((wk) => [wk.raised, wk.approved])); const ticks = niceTicks(max, 3); const top_ = ticks[ticks.length - 1];
  const x = (i) => left + (i / (weeks.length - 1)) * plotW; const y = (v) => top + plotH - (v / top_) * plotH;
  let out = `<div class="chart chart-lines"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Requests raised and approved per week">`;
  ticks.forEach((t) => { out += `<line class="grid-line" x1="${left}" y1="${y(t)}" x2="${w - right}" y2="${y(t)}"/><text x="${left - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`; });
  weeks.forEach((wk, i) => { if (i % 2 === 0 || i === weeks.length - 1) out += `<text x="${x(i)}" y="${h - 6}" text-anchor="middle">${esc(wk.label)}</text>`; });
  const lastVals = series.map((s) => weeks[weeks.length - 1][s.key]);
  const collide = Math.abs(y(lastVals[0]) - y(lastVals[1])) < 12;
  series.forEach((s, si) => {
    const pts = weeks.map((wk, i) => `${x(i)},${y(wk[s.key])}`);
    out += `<path class="area" d="M${x(0)},${y(0)} L${pts.join(' L')} L${x(weeks.length - 1)},${y(0)} Z" fill="${s.color}"/>`;
    out += `<polyline class="line" points="${pts.join(' ')}" stroke="${s.color}"/>`;
    const last = lastVals[si];
    out += `<circle class="dot" cx="${x(weeks.length - 1)}" cy="${y(last)}" r="4" fill="${s.color}"/>`;
    if (!collide) out += `<text class="val" x="${x(weeks.length - 1) + 8}" y="${y(last) + 4}">${last} ${esc(s.name.toLowerCase())}</text>`;
  });
  if (collide) out += `<text class="val" x="${x(weeks.length - 1) + 8}" y="${y(lastVals[0]) + 4}">${lastVals[0]} raised · ${lastVals[1]} approved</text>`;
  out += `<line class="crosshair" data-cross x1="0" y1="${top}" x2="0" y2="${top + plotH}"/>`;
  weeks.forEach((wk, i) => { const cw = plotW / (weeks.length - 1); out += `<rect class="hit" x="${x(i) - cw / 2}" y="${top}" width="${cw}" height="${plotH}" data-cross-x="${x(i)}" data-tip-rows="${attr(JSON.stringify([{ c: 'var(--series-1)', l: 'Raised', v: wk.raised }, { c: 'var(--series-2)', l: 'Approved', v: wk.approved }]))}" data-tip="Week of ${attr(wk.label)}" tabindex="0"></rect>`; });
  out += `</svg><div class="legend">${series.map((s) => `<span class="key" style="--c:${s.color}"><i></i>${esc(s.name)}</span>`).join('')}</div></div>`;
  return out;
}

/* ---------------- views ---------------- */
function viewDashboard() {
  const m = metrics(); const first = firstName(S.me) || 'there';
  const hour = new Date().getHours(); const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const attention = S.requests.filter((r) => r.status === 'open' && (isBreachedNow(r) || isOverdue(r))).sort((a, b) => (slaState(b).ratio || 0) - (slaState(a).ratio || 0)).slice(0, 8);
  const kpi = (label, value, foot, cls = '', count = true) => `<div class="panel kpi ${cls}" data-anim><div class="k-label">${esc(label)}</div><div class="k-value" ${count && typeof value === 'number' ? `data-count="${value}"` : ''}>${typeof value === 'number' ? value : esc(value)}</div><div class="k-foot">${foot}</div></div>`;
  const perf = m.performance;
  return `<div class="page-head" data-anim><div><h1>${greet}, ${esc(first)}</h1><p class="lede">${m.mine ? `<b>${plural(m.mine, 'task')}</b> waiting on you` : 'Nothing is waiting on you'} · ${plural(m.open, 'open request')} in progress${m.breached ? ` · <span style="color:var(--crit);font-weight:600">${m.breached} over SLA / TAT</span>` : ''}</p></div>
    <div class="page-actions"><button class="btn primary" data-action="new">${ic('plus')}New request</button></div></div>
  <div class="stack">
    <div class="grid kpis">
      ${kpi('Open requests', m.open, `${ic('plus', 'sm')} ${m.raisedThisWeek} raised this week`)}
      ${kpi('Waiting on you', m.mine, m.mine ? `<a href="#/queue">Open your queue ${ic('arrowRight', 'sm')}</a>` : 'You are all caught up', m.mine ? 'mine' : '')}
      ${kpi('Over SLA / TAT now', m.breached, m.overdue ? `${ic('calendar', 'sm')} ${plural(m.overdue, 'request')} past due date` : 'Open stages past their limit', m.breached ? 'attention' : '')}
      ${kpi('Avg end-to-end', m.avgE2E == null ? '—' : fmtDur(m.avgE2E), m.recentDoneN ? `${plural(m.recentDoneN, 'approval')} in the last 30 days` : 'No approvals in the last 30 days', '', false)}
      ${kpi('TAT met', m.tatMet == null ? '—' : Math.round(m.tatMet * 100) + '%', m.tatMetN ? `of ${plural(m.tatMetN, 'task')} delivered within their TAT` : 'No completed tasks yet', '', false)}
    </div>
    <div class="grid charts">
      <div class="panel" data-anim><div class="panel-head"><div><h2>Where work is sitting</h2><div class="sub">Open requests by stage · red count is over its limit</div></div></div><div class="panel-body">${m.wip.some((x) => x.count) ? chartBarsH(m.wip.map((x) => ({ label: x.stage.name, value: x.count, color: themed(x.stage.color), extra: x.breached ? `· ${x.breached} over` : '', tip: `${x.stage.name}: ${plural(x.count, 'open request')}${x.breached ? `, ${x.breached} over limit` : ''}` })), { aria: 'Open requests by stage' }) : emptyHtml('board', 'No open requests right now')}</div></div>
      <div class="panel" data-anim><div class="panel-head"><div><h2>Turnaround vs limit</h2><div class="sub">Average time per stage · marker is the SLA, or the average TAT set for production</div></div></div><div class="panel-body">${chartBullet(m.tat)}</div></div>
      <div class="panel" data-anim><div class="panel-head"><div><h2>Throughput</h2><div class="sub">Requests raised and approved per week, last 8 weeks</div></div></div><div class="panel-body">${chartLines(m.weeks)}</div></div>
    </div>
    <div class="panel" data-anim><div class="panel-head"><div><h2>Team turnaround</h2><div class="sub">Per person — stored on every task at final approval · last 30 days</div></div></div><div class="table-wrap" style="padding:6px 6px 8px"><table class="tbl"><thead><tr><th>Person</th><th>Team</th><th>In hand</th><th>Approved (30d)</th><th>Avg TAT</th><th>Avg target</th><th>On time</th><th>Avg rounds</th><th>All time</th></tr></thead><tbody>
      ${perf.length ? perf.map((p) => `<tr><td>${whoHtml(p.person)}</td><td>${teamChip(p.team)}</td><td class="num">${p.open || '—'}</td><td class="num">${p.recent || '—'}</td><td class="num">${p.avgActual == null ? '—' : fmtDur(p.avgActual * H)}</td><td class="num muted">${p.avgTarget == null ? '—' : fmtDur(p.avgTarget * H)}</td><td>${p.onTime == null ? '<span class="muted">—</span>' : `<span class="chip ${p.onTime >= 0.8 ? 'good' : p.onTime >= 0.5 ? 'warn' : 'crit'}">${Math.round(p.onTime * 100)}%</span>`}</td><td class="num">${p.avgRounds == null ? '—' : p.avgRounds.toFixed(1)}</td><td class="num muted">${p.done || '—'}</td></tr>`).join('') : `<tr><td colspan="9">${emptyHtml('award', 'No completed tasks yet')}</td></tr>`}
    </tbody></table></div></div>
    <div class="grid two">
      <div class="panel" data-anim><div class="panel-head"><div><h2>Needs attention</h2><div class="sub">Over SLA / TAT, or past the due date</div></div>${attention.length ? `<span class="badge crit">${attention.length}</span>` : ''}</div><div class="panel-body" style="padding-top:6px">${attention.length ? `<div class="list">${attention.map((r) => { const s = slaState(r); const st = stageById(r.stage); const due = fmtDue(r.dueDate, r.status); return `<div class="list-item" data-open="${attr(r.id)}">${personHtml(personFor(r), 'sm')}<div class="li-main"><div class="li-title">${esc(r.id)} · ${esc(r.title)}</div><div class="li-sub">${esc(st ? st.name : '')} · ${s.state === 'crit' ? `<span style="color:var(--crit);font-weight:600">over by ${fmtDur(-s.remaining)}</span>` : `in stage ${fmtDur(s.elapsed)}`}${isOverdue(r) ? ` · <span style="color:var(--crit)">${esc(due.text)}</span>` : ''}</div></div>${stageChip(st)}</div>`; }).join('')}</div>` : emptyHtml('check', 'Everything is inside its limits and due dates')}</div></div>
      <div class="panel" data-anim><div class="panel-head"><div><h2>Recent activity</h2><div class="sub">Across every request</div></div></div><div class="panel-body" style="padding-top:6px">${activityFeed(10).map((e) => `<div class="act" data-open="${attr(e.r.id)}" style="cursor:pointer"><div class="ico ${e.cls}">${ic(e.icon, 'sm')}</div><div class="txt"><b>${esc(e.by ? e.by.name : 'Someone')}</b> ${e.text}</div><div class="when">${fmtRel(e.at)}</div></div>`).join('') || emptyHtml('message', 'No activity yet')}</div></div>
    </div>
  </div>`;
}
function filteredRequests() {
  const q = lower(S.q); const f = S.filters;
  return S.requests.filter((r) => {
    if (q && !(lower(r.id).includes(q) || lower(r.title).includes(q) || lower(r.type).includes(q) || lower(r.requester && r.requester.name).includes(q) || lower(r.request).includes(q) || lower(r.brief).includes(q) || lower((assigneeOf(r) || {}).name).includes(q))) return false;
    if (f.type && r.typeId !== f.type && r.type !== f.type) return false;
    if (f.team && r.team !== f.team) return false;
    if (f.prio && r.priority !== f.prio) return false;
    if (f.stage && r.stage !== f.stage) return false;
    if (f.mine && !(needsMe(r) || isRequester(r) || Object.values(r.assignees || {}).some(isMe))) return false;
    if (f.breached && !isBreachedNow(r)) return false;
    return true;
  });
}
function filtersHtml() {
  const f = S.filters;
  return `<div class="board-tools" data-anim>
    <div class="seg" role="tablist"><button role="tab" class="${S.boardMode === 'board' ? 'active' : ''}" data-mode="board">${ic('board', 'sm')}Board</button><button role="tab" class="${S.boardMode === 'list' ? 'active' : ''}" data-mode="list">${ic('list', 'sm')}List</button></div>
    <select class="input sm" data-filter="team" aria-label="Filter by team" style="width:auto"><option value="">Both teams</option>${TEAMS.map((t) => `<option value="${attr(t.id)}" ${f.team === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
    <select class="input sm" data-filter="type" aria-label="Filter by type" style="width:auto"><option value="">All types</option>${types().map((t) => `<option value="${attr(t.id)}" ${f.type === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
    <select class="input sm" data-filter="prio" aria-label="Filter by priority" style="width:auto"><option value="">All priorities</option>${S.settings.priorities.map((t) => `<option ${f.prio === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
    ${S.boardMode === 'list' ? `<select class="input sm" data-filter="stage" aria-label="Filter by stage" style="width:auto"><option value="">All stages</option>${stages().filter((s) => s.kind !== 'start').map((s) => `<option value="${attr(s.id)}" ${f.stage === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : ''}
    <button class="btn sm ${f.mine ? 'primary' : ''}" data-toggle="mine">${ic('user', 'sm')}Mine</button>
    <button class="btn sm ${f.breached ? 'primary' : ''}" data-toggle="breached">${ic('alert', 'sm')}Over limit</button>
    <span class="spacer"></span>
    <span class="small muted">${plural(filteredRequests().length, 'request')}</span>
  </div>`;
}
function viewBoard() {
  const rs = filteredRequests();
  const head = `<div class="page-head" data-anim><div><h1>Requests</h1><p class="lede">Every requirement moving through ${stages().filter((s) => s.kind !== 'start' && s.kind !== 'end').map((s) => s.name).join(' → ')}.</p></div><div class="page-actions"><button class="btn primary" data-action="new">${ic('plus')}New request</button></div></div>`;
  if (S.boardMode === 'list') return head + filtersHtml() + viewList(rs);
  const cols = boardStages().map((st) => {
    let items = rs.filter((r) => r.stage === st.id && r.status === 'open').sort((a, b) => (slaState(b).ratio || 0) - (slaState(a).ratio || 0));
    if (st.kind === 'end') items = rs.filter((r) => r.stage === st.id && r.status === 'done').sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)).slice(0, 12);
    const breached = items.filter(isBreachedNow).length;
    const lim = st.slaFrom === 'task' ? 'TAT per task' : st.slaHours ? `SLA ${st.slaHours}h` : '';
    return `<section class="col" style="--stage:${attr(themed(st.color))}" data-anim><div class="col-head"><span class="swatch"></span><h3>${esc(st.name)}</h3>${lim ? `<span class="sla">${esc(lim)}</span>` : ''}<span class="count">${items.length}${breached ? ` <span style="color:var(--crit)">· ${breached}!</span>` : ''}</span></div><div class="col-body">${items.map(cardHtml).join('') || `<div class="col-empty">${st.kind === 'end' ? 'Nothing approved yet' : 'Nothing here'}</div>`}</div></section>`;
  }).join('');
  const cancelled = rs.filter((r) => r.status === 'cancelled').length;
  return head + filtersHtml() + `<div class="board" id="board">${cols}</div>${cancelled ? `<p class="small muted" style="margin-top:8px">${plural(cancelled, 'cancelled request')} hidden from the board — switch to List to see them.</p>` : ''}`;
}
function viewList(rs) {
  const k = S.sort.key, dir = S.sort.dir === 'asc' ? 1 : -1;
  const val = (r) => ({ id: r.num, title: lower(r.title), type: r.type, team: r.team, priority: S.settings.priorities.indexOf(r.priority), stage: stageIdx(r.stage), assignee: lower((assigneeOf(r) || {}).name), tat: r.tatHours || 0, inStage: slaState(r).elapsed, sla: slaState(r).ratio ?? -1, due: r.dueDate || '9999', updatedAt: r.updatedAt })[k];
  const sorted = [...rs].sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
  const th = (key, label) => `<th><button data-sort="${key}">${esc(label)}${k === key ? ic(S.sort.dir === 'asc' ? 'up' : 'down', 'sm') : ''}</button></th>`;
  return `<div class="panel" data-anim><div class="table-wrap"><table class="tbl"><thead><tr>${th('id', 'ID')}${th('title', 'Title')}${th('type', 'Type')}${th('stage', 'Stage')}${th('assignee', 'Assignee')}${th('tat', 'TAT')}${th('inStage', 'In stage')}${th('sla', 'Limit')}${th('due', 'Due')}${th('updatedAt', 'Updated')}</tr></thead><tbody>
    ${sorted.map((r) => { const st = stageById(r.stage); const s = slaState(r); const due = fmtDue(r.dueDate, r.status); return `<tr class="link" data-open="${attr(r.id)}"><td class="num muted">${esc(r.id)}</td><td><b>${esc(r.title)}</b>${r.round > 1 ? ` <span class="round">R${r.round}</span>` : ''}${r.status === 'cancelled' ? ' <span class="chip">cancelled</span>' : ''}<div class="tiny muted">${esc(r.priority)} · by ${esc(r.requester ? r.requester.name : '')}</div></td><td>${esc(r.type)}<div class="tiny muted">${esc(teamName(r.team).replace(' team', ''))}</div></td><td>${stageChip(st)}</td><td>${whoHtml(assigneeOf(r))}</td><td class="num">${fmtTat(r.tatHours)}</td><td class="num">${r.status === 'open' ? fmtDur(s.elapsed) : r.result ? fmtDur(r.result.actualHours * H) : '—'}</td><td>${r.status === 'done' && r.result ? `<span class="chip ${r.result.met ? 'good' : 'crit'}">${r.result.met ? 'on time' : 'late'}</span>` : s.state === 'crit' ? `<span class="breach-flag">${ic('alert')}${fmtDur(-s.remaining)} over</span>` : s.state === 'warn' ? `<span class="chip warn">${fmtDur(s.remaining)} left</span>` : s.state === 'ok' ? `<span class="chip good">on track</span>` : '<span class="muted">—</span>'}</td><td class="${due.cls}">${esc(due.text)}</td><td class="muted small">${fmtRel(r.updatedAt)}</td></tr>`; }).join('') || `<tr><td colspan="10">${emptyHtml('search', 'No requests match these filters')}</td></tr>`}
  </tbody></table></div></div>`;
}
function viewQueue() {
  const open = S.requests.filter((r) => r.status === 'open');
  const by = (kind, pred) => open.filter((r) => needsMe(r) === kind && (!pred || pred(r)));
  const triage = by('triage'), work = by('work');
  const reviews = open.filter((r) => needsMe(r) === 'review'); const isFinal = (r) => { const st = stageById(r.stage); const nx = nextStage(r.stage); return st && nx && nx.kind === 'end'; };
  const qc = reviews.filter((r) => !isFinal(r)), approvals = reviews.filter(isFinal);
  const raised = open.filter((r) => isRequester(r) && needsMe(r) !== 'review');
  const item = (r) => { const st = stageById(r.stage); const s = slaState(r); return `<div class="list-item" data-open="${attr(r.id)}"><div class="li-main"><div class="li-title">${esc(r.id)} · ${esc(r.title)}</div><div class="li-sub">${esc(r.type)} · ${esc(r.priority)} · by ${esc(r.requester ? r.requester.name : '')} · in ${esc(st ? st.name : '')} for ${fmtDur(s.elapsed)}${s.state === 'crit' ? ` · <span style="color:var(--crit);font-weight:600">over limit</span>` : s.state === 'warn' ? ` · <span style="color:var(--warn);font-weight:600">${fmtDur(s.remaining)} left</span>` : ''}</div></div><div class="li-side">${stageChip(st)}</div></div>`; };
  const sec = (title, sub, items, icon) => `<div class="panel" data-anim><div class="panel-head"><div><h2>${esc(title)}</h2><div class="sub">${esc(sub)}</div></div><span class="badge" style="${items.length ? '' : 'background:var(--surface-3);color:var(--ink-3)'}">${items.length}</span></div><div class="panel-body" style="padding-top:6px">${items.length ? `<div class="list">${items.map(item).join('')}</div>` : emptyHtml(icon, 'Nothing here right now')}</div></div>`;
  const sections = [];
  if (isCoordinator() || isAdmin()) sections.push(sec('To brief & assign', 'New requests waiting for a brief, an owner and a TAT', triage, 'clipboard'));
  sections.push(sec('Assigned to me', 'Tasks in production with you', work, 'inbox'));
  if (isCoordinator() || isAdmin()) sections.push(sec('To QC', 'Submitted work waiting for your check', qc, 'eye'));
  sections.push(sec('Waiting for my approval', isAdmin() ? 'Final approvals — you or the requester can approve' : 'Your requests that passed QC — approve or ask for changes', approvals, 'check'));
  sections.push(sec('My open requests', 'Requirements you raised, still in progress', raised, 'file'));
  return `<div class="page-head" data-anim><div><h1>My queue</h1><p class="lede">What is waiting on you, ${esc(firstName(S.me))} — ${roles().filter((r) => hasRole(S.me, r.id)).map((r) => r.name).join(', ') || 'no role yet'}.</p></div><div class="page-actions"><button class="btn primary" data-action="new">${ic('plus')}New request</button></div></div>
  <div class="grid two">${sections.join('')}</div>`;
}
function viewTeam() {
  const admin = canManageTeam(); const admins = S.members.filter((m) => hasRole(m, 'admin') && m.active !== false);
  const rows = [...S.members].sort((a, b) => (a.active === false) - (b.active === false) || a.name.localeCompare(b.name));
  const unconfirmed = S.members.filter((m) => m.emailUnconfirmed).length;
  return `<div class="page-head" data-anim><div><h1>Team</h1><p class="lede">Who does what in the relay. ${admin ? `Anyone with a ${esc((S.settings.allowedDomains || []).map((d) => '@' + d).join(' / '))} email can sign in and raise requests; give people their team roles here.` : `Managed by ${esc(admins.map((a) => a.name).join(', ') || 'the admin')}.`}</p></div>
    ${admin ? `<div class="page-actions"><button class="btn primary" data-action="add-member">${ic('plus')}Add teammate</button></div>` : ''}</div>
  <div class="stack">
    ${admin && unconfirmed ? `<div class="callout warn" data-anim><b>${plural(unconfirmed, 'email is a placeholder', 'emails are placeholders')}</b> taken from the team tracker — edit each person and confirm their real work email so they can sign in.</div>` : ''}
    <div class="panel" data-anim><div class="table-wrap"><table class="tbl"><thead><tr><th>Teammate</th><th>Email</th><th>Roles</th><th>Status</th><th>Added</th>${admin ? '<th></th>' : ''}</tr></thead><tbody>
      ${rows.map((m) => `<tr><td><span class="who">${personHtml(m)}<span class="name">${esc(m.name)}${isMe(m) ? ' <span class="chip accent">you</span>' : ''}</span></span></td><td class="mono small">${esc(m.email)}${m.emailUnconfirmed ? ' <span class="chip warn">confirm</span>' : ''}${m.selfRegistered ? ' <span class="chip">self-signed up</span>' : ''}</td><td><div class="row wrap" style="gap:6px">${(m.roles || []).map((r) => `<span class="role-chip" style="--c:${attr(roleColor(r))}"><i></i>${esc(roleName(r))}</span>`).join('') || '<span class="muted">—</span>'}</div></td><td>${m.active === false ? '<span class="chip">Inactive</span>' : '<span class="chip good">Active</span>'}</td><td class="muted small">${m.addedAt ? fmtDate(m.addedAt) : '—'}</td>${admin ? `<td class="actions"><button class="btn ghost sm icon-only" data-action="edit-member" data-id="${attr(m.id)}" aria-label="Edit ${attr(m.name)}">${ic('edit', 'sm')}</button>${sameEmail(m.email, APP.ownerEmail) ? '' : `<button class="btn ghost sm icon-only" data-action="remove-member" data-id="${attr(m.id)}" aria-label="Remove ${attr(m.name)}">${ic('trash', 'sm')}</button>`}</td>` : ''}</tr>`).join('') || `<tr><td colspan="6">${emptyHtml('users', 'No teammates yet')}</td></tr>`}
    </tbody></table></div></div>
    <div class="grid two">
      <div class="panel" data-anim><div class="panel-head"><div><h2>Roles</h2><div class="sub">What each role can do in the relay</div></div>${admin ? `<button class="btn sm" data-action="add-role">${ic('plus', 'sm')}Add role</button>` : ''}</div><div class="panel-body" style="padding-top:8px"><div class="list">${roles().map((r) => `<div class="list-item" style="cursor:default"><span class="role-chip" style="--c:${attr(r.color)}"><i></i>${esc(r.name)}</span><div class="li-main"><div class="li-sub" style="white-space:normal">${esc(r.desc || '')} · ${plural(membersWithRole(r.id).length, 'member')}</div></div>${admin && !['admin', 'requester', 'coordinator', 'design', 'video'].includes(r.id) && !stages().some((s) => s.role === r.id) ? `<button class="btn ghost sm icon-only" data-action="remove-role" data-id="${attr(r.id)}" aria-label="Remove role">${ic('trash', 'sm')}</button>` : ''}</div>`).join('')}</div></div></div>
      <div class="panel" data-anim><div class="panel-head"><div><h2>How access works</h2></div></div><div class="panel-body"><div class="stack" style="gap:10px;font-size:13.5px;color:var(--ink-2)">
        <p><b>1. Anyone at Brick&amp;Bolt can raise a request.</b> A ${esc((S.settings.allowedDomains || []).map((d) => '@' + d).join(' / '))} email signs in on first use and gets the Requester role automatically.</p>
        <p><b>2. Every request goes to the coordinator</b> (${esc(coordinatorNames())}), who writes the brief with the requester, assigns it to the design or video team and sets the TAT.</p>
        <p><b>3. Approvals.</b> The coordinator does QC; then either the person who raised it or an admin gives final approval — whichever comes first.</p>
        <p class="muted small">Sign-in is a roster check, not a password. ${S.mode === 'live' ? 'The real access gate is who this page is shared with.' : 'In demo mode everything stays in this browser.'}</p></div></div></div>
    </div>
  </div>`;
}
function stageOwnerText(s, r) {
  if (s.kind === 'start') return `Raised by <b>anyone</b>`;
  if (s.kind === 'triage') return `Owned by <b>${esc(roleName(s.role))}</b>`;
  if (s.kind === 'work') return `Owned by <b>${esc(s.role === 'team' ? 'assigned team member' : roleName(s.role))}</b>`;
  if (s.kind === 'review') return `Approved by <b>${esc((s.reviewers || []).map((sp) => sp === 'requester' ? 'requester' : roleName(sp.slice(5))).join(' or '))}</b>`;
  return 'Terminal';
}
function flowDiagram(flow) {
  const sts = flow.stages;
  return `<div class="flow-diagram">${sts.map((s) => { const loops = s.kind === 'review' && s.editsTo ? sts.find((x) => x.id === s.editsTo) : null; return `<div class="flow-node" style="--stage:${attr(themed(s.color))}"><div class="fn-name"><i></i>${esc(s.name)}</div><div class="fn-meta">${stageOwnerText(s)}</div><div class="fn-meta">${s.slaFrom === 'task' ? '<b>TAT per task</b>, set at assignment' : s.slaHours ? `SLA <b>${s.slaHours}h</b>` : 'No limit'}${s.needsFile ? ' · needs file link' : ''}</div>${loops ? `<div class="fn-loop">↺ changes go back to ${esc(loops.name)}</div>` : ''}<span class="fn-arrow"></span></div>`; }).join('')}</div>`;
}
function viewFlow() {
  const admin = isAdmin();
  const f = S.flowDraft || (S.flowDraft = clone(S.flow));
  const openCounts = {}; S.requests.forEach((r) => { if (r.status === 'open') openCounts[r.stage] = (openCounts[r.stage] || 0) + 1; });
  const roleOpts = (sel, withTeam) => (withTeam ? [{ id: 'team', name: 'Assigned team member' }] : []).concat(roles()).map((r) => `<option value="${attr(r.id)}" ${sel === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('');
  const reviewerPicks = (s) => [{ id: 'requester', name: 'Requester' }].concat(roles().map((r) => ({ id: 'role:' + r.id, name: r.name }))).map((o) => `<label class="check tiny"><input type="checkbox" data-sf="reviewer" value="${attr(o.id)}" ${(s.reviewers || []).includes(o.id) ? 'checked' : ''}>${esc(o.name)}</label>`).join('');
  const editor = admin ? `<div class="panel" data-anim><div class="panel-head"><div><h2>Edit the flow</h2><div class="sub">Order, owners, SLA hours and rules per stage. Changes apply to new handoffs; requests keep the stage they are in.</div></div><div class="row"><button class="btn sm" data-action="add-stage">${ic('plus', 'sm')}Add stage</button><button class="btn sm ghost" data-action="reset-flow">Discard changes</button><button class="btn sm primary" data-action="save-flow">${ic('check', 'sm')}Save flow</button></div></div>
    <div class="panel-body">
    ${f.stages.map((s, i) => `<div class="stage-editor" data-i="${i}"><span class="se-idx">${i + 1}</span>
      <div class="se-field se-name"><label>Stage</label><div class="row"><input type="color" class="color-dot-input" value="${attr(s.color || '#64748B')}" data-sf="color" aria-label="Stage colour"><input class="input sm" data-sf="name" value="${attr(s.name)}" aria-label="Stage name" placeholder="Stage name"></div></div>
      <div class="se-field"><label>Kind</label><select class="input sm" data-sf="kind" aria-label="Stage kind" ${i === 0 || i === f.stages.length - 1 ? 'disabled' : ''}><option value="triage" ${s.kind === 'triage' ? 'selected' : ''}>Brief / triage</option><option value="work" ${s.kind === 'work' ? 'selected' : ''}>Work</option><option value="review" ${s.kind === 'review' ? 'selected' : ''}>Approval</option>${s.kind === 'start' ? '<option value="start" selected>Start</option>' : ''}${s.kind === 'end' ? '<option value="end" selected>End</option>' : ''}</select></div>
      ${s.kind === 'triage' || s.kind === 'work' || s.kind === 'start' ? `<div class="se-field"><label>${s.kind === 'start' ? 'Raised by' : 'Owner'}</label><select class="input sm" data-sf="role" aria-label="Owner role" ${s.kind === 'start' ? 'disabled' : ''}>${roleOpts(s.role, s.kind === 'work')}</select></div>` : ''}
      ${s.kind === 'review' ? `<div class="se-field" style="flex:1 1 260px"><label>Approved by (any of)</label><div class="row wrap" style="gap:6px 12px">${reviewerPicks(s)}</div></div>` : ''}
      ${s.kind === 'work' ? `<div class="se-field"><label>Time limit</label><select class="input sm" data-sf="slaFrom" aria-label="Limit source"><option value="task" ${s.slaFrom === 'task' ? 'selected' : ''}>TAT per task (set at assignment)</option><option value="fixed" ${s.slaFrom !== 'task' ? 'selected' : ''}>Fixed SLA hours</option></select></div>` : ''}
      ${s.kind !== 'start' && s.kind !== 'end' && !(s.kind === 'work' && s.slaFrom === 'task') ? `<div class="se-field se-sla"><label>SLA (h)</label><input class="input sm" type="number" min="0" step="1" data-sf="slaHours" value="${attr(s.slaHours || 0)}" aria-label="SLA hours"></div>` : ''}
      ${s.kind === 'review' ? `<div class="se-field"><label>Changes go to</label><select class="input sm" data-sf="editsTo" aria-label="Changes go to">${f.stages.filter((x) => x.kind === 'work').map((x) => `<option value="${attr(x.id)}" ${s.editsTo === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>` : ''}
      ${s.kind === 'work' ? `<div class="se-field se-check"><label class="check"><input type="checkbox" data-sf="needsFile" ${s.needsFile ? 'checked' : ''}>Needs file link</label></div>` : ''}
      <div class="se-ops"><button class="btn ghost sm icon-only" data-action="stage-up" data-i="${i}" ${i <= 1 || i === f.stages.length - 1 ? 'disabled' : ''} aria-label="Move up">${ic('up', 'sm')}</button><button class="btn ghost sm icon-only" data-action="stage-down" data-i="${i}" ${i === 0 || i >= f.stages.length - 2 ? 'disabled' : ''} aria-label="Move down">${ic('down', 'sm')}</button><button class="btn ghost sm icon-only" data-action="stage-del" data-i="${i}" ${s.kind === 'start' || s.kind === 'end' || openCounts[s.id] ? 'disabled' : ''} title="${openCounts[s.id] ? plural(openCounts[s.id], 'open request') + ' in this stage' : 'Remove stage'}" aria-label="Remove stage">${ic('trash', 'sm')}</button></div>
    </div>`).join('')}
    <div class="callout" style="margin-top:14px">A <b>Brief / triage</b> stage is where the coordinator writes the brief, picks the person and sets the TAT. A <b>Work</b> stage is timed against that TAT. An <b>Approval</b> stage can be passed by any of the people ticked; "changes" send the task back to the stage you choose as a new round.</div></div></div>` : '';
  return `<div class="page-head" data-anim><div><h1>Flow</h1><p class="lede">The flow every request runs through. Version ${S.flow.version || 1}${S.flow.updatedAt ? ` · updated ${fmtRel(S.flow.updatedAt)}` : ''}.</p></div></div>
  <div class="stack"><div class="panel" data-anim><div class="panel-head"><div><h2>Current flow</h2><div class="sub">Each stage's owner and time limit</div></div></div><div class="panel-body">${flowDiagram(admin ? f : S.flow)}</div></div>${editor}</div>`;
}
function viewSettings() {
  if (!isAdmin()) return `<div class="page-head"><div><h1>Settings</h1><p class="lede">Only admins can change workspace settings.</p></div></div>`;
  const st = S.settingsDraft || (S.settingsDraft = clone(S.settings)); const w = st.workHours;
  const hours = Array.from({ length: 24 }, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}:00</option>`).join('');
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return `<div class="page-head" data-anim><div><h1>Settings</h1><p class="lede">Request types and their default TAT, who may sign in, how time is counted, and housekeeping.</p></div><div class="page-actions"><button class="btn primary" data-action="save-settings">${ic('check')}Save settings</button></div></div>
  <div class="stack">
    <div class="panel" data-anim><div class="panel-head"><div><h2>Request types &amp; default TAT</h2><div class="sub">The TAT here is the default the coordinator sees at assignment — she can change it per task</div></div><button class="btn sm" data-action="add-type">${ic('plus', 'sm')}Add type</button></div><div class="table-wrap" style="padding:0 6px 8px"><table class="tbl"><thead><tr><th>Type</th><th>Team</th><th>Default TAT</th><th>Usually from</th><th>Usually goes to</th><th></th></tr></thead><tbody>
      ${st.types.map((t, i) => `<tr><td><input class="input sm" data-ty="name" data-i="${i}" value="${attr(t.name)}" aria-label="Type name"></td><td><select class="input sm" data-ty="team" data-i="${i}" aria-label="Team">${TEAMS.map((tm) => `<option value="${attr(tm.id)}" ${t.team === tm.id ? 'selected' : ''}>${esc(tm.name)}</option>`).join('')}</select></td><td><div class="row" style="gap:6px"><input class="input sm" type="number" min="0.5" step="0.5" style="width:84px" data-ty="tatDays" data-i="${i}" value="${attr(Math.round((t.tatHours / 24) * 10) / 10)}" aria-label="TAT in days"><span class="small muted">days</span></div></td><td><input class="input sm" data-ty="from" data-i="${i}" value="${attr(t.from || '')}" placeholder="—"></td><td><input class="input sm" data-ty="goesTo" data-i="${i}" value="${attr(t.goesTo || '')}" placeholder="—"></td><td class="actions"><button class="btn ghost sm icon-only" data-action="del-type" data-i="${i}" aria-label="Remove ${attr(t.name)}">${ic('trash', 'sm')}</button></td></tr>`).join('')}
    </tbody></table></div></div>
    <div class="grid two">
      <div class="stack">
        <div class="panel" data-anim><div class="panel-head"><div><h2>Who can sign in</h2><div class="sub">Email domains that self-register as Requester</div></div></div><div class="panel-body"><div class="field"><label>Allowed domains</label><input class="input sm mono" data-ss="allowedDomains" value="${attr((st.allowedDomains || []).join(', '))}" placeholder="bricknbolt.com"><span class="hint">Comma-separated. Anyone else must be added under Team by an admin.</span></div></div></div>
        <div class="panel" data-anim><div class="panel-head"><div><h2>Turnaround clock</h2><div class="sub">How TAT and SLA hours are counted</div></div><button class="switch" role="switch" aria-checked="${w.enabled ? 'true' : 'false'}" data-action="toggle-wh" aria-label="Count working hours only"></button></div><div class="panel-body stack" style="gap:12px">
          <p class="small muted">${w.enabled ? 'Only working hours count. A 1-day TAT is one working day.' : 'Every hour counts, including nights and weekends. Turn on to count working hours only.'}</p>
          <div class="row wrap"><div class="field"><label>Day starts</label><select class="input sm" data-ss="start" ${w.enabled ? '' : 'disabled'}>${hours}</select></div><div class="field"><label>Day ends</label><select class="input sm" data-ss="end" ${w.enabled ? '' : 'disabled'}>${hours}</select></div></div>
          <div class="field"><label>Working days</label><div class="days">${dayNames.map((d, i) => `<label title="${DAYS[i]}"><input type="checkbox" data-day="${i}" ${w.days.includes(i) ? 'checked' : ''} ${w.enabled ? '' : 'disabled'}>${d}</label>`).join('')}</div></div>
          <div class="field"><label>Warn when a stage has used <span class="mono" id="warn-pct">${Math.round((st.slaWarnAt || 0.75) * 100)}%</span> of its limit</label><input type="range" min="50" max="95" step="5" value="${Math.round((st.slaWarnAt || 0.75) * 100)}" data-ss="slaWarnAt" aria-label="Warning threshold"></div>
        </div></div>
      </div>
      <div class="stack">
        <div class="panel" data-anim><div class="panel-head"><div><h2>Task IDs</h2><div class="sub">Prefix for new task numbers</div></div></div><div class="panel-body"><div class="field" style="max-width:200px"><label>Prefix</label><input class="input sm mono" data-ss="prefix" value="${attr(st.prefix || 'BB')}" maxlength="6" style="text-transform:uppercase"></div></div></div>
        <div class="panel" data-anim><div class="panel-head"><div><h2>Priorities</h2><div class="sub">Lowest to highest</div></div></div><div class="panel-body stack" style="gap:10px"><div class="tags">${st.priorities.map((t, i) => `<span class="tag">${esc(t)}<button data-action="del-prio" data-i="${i}" aria-label="Remove ${attr(t)}">${ic('x', 'sm')}</button></span>`).join('')}</div><form class="row" data-form="add-prio"><input class="input sm" name="v" placeholder="Add a priority" required><button class="btn sm">Add</button></form></div></div>
        <div class="panel" data-anim><div class="panel-head"><div><h2>Housekeeping</h2></div></div><div class="panel-body stack" style="gap:10px">
          <div class="row between wrap"><div><b class="small">Export tasks</b><div class="tiny muted">CSV with every stage's time, the TAT target and the stored result</div></div><button class="btn sm" data-action="export">${ic('download', 'sm')}Download CSV</button></div>
          ${S.requests.some((r) => r.sample) ? `<div class="row between wrap"><div><b class="small">Sample requests</b><div class="tiny muted">${plural(S.requests.filter((r) => r.sample).length, 'sample request')} — remove when the team goes live</div></div><button class="btn sm danger" data-action="remove-samples">${ic('trash', 'sm')}Remove samples</button></div>` : ''}
          ${S.mode === 'demo' ? `<div class="row between wrap"><div><b class="small">Demo data</b><div class="tiny muted">Reset this browser's demo workspace</div></div><button class="btn sm danger" data-action="reset-demo">Reset demo</button></div>` : ''}
        </div></div>
      </div>
    </div>
  </div>`;
}

/* ---------------- request drawer ---------------- */
function stepperHtml(r) {
  const cur = stageIdx(r.stage);
  return `<div class="stepper">${stages().map((s, i) => {
    const visits = (r.visits || []).filter((v) => v.stage === s.id); const tat = stageTat(r, s.id); const breached = visits.some((v) => visitBreached(v, r));
    const done = r.status === 'done' ? true : i < cur || (i === cur && r.status !== 'open'); const current = r.status === 'open' && i === cur;
    const lim = s.slaFrom === 'task' ? fmtTat(r.tatHours) : s.slaHours ? `${s.slaHours}h` : '';
    const time = s.kind === 'start' ? fmtDate(r.createdAt) : s.kind === 'end' ? (r.completedAt ? fmtDate(r.completedAt) : '') : visits.length ? fmtDur(tat) + (lim ? ` / ${lim}` : '') : '';
    return `<div class="step ${done ? 'done' : ''} ${current ? 'current' : ''}" style="--stage:${attr(themed(s.color))}"><div class="node">${done ? ic('check', 'sm') : i + 1}</div><div class="s-name">${esc(s.name)}</div><div class="s-time ${breached ? 'crit' : ''}">${esc(time)}</div></div>`;
  }).join('')}</div>`;
}
function limitChip(r) {
  const s = slaState(r); const st = stageById(r.stage); const word = st && st.slaFrom === 'task' ? 'TAT' : 'SLA';
  if (s.state === 'none') return '';
  if (s.state === 'crit') return `<span class="chip crit">${ic('alert', 'sm')}${word} over by ${fmtDur(-s.remaining)}</span>`;
  return `<span class="chip ${s.state === 'warn' ? 'warn' : 'good'}">${fmtDur(s.remaining)} left · due ${fmtDeadline(s.deadline)}</span>`;
}
function tatInput(hours, name = 'tatDays') { return `<div class="row" style="gap:6px"><input class="input sm" type="number" min="0.5" step="0.5" name="${name}" value="${attr(Math.round(((hours || 0) / 24) * 10) / 10 || '')}" style="width:88px" aria-label="TAT in days"><span class="small muted">days</span></div>`; }
function actionPanelHtml(r) {
  const st = stageById(r.stage); if (!st) return `<div class="action-panel"><h3>Unknown stage</h3><p class="small muted">This request is in a stage that no longer exists in the flow (${esc(r.stage)}). An admin can reopen it.</p>${isAdmin() ? `<div class="actions"><button class="btn sm" data-action="reopen">${ic('rotate', 'sm')}Move to production</button></div>` : ''}</div>`;
  if (r.status === 'cancelled') return `<div class="action-panel"><h3>Cancelled</h3><p class="small muted">This request was cancelled${r.updatedAt ? ' ' + fmtRel(r.updatedAt) : ''}.</p>${canEditRequest(r) ? `<div class="actions"><button class="btn sm" data-action="reopen">${ic('rotate', 'sm')}Reopen</button></div>` : ''}</div>`;
  if (st.kind === 'end') { const res = r.result; return `<div class="action-panel done"><h3>${ic('check', 'sm')} Approved ${fmtRel(r.completedAt || r.updatedAt)}${res && res.approvedBy ? ` by ${esc(res.approvedBy.name)}` : ''}</h3>${res ? `<div class="kv" style="margin-top:4px"><div><div class="k">${esc(res.assignee ? res.assignee.name : 'Assignee')} — production TAT</div><div class="v mono">${fmtDur((res.actualHours || 0) * H)} <span class="muted">/ ${fmtTat(res.targetHours)}</span> <span class="chip ${res.met ? 'good' : 'crit'}">${res.met ? 'on time' : 'late'}</span></div></div><div><div class="k">Rounds</div><div class="v mono">${res.rounds || 1}${res.rounds > 1 ? ` · first round ${fmtDur((res.firstRoundHours || 0) * H)}` : ''}</div></div><div><div class="k">End to end</div><div class="v mono">${fmtDur((res.totalHours || 0) * H)}</div></div><div><div class="k">Stage times</div><div class="v mono small">${Object.entries(res.stageHours || {}).map(([k, v]) => `${esc((stageById(k) || { name: k }).name)} ${fmtDur(v * H)}`).join(' · ')}</div></div></div>` : `<p class="small">End-to-end turnaround <b class="mono">${fmtDur(totalTat(r))}</b>.</p>`}${canEditRequest(r) ? `<div class="actions"><button class="btn sm" data-action="reopen">${ic('rotate', 'sm')}Reopen for changes</button></div>` : ''}</div>`; }
  const lim = limitChip(r);
  if (st.kind === 'triage') {
    const cs = membersWithRole(st.role);
    if (!canTriage(r, st)) return `<div class="action-panel"><div class="row between wrap"><h3>With ${esc(cs.length ? cs.map((m) => m.name).join(' / ') : roleName(st.role))} for the brief</h3>${lim}</div><p class="small muted">${cs.length ? `${esc(cs.length === 1 ? cs[0].name : 'The coordinator')} will confirm the details with ${isRequester(r) ? 'you' : esc(firstName(r.requester))}, write the creative brief, pick who works on it and set the TAT.` : `Nobody has the ${esc(roleName(st.role))} role yet — an admin needs to assign it under Team.`}</p>${r.brief ? `<div class="divider" style="margin:4px 0"></div><div class="section-title">Creative brief (draft)</div><div class="brief">${esc(r.brief)}</div>` : ''}</div>`;
    const team = r.team || (typeById(r.typeId) || {}).team || 'design'; const ty = typeById(r.typeId);
    const eligible = membersWithRole(team); const suggested = ty && ty.goesTo ? eligible.find((m) => lower(ty.goesTo).includes(lower(m.name))) : null; const current = assigneeOf(r);
    return `<form class="action-panel" data-form="triage"><div class="row between wrap"><h3>${ic('clipboard', 'sm')} Brief &amp; assign</h3>${lim}</div>
      <div class="field"><label for="t-brief">Creative brief <span class="muted" style="font-weight:400">— confirm the details with ${esc(firstName(r.requester))}, then write what the team should produce</span></label><textarea class="input" id="t-brief" name="brief" rows="5" placeholder="Deliverables and sizes, message and offer, audience, tone, references, must-haves…">${esc(r.brief || '')}</textarea></div>
      <div class="row wrap" style="gap:12px;align-items:flex-end">
        <div class="field"><label for="t-team">Team</label><select class="input sm" id="t-team" name="team" data-triage-team>${TEAMS.map((t) => `<option value="${attr(t.id)}" ${team === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>
        <div class="field" style="flex:1;min-width:180px"><label for="t-who">Assign to</label><select class="input sm" id="t-who" name="email" data-triage-who><option value="">${eligible.length ? 'Choose…' : 'No one on this team yet'}</option>${eligible.map((m) => `<option value="${attr(m.email)}" ${(current && sameEmail(current.email, m.email)) || (!current && suggested && sameEmail(suggested.email, m.email)) ? 'selected' : ''}>${esc(m.name)}${suggested && sameEmail(suggested.email, m.email) ? ' (usual)' : ''}</option>`).join('')}</select></div>
        <div class="field"><label for="t-tat">TAT for this task</label>${tatInput(r.tatHours)}</div>
      </div>
      <div class="row between wrap"><span class="tiny muted">Default for ${esc(r.type)}: ${fmtTat(ty ? ty.tatHours : r.tatHours)}. The TAT clock starts the moment you assign.</span><div class="actions"><button class="btn sm" type="button" data-action="save-brief">Save brief</button><button class="btn sm primary" type="submit">${ic('arrowRight', 'sm')}Assign &amp; start production</button></div></div>
    </form>`;
  }
  if (st.kind === 'work') {
    const a = (r.assignees || {})[st.id]; const roundFiles = (r.deliverables || []).filter((d) => d.round === r.round); const needFile = st.needsFile && !roundFiles.length;
    const s = slaState(r); const team = r.team || 'design'; const eligible = membersWithRole(team);
    const manage = canManageAssignment(r) ? `<form class="row wrap" data-form="reassign" style="gap:8px;align-items:flex-end"><div class="field"><label>Reassign</label><select class="input sm" name="email" style="min-width:160px"><option value="">Choose…</option>${eligible.map((m) => `<option value="${attr(m.email)}" ${a && sameEmail(a.email, m.email) ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div><button class="btn sm" type="submit">Reassign</button><div class="field"><label>TAT</label>${tatInput(r.tatHours)}</div><button class="btn sm" type="button" data-action="set-tat">Update TAT</button></form>` : '';
    return `<div class="action-panel"><div class="row between wrap"><h3>${esc(st.name)} · round ${r.round || 1}</h3>${lim}</div>
      <div class="row between wrap"><span class="who">${personHtml(a)}<span class="name">${a ? esc(a.name) + (isMe(a) ? ' (you)' : '') : 'Nobody assigned'}</span></span><span class="small muted">TAT <b class="mono">${fmtTat(r.tatHours)}</b>${s.deadline ? ` · due ${fmtDeadline(s.deadline)}` : ''}${r.assignedAt ? ` · assigned ${fmtRel(r.assignedAt)}` : ''}</span></div>
      ${canSubmitWork(r, st) ? `<div class="divider" style="margin:4px 0"></div><div class="row between wrap"><span class="small muted">${needFile ? 'Add the final file link below, then submit for QC.' : `Ready? Submit it to ${esc(coordinatorNames())} for QC.`}</span><div class="actions"><button class="btn sm primary" data-action="submit" ${needFile ? 'disabled' : ''}>${ic('send', 'sm')}Submit for QC</button></div></div>` : `<p class="small muted">${a ? `${esc(a.name)} is working on this.` : 'Waiting for the coordinator to assign it.'}</p>`}
      ${manage ? `<div class="divider" style="margin:4px 0"></div>${manage}` : ''}
    </div>`;
  }
  if (st.kind === 'review') {
    const nx = nextStage(st.id); const isFinal = nx && nx.kind === 'end';
    const who = (st.reviewers || []).map((sp) => reviewerLabel(sp, r)); const latest = (r.deliverables || []).filter((d) => d.round === r.round);
    if (!canReview(r, st)) return `<div class="action-panel review"><div class="row between wrap"><h3>Waiting for ${esc(who.join(' or '))} — ${esc(st.name.toLowerCase())}</h3>${lim}</div><p class="small muted">Round ${r.round || 1}. ${latest.length ? plural(latest.length, 'file link') + ' submitted for this round.' : 'No file link on this round.'}</p></div>`;
    return `<div class="action-panel review"><div class="row between wrap"><h3>${isFinal ? 'Your final approval' : 'Your QC'} · round ${r.round || 1}</h3>${lim}</div>
      ${isFinal ? `<p class="small muted">Either ${esc(who.join(' or '))} can approve — the first one to act closes the task and records ${esc(assigneeOf(r) ? assigneeOf(r).name + "'s" : 'the')} TAT.</p>` : `<p class="small muted">Check the work against the brief. Approve to send it to ${esc(who.length ? '' : '')}${esc((nx.reviewers || []).map((sp) => reviewerLabel(sp, r)).join(' or '))} for final approval, or send it back for rework.</p>`}
      ${latest.length ? `<div class="stack" style="gap:6px">${latest.map((d) => `<div class="deliverable">${ic('link', 'sm')}<a href="${attr(d.url)}" target="_blank" rel="noopener">${esc(d.label)}</a>${ic('external', 'sm')}</div>`).join('')}</div>` : '<p class="small muted">No file link was added on this round — ask for it in the thread or send it back.</p>'}
      <form data-form="review" class="stack" style="gap:8px"><textarea class="input" name="note" placeholder="Notes for the team — required when sending it back" rows="3"></textarea><div class="actions"><button class="btn good" data-review="approve" type="button">${ic('check', 'sm')}Approve</button><button class="btn" data-review="edits" type="button">${ic('rotate', 'sm')}${isFinal ? 'Request changes' : 'Send back for rework'}</button></div></form></div>`;
  }
  return '';
}
function drawerHtml(r) {
  const st = stageById(r.stage); const due = fmtDue(r.dueDate, r.status);
  const visitsTl = (r.visits || []).map((v) => { const s = stageById(v.stage) || { name: v.stage, color: '#888' }; const el = visitElapsed(v); const lim = stageLimitMs(s, r); const br = lim > 0 && el > lim; const open = !v.exitedAt;
    const what = s.kind === 'start' ? `<b>${esc(r.requester ? r.requester.name : '')}</b> raised the request` : open ? `In <b>${esc(s.name)}</b>${v.assignee ? ` with ${esc(v.assignee.name)}` : ''} since ${fmtDateTime(v.enteredAt)}` : `<b>${esc(s.name)}</b> ${{ assigned: 'done — briefed and assigned', submitted: 'submitted for QC', approved: 'approved', edits: 'sent back for changes', cancelled: 'cancelled', reopened: 'reopened' }[v.action] || v.action || 'closed'}${v.by ? ` by ${esc(v.by.name)}` : ''}`;
    return `<div class="tl" style="--stage:${attr(themed(s.color))}"><div class="dot ${open ? '' : 'filled'}"></div><div><div class="t-main">${what}${v.round > 1 ? ` <span class="round">R${v.round}</span>` : ''}</div><div class="t-sub"><span>${fmtDateTime(v.enteredAt)}${v.exitedAt && s.kind !== 'start' ? ' → ' + fmtDateTime(v.exitedAt) : ''}</span>${s.kind !== 'start' && s.kind !== 'end' ? `<span>${s.slaFrom === 'task' ? 'TAT' : 'time'} ${fmtDur(el)}${lim ? ` / ${fmtDur(lim)}` : ''}</span>${lim ? `<span class="${br ? 'crit' : 'good'}">${br ? 'over' : 'within limit'}</span>` : ''}` : ''}</div></div></div>`; }).join('');
  return `<div class="drawer-head"><div class="grow"><div class="row wrap" style="gap:8px"><span class="mono small muted">${esc(r.id)}</span>${stageChip(st)}${teamChip(r.team)}${r.status === 'cancelled' ? '<span class="chip">Cancelled</span>' : ''}${isBreachedNow(r) ? `<span class="breach-flag pulse">${ic('alert')}over limit</span>` : ''}${r.round > 1 ? `<span class="round">Round ${r.round}</span>` : ''}${r.sample ? '<span class="chip">sample</span>' : ''}</div><h2>${esc(r.title)}</h2><div class="row wrap" style="gap:10px;margin-top:8px"><span class="chip outline">${esc(r.type)}</span>${prioHtml(r.priority)}<span class="small ${due.cls}">${ic('calendar', 'sm')} ${esc(due.text)}</span><span class="who" title="Raised by">${personHtml(r.requester, 'sm')}<span class="name small">${esc(r.requester ? r.requester.name : '')}</span></span>${assigneeOf(r) ? `<span class="who" title="Assignee">${personHtml(assigneeOf(r), 'sm')}<span class="name small">${esc(assigneeOf(r).name)} · TAT ${fmtTat(r.tatHours)}</span></span>` : ''}</div></div>
    <div class="row">${canEditRequest(r) ? `<button class="btn ghost sm icon-only" data-action="edit" data-id="${attr(r.id)}" aria-label="Edit request">${ic('edit', 'sm')}</button>` : ''}<button class="btn ghost sm icon-only" data-action="close-drawer" aria-label="Close">${ic('x')}</button></div></div>
  <div class="drawer-body">
    ${stepperHtml(r)}
    ${actionPanelHtml(r)}
    <section><div class="section-title">Request${r.requester ? ` from ${esc(r.requester.name)}` : ''}</div><div class="brief">${esc(r.request || r.brief || 'No description provided.')}</div>${(r.refs || []).length ? `<div class="stack" style="gap:6px;margin-top:10px">${r.refs.map((u) => `<div class="deliverable">${ic('link', 'sm')}<a href="${attr(u)}" target="_blank" rel="noopener">${esc(u)}</a></div>`).join('')}</div>` : ''}</section>
    ${r.brief && st && st.kind !== 'triage' ? `<section><div class="section-title">Creative brief</div><div class="brief">${esc(r.brief)}</div></section>` : ''}
    <section><div class="section-title">Files &amp; links</div>${(r.deliverables || []).length ? `<div class="stack" style="gap:6px">${[...r.deliverables].reverse().map((d) => `<div class="deliverable">${ic('file', 'sm')}<a href="${attr(d.url)}" target="_blank" rel="noopener">${esc(d.label)}</a><span class="who-when">R${d.round || 1} · ${esc(d.by ? d.by.name : '')} · ${fmtRel(d.at)}</span></div>`).join('')}</div>` : '<p class="small muted">No file links yet.</p>'}
      ${r.status === 'open' && canAddDeliverable(r) ? `<form data-form="deliverable" class="row wrap" style="margin-top:10px"><input class="input sm" name="url" type="url" placeholder="https://drive.google.com/… (final file link)" required style="flex:2;min-width:200px"><input class="input sm" name="label" placeholder="Label (optional)" style="flex:1;min-width:120px"><button class="btn sm">${ic('plus', 'sm')}Add link</button></form>` : ''}</section>
    <section><div class="section-title">Thread</div><div class="thread">${(r.thread || []).length ? r.thread.map((m) => `<div class="msg ${m.kind}">${m.kind === 'system' ? '' : personHtml(m.by, 'sm')}<div class="bubble"><div class="m-head"><b>${esc(m.by ? m.by.name : 'System')}</b><span>${m.kind === 'edit' ? 'asked for changes · ' : m.kind === 'approval' ? 'approved · ' : ''}${fmtRel(m.at)}</span></div><div class="m-text">${esc(m.text)}</div></div></div>`).join('') : '<p class="small muted">No messages yet.</p>'}</div>
      ${S.me ? `<form data-form="comment" class="row" style="margin-top:10px;align-items:flex-start"><textarea class="input" name="text" placeholder="Write to the team…" rows="2" required style="min-height:44px"></textarea><button class="btn icon-only" aria-label="Send">${ic('send')}</button></form>` : ''}</section>
    <section><div class="section-title">Timeline &amp; turnaround</div><div class="timeline">${visitsTl}</div></section>
    ${canEditRequest(r) ? `<section><div class="row between wrap"><span class="small muted">Raised ${fmtDateTime(r.createdAt)} · updated ${fmtRel(r.updatedAt)}</span><div class="row">${r.status === 'open' ? `<button class="btn sm danger" data-action="cancel">${ic('x', 'sm')}Cancel request</button>` : ''}${isAdmin() ? `<button class="btn sm ghost" data-action="delete">${ic('trash', 'sm')}Delete</button>` : ''}</div></div></section>` : `<p class="small muted">Raised ${fmtDateTime(r.createdAt)}</p>`}
  </div>`;
}

/* ---------------- modals ---------------- */
function requestFormHtml(r) {
  r = r || {}; const opt = (list, sel) => list.map((t) => `<option ${t === sel ? 'selected' : ''}>${esc(t)}</option>`).join('');
  const typeOpts = TEAMS.map((tm) => `<optgroup label="${attr(tm.name)}">${types().filter((t) => t.team === tm.id).map((t) => `<option value="${attr(t.id)}" ${t.id === r.typeId ? 'selected' : ''}>${esc(t.name)} · ${fmtTat(t.tatHours)}</option>`).join('')}</optgroup>`).join('');
  return `<div class="form-grid">
    <div class="field span-2"><label for="f-title">What do you need?</label><input class="input" id="f-title" name="title" value="${attr(r.title || '')}" placeholder="e.g. Diwali offer — LP hero banners" required maxlength="140"></div>
    <div class="field"><label for="f-type">Type</label><select class="input" id="f-type" name="typeId">${typeOpts}</select><span class="hint">Default TAT shown next to each type — ${esc(coordinatorNames())} confirms it at assignment.</span></div>
    <div class="field"><label for="f-prio">Priority</label><select class="input" id="f-prio" name="priority">${opt(S.settings.priorities, r.priority || 'Normal')}</select></div>
    <div class="field"><label for="f-due">Needed by</label><input class="input" id="f-due" type="date" name="dueDate" value="${attr(r.dueDate || '')}" min="${isoToday()}"></div>
    <div class="field"><label>Raised by</label><div class="row" style="min-height:40px">${whoHtml(r.requester || S.me)}</div></div>
    <div class="field span-2"><label for="f-request">Details</label><textarea class="input" id="f-request" name="request" rows="4" placeholder="Sizes, message, offer, audience, where it will run, anything the team must know…">${esc(r.request || '')}</textarea><span class="hint">${esc(coordinatorNames())} will turn this into the creative brief with you — the more you add, the faster that goes.</span></div>
    <div class="field span-2"><label for="f-refs">Reference links</label><textarea class="input" id="f-refs" name="refs" rows="2" placeholder="One link per line — past creatives, brand folder, examples">${esc((r.refs || []).join('\n'))}</textarea></div>
  </div>`;
}
function modalHtml(m) {
  const wrap = (title, sub, body, foot, size = '') => `<div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div class="grow"><h2 id="modal-title">${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button class="btn ghost sm icon-only" data-action="close-modal" aria-label="Close">${ic('x')}</button></div><div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  switch (m.type) {
    case 'new': return `<form data-form="new">${wrap('New request', `Goes to <b>${esc(coordinatorNames())}</b> for the brief and assignment.`, requestFormHtml(), `<button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn primary" type="submit">${ic('send', 'sm')}Raise request</button>`)}</form>`;
    case 'edit': return `<form data-form="edit" data-id="${attr(m.id)}">${wrap('Edit request', esc(m.id), requestFormHtml(getReq(m.id)), `<button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn primary" type="submit">Save changes</button>`)}</form>`;
    case 'member': { const mem = m.id ? S.members.find((x) => x.id === m.id) : null; const rolePicks = roles().map((r) => `<label class="check"><input type="checkbox" name="roles" value="${attr(r.id)}" ${mem && hasRole(mem, r.id) ? 'checked' : (!mem && r.id === 'requester' ? 'checked' : '')}><span class="role-chip" style="--c:${attr(r.color)}"><i></i>${esc(r.name)}</span></label>`).join('');
      return `<form data-form="member" data-id="${attr(m.id || '')}">${wrap(mem ? 'Edit teammate' : 'Add a teammate', mem ? (mem.emailUnconfirmed ? 'This email is a placeholder — replace it with their real work email.' : '') : 'They sign in with this email.', `<div class="form-grid"><div class="field"><label for="m-name">Name</label><input class="input" id="m-name" name="name" value="${attr(mem ? mem.name : '')}" required placeholder="Full name"></div><div class="field"><label for="m-email">Work email</label><input class="input" id="m-email" name="email" type="email" value="${attr(mem ? mem.email : '')}" required placeholder="name@bricknbolt.com"></div><div class="field span-2"><label>Roles</label><div class="role-picks">${rolePicks}</div><span class="hint">A person can hold more than one role — e.g. Coordinator + Requester.</span></div>${mem ? `<div class="field span-2"><label class="check"><input type="checkbox" name="active" ${mem.active === false ? '' : 'checked'}>Active — can sign in and be assigned work</label></div>` : ''}</div>`, `<button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn primary" type="submit">${mem ? 'Save' : 'Add teammate'}</button>`, 'sm')}</form>`; }
    case 'role': return `<form data-form="role">${wrap('Add a role', 'Roles own stages of the flow.', `<div class="form-grid"><div class="field"><label for="r-name">Role name</label><input class="input" id="r-name" name="name" required placeholder="e.g. Copywriter"></div><div class="field"><label for="r-color">Colour</label><input type="color" class="color-dot-input" id="r-color" name="color" value="#0E9384"></div><div class="field span-2"><label for="r-desc">What they do</label><input class="input" id="r-desc" name="desc" placeholder="Short description"></div></div>`, `<button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn primary" type="submit">Add role</button>`, 'sm')}</form>`;
    case 'note': return `<form data-form="note" data-kind="${attr(m.kind)}">${wrap(esc(m.title), esc(m.sub || ''), `<div class="field"><label for="n-text">${esc(m.label || 'Note')}</label><textarea class="input" id="n-text" name="text" rows="3" ${m.required ? 'required' : ''} placeholder="${attr(m.placeholder || '')}"></textarea></div>`, `<button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn ${m.danger ? 'danger' : 'primary'}" type="submit">${esc(m.confirm || 'Confirm')}</button>`, 'sm')}</form>`;
    case 'confirm': return wrap(esc(m.title), esc(m.sub || ''), '', `<button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn ${m.danger ? 'danger' : 'primary'}" data-action="confirm-ok">${esc(m.confirm || 'Confirm')}</button>`, 'sm');
  }
  return '';
}

/* ---------------- gate (sign in) ---------------- */
function gateHtml() {
  if (S.authMode === 'clerk') {
    const pill = S.backend === 'supabase' ? '<span class="mode-pill live"><span class="dot"></span>Live workspace</span>' : '<span class="mode-pill"><span class="dot"></span>Shared database not connected yet</span>';
    const domains = (S.settings.allowedDomains || []).map((d) => '@' + d).join(' or ');
    const body = S.clerkState === 'failed' ? `<div class="callout warn">The sign-in service could not be loaded. Check your connection and reload.</div>`
      : S.gateError ? `<div class="callout warn">${esc(S.gateError)}</div><div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-action="signout">Sign in with a different account</button></div>`
      : S.identity ? `<div class="row" style="justify-content:center;gap:10px"><span class="skeleton" style="width:22px;height:22px;border-radius:50%"></span><span class="small muted">Signed in as ${esc(S.identity.email)} — loading your workspace…</span></div>`
      : `<div class="clerk-mount" id="clerk-signin"></div>`;
    return `<div class="gate"><div class="gate-card auth" data-anim><div class="row"><div class="brand-mark">${ic('relay')}</div><div><div class="brand-name">Creative Request Ops</div><div class="brand-sub">Brick&amp;Bolt</div></div></div>
      <p class="lede">Requests, briefs, QC and approvals for Brick&amp;Bolt's branding team. Sign in with your ${esc(domains || 'company')} Google account.</p>
      ${body}
      <div class="gate-foot">${pill}</div></div></div>`;
  }
  const admins = S.members.filter((m) => hasRole(m, 'admin') && m.active !== false).map((m) => m.name);
  const loading = S.mode === 'loading' || !S.loaded.members;
  const domains = (S.settings.allowedDomains || []).map((d) => '@' + d).join(' or ');
  const pill = S.mode === 'demo' ? '<span class="mode-pill"><span class="dot"></span>Demo mode — data stays in this browser</span>' : S.mode === 'live' ? '<span class="mode-pill live"><span class="dot"></span>Live workspace</span>' : '<span class="mode-pill"><span class="dot"></span>Connecting…</span>';
  let body;
  if (S.bootstrap) body = `<form data-form="bootstrap" class="stack" style="gap:12px"><div class="field"><label for="g-name">Your name</label><input class="input" id="g-name" name="name" required value="${attr(APP.ownerName)}"></div><div class="field"><label for="g-email">Work email</label><input class="input" id="g-email" name="email" type="email" required value="${attr(APP.ownerEmail)}"></div><button class="btn primary block" type="submit">Set up workspace as admin</button></form>`;
  else if (S.gatePending) body = `<form data-form="register" class="stack" style="gap:12px"><div class="callout">First time here — welcome. You'll be able to raise requests straight away.</div><div class="field"><label>Work email</label><div class="input mono" style="background:var(--surface-2)">${esc(S.gatePending)}</div></div><div class="field"><label for="g-name">Your name</label><input class="input" id="g-name" name="name" required placeholder="As your team knows you" autofocus></div><div class="row"><button class="btn" type="button" data-action="gate-back">Back</button><button class="btn primary" type="submit" style="flex:1">Continue</button></div></form>`;
  else body = `<form data-form="signin" class="stack" style="gap:12px"><div class="field"><label for="g-email">Work email</label><input class="input" id="g-email" name="email" type="email" required placeholder="name@bricknbolt.com" autocomplete="email" ${loading ? 'disabled' : ''}>${S.gateError ? `<span class="error">${esc(S.gateError)}</span>` : `<span class="hint">Anyone with a ${esc(domains || 'company')} email can sign in.</span>`}</div><button class="btn primary block" type="submit" ${loading ? 'disabled' : ''}>${loading ? 'Loading team…' : 'Continue'}</button></form>`;
  return `<div class="gate"><div class="gate-card" data-anim><div class="row"><div class="brand-mark">${ic('relay')}</div><div><div class="brand-name">Creative Request Ops</div><div class="brand-sub">Brick&amp;Bolt</div></div></div>
    <div><h1>${S.bootstrap ? 'Set up your workspace' : S.gatePending ? 'Nearly there' : 'Who\'s working?'}</h1><p class="lede" style="margin-top:6px">${S.bootstrap ? 'No team yet — the first person in becomes the admin.' : S.gatePending ? 'Tell the team who you are.' : 'Requests, briefs, QC and approvals for the branding team.'}</p></div>
    ${body}
    <div class="gate-foot">${pill}<br><span style="display:inline-block;margin-top:8px">${admins.length ? `Questions about access? Ask ${esc(admins.join(' or '))}.` : ''}</span></div></div></div>`;
}
function trySignIn(email) {
  email = lower(email); if (!email) return;
  const m = S.members.find((x) => sameEmail(x.email, email));
  if (m && m.active === false) { S.gateError = 'This account is inactive — ask an admin to reactivate it.'; return renderAll(false); }
  if (m) { localStorage.setItem(LS.me, email); S.me = m; S.gateError = ''; return renderAll(true); }
  if (sameEmail(email, APP.ownerEmail)) { const doc = { email, name: APP.ownerName, roles: ['admin', 'requester'], active: true }; saveMember(doc, 'quiet').then(() => { localStorage.setItem(LS.me, email); S.me = S.members.find((x) => sameEmail(x.email, email)); renderAll(true); }); return; }
  const domains = (S.settings.allowedDomains || []).map(lower);
  if (domains.includes(emailDomain(email))) { S.gatePending = email; S.gateError = ''; return renderAll(false); }
  S.gateError = `Only ${domains.map((d) => '@' + d).join(' / ') || 'company'} emails can sign in on their own — ask an admin to add you.`; renderAll(false);
}
async function registerAndSignIn(email, name) {
  const doc = { email: lower(email), name: name.trim(), roles: ['requester'], active: true, selfRegistered: true };
  await saveMember(doc, 'quiet');
  localStorage.setItem(LS.me, doc.email); S.me = S.members.find((x) => sameEmail(x.email, doc.email)); S.gatePending = null; renderAll(true);
  toast(`Welcome, ${firstName(doc)} — you can raise requests right away`);
}

/* ---------------- shell ---------------- */
const NAV = [
  { v: 'dashboard', label: 'Dashboard', icon: 'dashboard' }, { v: 'board', label: 'Requests', icon: 'board' }, { v: 'queue', label: 'My queue', icon: 'inbox' },
  { v: 'team', label: 'Team', icon: 'users' }, { v: 'flow', label: 'Flow', icon: 'flow' }, { v: 'settings', label: 'Settings', icon: 'settings', admin: true },
];
function navItems() {
  const m = metrics();
  return NAV.filter((n) => !n.admin || isAdmin()).map((n) => { const badge = n.v === 'queue' && m.mine ? `<span class="badge">${m.mine}</span>` : n.v === 'board' && m.breached ? `<span class="badge crit" title="Over SLA / TAT">${m.breached}</span>` : ''; return `<a class="nav-item ${S.route.view === n.v ? 'active' : ''}" href="#/${n.v}" data-nav="${n.v}" aria-current="${S.route.view === n.v ? 'page' : 'false'}">${ic(n.icon)}<span>${esc(n.label)}</span>${badge}</a>`; }).join('');
}
function shellHtml() {
  const title = (NAV.find((n) => n.v === S.route.view) || {}).label || '';
  const pill = S.mode === 'demo' ? '<span class="mode-pill" title="No shared database in this view — data is saved in this browser only">Demo</span>' : '';
  return `<div class="app" id="app">
    <nav class="nav" aria-label="Main"><div class="brand"><div class="brand-mark">${ic('relay')}</div><div><div class="brand-name">Creative Request Ops</div><div class="brand-sub">Brick&amp;Bolt</div></div></div>
      <div class="nav-section">Work</div>${navItems()}<div class="nav-spacer"></div>
      <div class="nav-foot">${S.authMode === 'clerk' ? `<div class="clerk-user"><span id="clerk-user"></span><span class="name">${esc(S.me.name)}</span></div>` : `<button class="nav-item" data-action="signout" title="Switch user"><span class="avatar sm" style="background:${avatarColor(S.me.email)}">${esc(initials(S.me.name))}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(S.me.name)}</span>${ic('logout', 'sm')}</button>`}</div></nav>
    <div class="main">${S.authMode === 'clerk' && S.backend !== 'supabase' && isAdmin() ? `<div class="setup-banner">${ic('alert', 'sm')}<span><b>Shared database not connected.</b> Sign-in works, but tasks are only saved in this browser until the Supabase URL is added to config.js.</span></div>` : ''}<header class="topbar"><span class="title">${esc(title)}</span><div class="search">${ic('search')}<input type="search" id="q" placeholder="Search tasks, IDs, people…" value="${attr(S.q)}" aria-label="Search"></div><span class="grow"></span>${pill}<button class="btn primary sm" data-action="new">${ic('plus', 'sm')}<span class="nowrap">New request</span></button></header>
      <div class="content"><div class="page" id="page"></div></div></div>
    <nav class="bottom-nav" aria-label="Main">${navItems()}</nav></div>`;
}
const VIEWS = { dashboard: viewDashboard, board: viewBoard, queue: viewQueue, team: viewTeam, flow: viewFlow, settings: viewSettings };

/* ---------------- render ---------------- */
let shellMounted = false;
function renderAll(animate) {
  const root = $('#root');
  if (!S.me) { shellMounted = false; unmountClerk(); root.innerHTML = gateHtml(); mountClerkSignIn(); if (animate !== false) animateIn(root); syncLayer(); return; }
  if (!shellMounted) { unmountClerk(); root.innerHTML = shellHtml(); shellMounted = true; animate = true; mountClerkUserButton(); }
  else { const items = navItems(); const side = $('.nav', root); if (side) { $$('.nav-item[data-nav]', side).forEach((x) => x.remove()); side.querySelector('.nav-spacer').insertAdjacentHTML('beforebegin', items); } const bottom = $('.bottom-nav', root); if (bottom) bottom.innerHTML = items; $('.topbar .title').textContent = (NAV.find((n) => n.v === S.route.view) || {}).label || ''; }
  renderPage(animate);
  syncLayer();
}
function renderPage(animate) {
  const page = $('#page'); if (!page) return;
  const view = VIEWS[S.route.view] || viewDashboard;
  let flipState = null;
  if (S.route.view === 'board' && S.boardMode === 'board' && window.Flip && $('#board') && !animate && motionOk()) { try { flipState = Flip.getState('#board .card'); } catch (e) { flipState = null; } }
  const vals = captureForms(page);
  page.innerHTML = view();
  restoreForms(page, vals);
  afterRender(page);
  if (flipState) { try { Flip.from(flipState, { duration: 0.45, ease: 'power2.inOut', absolute: true, nested: true, onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 }) }); } catch (e) { /* ignore */ } }
  else if (animate) animateIn(page);
}
function afterRender(root) {
  requestAnimationFrame(() => { $$('.bullet-track .fill', root).forEach((el) => { el.style.width = el.dataset.w + '%'; }); });
  if (S.route.view === 'settings' && S.settingsDraft) { const st = S.settingsDraft; const s1 = $('[data-ss="start"]', root), s2 = $('[data-ss="end"]', root); if (s1) s1.value = st.workHours.start; if (s2) s2.value = st.workHours.end; }
}
function syncLayer() {
  const layer = $('#layer'); const r = S.drawer ? getReq(S.drawer) : null;
  const key = S.modal ? 'modal:' + S.modal.type + ':' + (S.modal.id || '') : r ? 'drawer:' + r.id : '';
  const prevKey = layer.dataset.key || '';
  if (!key) { if (prevKey) closeLayer(layer); return; }
  const vals = captureForms(layer);
  if (S.modal) { if (prevKey !== key) { $$('.closing', layer).forEach((el) => el.remove()); layer.innerHTML = `<div class="overlay" data-action="close-modal"></div><div class="modal-wrap" data-action="close-modal">${modalHtml(S.modal)}</div>`; } }
  else { $$('.closing', layer).forEach((el) => el.remove()); const scrollTop = prevKey === key ? ($('.drawer-body', layer) || {}).scrollTop : 0; layer.innerHTML = `<div class="overlay" data-action="close-drawer"></div><aside class="drawer" role="dialog" aria-label="${attr(r.id)}">${drawerHtml(r)}</aside>`; if (scrollTop) $('.drawer-body', layer).scrollTop = scrollTop; }
  restoreForms(layer, vals);
  if (prevKey !== key) { layer.dataset.key = key; document.body.style.overflow = 'hidden'; animateLayer(layer, !!S.modal); const first = $('.modal input:not([readonly]), .modal textarea', layer); if (first) setTimeout(() => first.focus(), 60); }
}
function closeLayer(layer) { layer.dataset.key = ''; document.body.style.overflow = ''; const old = $$(':scope > *:not(.closing)', layer); old.forEach((el) => { el.classList.add('closing'); el.style.pointerEvents = 'none'; }); if (motionOk() && old.length) { gsap.to(old, { opacity: 0, duration: 0.18, overwrite: true, onComplete: () => old.forEach((el) => el.remove()) }); setTimeout(() => old.forEach((el) => el.remove()), 400); } else old.forEach((el) => el.remove()); }
function captureForms(root) { const v = {}; const els = $$('textarea, input:not([type=checkbox]):not([type=radio]):not([type=search]), select', root); els.forEach((el, i) => { const k = (el.name || el.id || el.dataset.sf || el.dataset.ss || el.dataset.ty || '') + '#' + i; v[k] = el.value; }); v.__active = document.activeElement && root.contains(document.activeElement) ? ((document.activeElement.name || document.activeElement.id || document.activeElement.dataset.sf || document.activeElement.dataset.ss || document.activeElement.dataset.ty || '') + '#' + els.indexOf(document.activeElement)) : null; return v; }
function restoreForms(root, vals) { if (!vals) return; const els = $$('textarea, input:not([type=checkbox]):not([type=radio]):not([type=search]), select', root); els.forEach((el, i) => { const k = (el.name || el.id || el.dataset.sf || el.dataset.ss || el.dataset.ty || '') + '#' + i; if (k in vals && vals[k] !== '' && el.value !== vals[k] && !el.dataset.keep) el.value = vals[k]; if (vals.__active === k) { el.focus({ preventScroll: true }); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* not all inputs */ } } }); }

/* ---------------- motion ---------------- */
const motionOk = () => !!window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function animateIn(root) {
  if (!motionOk()) return;
  const els = $$('[data-anim]', root).slice(0, 24);
  if (els.length) { gsap.fromTo(els, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.045, ease: 'power3.out', clearProps: 'transform,opacity' }); setTimeout(() => gsap.set(els, { clearProps: 'transform,opacity' }), 1600); }
  $$('.k-value[data-count]', root).forEach((el) => { const target = Number(el.dataset.count); if (!target) return; const o = { v: 0 }; gsap.to(o, { v: target, duration: 0.9, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); } }); setTimeout(() => { el.textContent = target; }, 1600); });
}
function animateLayer(layer, isModal) {
  if (!motionOk()) return;
  const ov = $('.overlay', layer); if (ov) gsap.fromTo(ov, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  const target = $(isModal ? '.modal' : '.drawer', layer); if (!target) return;
  if (isModal) gsap.fromTo(target, { opacity: 0, y: 16, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'power3.out', clearProps: 'transform' });
  else gsap.fromTo(target, { x: 48, opacity: 0 }, { x: 0, opacity: 1, duration: 0.38, ease: 'expo.out', clearProps: 'transform' });
  setTimeout(() => { if (target.isConnected) gsap.set([target, ov].filter(Boolean), { clearProps: 'transform,opacity' }); }, 900);
}

/* ---------------- toast & tooltip ---------------- */
function toast(msg, kind = 'good') {
  const host = $('#toasts'); const el = document.createElement('div'); el.className = `toast ${kind}`; el.innerHTML = `${ic(kind === 'crit' ? 'alert' : kind === 'info' ? 'info' : 'check')}<span></span>`; el.querySelector('span').textContent = msg; host.appendChild(el);
  if (motionOk()) gsap.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' });
  setTimeout(() => { if (motionOk()) gsap.to(el, { opacity: 0, y: 8, duration: 0.25, onComplete: () => el.remove() }); else el.remove(); setTimeout(() => el.remove(), 400); }, kind === 'crit' ? 5200 : 3400);
}
const tip = { el: null };
function showTip(x, y, title, rows) {
  const el = tip.el || (tip.el = $('#tip')); el.innerHTML = '';
  if (title) { const t = document.createElement('div'); t.className = 't-title'; t.textContent = title; el.appendChild(t); }
  (rows || []).forEach((r) => { const d = document.createElement('div'); d.className = 't-row'; d.style.setProperty('--c', r.c || 'transparent'); if (r.c) d.appendChild(document.createElement('i')); const b = document.createElement('b'); b.textContent = r.v; const s = document.createElement('span'); s.textContent = r.l; d.appendChild(b); d.appendChild(s); el.appendChild(d); });
  el.classList.add('show'); positionTip(x, y);
}
function positionTip(x, y) { const el = tip.el; const w = el.offsetWidth, h = el.offsetHeight; let left = x + 14, top = y + 14; if (left + w > window.innerWidth - 8) left = x - w - 14; if (top + h > window.innerHeight - 8) top = y - h - 14; el.style.left = left + 'px'; el.style.top = top + 'px'; }
function hideTip() { if (tip.el) tip.el.classList.remove('show'); $$('[data-cross]').forEach((c) => { c.style.opacity = 0; }); }
function tipFrom(el, x, y) {
  const rows = el.dataset.tipRows ? JSON.parse(el.dataset.tipRows).map((r) => ({ c: r.c, l: r.l, v: String(r.v) })) : null;
  showTip(x, y, el.dataset.tip, rows);
  if (el.dataset.crossX) { const svg = el.closest('svg'); const c = svg && svg.querySelector('[data-cross]'); if (c) { c.setAttribute('x1', el.dataset.crossX); c.setAttribute('x2', el.dataset.crossX); c.style.opacity = 1; } }
}

/* ---------------- CSV export ---------------- */
function csvExport() {
  const sts = stages().filter((s) => s.kind !== 'start' && s.kind !== 'end');
  const head = ['Task ID', 'Title', 'Type', 'Team', 'Priority', 'Status', 'Stage', 'Round', 'Requester', 'Assignee', 'Raised', 'Assigned', 'Due', 'Approved', 'Approved by', 'TAT target (h)', 'Production TAT (h)', 'TAT met', 'End-to-end (h)', ...sts.flatMap((s) => [`${s.name} time (h)`, `${s.name} limit (h)`, `${s.name} result`])];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const iso = (ts) => ts ? new Date(ts).toISOString() : '';
  const rows = S.requests.map((r) => { const a = assigneeOf(r); const res = r.result; return [r.id, r.title, r.type, teamName(r.team), r.priority, r.status, (stageById(r.stage) || {}).name, r.round || 1, r.requester ? r.requester.name : '', a ? a.name : '', iso(r.createdAt), iso(r.assignedAt), r.dueDate || '', iso(r.completedAt), res && res.approvedBy ? res.approvedBy.name : '', r.tatHours || '', res ? res.actualHours : (productionTat(r) / H).toFixed(1), res ? (res.met ? 'yes' : 'no') : '', (totalTat(r) / H).toFixed(1), ...sts.flatMap((s) => { const vs = (r.visits || []).filter((v) => v.stage === s.id); if (!vs.length) return ['', stageLimitMs(s, r) / H || '', '']; const t = stageTat(r, s.id); const lim = stageLimitMs(s, r); return [(t / H).toFixed(1), lim / H || '', vs.some((v) => visitBreached(v, r)) ? 'over' : lim ? 'within' : 'no limit']; })]; });
  return [head, ...rows].map((r) => r.map(q).join(',')).join('\n');
}
async function doExport() {
  const data = csvExport(); const filename = `creative-request-ops-tasks-${isoToday()}.csv`;
  if (S.downloads) { try { await S.downloads.save({ filename, data }); toast('CSV saved'); } catch (e) { if (e && e.code !== 'declined') toast('Could not save the file here.', 'crit'); } return; }
  try { const blob = new Blob([data], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); toast('CSV downloaded'); } catch (e) { toast('Downloads are not available in this view.', 'crit'); }
}

/* ---------------- events ---------------- */
function formData(form) { const o = {}; new FormData(form).forEach((v, k) => { if (k in o) { o[k] = [].concat(o[k], v); } else o[k] = v; }); return o; }
function parseRequestForm(form) {
  const f = formData(form);
  const refs = String(f.refs || '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const bad = refs.find((u) => !isUrl(u)); if (bad) { toast(`"${bad.slice(0, 40)}" is not a link — use full https:// URLs.`, 'crit'); return null; }
  return { title: f.title.trim(), request: (f.request || '').trim(), typeId: f.typeId, priority: f.priority, dueDate: f.dueDate || null, refs };
}
const daysToHours = (v) => Math.round(Number(v) * 24 * 2) / 2 || 0;
function openRequest(id) { if (!getReq(id)) return toast('That request no longer exists.', 'crit'); S.modal = null; S.drawer = id; syncLayer(); if (location.hash !== `#/r/${id}`) history.replaceState(null, '', `#/r/${id}`); }
function closeDrawer() { S.drawer = null; syncLayer(); if (location.hash.startsWith('#/r/')) history.replaceState(null, '', `#/${S.route.view}`); }
function openModal(m) { S.modal = m; syncLayer(); }
function closeModal() { S.modal = null; syncLayer(); }
function confirmBox(opts) { return new Promise((res) => { S.modal = { type: 'confirm', ...opts, _res: res }; syncLayer(); }); }
function noteBox(opts) { return new Promise((res) => { S.modal = { type: 'note', ...opts, _res: res }; syncLayer(); }); }

document.addEventListener('click', async (e) => {
  const openEl = e.target.closest('[data-open]'); if (openEl && !e.target.closest('a')) { openRequest(openEl.dataset.open); return; }
  const modeEl = e.target.closest('[data-mode]'); if (modeEl) { S.boardMode = modeEl.dataset.mode; localStorage.setItem(LS.boardMode, S.boardMode); renderPage(false); return; }
  const tog = e.target.closest('[data-toggle]'); if (tog) { S.filters[tog.dataset.toggle] = !S.filters[tog.dataset.toggle]; renderPage(false); return; }
  const sortEl = e.target.closest('[data-sort]'); if (sortEl) { const k = sortEl.dataset.sort; if (S.sort.key === k) S.sort.dir = S.sort.dir === 'asc' ? 'desc' : 'asc'; else S.sort = { key: k, dir: ['title', 'assignee', 'type'].includes(k) ? 'asc' : 'desc' }; renderPage(false); return; }
  const revEl = e.target.closest('[data-review]'); if (revEl) { const form = revEl.closest('form'); const note = form.querySelector('[name=note]').value.trim(); const id = S.drawer; const r = getReq(id); const st = stageById(r.stage); const nx = nextStage(r.stage); const isFinal = nx && nx.kind === 'end'; if (revEl.dataset.review === 'approve') { if (!(await confirmBox({ title: isFinal ? 'Give final approval?' : `Pass ${st.name}?`, sub: isFinal ? `The task closes and ${assigneeOf(r) ? assigneeOf(r).name + "'s" : 'the'} production TAT is recorded.` : `It goes to ${(nx.reviewers || []).map((sp) => reviewerLabel(sp, r)).join(' or ')} for final approval.`, confirm: 'Approve' }))) return; await actApprove(id, note); } else { if (!note) { toast('Tell the team what to change first.', 'crit'); form.querySelector('[name=note]').focus(); return; } await actRequestEdits(id, note); } return; }
  const act = e.target.closest('[data-action]'); if (!act) return;
  if (act.classList.contains('overlay') || act.classList.contains('modal-wrap')) { if (e.target !== act) return; }
  const a = act.dataset.action; const id = act.dataset.id || S.drawer;
  switch (a) {
    case 'new': if (!canCreate()) return; S.drawer = null; openModal({ type: 'new' }); break;
    case 'close-modal': { const m = S.modal; closeModal(); if (m && m._res) m._res(false); break; }
    case 'confirm-ok': { const m = S.modal; closeModal(); if (m && m._res) m._res(true); break; }
    case 'close-drawer': closeDrawer(); break;
    case 'gate-back': S.gatePending = null; renderAll(false); break;
    case 'signout': if (S.authMode === 'clerk' && S.clerk) { try { await S.clerk.signOut(); } catch (e) { /* ignore */ } location.assign(pageUrl()); return; } localStorage.removeItem(LS.me); S.me = null; S.drawer = null; S.modal = null; S.flowDraft = null; S.settingsDraft = null; S.gatePending = null; renderAll(true); break;
    case 'edit': openModal({ type: 'edit', id }); break;
    case 'save-brief': { const form = act.closest('form'); const f = formData(form); await actSaveBrief(id, { brief: (f.brief || '').trim(), team: f.team, tatHours: daysToHours(f.tatDays) }); break; }
    case 'set-tat': { const form = act.closest('form'); const f = formData(form); await actSetTat(id, daysToHours(f.tatDays)); break; }
    case 'submit': await actSubmit(id); break;
    case 'reopen': if (await confirmBox({ title: 'Reopen this task?', sub: 'It goes back into production as a new round.', confirm: 'Reopen' })) await actReopen(id); break;
    case 'cancel': { const note = await noteBox({ kind: 'cancel', title: 'Cancel this request?', sub: 'It leaves the board but stays in the list for reporting.', label: 'Reason (optional)', required: false, confirm: 'Cancel request', danger: true }); if (note === false) return; await actCancel(id, note); break; }
    case 'delete': if (await confirmBox({ title: 'Delete this request permanently?', sub: 'This removes it from every report. Prefer Cancel unless it was a mistake.', confirm: 'Delete', danger: true })) { await actDelete(id); closeDrawer(); } break;
    case 'add-member': openModal({ type: 'member' }); break;
    case 'edit-member': openModal({ type: 'member', id }); break;
    case 'remove-member': { const m = S.members.find((x) => x.id === id); if (await confirmBox({ title: `Remove ${m ? m.name : 'this teammate'}?`, sub: 'They can no longer sign in. Their past work stays on the tasks.', confirm: 'Remove', danger: true })) await removeMember(id); break; }
    case 'add-role': openModal({ type: 'role' }); break;
    case 'remove-role': { const s = clone(S.settings); s.roles = roles().filter((r) => r.id !== id); await saveSettings(s, 'Role removed'); S.settingsDraft = null; break; }
    case 'add-stage': { const f = S.flowDraft; const n = f.stages.length; const name = 'New stage'; f.stages.splice(n - 1, 0, { id: slug(name) + '-' + uid().slice(0, 4), name, role: 'coordinator', slaHours: 24, kind: 'review', reviewers: ['role:coordinator'], editsTo: (f.stages.find((x) => x.kind === 'work') || {}).id || '', color: '#0E9384' }); renderPage(false); break; }
    case 'stage-up': case 'stage-down': { const f = S.flowDraft; const i = Number(act.dataset.i); const j = a === 'stage-up' ? i - 1 : i + 1; [f.stages[i], f.stages[j]] = [f.stages[j], f.stages[i]]; renderPage(false); break; }
    case 'stage-del': { const f = S.flowDraft; const s = f.stages[Number(act.dataset.i)]; if (await confirmBox({ title: `Remove the ${s.name} stage?`, sub: 'Past timing data for this stage stays on old tasks.', confirm: 'Remove', danger: true })) { f.stages.splice(Number(act.dataset.i), 1); f.stages.forEach((x) => { if (x.editsTo === s.id) x.editsTo = (f.stages.find((y) => y.kind === 'work') || {}).id || ''; }); renderPage(false); } break; }
    case 'reset-flow': S.flowDraft = clone(S.flow); renderPage(false); toast('Changes discarded', 'info'); break;
    case 'save-flow': { const f = clone(S.flowDraft); const err = validateFlow(f); if (err) return toast(err, 'crit'); await saveFlow(f); S.flowDraft = clone(S.flow); renderPage(false); break; }
    case 'toggle-wh': S.settingsDraft.workHours.enabled = !S.settingsDraft.workHours.enabled; renderPage(false); break;
    case 'add-type': S.settingsDraft.types.push({ id: 'type-' + uid().slice(0, 5), name: '', team: 'design', tatHours: 72, from: '', goesTo: '' }); renderPage(false); setTimeout(() => { const last = $$('[data-ty="name"]').pop(); if (last) last.focus(); }, 0); break;
    case 'del-type': S.settingsDraft.types.splice(Number(act.dataset.i), 1); renderPage(false); break;
    case 'del-prio': S.settingsDraft.priorities.splice(Number(act.dataset.i), 1); renderPage(false); break;
    case 'save-settings': { const st = clone(S.settingsDraft); st.prefix = (st.prefix || 'BB').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'BB'; st.types = st.types.map((t) => ({ ...t, name: String(t.name || '').trim(), tatHours: Number(t.tatHours) || 24 })).filter((t) => t.name); if (!st.types.length) return toast('Keep at least one request type.', 'crit'); const names = new Set(); for (const t of st.types) { if (names.has(lower(t.name))) return toast(`Two types are called "${t.name}".`, 'crit'); names.add(lower(t.name)); } if (!st.priorities.length) return toast('Keep at least one priority.', 'crit'); st.allowedDomains = String(st.allowedDomains || '').split(/[,\s]+/).map((d) => lower(d).replace(/^@/, '')).filter(Boolean); if (st.workHours.enabled && st.workHours.end <= st.workHours.start) return toast('The working day must end after it starts.', 'crit'); if (st.workHours.enabled && !st.workHours.days.length) return toast('Pick at least one working day.', 'crit'); await saveSettings(st); S.settingsDraft = clone(S.settings); renderPage(false); break; }
    case 'export': await doExport(); break;
    case 'remove-samples': if (await confirmBox({ title: 'Remove all sample requests?', sub: 'Sample tasks are deleted for everyone. The team roster stays.', confirm: 'Remove samples', danger: true })) await removeSamples(); break;
    case 'reset-demo': if (S.store.reset && await confirmBox({ title: 'Reset the demo workspace?', sub: 'Everything in this browser goes back to the sample state.', confirm: 'Reset', danger: true })) { S.store.reset(); S.flow = clone(DEFAULT_FLOW); S.settings = clone(DEFAULT_SETTINGS); S.flowDraft = null; S.settingsDraft = null; renderAll(true); } break;
  }
});
function validateFlow(f) {
  if (f.stages.length < 3) return 'A flow needs at least a start, one stage and an end.';
  if (f.stages[0].kind !== 'start' || f.stages[f.stages.length - 1].kind !== 'end') return 'The first stage must be the start and the last must be the end.';
  if (!f.stages.some((s) => s.kind === 'work')) return 'Add at least one work stage.';
  const ids = new Set(); for (const s of f.stages) { s.name = String(s.name || '').trim(); if (!s.name) return 'Every stage needs a name.'; if (ids.has(s.id)) return 'Duplicate stage id.'; ids.add(s.id); s.slaHours = Math.max(0, Number(s.slaHours) || 0); if (s.kind === 'review') { if (!(s.reviewers || []).length) return `${s.name} needs at least one approver.`; if (!f.stages.some((x) => x.id === s.editsTo && x.kind === 'work')) s.editsTo = f.stages.find((x) => x.kind === 'work').id; } if ((s.kind === 'triage' || s.kind === 'work') && !s.role) return `${s.name} needs an owner.`; if (s.kind === 'work' && s.slaFrom !== 'task') delete s.slaFrom; }
  return null;
}
document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-form]'); if (!form) return; e.preventDefault();
  const kind = form.dataset.form; const f = formData(form);
  switch (kind) {
    case 'signin': trySignIn(f.email); break;
    case 'register': await registerAndSignIn(S.gatePending, f.name); break;
    case 'bootstrap': { const doc = { email: lower(f.email), name: f.name.trim(), roles: ['admin', 'requester'], active: true }; await saveMember(doc, true); localStorage.setItem(LS.me, doc.email); S.me = S.members.find((x) => sameEmail(x.email, doc.email)); S.bootstrap = false; renderAll(true); break; }
    case 'new': { const d = parseRequestForm(form); if (!d) return; form.querySelector('[type=submit]').disabled = true; closeModal(); const r = await createRequest(d); openRequest(r.id); break; }
    case 'edit': { const d = parseRequestForm(form); if (!d) return; closeModal(); await actEdit(form.dataset.id, d); break; }
    case 'triage': await actAssign(S.drawer, { brief: (f.brief || '').trim(), team: f.team, email: f.email, tatHours: daysToHours(f.tatDays) }); break;
    case 'reassign': if (!f.email) return toast('Choose who to reassign to.', 'info'); await actReassign(S.drawer, f.email); break;
    case 'member': { const rolesSel = [].concat(f.roles || []); if (!rolesSel.length) return toast('Pick at least one role.', 'crit'); const existing = form.dataset.id ? S.members.find((x) => x.id === form.dataset.id) : null; const newEmail = lower(f.email); if (S.members.some((x) => sameEmail(x.email, newEmail) && (!existing || x.id !== existing.id))) return toast('That email is already on the team.', 'crit'); const wasAdminSelf = existing && isMe(existing) && hasRole(existing, 'admin'); if (wasAdminSelf && !rolesSel.includes('admin') && !sameEmail(existing.email, APP.ownerEmail)) return toast('You cannot remove your own admin role.', 'crit'); closeModal(); if (existing && !sameEmail(existing.email, newEmail)) { await removeMemberQuiet(existing.id); } await saveMember({ ...(existing || {}), email: newEmail, name: f.name, roles: rolesSel, active: existing ? !!f.active : true, emailUnconfirmed: undefined }, !existing); if (existing && isMe(existing)) { const me = S.members.find((x) => sameEmail(x.email, newEmail)); if (me) { S.me = me; localStorage.setItem(LS.me, newEmail); } } renderAll(false); break; }
    case 'role': { const s = clone(S.settings); s.roles = roles().slice(); const rid = slug(f.name); if (s.roles.some((r) => r.id === rid)) return toast('A role with that name already exists.', 'crit'); s.roles.push({ id: rid, name: f.name.trim(), color: f.color || '#0E9384', desc: (f.desc || '').trim() }); closeModal(); await saveSettings(s, 'Role added'); S.settingsDraft = null; break; }
    case 'note': { const m = S.modal; closeModal(); if (m && m._res) m._res(f.text.trim()); break; }
    case 'deliverable': { if (!isUrl(f.url)) return toast('Paste a full https:// link.', 'crit'); form.reset(); await actAddDeliverable(S.drawer, f.url.trim(), (f.label || '').trim()); break; }
    case 'comment': { const t = f.text.trim(); if (!t) return; form.reset(); await actComment(S.drawer, t); break; }
    case 'add-prio': { const v = f.v.trim(); if (v && !S.settingsDraft.priorities.includes(v)) S.settingsDraft.priorities.push(v); renderPage(false); break; }
  }
});
async function removeMemberQuiet(id) { S.members = S.members.filter((m) => m.id !== id); try { await S.store.del('members', id); } catch (e) { /* best effort */ } }
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'q') { S.q = t.value; clearTimeout(S._qT); S._qT = setTimeout(() => renderPage(false), 120); return; }
  if (t.dataset.triageTeam !== undefined) { const team = t.value; const who = $('[data-triage-who]'); if (who) { const eligible = membersWithRole(team); who.innerHTML = `<option value="">${eligible.length ? 'Choose…' : 'No one on this team yet'}</option>` + eligible.map((m) => `<option value="${attr(m.email)}">${esc(m.name)}</option>`).join(''); } return; }
  if (t.dataset.sf !== undefined && S.flowDraft) { const row = t.closest('.stage-editor'); const s = S.flowDraft.stages[Number(row.dataset.i)]; const k = t.dataset.sf; if (k === 'needsFile') s.needsFile = t.checked; else if (k === 'reviewer') { const set = new Set(s.reviewers || []); if (t.checked) set.add(t.value); else set.delete(t.value); s.reviewers = [...set]; } else if (k === 'slaHours') s.slaHours = Math.max(0, Number(t.value) || 0); else s[k] = t.value; if (k === 'kind' || k === 'slaFrom') { if (s.kind === 'review') { s.reviewers ||= ['role:coordinator']; if (!s.editsTo) s.editsTo = (S.flowDraft.stages.find((x) => x.kind === 'work') || {}).id || ''; } if (s.kind === 'work' && !s.role) s.role = 'team'; if (s.kind === 'triage' && (!s.role || s.role === 'team')) s.role = 'coordinator'; renderPage(false); return; } if (['color', 'name', 'slaHours', 'role', 'reviewer', 'editsTo'].includes(k)) { const fd = $('.flow-diagram'); if (fd) fd.outerHTML = flowDiagram(S.flowDraft); } return; }
  if (t.dataset.ty !== undefined && S.settingsDraft) { const ty = S.settingsDraft.types[Number(t.dataset.i)]; if (!ty) return; const k = t.dataset.ty; if (k === 'tatDays') ty.tatHours = daysToHours(t.value); else ty[k] = t.value; if (k === 'name' && !ty._idLocked && String(ty.id || '').startsWith('type-')) { /* keep generated id */ } return; }
  if (t.dataset.ss !== undefined && S.settingsDraft) { const k = t.dataset.ss; if (k === 'start' || k === 'end') S.settingsDraft.workHours[k] = Number(t.value); else if (k === 'slaWarnAt') { S.settingsDraft.slaWarnAt = Number(t.value) / 100; const p = $('#warn-pct'); if (p) p.textContent = t.value + '%'; } else S.settingsDraft[k] = t.value; return; }
  if (t.dataset.day !== undefined && S.settingsDraft) { const d = Number(t.dataset.day); const days = S.settingsDraft.workHours.days; if (t.checked && !days.includes(d)) days.push(d); if (!t.checked) S.settingsDraft.workHours.days = days.filter((x) => x !== d); return; }
});
document.addEventListener('change', (e) => { const t = e.target; if (t.dataset.filter) { S.filters[t.dataset.filter] = t.value; renderPage(false); } });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (S.modal) { const m = S.modal; closeModal(); if (m._res) m._res(false); } else if (S.drawer) closeDrawer(); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card[data-open]')) { e.preventDefault(); openRequest(e.target.dataset.open); }
});
document.addEventListener('pointermove', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) tipFrom(el, e.clientX, e.clientY); else hideTip(); });
document.addEventListener('pointerleave', hideTip, true);
document.addEventListener('focusin', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); tipFrom(el, r.left + r.width / 2, r.top); } });
document.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('[data-tip]')) hideTip(); });
try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.me) renderAll(false); }); } catch (e) { /* older browsers */ }
try { new MutationObserver(() => { if (S.me) renderAll(false); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { /* ignore */ }

/* ---------------- routing ---------------- */
function readRoute() {
  const h = location.hash.replace(/^#\/?/, ''); const [seg, arg] = h.split('/');
  if (seg === 'r' && arg) { S.drawer = decodeURIComponent(arg); if (!S._routed) S.route.view = 'board'; S._routed = true; return; }
  S._routed = true;
  S.route.view = VIEWS[seg] ? seg : 'dashboard';
  if (S.route.view === 'settings' && S.me && !isAdmin()) S.route.view = 'dashboard';
  if (S.route.view !== 'flow') S.flowDraft = null; if (S.route.view !== 'settings') S.settingsDraft = null;
}
window.addEventListener('hashchange', () => { const before = S.route.view; readRoute(); if (S.route.view !== before) { S.drawer = null; window.scrollTo({ top: 0 }); } renderAll(S.route.view !== before); });

/* ---------------- boot ---------------- */
function normalizeSettings(settings) {
  const s = { ...clone(DEFAULT_SETTINGS), ...(settings || {}) };
  s.workHours = { ...DEFAULT_SETTINGS.workHours, ...((settings && settings.workHours) || {}) };
  if (!Array.isArray(s.types) || !s.types.length) s.types = clone(DEFAULT_TYPES);
  s.types = s.types.map((t) => typeof t === 'string' ? { id: slug(t), name: t, team: 'design', tatHours: 72 } : { tatHours: 72, team: 'design', ...t, id: t.id || slug(t.name) });
  if (!Array.isArray(s.allowedDomains)) s.allowedDomains = clone(DEFAULT_SETTINGS.allowedDomains);
  if (!Array.isArray(s.roles) || !s.roles.length) s.roles = clone(DEFAULT_ROLES);
  return s;
}
function subscribeAll() {
  const onErr = (e) => { if (e && (e.code === 'revoked' || e.code === 'not_granted')) { S.dbError = e.code; toast('Your access to this workspace changed — reload to continue.', 'crit'); } };
  S.store.subscribe('members', (rows) => { S.members = rows; S.loaded.members = true; if (S.authMode === 'clerk') { resolveIdentity().then(() => renderAll(false)); return; } if (S.me) { const fresh = rows.find((m) => sameEmail(m.email, S.me.email)); if (!fresh || fresh.active === false) { if (!sameEmail(S.me.email, APP.ownerEmail)) { S.me = null; localStorage.removeItem(LS.me); toast('Your access was changed by an admin.', 'info'); } } else S.me = fresh; } else if (S.loaded.members) { const saved = localStorage.getItem(LS.me); if (saved) { const m = rows.find((x) => sameEmail(x.email, saved) && x.active !== false); if (m) S.me = m; } } S.bootstrap = S.loaded.members && rows.length === 0; renderAll(false); }, onErr);
  S.store.subscribe('requests', (rows) => { S.requests = rows.map((r) => ({ visits: [], thread: [], deliverables: [], assignees: {}, refs: [], ...r })).sort((a, b) => (a.num || 0) - (b.num || 0)); S.loaded.requests = true; renderAll(false); }, onErr);
  S.store.subscribe('config', (rows) => { const flow = rows.find((r) => r.id === 'flow'); const settings = rows.find((r) => r.id === 'settings'); if (flow && Array.isArray(flow.stages) && flow.stages.length && flow.stages.some((s) => s.kind === 'triage')) S.flow = flow; S.settings = normalizeSettings(settings); S.loaded.config = true; renderAll(false); }, onErr);
}
/* ---------------- Clerk (real identity on the website) ---------------- */
const pageUrl = () => location.href.split('#')[0];
const cssVar = (n, fb) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb;
const clerkAppearance = () => ({ variables: { colorPrimary: cssVar('--accent', '#1F4FD1'), colorText: cssVar('--ink', '#0F172A'), colorTextSecondary: cssVar('--ink-2', '#46546B'), colorNeutral: cssVar('--ink', '#0F172A'), colorBackground: cssVar('--surface', '#ffffff'), colorInputBackground: cssVar('--surface-2', '#EAEEF5'), colorInputText: cssVar('--ink', '#0F172A'), colorDanger: cssVar('--crit-mark', '#E5484D'), borderRadius: '10px', fontFamily: '"Instrument Sans", system-ui, sans-serif', fontSize: '15px' }, elements: { cardBox: { boxShadow: 'none', border: '1px solid ' + cssVar('--border', '#D9E0EA') }, footer: { background: 'transparent' } } });
function waitForClerk(ms = 12000) { return new Promise((res) => { const t0 = Date.now(); (function tick() { if (window.Clerk) return res(window.Clerk); if (window.__clerkLoadFailed || Date.now() - t0 > ms) return res(null); setTimeout(tick, 100); })(); }); }
function clerkIdentity() { const u = S.clerk && S.clerk.user; if (!u) return null; const email = lower(u.primaryEmailAddress && u.primaryEmailAddress.emailAddress); const name = u.fullName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || (email ? email.split('@')[0] : 'Someone'); return { authId: u.id, email, name, image: u.imageUrl || null }; }
let clerkSignInEl = null, clerkUserEl = null;
function mountClerkSignIn() { if (S.authMode !== 'clerk' || !S.clerk) return; const el = $('#clerk-signin'); if (!el || el === clerkSignInEl) return; clerkSignInEl = el; try { S.clerk.mountSignIn(el, { forceRedirectUrl: pageUrl(), signUpForceRedirectUrl: pageUrl(), appearance: clerkAppearance() }); } catch (e) { console.warn('mountSignIn', e); } }
function mountClerkUserButton() { if (S.authMode !== 'clerk' || !S.clerk) return; const el = $('#clerk-user'); if (!el || el === clerkUserEl) return; clerkUserEl = el; try { S.clerk.mountUserButton(el, { afterSignOutUrl: pageUrl(), appearance: clerkAppearance() }); } catch (e) { console.warn('mountUserButton', e); } }
function unmountClerk() { if (!S.clerk) return; try { if (clerkSignInEl && clerkSignInEl.isConnected) S.clerk.unmountSignIn(clerkSignInEl); } catch (e) { /* ignore */ } try { if (clerkUserEl && clerkUserEl.isConnected) S.clerk.unmountUserButton(clerkUserEl); } catch (e) { /* ignore */ } clerkSignInEl = null; clerkUserEl = null; }
/* Match the signed-in Clerk account to the roster; first-timers on an allowed domain become Requesters. */
let registering = false;
async function resolveIdentity() {
  if (S.authMode !== 'clerk') return;
  const id = S.identity; if (!id || !id.email) { S.me = null; return; }
  const m = S.members.find((x) => sameEmail(x.email, id.email));
  if (m) {
    if (m.active === false) { S.me = null; S.gateError = 'Your account is inactive — ask an admin to reactivate it.'; return; }
    S.gateError = '';
    S.me = { ...m, authId: id.authId, image: id.image };
    if (!registering && (m.authId !== id.authId || (m.emailUnconfirmed))) { registering = true; try { await saveMember({ ...m, authId: id.authId, emailUnconfirmed: undefined }, 'quiet'); } finally { registering = false; } }
    return;
  }
  if (!S.loaded.members || registering) return;
  const domains = (S.settings.allowedDomains || []).map(lower);
  const owner = sameEmail(id.email, APP.ownerEmail);
  if (!owner && domains.length && !domains.includes(emailDomain(id.email))) { S.me = null; S.gateError = `${id.email} is not on an allowed domain (${domains.map((d) => '@' + d).join(', ')}). Ask an admin to add you.`; return; }
  registering = true;
  try { await saveMember({ email: id.email, name: id.name, roles: owner ? ['admin', 'requester'] : ['requester'], active: true, selfRegistered: !owner, authId: id.authId }, 'quiet'); }
  finally { registering = false; }
  S.me = { ...S.members.find((x) => sameEmail(x.email, id.email)), authId: id.authId, image: id.image };
  toast(`Welcome, ${firstName(id)} — you can raise requests right away`);
}
async function boot() {
  readRoute();
  const cfg = CFG;
  if (!inArtifact() && cfg.clerkPublishableKey) S.authMode = 'clerk';
  renderAll(false);
  let db = null, downloads = null;
  if (inArtifact()) {
    try { [db, downloads] = await Promise.all([window.claude.use('db'), window.claude.use('downloads')]); } catch (e) { db = null; }
  }
  S.downloads = downloads;
  if (S.authMode === 'clerk') {
    const clerk = await waitForClerk();
    if (!clerk) { S.clerkState = 'failed'; S.authMode = 'roster'; toast('Sign-in service did not load — using roster sign-in for now.', 'crit'); }
    else {
      S.clerk = clerk;
      try { await clerk.load({ appearance: clerkAppearance() }); S.clerkState = 'ready'; } catch (e) { console.error(e); S.clerkState = 'failed'; }
      S.identity = clerkIdentity();
      clerk.addListener(({ user }) => { const next = user ? clerkIdentity() : null; const changed = (next && next.email) !== (S.identity && S.identity.email); S.identity = next; if (changed) { if (!next) { S.me = null; S.drawer = null; S.modal = null; } resolveIdentity().then(() => renderAll(true)); } });
    }
  }
  if (S.authMode === 'clerk' && cfg.supabaseUrl && cfg.supabaseKey && window.supabase && S.clerk) {
    const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { accessToken: async () => { try { return S.clerk.session ? await S.clerk.session.getToken() : null; } catch (e) { return null; } } });
    S.store = new SupabaseStore(client); S.mode = 'live'; S.backend = 'supabase';
  } else if (db) { S.store = new DbStore(db); S.mode = 'live'; S.backend = 'artifact'; }
  else { S.store = new LocalStore(); S.mode = 'demo'; S.backend = 'local'; }
  renderAll(false);
  subscribeAll();
  setInterval(() => { if (document.hidden) return; const ae = document.activeElement; const typing = ae && (ae.tagName === 'TEXTAREA' || (ae.tagName === 'INPUT' && ae.type !== 'search')); if (!typing && S.me) { renderPage(false); if (S.drawer && !S.modal) syncLayer(); } }, 60000);
}
if (window.gsap && window.Flip) { try { gsap.registerPlugin(Flip); } catch (e) { /* optional */ } }
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
