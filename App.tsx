import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, Video, RotateCcw, Save, Share2, History, X, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppState, AnalysisResult, HistoryItem } from './types';
import { analyzeDogMedia } from './services/geminiService';
import { formatTime } from './services/audioUtils';
import Mascot from './components/Mascot';
import Waveform from './components/Waveform';

export default function App() {
  const [state, setState] = useState<AppState>(AppState.HOME);
  const [recordingTime, setRecordingTime] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Audio Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('woof_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const saveToHistory = (result: AnalysisResult) => {
    const newItem: HistoryItem = { ...result, id: Date.now().toString(), timestamp: Date.now() };
    const updated = [newItem, ...history];
    setHistory(updated);
    localStorage.setItem('woof_history', JSON.stringify(updated));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.start();
      setState(AppState.RECORDING);

      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(p => p + 1);
      }, 1000);

    } catch (e) {
      console.error(e);
      alert("Доступ к микрофону запрещен");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleAnalysis(blob, 'audio/webm');
      };
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4.5 * 1024 * 1024) {
      alert("Файл слишком большой (максимум 4.5 МБ)");
      return;
    }

    await handleAnalysis(file, file.type);
  };

  const handleAnalysis = async (blob: Blob, mimeType: string) => {
    setState(AppState.ANALYZING);
    try {
      const result = await analyzeDogMedia(blob, mimeType);
      setAnalysisResult(result);
      saveToHistory(result);
      setState(AppState.RESULT);
    } catch (e) {
      console.error(e);
      setError("Мы не смогли понять этот лай. Попробуйте еще раз?");
      setState(AppState.HOME);
    }
  };

  // --- Views ---

  const renderHome = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-between h-full py-10 px-6 max-w-md mx-auto w-full"
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <Mascot mood="happy" className="w-48 h-48 mb-8" />
        <h1 className="text-4xl font-display font-bold text-terracotta mb-2 text-center">WoofWhisper</h1>
        <p className="text-charcoal/70 text-center mb-12 font-body">Что пытается сказать ваша собака?</p>

        {/* Main CTA */}
        <button
          onClick={startRecording}
          className="relative group w-48 h-48 rounded-full bg-terracotta flex items-center justify-center shadow-2xl mb-8 active:scale-95 transition-transform"
        >
          <div className="absolute inset-0 rounded-full bg-terracotta animate-ping opacity-20 group-hover:opacity-40" />
          <div className="flex flex-col items-center">
            <Mic size={48} className="text-cream mb-2" />
            <span className="text-cream font-display font-bold text-xl">Слушать</span>
          </div>
        </button>

        {/* Secondary Actions */}
        <div className="flex gap-4 w-full justify-center">
          <label className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl shadow-md text-sage font-bold cursor-pointer hover:bg-gray-50 transition-colors">
            <Video size={20} />
            <span>Видео</span>
            <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
          </label>
          <label className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl shadow-md text-sage font-bold cursor-pointer hover:bg-gray-50 transition-colors">
            <Upload size={20} />
            <span>Аудио</span>
            <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <button
        onClick={() => setState(AppState.HISTORY)}
        className="mt-8 text-charcoal/50 flex items-center gap-2 font-display hover:text-charcoal transition-colors"
      >
        <History size={18} />
        История переводов
      </button>
    </motion.div>
  );

  const renderRecording = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full max-w-md mx-auto px-6"
    >
      <Mascot mood="listening" className="w-40 h-40 mb-12" />
      <h2 className="text-2xl font-display font-bold text-charcoal mb-4">Слушаю...</h2>
      <div className="w-full mb-8">
        <Waveform active={true} />
      </div>
      <div className="text-4xl font-display text-terracotta mb-12 font-mono tabular-nums">
        {formatTime(recordingTime)}
      </div>
      <button
        onClick={stopRecording}
        className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
      >
        <div className="w-8 h-8 bg-white rounded-md" />
      </button>
      <p className="mt-8 text-charcoal/60 text-sm">Нажмите квадрат, чтобы остановить</p>
    </motion.div>
  );

  const renderAnalyzing = () => (
    <motion.div className="flex flex-col items-center justify-center h-full max-w-md mx-auto px-6">
      <Mascot mood="confused" className="w-48 h-48 mb-8" />
      <div className="flex flex-col items-center">
        <h2 className="text-2xl font-display font-bold text-terracotta mb-2">Анализирую...</h2>
        <motion.p
          className="text-sage font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Расшифровка виляний хвостом и лая
        </motion.p>
      </div>
      {/* Custom Progress Bar */}
      <div className="w-64 h-3 bg-gray-200 rounded-full mt-8 overflow-hidden">
        <motion.div
          className="h-full bg-terracotta rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 4, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );

  const renderResult = () => {
    if (!analysisResult) return null;

    const stressColors = {
      Low: 'bg-green-100 text-green-700',
      Medium: 'bg-yellow-100 text-yellow-700',
      Critical: 'bg-red-100 text-red-700'
    };

    const stressLabels = {
      Low: 'Низкий',
      Medium: 'Средний',
      Critical: 'Высокий'
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col h-full max-w-md mx-auto bg-cream relative overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-cream/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <button onClick={() => setState(AppState.HOME)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <X size={24} className="text-charcoal" />
          </button>
          <span className="font-display font-bold text-charcoal">Перевод</span>
          <div className="w-8" /> {/* Spacer */}
        </div>

        <div className="px-6 pb-24 pt-4 space-y-6">
          {/* Main Bubble */}
          <div className="bg-white rounded-[2rem] rounded-tl-none p-6 shadow-lg border-2 border-terracotta/10 relative mt-4">
            <div className="absolute -top-3 -left-[2px] w-4 h-4 bg-white border-l-2 border-t-2 border-terracotta/10 transform -rotate-45" />
            <p className="text-2xl font-display font-bold text-charcoal leading-snug">
              "{analysisResult.translation}"
            </p>
          </div>

          {/* Emotional Spectrum */}
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sage uppercase tracking-wider text-xs">Эмоциональное состояние</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${stressColors[analysisResult.emotionalSpectrum.stressLevel]}`}>
                Стресс: {stressLabels[analysisResult.emotionalSpectrum.stressLevel]}
              </span>
            </div>
            <div className="text-4xl mb-2">{getEmoji(analysisResult.emotionalSpectrum.dominantEmotion)}</div>
            <p className="font-display font-bold text-xl text-charcoal capitalize">
              {analysisResult.emotionalSpectrum.dominantEmotion}
            </p>
            <p className="text-charcoal/60 text-sm mt-2 leading-relaxed">
              {analysisResult.observations.sound} {analysisResult.observations.body}
            </p>
          </div>

          {/* Recommendations */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-sage/10 rounded-3xl p-5 border border-sage/20">
              <h4 className="font-bold text-sage mb-2 flex items-center gap-2">
                <span className="bg-sage text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✓</span>
                Что делать
              </h4>
              <p className="text-charcoal/80 text-sm">{analysisResult.recommendations.do}</p>
            </div>
            <div className="bg-red-50 rounded-3xl p-5 border border-red-100">
              <h4 className="font-bold text-red-400 mb-2 flex items-center gap-2">
                <span className="bg-red-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</span>
                Чего не делать
              </h4>
              <p className="text-charcoal/80 text-sm">{analysisResult.recommendations.dont}</p>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-8 max-w-md mx-auto">
          <div className="flex gap-3">
            <button
              onClick={() => setState(AppState.HOME)}
              className="flex-1 bg-terracotta text-white font-bold py-4 rounded-2xl shadow-lg shadow-terracotta/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <RotateCcw size={20} /> Новый
            </button>
            <button className="bg-sand text-charcoal p-4 rounded-2xl hover:bg-sand/80 transition-colors">
              <Share2 size={24} />
            </button>
            <button className="bg-sand text-charcoal p-4 rounded-2xl hover:bg-sand/80 transition-colors">
              <Save size={24} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderHistory = () => (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="flex flex-col h-full bg-cream max-w-md mx-auto"
    >
      <div className="p-6 flex items-center gap-4 border-b border-gray-100">
        <button onClick={() => setState(AppState.HOME)} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} className="text-charcoal" />
        </button>
        <h2 className="text-2xl font-display font-bold text-charcoal">История</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {history.length === 0 ? (
          <div className="text-center text-charcoal/50 mt-20">
            <History size={48} className="mx-auto mb-4 opacity-30" />
            <p>Переводов пока нет.</p>
          </div>
        ) : (
          history.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex gap-4 items-start" onClick={() => {
              setAnalysisResult(item);
              setState(AppState.RESULT);
            }}>
              <div className="bg-sand w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0">
                {getEmoji(item.emotionalSpectrum.dominantEmotion)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-bold text-charcoal truncate">{item.emotionalSpectrum.dominantEmotion}</span>
                  <span className="text-xs text-charcoal/40">{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-charcoal/60 text-sm line-clamp-2">"{item.translation}"</p>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center font-body">
      {/* Mobile Wrapper */}
      <div className="bg-cream w-full h-screen sm:h-[800px] sm:w-[400px] sm:rounded-[3rem] shadow-2xl relative overflow-hidden">
        <AnimatePresence mode="wait">
          {state === AppState.HOME && renderHome()}
          {state === AppState.RECORDING && renderRecording()}
          {state === AppState.ANALYZING && renderAnalyzing()}
          {state === AppState.RESULT && renderResult()}
          {state === AppState.HISTORY && renderHistory()}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Helper to map emotion string to emoji
function getEmoji(emotion: string): string {
  const e = emotion.toLowerCase();
  if (e.includes('happy') || e.includes('play') || e.includes('радость') || e.includes('игр') || e.includes('счаст')) return '🎾';
  if (e.includes('anger') || e.includes('guard') || e.includes('злость') || e.includes('агресс') || e.includes('защит') || e.includes('рык')) return '🛡️';
  if (e.includes('fear') || e.includes('nervous') || e.includes('страх') || e.includes('нерв') || e.includes('тревог') || e.includes('испуг')) return '🌩️';
  if (e.includes('sad') || e.includes('грусть') || e.includes('печаль') || e.includes('тоск')) return '🌧️';
  return '🐕';
}
