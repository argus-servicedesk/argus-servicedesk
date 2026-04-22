#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const repoRoot = path.resolve(__dirname, '..', '..');
const memoryDir = path.join(repoRoot, 'memory');
const todosFile = path.join(repoRoot, 'todos', 'active.md');
const envFile = path.join(repoRoot, '.env');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value.replace(/^"(.*)"$/, '$1');
  });
  return env;
}

function readFileOrEmpty(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function findFirstBullet(sectionContent) {
  return sectionContent
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('- '));
}

function getLastWorkedOn(activeTodo) {
  const match = activeTodo.match(/## Last Worked On([\s\S]*?)(\n## |\s*$)/);
  if (!match) return 'No last-worked-on note in todos/active.md';
  const bullet = findFirstBullet(match[1] || '');
  return bullet ? bullet.slice(2).trim() : 'No last-worked-on bullet in todos/active.md';
}

function getTopPriorities(activeTodo) {
  const tasks = activeTodo
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- [ ] '))
    .map((line) => line.replace('- [ ] ', '').trim());

  const top = tasks.slice(0, 3);
  while (top.length < 3) {
    top.push(`Define next priority #${top.length + 1} in /todos/active.md`);
  }
  return top;
}

function summarizeMemory(memoryFiles) {
  const highlights = [];
  Object.entries(memoryFiles).forEach(([name, content]) => {
    const firstBullet = content
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('- '));
    if (firstBullet) {
      highlights.push(`- ${name.replace('.md', '')}: ${firstBullet.slice(2).trim()}`);
    }
  });
  return highlights.length > 0 ? highlights.join('\n') : '- No memory highlights found.';
}

function postToSlack(webhookUrl, text) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const payload = JSON.stringify({ text });

    const req = https.request(
      {
        method: 'POST',
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseBody || 'ok');
          } else {
            reject(new Error(`Slack webhook failed (${res.statusCode}): ${responseBody}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const env = { ...parseEnvFile(envFile), ...process.env };
  const webhookUrl = env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL is missing. Set it in repository .env.');
  }

  const memoryFiles = {
    decisions: readFileOrEmpty(path.join(memoryDir, 'decisions.md')),
    people: readFileOrEmpty(path.join(memoryDir, 'people.md')),
    preferences: readFileOrEmpty(path.join(memoryDir, 'preferences.md')),
    user: readFileOrEmpty(path.join(memoryDir, 'user.md')),
  };
  const activeTodo = readFileOrEmpty(todosFile);

  const date = new Date();
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lastWorkedOn = getLastWorkedOn(activeTodo);
  const priorities = getTopPriorities(activeTodo);
  const memorySummary = summarizeMemory({
    'decisions.md': memoryFiles.decisions,
    'people.md': memoryFiles.people,
    'preferences.md': memoryFiles.preferences,
    'user.md': memoryFiles.user,
  });

  const briefing = [
    `*Morning Briefing - ${dateLabel}*`,
    '',
    '*Last worked on:*',
    `- ${lastWorkedOn}`,
    '',
    '*Memory highlights:*',
    memorySummary,
    '',
    '*Top 3 priorities today:*',
    `1. ${priorities[0]}`,
    `2. ${priorities[1]}`,
    `3. ${priorities[2]}`,
  ].join('\n');

  await postToSlack(webhookUrl, briefing);
  process.stdout.write('Morning briefing sent to Slack.\n');
}

main().catch((err) => {
  process.stderr.write(`send-morning-briefing failed: ${err.message}\n`);
  process.exit(1);
});

