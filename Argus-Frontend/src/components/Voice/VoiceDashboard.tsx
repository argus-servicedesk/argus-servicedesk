import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import {
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Bot,
  Search,
  Filter,
  Loader2,
  Play,
  Square,
  Volume2,
  Languages,
  Heart,
  Clock,
  User,
  ExternalLink,
  Send,
  Wifi,
  WifiOff,
  MessageSquare,
} from 'lucide-react';
import {
  useVoiceCallLogs,
  useVoiceStats,
  useVoiceLanguages,
  useVoiceHealth,
  useTranscribe,
  useSynthesize,
  useMakeCall,
} from '../../hooks/useVoice';
import { useSocket } from '../../lib/socket';
import type { VoiceCallLog, VoiceHandler } from '../../types';

// ── AI Voice Agent Chat ──

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
}

const AGENT_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'gu', label: 'Gujarati' },
];

const inputStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(99,102,241,0.10)',
  color: '#0f172a',
  borderRadius: '0.75rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
};

function AIAgentTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', text: "Hello! I'm Argus AI, your IT incident management assistant. Click the microphone to speak, or type a message below.", timestamp: new Date() },
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [agentLang, setAgentLang] = useState('en');

  const socketRef = useRef<Socket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  const addMsg = useCallback((role: ChatMessage['role'], text: string) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, role, text, timestamp: new Date() }]);
  }, []);

  const playNext = useCallback(() => {
    if (audioQueueRef.current.length === 0) { isPlayingRef.current = false; return; }
    isPlayingRef.current = true;
    const b64 = audioQueueRef.current.shift()!;
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); playNext(); };
    audio.onerror = () => { URL.revokeObjectURL(url); playNext(); };
    audio.play().catch(() => playNext());
  }, []);

  // Browser TTS fallback when XTTS server unavailable
  const speakBrowserTTS = useCallback((text: string, lang: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : lang === 'te' ? 'te-IN' : lang === 'kn' ? 'kn-IN' : lang === 'ml' ? 'ml-IN' : 'en-US';
    utt.rate = 0.95;
    utt.pitch = 1.0;
    window.speechSynthesis.speak(utt);
  }, []);

  useEffect(() => {
    const token = (() => { try { return JSON.parse(localStorage.getItem('argus-auth') || '{}')?.state?.token; } catch { return null; } })();

    const voiceSocket = io(window.location.origin, {
      path: '/socket.io/',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    });
    socketRef.current = voiceSocket;

    voiceSocket.on('connect', () => {
      setIsConnected(true);
      voiceSocket.emit('start-session', { language: agentLang });
    });

    voiceSocket.on('disconnect', () => setIsConnected(false));

    voiceSocket.on('session-ready', (data: { session_id: string }) => {
      console.log('[Argus] Session:', data.session_id);
    });

    voiceSocket.on('transcript', (data: { text: string }) => {
      setIsProcessing(true);
      setProcessingText('Thinking...');
      addMsg('user', data.text);
    });

    voiceSocket.on('response-text', (data: { text: string }) => {
      setIsProcessing(false);
      setProcessingText('');
      addMsg('assistant', data.text);
      // Use browser TTS — will be overridden if audio-response arrives
      speakBrowserTTS(data.text, agentLang);
    });

    voiceSocket.on('audio-response', (data: { audio: string }) => {
      window.speechSynthesis?.cancel(); // stop browser TTS if XTTS audio arrives
      audioQueueRef.current.push(data.audio);
      if (!isPlayingRef.current) playNext();
    });

    voiceSocket.on('error', (data: { code: string; message: string }) => {
      setIsProcessing(false);
      setProcessingText('');
      if (data.code === 'STT_UNAVAILABLE') {
        addMsg('system', 'Voice transcription unavailable — type your message below.');
      } else if (data.code !== 'AUDIO_TOO_SHORT') {
        addMsg('system', `Error: ${data.message}`);
      }
    });

    return () => { voiceSocket.disconnect(); };
  }, [addMsg, playNext, agentLang, speakBrowserTTS]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const startRecording = useCallback(async () => {
    if (!socketRef.current?.connected) { toast.error('Voice agent not connected'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) socketRef.current?.emit('audio-chunk', e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        socketRef.current?.emit('finalize-audio', {});
        setIsProcessing(true);
        setProcessingText('Transcribing...');
      };

      recorder.start(250);
      setIsRecording(true);
    } catch {
      toast.error('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    setIsRecording(false);
  }, []);

  useEffect(() => {
    if (isRecording) {
      // startRecording creates the recorder, we need to capture it
    }
  }, [isRecording]);

  const handleMicClick = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      if (!socketRef.current?.connected) { toast.error('Voice agent not connected'); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) socketRef.current?.emit('audio-chunk', e.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          socketRef.current?.emit('finalize-audio', {});
          setIsProcessing(true);
          setProcessingText('Transcribing...');
        };

        recorderRef.current = recorder;
        recorder.start(250);
        setIsRecording(true);
      } catch {
        toast.error('Microphone access denied');
      }
    }
  }, [isRecording, stopRecording]);

  const handleSendText = useCallback(() => {
    const text = textInput.trim();
    if (!text || !socketRef.current?.connected) return;
    addMsg('user', text);
    socketRef.current.emit('text-message', { text });
    setTextInput('');
    setIsProcessing(true);
    setProcessingText('Thinking...');
  }, [textInput, addMsg]);

  return (
    <div className="rounded-xl overflow-hidden animate-fade-in" style={{ height: 'calc(100vh - 400px)', minHeight: '500px', background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)', background: 'rgba(99,102,241,0.03)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.10)' }}>
            <Bot className="w-4 h-4" style={{ color: '#6366f1' }} />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold" style={{ color: '#0f172a' }}>Argus AI Agent</h3>
            <p className="text-[10px]" style={{ color: '#94a3b8' }}>GPT-4.1 &middot; Real-time voice &middot; Service Desk tools</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={agentLang}
            onChange={e => { setAgentLang(e.target.value); setMessages([{ id: 'welcome', role: 'assistant', text: "Language changed. Starting new session...", timestamp: new Date() }]); }}
            className="px-2.5 py-1 rounded-lg text-[11px] font-mono focus:outline-none"
            style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.10)', color: '#6366f1' }}
          >
            {AGENT_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono"
            style={isConnected
              ? { border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.12)', color: '#059669' }
              : { border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.12)', color: '#DC2626' }
            }>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ height: 'calc(100% - 140px)' }}>
        {messages.map(msg => (
          <div key={msg.id} className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className="max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed"
              style={
                msg.role === 'user'
                  ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', borderBottomRightRadius: '4px' }
                  : msg.role === 'system'
                  ? { background: 'rgba(239,68,68,0.12)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.25)', borderBottomLeftRadius: '4px' }
                  : { background: 'rgba(99,102,241,0.04)', color: '#0f172a', border: '1px solid rgba(99,102,241,0.15)', borderBottomLeftRadius: '4px' }
              }>
              <div className="text-[10px] font-mono font-medium uppercase tracking-wider mb-1"
                style={{
                  color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : msg.role === 'system' ? 'rgba(252,165,165,0.6)' : '#94a3b8'
                }}>
                {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'Argus'}
              </div>
              <span className="whitespace-pre-wrap">{msg.text}</span>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-2.5 text-sm flex items-center gap-2"
              style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#64748b', borderBottomLeftRadius: '4px' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="italic">{processingText || 'Processing...'}</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-5 py-3 flex items-center gap-3" style={{ borderTop: '1px solid rgba(99,102,241,0.06)', background: 'rgba(99,102,241,0.03)' }}>
        <div className="flex-1 relative">
          <input
            type="text"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
            placeholder="Type a message or use the mic..."
            disabled={!isConnected || isRecording}
            className="w-full px-4 py-2.5 rounded-xl text-sm disabled:opacity-50 transition-all focus:outline-none"
            style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.10)', color: '#0f172a' }}
          />
        </div>

        <button
          onClick={handleSendText}
          disabled={!isConnected || !textInput.trim() || isRecording}
          className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 transition-all text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
        >
          <Send className="w-4 h-4" />
        </button>

        <button
          onClick={handleMicClick}
          disabled={!isConnected}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 text-white"
          style={isRecording
            ? { background: '#DC2626', boxShadow: '0 0 20px rgba(220,38,38,0.4)' }
            : { background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }
          }
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

// ── Subcomponents ──

function StatsCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl transition-all duration-300" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', color }}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-display font-bold tracking-tight" style={{ color: '#0f172a' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{label}</p>
    </div>
  );
}

function HandlerBadge({ handler }: { handler: VoiceHandler }) {
  const styles: Record<VoiceHandler, { bg: string; color: string; border: string }> = {
    AI_BOT: { bg: 'rgba(99,102,241,0.08)', color: '#6366f1', border: 'rgba(99,102,241,0.15)' },
    HUMAN: { bg: 'rgba(99,102,241,0.12)', color: '#A5B4FC', border: 'rgba(99,102,241,0.25)' },
    IVR: { bg: 'rgba(245,158,11,0.12)', color: '#D97706', border: 'rgba(245,158,11,0.25)' },
  };
  const icons: Record<VoiceHandler, React.ComponentType<{ className?: string }>> = {
    AI_BOT: Bot,
    HUMAN: User,
    IVR: Phone,
  };
  const IconComp = icons[handler];
  const s = styles[handler];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-medium rounded-md"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <IconComp className="w-3 h-3" />
      {handler.replace('_', ' ')}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[10px]" style={{ color: '#cbd5e1' }}>-</span>;
  const s = status.toLowerCase();
  const style =
    s === 'completed' ? { bg: 'rgba(16,185,129,0.12)', color: '#059669', border: 'rgba(16,185,129,0.25)' } :
    s === 'in-progress' || s === 'ringing' ? { bg: 'rgba(245,158,11,0.12)', color: '#D97706', border: 'rgba(245,158,11,0.25)' } :
    s === 'failed' || s === 'busy' || s === 'no-answer' ? { bg: 'rgba(239,68,68,0.12)', color: '#DC2626', border: 'rgba(239,68,68,0.25)' } :
    { bg: 'rgba(99,102,241,0.04)', color: '#64748b', border: 'rgba(99,102,241,0.08)' };
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-md"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
      {status}
    </span>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Main Component ──

export default function VoiceDashboard() {
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');
  const [handlerFilter, setHandlerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const [activeTab, setActiveTab] = useState<'agent' | 'logs' | 'transcribe' | 'synthesize' | 'call'>('agent');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [synthesizeText, setSynthesizeText] = useState('');
  const [callNumber, setCallNumber] = useState('');
  const [transcriptionResult, setTranscriptionResult] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryFilters = useMemo(() => {
    const f: Record<string, string | number> = { page, limit: 20 };
    if (directionFilter !== 'ALL') f.direction = directionFilter;
    if (handlerFilter !== 'ALL') f.handler = handlerFilter;
    return f;
  }, [directionFilter, handlerFilter, page]);

  const socket = useSocket();

  const { data: logsResponse, isLoading: logsLoading } = useVoiceCallLogs(queryFilters);
  const { data: statsResponse } = useVoiceStats();
  const { data: languagesResponse } = useVoiceLanguages();
  const { data: healthResponse } = useVoiceHealth();
  const transcribe = useTranscribe();
  const synthesize = useSynthesize();
  const makeCall = useMakeCall();

  useEffect(() => {
    const handler = (data: { callId: string; incidentNumber: string }) => {
      toast.success(
        `Call completed -- incident ${data.incidentNumber} auto-created`,
        { duration: 6000, icon: '📞' }
      );
    };
    socket.on('voice:call-completed', handler);
    return () => { socket.off('voice:call-completed', handler); };
  }, [socket]);

  const logs: VoiceCallLog[] = logsResponse?.data ?? [];
  const pagination = logsResponse?.pagination;
  const stats = statsResponse?.data;
  const languages = languagesResponse?.data ?? [];
  const voiceHealth = healthResponse?.data;

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        l.callerNumber?.toLowerCase().includes(q) ||
        l.callerName?.toLowerCase().includes(q) ||
        l.transcript?.toLowerCase().includes(q) ||
        l.callSid?.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        try {
          const result = await transcribe.mutateAsync({ audio: file, language: selectedLanguage });
          setTranscriptionResult(result.data?.text || 'No transcription returned');
          toast.success('Transcription complete');
        } catch (err: any) {
          toast.error(err?.response?.data?.error ?? 'Transcription failed');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error('Microphone access denied');
    }
  }, [transcribe, selectedLanguage]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const handleFileTranscribe = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await transcribe.mutateAsync({ audio: file, language: selectedLanguage });
      setTranscriptionResult(result.data?.text || 'No transcription returned');
      toast.success('Transcription complete');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Transcription failed');
    }
  };

  const handleSynthesize = async () => {
    if (!synthesizeText.trim()) { toast.error('Enter text to synthesize'); return; }
    try {
      const blob = await synthesize.mutateAsync({ text: synthesizeText, language: selectedLanguage });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      toast.success('Playing synthesized audio');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Synthesis failed');
    }
  };

  const handleMakeCall = async () => {
    if (!callNumber.trim()) { toast.error('Enter a phone number'); return; }
    try {
      await makeCall.mutateAsync({ to: callNumber });
      toast.success('Call initiated');
      setCallNumber('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to initiate call');
    }
  };

  const tabs = [
    { id: 'agent' as const, label: 'AI Agent', icon: Bot },
    { id: 'logs' as const, label: 'Call Logs', icon: Phone },
    { id: 'transcribe' as const, label: 'Transcribe', icon: Mic },
    { id: 'synthesize' as const, label: 'Synthesize', icon: Volume2 },
    { id: 'call' as const, label: 'Make Call', icon: PhoneCall },
  ];

  return (
    <div className="animate-fade-in space-y-0">
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #6d28d9 100%)' }}>
        {/* dot-grid texture */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px', opacity: 0.15 }} />
        {/* glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/4" style={{ background: 'rgba(109,40,217,0.3)', filter: 'blur(70px)' }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full" style={{ background: 'rgba(124,58,237,0.25)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full -translate-x-1/4" style={{ background: 'rgba(109,40,217,0.2)', filter: 'blur(80px)' }} />
        <div className="relative px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Mic size={16} style={{ color: '#ddd6fe' }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>Voice Gateway</h1>
              </div>
              <p className="text-sm ml-[42px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Multilingual voice AI &middot; STT + TTS + IVR &middot; <span className="font-mono" style={{ color: '#ddd6fe' }}>{stats?.total ?? 0}</span> total calls
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={voiceHealth?.healthy
                ? { border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }
                : { border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }
              }>
              <Heart className="w-3.5 h-3.5" />
              <span className="font-mono">Voice Server: {voiceHealth?.healthy ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="h-0.5 -mt-5 mb-4" style={{ background: 'linear-gradient(90deg, #a78bfa, #c4b5fd, #ddd6fe, transparent)' }} />

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard icon={Phone} label="Total Calls" value={stats?.total ?? 0} color="#334155" />
        <StatsCard icon={PhoneIncoming} label="Inbound" value={stats?.inbound ?? 0} color="#6EE7B7" />
        <StatsCard icon={PhoneOutgoing} label="Outbound" value={stats?.outbound ?? 0} color="#FCD34D" />
        <StatsCard icon={Bot} label="AI Handled" value={stats?.aiHandled ?? 0} color="#334155" />
        <StatsCard icon={Clock} label="Avg Duration" value={formatDuration(stats?.averageDurationSeconds ?? 0)} color="#3B82F6" />
      </div>

      {/* Language Selector */}
      {languages.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2" style={{ color: '#94a3b8' }}>
              <Languages className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Language</span>
            </div>
            <div className="flex gap-2">
              {languages.map((lang: { code: string; name: string }) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                  style={selectedLanguage === lang.code
                    ? { border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.10)', color: '#6366f1' }
                    : { border: '1px solid rgba(99,102,241,0.15)', color: '#94a3b8' }
                  }
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="p-1 rounded-xl inline-flex gap-1" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={activeTab === tab.id
              ? { background: 'rgba(99,102,241,0.10)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' }
              : { color: '#94a3b8', border: '1px solid transparent' }
            }
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: AI Agent */}
      {activeTab === 'agent' && <AIAgentTab />}

      {/* Tab Content: Transcribe */}
      {activeTab === 'transcribe' && (
        <div className="p-6 rounded-xl space-y-5 animate-fade-in" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
          <h3 className="text-sm font-display font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Mic className="w-4 h-4" style={{ color: '#6366f1' }} />
            Speech-to-Text (Whisper STT)
          </h3>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={transcribe.isPending}
              className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300"
              style={isRecording
                ? { background: 'rgba(239,68,68,0.15)', border: '2px solid #DC2626' }
                : { background: 'rgba(99,102,241,0.10)', border: '2px solid rgba(99,102,241,0.25)' }
              }
            >
              {transcribe.isPending ? (
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#6366f1' }} />
              ) : isRecording ? (
                <Square className="w-8 h-8" style={{ color: '#DC2626' }} />
              ) : (
                <Mic className="w-8 h-8" style={{ color: '#6366f1' }} />
              )}
            </button>
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              {isRecording ? 'Recording... Click to stop' : transcribe.isPending ? 'Transcribing...' : 'Click to record or upload a file'}
            </p>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileTranscribe}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={transcribe.isPending}
                className="px-4 py-2 text-xs rounded-xl disabled:opacity-50"
                style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#64748b' }}
              >
                Upload Audio File
              </button>
            </div>

            {transcriptionResult && (
              <div className="w-full mt-4 p-4 rounded-lg" style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <p className="text-xs mb-1 font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Transcription Result</p>
                <p className="text-sm leading-relaxed" style={{ color: '#0f172a' }}>{transcriptionResult}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Synthesize */}
      {activeTab === 'synthesize' && (
        <div className="p-6 rounded-xl space-y-5 animate-fade-in" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
          <h3 className="text-sm font-display font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Volume2 className="w-4 h-4" style={{ color: '#6366f1' }} />
            Text-to-Speech (XTTS v2)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Text to Speak</label>
              <textarea
                value={synthesizeText}
                onChange={(e) => setSynthesizeText(e.target.value)}
                placeholder="Enter text to convert to speech..."
                rows={4}
                className="w-full text-sm resize-none focus:outline-none"
                style={inputStyle}
              />
            </div>
            <button
              onClick={handleSynthesize}
              disabled={synthesize.isPending}
              className="px-6 py-2 text-sm flex items-center gap-2 disabled:opacity-50 rounded-xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
            >
              {synthesize.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {synthesize.isPending ? 'Generating...' : 'Speak'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Content: Make Call */}
      {activeTab === 'call' && (
        <div className="p-6 rounded-xl space-y-5 animate-fade-in" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
          <h3 className="text-sm font-display font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <PhoneCall className="w-4 h-4" style={{ color: '#6366f1' }} />
            Outbound Call (Twilio IVR)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Phone Number</label>
              <input
                type="tel"
                value={callNumber}
                onChange={(e) => setCallNumber(e.target.value)}
                placeholder="+919876543210"
                className="w-full text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleMakeCall}
                disabled={makeCall.isPending}
                className="px-6 py-2 text-sm flex items-center gap-2 disabled:opacity-50 rounded-xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
              >
                {makeCall.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PhoneCall className="w-4 h-4" />
                )}
                {makeCall.isPending ? 'Calling...' : 'Initiate Call'}
              </button>
            </div>
          </div>
          <p className="text-xs" style={{ color: '#cbd5e1' }}>
            Calls use Twilio IVR. The recipient will hear an automated greeting and can interact via DTMF or speech.
          </p>
        </div>
      )}

      {/* Tab Content: Call Logs */}
      {activeTab === 'logs' && (
        <>
          {/* Filter Bar */}
          <div className="rounded-xl p-3" style={{ background: '#ffffff', backdropFilter: 'blur(12px)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                <Filter size={13} />
                <span className="text-[10px] font-semibold uppercase tracking-widest">Filters</span>
              </div>

              <select
                value={directionFilter}
                onChange={(e) => { setDirectionFilter(e.target.value); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-sm focus:outline-none"
                style={inputStyle}
              >
                <option value="ALL">All Directions</option>
                <option value="INBOUND">Inbound</option>
                <option value="OUTBOUND">Outbound</option>
              </select>

              <select
                value={handlerFilter}
                onChange={(e) => { setHandlerFilter(e.target.value); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-sm focus:outline-none"
                style={inputStyle}
              >
                <option value="ALL">All Handlers</option>
                <option value="AI_BOT">AI Bot</option>
                <option value="HUMAN">Human</option>
                <option value="IVR">IVR</option>
              </select>

              <div className="w-px h-7 hidden sm:block" style={{ background: 'rgba(99,102,241,0.08)' }} />

              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search by caller, transcript, or call SID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
                  style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.10)', color: '#0f172a' }}
                />
              </div>
            </div>
          </div>

          {logsLoading && (
            <div className="p-12 text-center rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)' }}>
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: '#6366f1' }} />
              <p className="font-medium" style={{ color: '#64748b' }}>Loading call logs...</p>
            </div>
          )}

          {!logsLoading && (
            <div className="space-y-3">
              {filteredLogs.length === 0 && (
                <div className="p-12 text-center rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <Phone className="w-12 h-12 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
                  <p className="font-medium" style={{ color: '#64748b' }}>No call logs found</p>
                  <p className="text-sm mt-1" style={{ color: '#cbd5e1' }}>Make a call or adjust filters</p>
                </div>
              )}

              {filteredLogs.map((call) => (
                <div
                  key={call.id}
                  className="p-5 rounded-xl transition-all duration-300 group"
                  style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex-shrink-0">
                      {call.direction === 'INBOUND' ? (
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.12)' }}>
                          <PhoneIncoming className="w-4 h-4" style={{ color: '#059669' }} />
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.12)' }}>
                          <PhoneOutgoing className="w-4 h-4" style={{ color: '#D97706' }} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-display font-bold" style={{ color: '#0f172a' }}>
                          {call.callerName || call.callerNumber || 'Unknown'}
                        </span>
                        <StatusBadge status={call.status} />
                        <HandlerBadge handler={call.handler} />
                      </div>

                      {call.transcript && (
                        <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed" style={{ color: '#64748b' }}>
                          {call.transcript}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        {call.callerNumber && (
                          <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: '#94a3b8' }}>
                            <Phone className="w-3 h-3" style={{ color: '#cbd5e1' }} />
                            {call.callerNumber}
                          </span>
                        )}
                        {call.duration != null && (
                          <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: '#94a3b8' }}>
                            <Clock className="w-3 h-3" style={{ color: '#cbd5e1' }} />
                            {formatDuration(call.duration)}
                          </span>
                        )}
                        {call.language && (
                          <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: '#94a3b8' }}>
                            <Languages className="w-3 h-3" style={{ color: '#cbd5e1' }} />
                            {call.language.toUpperCase()}
                          </span>
                        )}
                        <span className="text-[11px] font-mono" style={{ color: '#94a3b8' }}>
                          {new Date(call.createdAt).toLocaleString()}
                        </span>
                        {call.callSid && (
                          <span className="text-[10px] font-mono" style={{ color: '#cbd5e1' }}>
                            SID: {call.callSid.substring(0, 16)}...
                          </span>
                        )}
                        {call.linkedIncidentId && (
                          <Link
                            to={`/incidents/${call.linkedIncidentId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-mono flex items-center gap-1 hover:underline"
                            style={{ color: '#6366f1' }}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Incident
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)' }}>
              <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-30"
                  style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#64748b' }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-30"
                  style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#64748b' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
