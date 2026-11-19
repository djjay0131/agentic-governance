#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  gitRoot, gitSha, resolveDataDir, sha256File, stableStringify, toCsv,
} from './lib.mjs';

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
const CANON_ROOT = path.resolve(HARNESS_DIR, '..', '..', '..');
const DELTA_REL = 'llm/governance/governance-delta.md';
const DEFAULT_API = 'https://api.github.com';

const LEVELS = ['L0', 'L1', 'L2', 'L3'];
const LEVEL_RANK = { L0: 0, L1: 1, L2: 2, L3: 3 };

function argValue(args, flag, fallback = null) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
}

function apiBase() {
  return (process.env.GITHUB_API_URL || DEFAULT_API).replace(/\/+$/, '');
}

function api(pathname, query = null) {
  const url = new URL(apiBase() + pathname);
  if (query) {
    for (const key of Object.keys(query).sort()) {
      if (query[key] !== undefined && query[key] !== null) url.searchParams.set(key, query[key]);
    }
  }
  return url.toString();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeStable(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stableStringify(value));
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function safeName(value) {
  return String(value).replace(/[^A-Za-z0-9._-]/g, '__');
}

function parseNext(link) {
  if (!link) return null;
  for (const part of link.split(',')) {
    const m = part.match(/<([^>]+)>;\s*rel="?next"?/);
    if (m) return m[1];
  }
  return null;
}

function authToken() {
  const env = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (env && env.trim()) return env.trim();
  try {
    const token = execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (token) return token;
  } catch (error) {
    void error;
  }
  throw new Error('authentication required: set GITHUB_TOKEN or run `gh auth login`');
}

async function fetchJson(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'agentic-governance-census',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (res.status >= 400) {
    const error = new Error(`${url}: HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return { status: res.status, body, next: parseNext(res.headers.get('link')) };
}

async function fetchPages(url, token) {
  const out = [];
  const seen = new Set();
  let next = url;
  while (next) {
    if (seen.has(next)) break;
    seen.add(next);
    const page = await fetchJson(next, token);
    out.push(page.body);
    next = page.next;
  }
  return out;
}

class ResponseCache {
  constructor(dir) {
    this.dir = dir;
    this.indexFile = path.join(dir, 'index.json');
    this.requests = new Map();
    this.repos = new Map();
  }

  load() {
    if (!fs.existsSync(this.indexFile)) return this;
    const index = readJson(this.indexFile);
    for (const entry of index.requests || []) this.requests.set(entry.key, entry);
    for (const entry of index.repos || []) this.repos.set(entry.repo, entry);
    return this;
  }

  async record(url, token) {
    const key = `GET ${url}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'agentic-governance-census',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    const text = await res.text();
    const file = path.join('requests', `${sha256Text(key)}.json`);
    fs.mkdirSync(path.join(this.dir, 'requests'), { recursive: true });
    fs.writeFileSync(path.join(this.dir, file), text);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
    const entry = {
      key,
      status: res.status,
      file,
      sha256: sha256Text(text),
      next: parseNext(res.headers.get('link')),
    };
    this.requests.set(key, entry);
    return { ...entry, body };
  }

  async recordPages(url, token) {
    const out = [];
    const seen = new Set();
    let next = url;
    while (next) {
      if (seen.has(next)) break;
      seen.add(next);
      const page = await this.record(next, token);
      out.push(page.body);
      next = page.next;
    }
    return out;
  }

  get(url) {
    const key = `GET ${url}`;
    const entry = this.requests.get(key);
    if (!entry) throw new Error(`offline cache miss: ${key}`);
    const text = fs.readFileSync(path.join(this.dir, entry.file), 'utf8');
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
    return { status: entry.status, body, next: entry.next };
  }

  getPages(url) {
    const out = [];
    const seen = new Set();
    let next = url;
    while (next) {
      if (seen.has(next)) break;
      seen.add(next);
      const page = this.get(next);
      out.push(page.body);
      next = page.next;
    }
    return out;
  }

  setRepo(entry) {
    this.repos.set(entry.repo, entry);
  }

  getRepo(repo) {
    const entry = this.repos.get(repo);
    if (!entry) throw new Error(`offline cache miss: repo ${repo}`);
    return entry;
  }

  save() {
    const requests = [...this.requests.values()].sort((a, b) => a.key.localeCompare(b.key));
    const repos = [...this.repos.values()].sort((a, b) => a.repo.localeCompare(b.repo));
    writeStable(this.indexFile, { requests, repos });
  }

  hash() {
    const requests = [...this.requests.values()]
      .map((e) => ({ key: e.key, status: e.status, sha256: e.sha256, next: e.next || null }))
      .sort((a, b) => a.key.localeCompare(b.key));
    const repos = [...this.repos.values()]
      .map((e) => ({
        repo: e.repo, default_branch: e.default_branch, pinned_sha: e.pinned_sha, refs: e.refs,
      }))
      .sort((a, b) => a.repo.localeCompare(b.repo));
    return sha256Text(stableStringify({ requests, repos }));
  }
}

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options,
  });
}

function sectionText(text, title) {
  const lines = String(text || '').split('\n');
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heading = new RegExp(`^##\\s+${escaped}\\s*$`, 'i');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (heading.test(lines[i].trim())) { start = i; break; }
  }
  if (start < 0) return '';
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+\S/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}

function relatedRepos(deltaText) {
  const section = sectionText(deltaText, 'Related Repos');
  const repos = [];
  for (const line of section.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length === 0) continue;
    const m = cells[0].match(/`([^`]+)`/);
    if (m && !/^-+$/.test(m[1])) repos.push(m[1]);
  }
  return [...new Set(repos)];
}

function canonOwner(deltaText) {
  const m = String(deltaText || '').match(/https:\/\/github\.com\/([^/\s)]+)\/agentic-governance/);
  return m ? m[1] : 'djjay0131';
}

function decodeContent(body) {
  if (!body || body.content === undefined) return null;
  if (body.encoding === 'base64') return Buffer.from(body.content, 'base64').toString('utf8');
  return String(body.content);
}

function extractCheckCommand(deltaText) {
  const section = sectionText(deltaText, 'Governance Check Command');
  if (!section) return null;
  const candidates = [];
  for (const line of section.split('\n')) {
    if (!/governance-checks\.mjs/.test(line)) continue;
    const ticked = [...line.matchAll(/`([^`]*governance-checks\.mjs[^`]*)`/g)].map((m) => m[1]);
    if (ticked.length > 0) {
      candidates.push(...ticked);
      continue;
    }
    const bare = line.match(/(node\s+[^\n]*governance-checks\.mjs[^\n]*)/);
    if (bare) candidates.push(bare[1]);
  }
  for (const candidate of candidates) {
    const command = candidate.trim().replace(/[.`,]+$/g, '').trim();
    if (/^node\s/.test(command)) return command;
  }
  return candidates.length > 0 ? candidates[0].trim() : null;
}

function parsePinnedVersion(deltaText) {
  for (const line of String(deltaText || '').split('\n')) {
    if (!/^Governance\s*:/i.test(line.trim())) continue;
    const versions = [...line.matchAll(/v?(\d+\.\d+(?:\.\d+)?)/g)].map((m) => m[1]);
    if (versions.length === 0) return null;
    versions.sort((a, b) => b.split('.').length - a.split('.').length
      || b.localeCompare(a, undefined, { numeric: true }));
    return `v${versions[0]}`;
  }
  return null;
}

function semver(value) {
  const m = String(value || '').match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3] || 0)];
}

function compareVersions(a, b) {
  const va = semver(a);
  const vb = semver(b);
  if (!va || !vb) return null;
  for (let i = 0; i < 3; i++) {
    if (va[i] < vb[i]) return -1;
    if (va[i] > vb[i]) return 1;
  }
  return 0;
}

function currentCanonVersion() {
  try {
    return `v${fs.readFileSync(path.join(CANON_ROOT, 'VERSION'), 'utf8').trim().replace(/^v/, '')}`;
  } catch {
    return 'unknown';
  }
}

function levelFromText(value) {
  const text = String(value || '');
  const direct = text.match(/(?:^|[^A-Za-z0-9])(?:gov[-_ ]*)?L([0-3])(?![0-9])/i);
  if (direct) return `L${direct[1]}`;
  const spelled = text.match(/\bLevel\s*([0-3])\b/i);
  if (spelled) return `L${spelled[1]}`;
  return null;
}

function levelFromLabel(name) {
  const text = String(name || '');
  const m = text.match(/(?:^|[^A-Za-z0-9])(?:gov[-_ ]*|level[-_ ]*)?L([0-3])(?![0-9])/i);
  return m ? `L${m[1]}` : null;
}

function isHumanReview(review, author) {
  if (!review || !review.submitted_at || !review.user) return false;
  if (review.user.type === 'Bot') return false;
  if (/\[bot\]$/i.test(review.user.login || '')) return false;
  if (author && review.user.login === author) return false;
  return true;
}

function agentMarkers(pr, messages) {
  const markerSet = new Set();
  const texts = [pr.body || '', ...messages];
  const agentActor = /claude|copilot|codex|opencode|cursor|devin|gemini|gpt|anthropic|\bbot\b/i;
  for (const text of texts) {
    const value = String(text || '');
    if (/^Claude-Session\s*:/im.test(value)) markerSet.add('claude-session');
    if (/^Generated-with\s*:/im.test(value)) markerSet.add('generated-with');
    if (/Generated with \[?Claude(?: Code)?\]?/i.test(value)) markerSet.add('generated-with');
    if (/🤖\s*Generated with/i.test(value)) markerSet.add('generated-with');
    if (/noreply@anthropic\.com/i.test(value)) markerSet.add('anthropic-email');
    for (const m of value.matchAll(/^Co-Authored-By\s*:\s*(.+)$/gim)) {
      if (agentActor.test(m[1])) markerSet.add('co-authored-by');
    }
  }
  return [...markerSet].sort();
}

function reclassification(events) {
  const active = new Map();
  let previous = null;
  let from = null;
  let to = null;
  const sorted = [...events].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || ''))
    || (Number(a.id) || 0) - (Number(b.id) || 0));
  for (const event of sorted) {
    const name = event.label && event.label.name;
    const level = levelFromLabel(name);
    if (!level) continue;
    if (event.event === 'labeled') active.set(name, level);
    else if (event.event === 'unlabeled') active.delete(name);
    else continue;
    let effective = null;
    for (const value of active.values()) {
      if (effective === null || LEVEL_RANK[value] > LEVEL_RANK[effective]) effective = value;
    }
    if (effective === null) continue;
    if (previous && LEVEL_RANK[effective] < LEVEL_RANK[previous] && from === null) {
      from = previous;
      to = effective;
    }
    previous = effective;
  }
  return { downward: from !== null, from, to };
}

function protectionInfo(cached) {
  if (cached.status === 404) {
    return {
      state: 'none', approvals: 0, enforceAdmins: 'no', forcePush: 'no', contexts: [], required: 'no',
    };
  }
  if (cached.status !== 200) {
    return {
      state: 'unavailable', approvals: '', enforceAdmins: '', forcePush: '', contexts: [], required: 'no',
    };
  }
  const body = cached.body || {};
  const rsc = body.required_status_checks;
  const contexts = [
    ...((rsc && rsc.contexts) || []),
    ...(((rsc && rsc.checks) || []).map((c) => c.context)),
  ].filter(Boolean);
  const unique = [...new Set(contexts)].sort();
  return {
    state: 'protected',
    approvals: (body.required_pull_request_reviews
      && body.required_pull_request_reviews.required_approving_review_count) || 0,
    enforceAdmins: body.enforce_admins && body.enforce_admins.enabled ? 'yes' : 'no',
    forcePush: body.allow_force_pushes && body.allow_force_pushes.enabled ? 'yes' : 'no',
    contexts: unique,
    required: unique.some((context) => /governance[-_ ]?checks?/i.test(context)) ? 'yes' : 'no',
  };
}

function ciWorkflows(treeBody) {
  const tree = (treeBody && treeBody.tree) || [];
  return tree
    .filter((entry) => entry.type === 'blob'
      && /^\.github\/workflows\/.+\.(ya?ml)$/i.test(entry.path))
    .map((entry) => entry.path)
    .sort();
}

function runDeclaredCheck(bare, sha, defaultBranch, command) {
  if (!command) return { status: 'not_declared', exit: '', failing: '' };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'census-check-'));
  try {
    git(['clone', '--quiet', '--no-hardlinks', bare, tmp]);
    git(['-C', tmp, 'checkout', '--quiet', '--detach', sha]);
    git(['-C', tmp, 'update-ref', `refs/remotes/origin/${defaultBranch}`, sha]);
    const cmd = command
      .replace(/<canon[\s-]*checkout>/gi, CANON_ROOT)
      .replace(/~\/code\/agentic-governance/g, CANON_ROOT);
    const result = spawnSync('sh', ['-c', cmd], {
      cwd: tmp,
      encoding: 'utf8',
      timeout: 120000,
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: path.join(CANON_ROOT, 'plugin') },
    });
    if (result.error && result.error.code === 'ETIMEDOUT') {
      return { status: 'timeout', exit: '', failing: '' };
    }
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    const failing = [...output.matchAll(/^FAIL\s+(\S+)/gm)].map((m) => m[1]);
    const exit = result.status === null ? 'error' : String(result.status);
    return {
      status: exit === '0' ? 'pass' : 'fail',
      exit,
      failing: failing.join(';'),
    };
  } catch {
    return { status: 'error', exit: '', failing: '' };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function directCommitCount(pages, cache, sourceRepo, adoptionDate) {
  const since = new Date(`${adoptionDate}T00:00:00Z`);
  let count = 0;
  for (const commit of pages.flat()) {
    const date = new Date((commit.commit && commit.commit.committer && commit.commit.committer.date)
      || (commit.commit && commit.commit.author && commit.commit.author.date));
    if (!(date >= since)) continue;
    const parents = commit.parents || [];
    if (parents.length > 1) continue;
    const pulls = cache.get(api(`/repos/${sourceRepo}/commits/${commit.sha}/pulls`)).body;
    if (!Array.isArray(pulls) || pulls.length === 0) count++;
  }
  return count;
}

function ledgerRowsFor(displayRepo, sourceRepo, prs, cache) {
  const rows = [];
  const sorted = [...prs].filter((pr) => pr
    && pr.merged_at
    && pr.number !== undefined)
    .sort((a, b) => Number(a.number) - Number(b.number));
  for (const pr of sorted) {
    const labels = (pr.labels || []).map((label) => label.name);
    const titleLevel = levelFromText(pr.title);
    const labelLevels = labels.map(levelFromLabel).filter(Boolean)
      .sort((a, b) => LEVEL_RANK[b] - LEVEL_RANK[a] || a.localeCompare(b));
    let declared = 'none';
    let levelSource = 'none';
    if (titleLevel) {
      declared = titleLevel;
      levelSource = 'title';
    } else if (labelLevels.length > 0) {
      declared = labelLevels[0];
      levelSource = 'label';
    }

    const reviews = cache.getPages(api(`/repos/${sourceRepo}/pulls/${pr.number}/reviews`, {
      per_page: '100',
    })).flat();
    const author = pr.user && pr.user.login;
    const human = reviews.filter((review) => isHumanReview(review, author));
    const firstReview = human.map((review) => review.submitted_at).sort()[0];
    const opened = new Date(pr.created_at);
    const merged = new Date(pr.merged_at);
    const hoursToFirst = firstReview
      ? ((new Date(firstReview) - opened) / 3600000).toFixed(3)
      : '';
    const hoursToMerge = ((merged - opened) / 3600000).toFixed(3);

    const events = cache.getPages(api(`/repos/${sourceRepo}/issues/${pr.number}/events`, {
      per_page: '100',
    })).flat();
    const reclass = reclassification(events);

    const commits = cache.getPages(api(`/repos/${sourceRepo}/pulls/${pr.number}/commits`, {
      per_page: '100',
    })).flat();
    const messages = commits.map((commit) => (commit.commit && commit.commit.message) || '');
    const markers = agentMarkers(pr, messages);

    rows.push([
      displayRepo,
      pr.number,
      declared,
      levelSource,
      markers.length > 0 ? 'agent' : 'human',
      markers.length > 0 ? markers.join(';') : 'none',
      human.length,
      hoursToFirst,
      hoursToMerge,
      reclass.downward ? 'yes' : 'no',
      reclass.from || '',
      reclass.to || '',
    ]);
  }
  return rows;
}

function repoEntry(manifest, local, displayRepo) {
  const entry = manifest.adopters.find((adopter) => adopter.repo === displayRepo);
  if (!entry) throw new Error(`manifest has no adopter ${displayRepo}`);
  return {
    displayRepo: entry.repo,
    sourceRepo: local[entry.repo] || entry.repo,
    sha: entry.sha,
    adoptionDate: entry.adoption_date,
    window: entry.ledger_window,
    defaultBranch: entry.default_branch,
  };
}

function inWindow(pr, window) {
  if (!pr.merged_at) return false;
  const merged = new Date(pr.merged_at).getTime();
  const from = new Date(`${window.from}T00:00:00Z`).getTime();
  const to = new Date(`${window.to}T23:59:59Z`).getTime();
  return merged >= from && merged <= to;
}

async function initManifest(args) {
  const manifestFile = argValue(args, '--manifest');
  if (!manifestFile) throw new Error('init requires --manifest <file>');
  const token = authToken();
  const delta = fs.readFileSync(path.join(CANON_ROOT, DELTA_REL), 'utf8');
  const owner = argValue(args, '--owner') || canonOwner(delta);
  const windowTo = argValue(args, '--window-to') || new Date().toISOString().slice(0, 10);
  const explicitFrom = argValue(args, '--window-from');
  const anonMapFile = argValue(args, '--anon-map');
  const anonMap = anonMapFile ? readJson(anonMapFile) : {};
  const localMap = {};
  const adopters = [];

  for (const name of relatedRepos(delta)) {
    const full = name.includes('/') ? name : `${owner}/${name}`;
    const repoInfo = (await fetchJson(api(`/repos/${full}`), token)).body;
    const defaultBranch = repoInfo.default_branch;
    let sha;
    try {
      sha = (await fetchJson(api(`/repos/${full}/git/ref/heads/${encodeURIComponent(defaultBranch)}`), token)).body.object.sha;
    } catch {
      sha = (await fetchJson(api(`/repos/${full}/commits/${encodeURIComponent(defaultBranch)}`), token)).body.sha;
    }
    let adoptionDate;
    try {
      const pages = await fetchPages(api(`/repos/${full}/commits`, {
        path: DELTA_REL, per_page: '100',
      }), token);
      const commits = pages.flat();
      const oldest = commits[commits.length - 1];
      adoptionDate = oldest
        ? ((oldest.commit.committer && oldest.commit.committer.date)
          || (oldest.commit.author && oldest.commit.author.date)).slice(0, 10)
        : String(repoInfo.created_at).slice(0, 10);
    } catch {
      adoptionDate = String(repoInfo.created_at).slice(0, 10);
    }
    const from = explicitFrom || adoptionDate;
    const display = anonMap[full] || anonMap[name] || full;
    if (display !== full) localMap[display] = full;
    adopters.push({
      repo: display,
      sha,
      adoption_date: adoptionDate,
      default_branch: defaultBranch,
      ledger_window: { from, to: windowTo },
    });
  }

  adopters.sort((a, b) => a.repo.localeCompare(b.repo));
  writeStable(path.resolve(manifestFile), {
    experiment: 'E4',
    canon_repository: `${owner}/agentic-governance`,
    adopters,
  });
  if (Object.keys(localMap).length > 0) {
    writeStable(path.resolve(`${manifestFile}.local.json`), localMap);
    console.log(`anonymized ${Object.keys(localMap).length} adopter(s); mapping is in ${manifestFile}.local.json (keep untracked)`);
  }
  console.log(`wrote ${manifestFile} with ${adopters.length} adopters`);
}

async function recordCache(args) {
  const manifestFile = path.resolve(argValue(args, '--manifest'));
  const cacheDir = path.resolve(argValue(args, '--cache'));
  if (!argValue(args, '--manifest') || !argValue(args, '--cache')) {
    throw new Error('record requires --manifest <file> --cache <dir>');
  }
  const manifest = readJson(manifestFile);
  const localFile = `${manifestFile}.local.json`;
  const local = fs.existsSync(localFile) ? readJson(localFile) : {};
  const token = authToken();
  const cache = new ResponseCache(cacheDir);
  fs.mkdirSync(cacheDir, { recursive: true });

  for (const entry of [...manifest.adopters].sort((a, b) => a.repo.localeCompare(b.repo))) {
    const info = repoEntry(manifest, local, entry.repo);
    const source = info.sourceRepo;
    const repoResponse = await cache.record(api(`/repos/${source}`), token);
    if (repoResponse.status !== 200) throw new Error(`cannot read ${source}: HTTP ${repoResponse.status}`);
    const defaultBranch = info.defaultBranch || repoResponse.body.default_branch;
    const sha = info.sha || (await cache.record(api(`/repos/${source}/git/ref/heads/${encodeURIComponent(defaultBranch)}`), token)).body.object.sha;

    await cache.record(api(`/repos/${source}/contents/${DELTA_REL}`, { ref: sha }), token);
    await cache.record(api(`/repos/${source}/git/trees/${sha}`, { recursive: '1' }), token);
    await cache.record(api(`/repos/${source}/branches/${encodeURIComponent(defaultBranch)}/protection`), token);

    const commitsUrl = api(`/repos/${source}/commits`, {
      sha: defaultBranch,
      since: `${info.adoptionDate}T00:00:00Z`,
      per_page: '100',
    });
    const commitPages = await cache.recordPages(commitsUrl, token);
    for (const commit of commitPages.flat()) {
      const parents = commit.parents || [];
      if (parents.length > 1) continue;
      await cache.record(api(`/repos/${source}/commits/${commit.sha}/pulls`), token);
    }

    const pullsUrl = api(`/repos/${source}/pulls`, {
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      since: `${info.window.from}T00:00:00Z`,
      per_page: '100',
    });
    const pullPages = await cache.recordPages(pullsUrl, token);
    const merged = pullPages.flat().filter((pr) => inWindow(pr, info.window));
    for (const pr of merged) {
      await cache.recordPages(api(`/repos/${source}/pulls/${pr.number}/reviews`, {
        per_page: '100',
      }), token);
      await cache.recordPages(api(`/repos/${source}/issues/${pr.number}/events`, {
        per_page: '100',
      }), token);
      await cache.recordPages(api(`/repos/${source}/pulls/${pr.number}/commits`, {
        per_page: '100',
      }), token);
    }

    const bare = path.join(cacheDir, 'repos', `${safeName(info.displayRepo)}.git`);
    fs.mkdirSync(path.dirname(bare), { recursive: true });
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'census-clone-'));
    const authedUrl = token
      ? `https://x-access-token:${token}@github.com/${source}.git`
      : `https://github.com/${source}.git`;
    try {
      try {
        git(['clone', '--quiet', '--bare', '--depth', '1', '--branch', defaultBranch,
          '--single-branch', authedUrl, tmp]);
        try {
          git(['-C', tmp, 'cat-file', '-e', `${sha}^{commit}`]);
        } catch {
          git(['-C', tmp, 'fetch', '--quiet', '--depth', '1', 'origin', sha]);
        }
      } catch {
        throw new Error(`cannot clone ${info.displayRepo} at ${sha}`);
      }
      git(['-C', tmp, 'remote', 'set-url', 'origin', `https://github.com/${source}.git`]);
      fs.rmSync(bare, { recursive: true, force: true });
      fs.renameSync(tmp, bare);
    } finally {
      if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
    }
    const refs = {};
    try {
      refs[`refs/heads/${defaultBranch}`] = git(['-C', bare, 'rev-parse',
        `refs/heads/${defaultBranch}`]).trim();
    } catch (error) {
      void error;
    }
    cache.setRepo({
      repo: info.displayRepo,
      default_branch: defaultBranch,
      pinned_sha: sha,
      refs,
    });
    console.log(`recorded ${info.displayRepo}`);
  }

  cache.save();
  const size = Number(execFileSync('du', ['-sk', cacheDir], { encoding: 'utf8' }).split(/\s+/)[0]);
  console.log(`cache written to ${cacheDir} (${size} KiB)`);
}

function runOffline(args) {
  const manifestFile = path.resolve(argValue(args, '--manifest'));
  const cacheDir = path.resolve(argValue(args, '--cache'));
  if (!argValue(args, '--manifest') || !argValue(args, '--cache') || !args.includes('--offline')) {
    throw new Error('run requires --manifest <file> --cache <dir> --offline');
  }
  const manifest = readJson(manifestFile);
  const localFile = `${manifestFile}.local.json`;
  const local = fs.existsSync(localFile) ? readJson(localFile) : {};
  const cache = new ResponseCache(cacheDir).load();
  const currentVersion = currentCanonVersion();
  const censusRows = [[
    'repo', 'commit_sha', 'adoption_date', 'default_branch',
    'pinned_canon_version', 'current_canon_version', 'pin_status',
    'check_command', 'check_status', 'check_exit_code', 'check_failing_checks',
    'ci_workflow_present', 'ci_workflows',
    'required_status_check', 'required_status_contexts',
    'branch_protection', 'required_approving_reviews', 'enforce_admins',
    'force_pushes_allowed', 'direct_commits_after_adoption',
  ]];
  const ledgerRows = [[
    'repo', 'pr_number', 'declared_level', 'level_source', 'author_type', 'author_marker',
    'human_reviews', 'hours_open_to_first_review', 'hours_open_to_merge',
    'reclassified_downward', 'reclassification_from', 'reclassification_to',
  ]];

  for (const entry of [...manifest.adopters].sort((a, b) => a.repo.localeCompare(b.repo))) {
    const info = repoEntry(manifest, local, entry.repo);
    const source = info.sourceRepo;
    const repoResponse = cache.get(api(`/repos/${source}`));
    const defaultBranch = info.defaultBranch || repoResponse.body.default_branch;
    const sha = info.sha;
    const deltaResponse = cache.get(api(`/repos/${source}/contents/${DELTA_REL}`, { ref: sha }));
    const deltaText = decodeContent(deltaResponse.body);
    const treeResponse = cache.get(api(`/repos/${source}/git/trees/${sha}`, { recursive: '1' }));
    const protection = protectionInfo(cache.get(api(
      `/repos/${source}/branches/${encodeURIComponent(defaultBranch)}/protection`,
    )));
    const commitsUrl = api(`/repos/${source}/commits`, {
      sha: defaultBranch, since: `${info.adoptionDate}T00:00:00Z`, per_page: '100',
    });
    const commitPages = cache.getPages(commitsUrl);
    const direct = directCommitCount(commitPages, cache, source, info.adoptionDate);

    const command = extractCheckCommand(deltaText);
    const pinned = parsePinnedVersion(deltaText);
    const comparison = compareVersions(pinned, currentVersion);
    const pinStatus = comparison === null ? 'unknown'
      : comparison === 0 ? 'same'
        : comparison < 0 ? 'behind' : 'ahead';

    const bare = path.join(cacheDir, 'repos', `${safeName(info.displayRepo)}.git`);
    const check = runDeclaredCheck(bare, sha, defaultBranch, command);
    const workflows = ciWorkflows(treeResponse.body);

    censusRows.push([
      info.displayRepo,
      sha,
      info.adoptionDate,
      defaultBranch,
      pinned || '',
      currentVersion,
      pinStatus,
      command || '',
      check.status,
      check.exit,
      check.failing,
      workflows.length > 0 ? 'yes' : 'no',
      workflows.join(';'),
      protection.required,
      protection.contexts.join(';'),
      protection.state,
      protection.approvals,
      protection.enforceAdmins,
      protection.forcePush,
      direct,
    ]);

    const pullsUrl = api(`/repos/${source}/pulls`, {
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      since: `${info.window.from}T00:00:00Z`,
      per_page: '100',
    });
    const merged = cache.getPages(pullsUrl).flat().filter((pr) => inWindow(pr, info.window));
    ledgerRows.push(...ledgerRowsFor(info.displayRepo, source, merged, cache));
  }

  const sortedLedger = [
    ledgerRows[0],
    ...ledgerRows.slice(1).sort((a, b) => String(a[0]).localeCompare(String(b[0]))
      || Number(a[1]) - Number(b[1])),
  ];

  const dataDir = resolveDataDir({
    data: argValue(args, '--data'),
    root: gitRoot(),
  });
  const outDir = path.join(dataDir, 'results');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'e4-census.csv'), toCsv(censusRows));
  fs.writeFileSync(path.join(outDir, 'e4-ledger.csv'), toCsv(sortedLedger));

  const canonSha = gitSha(CANON_ROOT, 'HEAD');
  const manifestE4 = {
    experiment: 'E4',
    canon_sha: canonSha,
    harness_sha: canonSha,
    node_version: process.version,
    current_canon_version: currentVersion,
    adopters: censusRows.length - 1,
    ledger_rows: ledgerRows.length - 1,
    inputs: {
      manifest: {
        file: path.basename(manifestFile),
        sha256: sha256File(manifestFile),
      },
      cache_index: {
        file: 'index.json',
        sha256: sha256File(path.join(cacheDir, 'index.json')),
      },
    },
    cache_hash: cache.hash(),
  };
  fs.writeFileSync(path.join(outDir, 'manifest-e4.json'), stableStringify(manifestE4));
  console.log(`wrote e4-census.csv (${censusRows.length - 1} rows), `
    + `e4-ledger.csv (${ledgerRows.length - 1} rows), manifest-e4.json`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  if (command === 'init') {
    await initManifest(args);
    return;
  }
  if (command === 'record') {
    await recordCache(args);
    return;
  }
  if (command === 'run') {
    runOffline(args);
    return;
  }
  console.error('usage: node census.mjs init --manifest <file> [--window-from <date>] [--window-to <date>] [--owner <login>] [--anon-map <file>]');
  console.error('       node census.mjs record --manifest <file> --cache <dir>');
  console.error('       node census.mjs run --manifest <file> --cache <dir> --offline [--data <dir>]');
  process.exit(2);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`census: ${error.message}`);
    process.exit(1);
  });
}
