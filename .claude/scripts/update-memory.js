#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const memoryDir = path.join(repoRoot, 'memory');
const todosFile = path.join(repoRoot, 'todos', 'active.md');

const memoryFiles = [
  'decisions.md',
  'people.md',
  'preferences.md',
  'user.md',
];

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.resume();
  });
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureFile(filePath, fallbackHeader) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `${fallbackHeader}\n\nLast Updated: unknown\n`, 'utf8');
  }
}

function setLastUpdated(content, timestamp) {
  if (/^Last Updated: .*/m.test(content)) {
    return content.replace(/^Last Updated: .*/m, `Last Updated: ${timestamp}`);
  }
  const lines = content.split('\n');
  if (lines.length > 0 && lines[0].startsWith('#')) {
    lines.splice(1, 0, '', `Last Updated: ${timestamp}`);
    return lines.join('\n');
  }
  return `Last Updated: ${timestamp}\n\n${content}`;
}

function extractLastWorkedOn(activeTodoContent) {
  const sectionMatch = activeTodoContent.match(/## Last Worked On([\s\S]*?)(\n## |\s*$)/);
  if (sectionMatch && sectionMatch[1]) {
    const bullet = sectionMatch[1]
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('- '));
    if (bullet) return bullet.slice(2).trim();
  }

  const unchecked = activeTodoContent
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('- [ ] '));
  if (unchecked) return unchecked.replace('- [ ] ', '').trim();

  return 'No active item found in /todos/active.md';
}

function appendSessionTimeline(userMd, timestamp, note) {
  const line = `- ${timestamp}: Session ended. Last worked on: ${note}`;
  if (!/## Session Timeline/m.test(userMd)) {
    return `${userMd.trim()}\n\n## Session Timeline\n\n${line}\n`;
  }
  return `${userMd.trim()}\n${line}\n`;
}

async function main() {
  const nowIso = new Date().toISOString();
  const stdinRaw = await readStdin();

  // Keep payload parsing tolerant; hook payload shapes may vary by Claude Code version.
  let payload = null;
  try {
    payload = stdinRaw ? JSON.parse(stdinRaw) : null;
  } catch {
    payload = null;
  }
  void payload;

  ensureDir(memoryDir);
  const headers = {
    'decisions.md': '# Decisions Memory',
    'people.md': '# People Memory',
    'preferences.md': '# Preferences Memory',
    'user.md': '# User Memory',
  };

  memoryFiles.forEach((fileName) => {
    const filePath = path.join(memoryDir, fileName);
    ensureFile(filePath, headers[fileName] || '# Memory');
    const content = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(filePath, setLastUpdated(content, nowIso), 'utf8');
  });

  const userFilePath = path.join(memoryDir, 'user.md');
  const userContent = fs.readFileSync(userFilePath, 'utf8');
  const todoContent = fs.existsSync(todosFile) ? fs.readFileSync(todosFile, 'utf8') : '';
  const note = extractLastWorkedOn(todoContent);
  const updatedUser = appendSessionTimeline(userContent, nowIso, note);
  fs.writeFileSync(userFilePath, updatedUser, 'utf8');

  process.stdout.write('Memory files updated.\n');
}

main().catch((err) => {
  process.stderr.write(`update-memory failed: ${err.message}\n`);
  process.exit(1);
});

