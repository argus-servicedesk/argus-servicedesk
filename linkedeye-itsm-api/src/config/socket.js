// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Socket.IO Setup
// ═══════════════════════════════════════════════════════════

const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt');
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('./env');

const OLLAMA_URL = process.env.OLLAMA_URL || config.ollamaUrl || 'http://localhost:11434';
const VOICE_SERVER = process.env.VOICE_SERVER_URL || 'http://voice-server:8100';
const VOICE_MODEL = 'llama3.2:3b';

const SYSTEM_PROMPT = `You are LinkedEye AI, an intelligent IT Service Management assistant for LinkedEye ITSM.
You help engineers manage incidents, alerts, changes, and IT operations.
Be concise, professional, and helpful. Keep responses under 3 sentences when possible.
Always respond in the same language the user speaks.`;

// Active voice sessions: socketId → { audioChunks[], lang, sessionId }
const voiceSessions = new Map();

async function callOllama(userText, lang = 'en') {
  try {
    const resp = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: VOICE_MODEL,
      prompt: `${SYSTEM_PROMPT}\n\nUser: ${userText}\nAssistant:`,
      stream: false,
      options: { temperature: 0.7, num_predict: 150 },
    }, { timeout: 30000 });
    return resp.data?.response?.trim() || 'I could not process that. Please try again.';
  } catch {
    return 'I am having trouble connecting to the AI engine. Please try again.';
  }
}

async function tryVoiceTTS(text, lang = 'en') {
  try {
    const resp = await axios.post(`${VOICE_SERVER}/synthesize`, { text, language: lang }, {
      responseType: 'arraybuffer', timeout: 15000,
    });
    return Buffer.from(resp.data).toString('base64');
  } catch {
    return null; // voice server unavailable — client uses browser TTS
  }
}

async function tryVoiceSTT(audioBuffer, lang = 'en') {
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('audio', audioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' });
    form.append('language', lang);
    const resp = await axios.post(`${VOICE_SERVER}/transcribe`, form, {
      headers: form.getHeaders(), timeout: 15000,
    });
    return resp.data?.text?.trim() || null;
  } catch {
    return null;
  }
}

let io = null;

function initSocket(httpServer, corsOrigins) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = verifyAccessToken(token);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);
    logger.info(`[WS] User ${id} connected`);

    socket.on('join:team', (teamId) => socket.join(`team:${teamId}`));
    socket.on('join:incident', (incId) => socket.join(`incident:${incId}`));
    socket.on('leave:incident', (incId) => socket.leave(`incident:${incId}`));

    // ── Voice Session ──────────────────────────────────────
    socket.on('start-session', ({ language = 'en' } = {}) => {
      const sessionId = `vs_${Date.now()}_${id.slice(0, 8)}`;
      voiceSessions.set(socket.id, { audioChunks: [], lang: language, sessionId });
      socket.emit('session-ready', { session_id: sessionId });
    });

    socket.on('audio-chunk', (chunk) => {
      const session = voiceSessions.get(socket.id);
      if (!session) return;
      if (Buffer.isBuffer(chunk)) session.audioChunks.push(chunk);
      else if (chunk instanceof ArrayBuffer) session.audioChunks.push(Buffer.from(chunk));
      else if (chunk?.data) session.audioChunks.push(Buffer.from(chunk.data));
    });

    socket.on('finalize-audio', async () => {
      const session = voiceSessions.get(socket.id);
      if (!session) return;
      const { audioChunks, lang } = session;
      session.audioChunks = []; // reset buffer

      let transcript = null;
      if (audioChunks.length > 0) {
        const audioBuffer = Buffer.concat(audioChunks);
        transcript = await tryVoiceSTT(audioBuffer, lang);
      }

      if (!transcript) {
        socket.emit('error', { code: 'STT_UNAVAILABLE', message: 'Voice transcription unavailable — please use text input.' });
        return;
      }

      socket.emit('transcript', { text: transcript });
      const responseText = await callOllama(transcript, lang);
      socket.emit('response-text', { text: responseText });
      const audioB64 = await tryVoiceTTS(responseText, lang);
      if (audioB64) socket.emit('audio-response', { audio: audioB64 });
    });

    // Text-only path (when mic unavailable or STT fails)
    socket.on('text-message', async ({ text, language = 'en' } = {}) => {
      if (!text?.trim()) return;
      socket.emit('transcript', { text });
      const responseText = await callOllama(text, language);
      socket.emit('response-text', { text: responseText });
      const audioB64 = await tryVoiceTTS(responseText, language);
      if (audioB64) socket.emit('audio-response', { audio: audioB64 });
    });

    socket.on('disconnect', () => {
      voiceSessions.delete(socket.id);
      logger.info(`[WS] User ${id} disconnected`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

function emitToUser(userId, event, data) {
  if (io) io.to(`user:${userId}`).emit(event, data);
}

function emitToTeam(teamId, event, data) {
  if (io) io.to(`team:${teamId}`).emit(event, data);
}

function emitToAll(event, data) {
  if (io) io.emit(event, data);
}

function emitToIncident(incidentId, event, data) {
  if (io) io.to(`incident:${incidentId}`).emit(event, data);
}

module.exports = { initSocket, getIO, emitToUser, emitToTeam, emitToAll, emitToIncident };
