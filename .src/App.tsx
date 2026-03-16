import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { 
  Languages, 
  ArrowRight, 
  Check, 
  Clock, 
  Copy, 
  Download, 
  History, 
  LoaderCircle, 
  Sparkles, 
  Trash2, 
  X,
  BrainCircuit,
  AlertCircle,
  Settings,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";

// Helper to get API Key from various sources
const getInitialApiKey = () => {
  if (typeof window !== 'undefined') {
    // 1. Check AI Studio Env
    if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
    // 2. Check Vite Env (for GitHub/Local)
    if (import.meta.env.VITE_GEMINI_API_KEY) return import.meta.env.VITE_GEMINI_API_KEY;
    // 3. Check Local Storage
    return localStorage.getItem("prochain_api_key") || "";
  }
  return "";
};

interface Language {
  id: string;
  name: string;
}

const LANGUAGES: Language[] = [
  { id: "ar", name: "Arabic" },
  { id: "bn", name: "Bangla" },
  { id: "zh-CN", name: "Chinese (Simplified)" },
  { id: "de", name: "German" },
  { id: "en-US", name: "English (US)" },
  { id: "en-US-pro", name: "English (US Professional)" },
  { id: "fr", name: "French" },
  { id: "hi", name: "Hindi" },
  { id: "ja", name: "Japanese" },
  { id: "es", name: "Spanish" },
].sort((a, b) => a.name.localeCompare(b.name));

interface HistoryItem {
  id: string;
  timestamp: number;
  sourceLang: string;
  target1Lang: string;
  target2Lang: string;
  sourceText: string;
  target1Text: string;
  target2Text: string;
  isThinkingMode: boolean;
}

export default function App() {
  const [apiKey, setApiKey] = useState(getInitialApiKey);
  const [showSettings, setShowSettings] = useState(false);
  const [sourceLang, setSourceLang] = useState("bn");
  const [target1Lang, setTarget1Lang] = useState("en-US");
  const [target2Lang, setTarget2Lang] = useState("en-US-pro");
  const [inputText, setInputText] = useState("");
  const [translation1, setTranslation1] = useState("");
  const [translation2, setTranslation2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [copied1, setCopied1] = useState(false);
  const [copied2, setCopied2] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("prochain_history");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
    }
    return [];
  });
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("prochain_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (apiKey && !process.env.GEMINI_API_KEY && !import.meta.env.VITE_GEMINI_API_KEY) {
      localStorage.setItem("prochain_api_key", apiKey);
    }
  }, [apiKey]);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    if (!apiKey) {
      setError("Please set your Gemini API Key in settings first.");
      setShowSettings(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const genAI = new GoogleGenAI({ apiKey });
      const sLangName = LANGUAGES.find(l => l.id === sourceLang)?.name;
      const t1LangName = LANGUAGES.find(l => l.id === target1Lang)?.name;
      const t2LangName = LANGUAGES.find(l => l.id === target2Lang)?.name;

      const modelName = isThinkingMode ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
      
      const prompt = `Translate the following text from ${sLangName} to ${t1LangName} and ${t2LangName}. 
Ensure the translations are highly professional, accurate, and natural-sounding.

SPECIAL INSTRUCTION:
If any target language is "English (US Professional)", you MUST rewrite and refine the text so it sounds EXACTLY like a highly professional, educated native speaker from the United States in a corporate or formal setting. Use advanced vocabulary, native phrasing, and flawless US English corporate tone.

Text to translate:
${inputText}`;

      const response = await genAI.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: isThinkingMode ? 0.7 : 0.3,
          thinkingConfig: isThinkingMode ? { thinkingLevel: ThinkingLevel.HIGH } : undefined,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translation1: { type: Type.STRING, description: `The professional ${t1LangName} translation` },
              translation2: { type: Type.STRING, description: `The professional ${t2LangName} translation` },
            },
            required: ["translation1", "translation2"],
          },
        },
      });

      const resultText = response.text;
      if (resultText) {
        const result = JSON.parse(resultText);
        const t1 = result.translation1 || "";
        const t2 = result.translation2 || "";
        
        setTranslation1(t1);
        setTranslation2(t2);

        const newItem: HistoryItem = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          sourceLang,
          target1Lang,
          target2Lang,
          sourceText: inputText,
          target1Text: t1,
          target2Text: t2,
          isThinkingMode
        };
        setHistory(prev => [newItem, ...prev].slice(0, 50));
      }
    } catch (err) {
      console.error("Translation error:", err);
      setError("An error occurred during translation. Please check your API key or try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (index === 1) {
      setCopied1(true);
      setTimeout(() => setCopied1(false), 2000);
    } else {
      setCopied2(true);
      setTimeout(() => setCopied2(false), 2000);
    }
  };

  const clearWorkspace = () => {
    setInputText("");
    setTranslation1("");
    setTranslation2("");
    setError(null);
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all translation history?")) {
      setHistory([]);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setSourceLang(item.sourceLang);
    setTarget1Lang(item.target1Lang);
    setTarget2Lang(item.target2Lang);
    setInputText(item.sourceText);
    setTranslation1(item.target1Text);
    setTranslation2(item.target2Text);
    setIsThinkingMode(item.isThinkingMode);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const swapLanguages = () => {
    const oldSource = sourceLang;
    setSourceLang(target1Lang);
    setTarget1Lang(oldSource);
    // If target2 was also the same as target1, maybe swap it too or just leave it
  };

  const getLangName = (id: string) => LANGUAGES.find(l => l.id === id)?.name || id;
  const formatDate = (ts: number) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(ts));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-sm">
              <Languages size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">ProChain</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsThinkingMode(!isThinkingMode)}
              className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border transition-all ${
                isThinkingMode 
                  ? "bg-amber-50 text-amber-700 border-amber-200 shadow-sm ring-2 ring-amber-100" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
              title="Thinking Mode: Uses Gemini 3.1 Pro for better reasoning"
            >
              <BrainCircuit size={16} className={isThinkingMode ? "animate-pulse" : ""} />
              <span className="hidden sm:inline">{isThinkingMode ? "Thinking Mode ON" : "Thinking Mode"}</span>
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
                showHistory ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <History size={16} />
              <span className="hidden sm:inline">History ({history.length})</span>
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Settings size={18} className="text-indigo-600" />
                  <h3 className="font-bold text-slate-800">Settings</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Key size={12} />
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API Key..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                  />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Your API key is stored locally in your browser. It is required for translation when running outside of AI Studio.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/10"
                  >
                    Save & Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleTranslate}
              disabled={!inputText.trim() || isLoading}
              className="group flex items-center gap-3 bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:shadow-indigo-500/20 transition-all active:scale-[0.98] text-base"
            >
              {isLoading ? (
                <>
                  <LoaderCircle size={20} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Translate Now</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            
            {isThinkingMode && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 text-xs font-bold uppercase tracking-wider"
              >
                <Sparkles size={12} />
                Advanced Reasoning
              </motion.div>
            )}
          </div>

          <button
            onClick={clearWorkspace}
            disabled={!inputText && !translation1 && !translation2}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-4 py-2 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 bg-white shadow-sm"
          >
            <Trash2 size={16} />
            Clear Workspace
          </button>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm"
          >
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}

        {/* Translation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
          {/* Source Card */}
          <div className="bg-white rounded-3xl shadow-sm hover:shadow-md border border-slate-200 overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all lg:sticky lg:top-24">
            <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="appearance-none bg-transparent text-slate-700 font-bold py-1 pr-8 focus:outline-none cursor-pointer hover:text-indigo-600 transition-colors bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_center] bg-[length:16px]"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.id} value={l.id}>{l.id.split('-')[0].toUpperCase()} - {l.name}</option>
                  ))}
                </select>
                <button 
                  onClick={swapLanguages}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Swap source and first target"
                >
                  <ArrowRight size={14} className="rotate-0 lg:rotate-0" />
                </button>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Source</span>
            </div>
            <div className="relative flex-1 flex flex-col p-6">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type or paste your text here..."
                className="flex-1 w-full min-h-[250px] resize-none border-none bg-transparent text-lg leading-relaxed text-slate-800 placeholder:text-slate-300 focus:ring-0 focus:outline-none"
                spellCheck="false"
              />
              {inputText && (
                <button
                  onClick={() => setInputText("")}
                  className="absolute top-6 right-6 p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Target 1 Card */}
          <div className="bg-white rounded-3xl shadow-sm hover:shadow-md border border-slate-200 overflow-hidden flex flex-col transition-all">
            <div className="bg-indigo-50/50 border-b border-indigo-100 px-5 py-4 flex items-center justify-between">
              <select
                value={target1Lang}
                onChange={(e) => setTarget1Lang(e.target.value)}
                className="appearance-none bg-transparent text-indigo-900 font-bold py-1 pr-8 focus:outline-none cursor-pointer hover:text-indigo-700 transition-colors bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%234338ca%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_center] bg-[length:16px]"
              >
                {LANGUAGES.map(l => (
                  <option key={l.id} value={l.id}>{l.id.split('-')[0].toUpperCase()} - {l.name}</option>
                ))}
              </select>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Target 1</span>
            </div>
            <div className="relative flex-1 flex flex-col p-6 bg-indigo-50/10">
              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 min-h-[250px]">
                  <LoaderCircle size={28} className="animate-spin text-indigo-500" />
                  <span className="text-sm font-medium animate-pulse">Translating...</span>
                </div>
              ) : (
                <>
                  <textarea
                    value={translation1}
                    readOnly
                    placeholder="Translation will appear here..."
                    className="flex-1 w-full min-h-[250px] resize-none border-none bg-transparent text-lg leading-relaxed text-slate-800 placeholder:text-slate-300 focus:ring-0 focus:outline-none"
                  />
                  {translation1 && (
                    <div className="absolute bottom-6 right-6">
                      <button
                        onClick={() => copyToClipboard(translation1, 1)}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-700 bg-white border border-slate-200 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                      >
                        {copied1 ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                        {copied1 ? "COPIED!" : "COPY"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Target 2 Card */}
          <div className="bg-white rounded-3xl shadow-sm hover:shadow-md border border-slate-200 overflow-hidden flex flex-col transition-all">
            <div className="bg-rose-50/50 border-b border-rose-100 px-5 py-4 flex items-center justify-between">
              <select
                value={target2Lang}
                onChange={(e) => setTarget2Lang(e.target.value)}
                className="appearance-none bg-transparent text-rose-900 font-bold py-1 pr-8 focus:outline-none cursor-pointer hover:text-rose-700 transition-colors bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23be123c%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_center] bg-[length:16px]"
              >
                {LANGUAGES.map(l => (
                  <option key={l.id} value={l.id}>{l.id.split('-')[0].toUpperCase()} - {l.name}</option>
                ))}
              </select>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Target 2</span>
            </div>
            <div className="relative flex-1 flex flex-col p-6 bg-rose-50/10">
              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 min-h-[250px]">
                  <LoaderCircle size={28} className="animate-spin text-rose-500" />
                  <span className="text-sm font-medium animate-pulse">Translating...</span>
                </div>
              ) : (
                <>
                  <textarea
                    value={translation2}
                    readOnly
                    placeholder="Translation will appear here..."
                    className="flex-1 w-full min-h-[250px] resize-none border-none bg-transparent text-lg leading-relaxed text-slate-800 placeholder:text-slate-300 focus:ring-0 focus:outline-none"
                  />
                  {translation2 && (
                    <div className="absolute bottom-6 right-6">
                      <button
                        onClick={() => copyToClipboard(translation2, 2)}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-rose-700 bg-white border border-slate-200 shadow-sm hover:border-rose-200 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all"
                      >
                        {copied2 ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                        {copied2 ? "COPIED!" : "COPY"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* History Section */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-8 border-t border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <History className="text-indigo-600" size={24} />
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Translation History</h2>
                  </div>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-sm font-bold text-slate-400 hover:text-rose-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50 uppercase tracking-wider"
                    >
                      Clear History
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                    <Clock className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-slate-500 font-medium text-lg">No translation history yet</p>
                    <p className="text-slate-400 mt-1">Your translations will be saved here automatically.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {history.map(item => (
                      <motion.div
                        key={item.id}
                        layout
                        onClick={() => loadFromHistory(item)}
                        className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group relative"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                            <span className="bg-slate-100 px-2 py-1 rounded-md">{getLangName(item.sourceLang)}</span>
                            <ArrowRight size={10} />
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md">{getLangName(item.target1Lang)}</span>
                            <span className="text-slate-300">&</span>
                            <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded-md">{getLangName(item.target2Lang)}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{formatDate(item.timestamp)}</span>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm text-slate-800 line-clamp-2 font-medium">{item.sourceText}</p>
                          <div className="pt-3 border-t border-slate-100">
                            <p className="text-sm text-slate-500 line-clamp-2 italic">{item.target1Text}</p>
                          </div>
                        </div>
                        {item.isThinkingMode && (
                          <div className="absolute top-2 right-2">
                            <BrainCircuit size={12} className="text-amber-400" />
                          </div>
                        )}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-black text-indigo-600 flex items-center gap-1 uppercase tracking-wider">
                            Load translation <ArrowRight size={12} />
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span>&copy; 2026 ProChain</span>
            <span className="h-1 w-1 bg-slate-200 rounded-full"></span>
            <span>Professional Grade AI</span>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <Sparkles size={12} className="text-indigo-500" />
              Powered by Gemini
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
