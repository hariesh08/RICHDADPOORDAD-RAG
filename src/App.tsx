import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, Trash2, Download, Copy, Check, 
  ThumbsUp, ThumbsDown, BookOpen, MessageSquare, Loader2, RefreshCw, Sliders, X, Sun, Moon
} from 'lucide-react';
import SuggestedQuestions from './components/SuggestedQuestions';
import SourceViewer from './components/SourceViewer';
import { Message, SystemStatus } from './types';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [topK, setTopK] = useState(5);
  const [temperature, setTemperature] = useState(0.2);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('hrag_dark_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('hrag_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Initial Server/Status info
  const loadStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Error fetching server status:', err);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Handle Query Submission
  const handleSend = async (textToSend?: string) => {
    const questionText = textToSend || input;
    if (!questionText.trim() || isGenerating) return;

    if (!textToSend) setInput('');

    const userMessage: Message = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);

    try {
      // Map history for API
      const historyPayload = messages.map(msg => ({
        sender: msg.sender,
        text: msg.text
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: questionText,
          history: historyPayload,
          topK,
          temperature
        })
      });

      if (!response.ok) {
        throw new Error('RAG server returned an error. Please verify configuration.');
      }

      const data = await response.json();

      const botMessage: Message = {
        id: `msg-bot-${Date.now()}`,
        sender: 'assistant',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources,
        confidenceScore: data.confidenceScore
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: `msg-err-${Date.now()}`,
        sender: 'assistant',
        text: err.message || 'An unexpected error occurred. Please make sure the backend is active.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset local database index to default
  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        await loadStatus();
        setMessages([]);
      }
    } catch (err) {
      console.error('Error resetting database:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Ingest Custom Uploaded PDF
  const handleUpload = async (fileBase64: string, fileName: string) => {
    setIsUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, fileName })
      });
      if (res.ok) {
        await loadStatus();
        setMessages([
          {
            id: `sys-msg-${Date.now()}`,
            sender: 'assistant',
            text: `Successfully ingested and embedded book "${fileName}". You can now start asking questions strictly from this PDF!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to ingest PDF.');
      }
    } catch (err: any) {
      console.error('Error uploading file:', err);
      alert('An error occurred during file upload.');
    } finally {
      setIsUploading(false);
    }
  };

  // Copy message text to clipboard
  const handleCopyText = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear Chat History
  const clearChat = () => {
    setMessages([]);
  };

  // Export Session Log as Markdown file
  const exportSession = () => {
    let md = `# Rich Dad Poor Dad RAG Chatbot Export\n`;
    md += `Date: ${new Date().toLocaleString()}\n`;
    md += `Active Book: ${status?.bookName || 'Default Book'}\n`;
    md += `--------------------------------------\n\n`;

    messages.forEach(m => {
      const name = m.sender === 'user' ? 'User' : 'RAG Assistant';
      md += `### ${name} (${m.timestamp})\n${m.text}\n\n`;
      if (m.sources && m.sources.length > 0) {
        md += `**Retrieved Sources:**\n`;
        m.sources.forEach((s, idx) => {
          md += `* [Source: ${s.source}, Page ${s.pageNumber}] "${s.text.trim()}"\n`;
        });
        md += `\n`;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rich_dad_poor_dad_chat_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0B0F19] text-[#E5E7EB]' : 'bg-[#F9FAFB] text-[#111827]'
    } relative`}>
      {/* Main Chat Frame */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header Controls */}
        <header className={`h-16 border-b flex items-center justify-between px-3 sm:px-6 shrink-0 z-10 transition-colors duration-200 ${
          isDarkMode ? 'bg-[#111827] border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              isDarkMode ? 'bg-white text-black' : 'bg-black text-white'
            } shrink-0`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className={`font-bold text-base sm:text-lg tracking-tight transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-950'
            }`}>HRAG'S</span>
            {status?.hasApiKey ? (
              <span className={`hidden sm:inline-block px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded border uppercase tracking-wider ml-1 sm:ml-2 transition-colors ${
                isDarkMode ? 'bg-green-950/40 text-green-400 border-green-800/60' : 'bg-green-50 text-green-700 border-green-200'
              }`}>Ready</span>
            ) : (
              <span className={`hidden sm:inline-block px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded border uppercase tracking-wider ml-1 sm:ml-2 transition-colors ${
                isDarkMode ? 'bg-red-950/40 text-red-400 border-red-800/60' : 'bg-red-50 text-red-700 border-red-200'
              }`}>Offline</span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'text-amber-400 hover:bg-gray-800' : 'text-gray-500 hover:text-black hover:bg-gray-100'
              }`}
              title={isDarkMode ? "Light Mode" : "Dark Mode"}
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <span className={`h-4 w-px ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></span>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-lg sm:px-3 sm:py-1.5 flex items-center gap-1.5 transition-colors font-semibold ${
                isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
              title="Engine Settings"
            >
              <Sliders size={14} />
              <span className="hidden md:inline">Settings</span>
            </button>
            <span className={`h-4 w-px ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></span>
            <button 
              onClick={exportSession}
              className={`p-2 rounded-lg sm:px-3 sm:py-1.5 flex items-center gap-1.5 transition-colors ${
                isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
              title="Export Session History"
            >
              <Download size={14} />
              <span className="hidden md:inline">Export</span>
            </button>
            <button 
              onClick={clearChat}
              className={`p-2 rounded-lg sm:px-3 sm:py-1.5 flex items-center gap-1.5 transition-colors ${
                isDarkMode ? 'text-red-400 hover:text-red-300 hover:bg-red-950/20' : 'text-red-600 hover:text-red-700 hover:bg-red-50'
              }`}
              title="Clear Memory"
            >
              <Trash2 size={14} />
              <span className="hidden md:inline">Clear</span>
            </button>
          </div>
        </header>

        {/* Chat History Viewport */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 transition-colors duration-200 ${
          isDarkMode ? 'bg-[#0f1420]' : 'bg-[#F9FAFB]'
        }`}>
          {messages.length === 0 ? (
            /* Branding & Greeting card when chat is empty */
            <div className="max-w-2xl mx-auto pt-12 space-y-8">
              <div className="text-center space-y-3">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10px] font-bold transition-colors ${
                  isDarkMode ? 'bg-white/10 text-white border border-white/20' : 'bg-black/5 text-black border border-black/10'
                }`}>
                  <Sparkles size={11} className="text-amber-500 animate-spin" /> STRICT KNOWLEDGE BOUNDS
                </div>
                <h2 className={`text-3xl font-extrabold tracking-tight transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-950'
                }`}>
                  HRAG'S
                </h2>
                <p className={`text-sm max-w-lg mx-auto leading-relaxed transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Ask detailed questions regarding cashflow management, liabilities vs assets, corporations, and real wealth mindsets from the book "Rich Dad Poor Dad".
                </p>
              </div>

              {/* Suggested Predefined Questions list */}
              <SuggestedQuestions onSelect={(q) => handleSend(q)} isDarkMode={isDarkMode} />
            </div>
          ) : (
            /* Message Bubbles Container */
            <div className="max-w-4xl mx-auto space-y-8">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col gap-3 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  
                  {msg.sender === 'user' ? (
                    /* User Message Style */
                    <div className={`max-w-[80%] p-4 rounded-2xl rounded-tr-none shadow-sm transition-colors ${
                      isDarkMode ? 'bg-blue-600 text-white' : 'bg-black text-white'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ) : (
                    /* Assistant Message Style */
                    <div className="w-full max-w-[85%] flex flex-col gap-4">
                      <div className={`p-5 rounded-2xl rounded-tl-none border shadow-sm transition-colors ${
                        isDarkMode ? 'bg-[#111827] border-gray-800' : 'bg-white border-gray-200'
                      }`}>
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap mb-4 transition-colors ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-800'
                        }`}>{msg.text}</p>
                        
                        {/* Meta lines, copy, etc. */}
                        <div className={`flex items-center justify-between pt-3 border-t transition-colors ${
                          isDarkMode ? 'border-gray-800' : 'border-gray-100'
                        }`}>
                          <div className="flex gap-2 items-center flex-wrap">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Retrieved from:</span>
                            {msg.sources && msg.sources.length > 0 ? (
                              msg.sources.map((src, sIdx) => (
                                <span key={sIdx} className={`px-2 py-0.5 text-[10px] rounded font-mono transition-colors ${
                                  isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                                }`}>Page {src.pageNumber}</span>
                              ))
                            ) : (
                              <span className="text-[10px] text-gray-400">Direct LLM Response</span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono">
                            <span>{msg.timestamp}</span>
                            <span className="text-gray-300">•</span>
                            <button 
                              onClick={() => handleCopyText(msg.text, msg.id)}
                              className={`transition-colors flex items-center gap-0.5 ${
                                isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black'
                              }`}
                              title="Copy to Clipboard"
                            >
                              {copiedId === msg.id ? <Check size={11} className={isDarkMode ? 'text-emerald-400' : 'text-green-600'} /> : <Copy size={11} />}
                              <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                            </button>
                            <span className="text-gray-300">•</span>
                            <button
                              onClick={() => setFeedback(prev => ({...prev, [msg.id]: 'up'}))}
                              className={`transition-colors ${
                                isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black'
                              } ${feedback[msg.id] === 'up' ? (isDarkMode ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold') : ''}`}
                            >
                              <ThumbsUp size={11} />
                            </button>
                            <button
                              onClick={() => setFeedback(prev => ({...prev, [msg.id]: 'down'}))}
                              className={`transition-colors ${
                                isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black'
                              } ${feedback[msg.id] === 'down' ? (isDarkMode ? 'text-red-400 font-bold' : 'text-red-600 font-bold') : ''}`}
                            >
                              <ThumbsDown size={11} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Source Preview bento-like cards */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-2">
                          {msg.sources.slice(0, 2).map((src, sIdx) => (
                            <div key={src.id || sIdx} className={`p-3 border border-dashed rounded-xl transition-colors ${
                              isDarkMode ? 'bg-[#111827]/40 border-gray-800' : 'bg-white/60 border-gray-300'
                            }`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-gray-500 font-mono">CHUNK #{sIdx + 1}</span>
                                <span className="text-[10px] text-gray-400 font-mono">Score: {(typeof src.similarity === 'number' && isFinite(src.similarity) ? src.similarity : 0).toFixed(2)}</span>
                              </div>
                              <p className={`text-[11px] line-clamp-3 leading-snug italic transition-colors ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>"{src.text}"</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Expandable deeper list view of all matching sources */}
                      {msg.sources && msg.sources.length > 2 && (
                        <div className="ml-2">
                          <SourceViewer sources={msg.sources} confidenceScore={msg.confidenceScore} isDarkMode={isDarkMode} />
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}

              {/* Chat Generating indicator */}
              {isGenerating && (
                <div className="flex flex-col gap-4 items-start">
                  <div className={`border p-5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3 transition-colors ${
                    isDarkMode ? 'bg-[#111827] border-gray-800' : 'bg-white border-gray-200'
                  }`}>
                    <Loader2 size={16} className="text-gray-400 animate-spin" />
                    <span className="text-xs text-gray-500 font-mono">Searching FAISS index and formulating answer...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Input Box Frame */}
        <footer className={`p-4 sm:p-5 border-t shrink-0 z-10 transition-colors duration-200 ${
          isDarkMode ? 'bg-[#111827] border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about Rich Dad Poor Dad..."
                disabled={isGenerating}
                className={`w-full py-3.5 pl-5 pr-12 text-sm rounded-2xl focus:outline-none focus:ring-2 transition-all ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-500' 
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-black/5 focus:border-black'
                }`}
              />
              <button
                type="submit"
                disabled={!input.trim() || isGenerating}
                className={`absolute right-2 top-1.5 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isDarkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40'
                    : 'bg-black text-white hover:bg-gray-800 disabled:opacity-35'
                }`}
                title="Send Message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </form>
            <p className="text-center mt-2.5 text-[10px] text-gray-400">
              AI-generated response based strictly on document context.
            </p>
          </div>
        </footer>
      </main>

      {/* Settings Modal Dialog Overlay */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className={`rounded-2xl shadow-xl border max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 transition-colors ${
            isDarkMode ? 'bg-[#111827] border-gray-800 text-white' : 'bg-white border-gray-100 text-gray-950'
          }`}>
            {/* Modal Header */}
            <div className={`p-6 border-b flex items-center justify-between ${
              isDarkMode ? 'border-gray-800' : 'border-gray-100'
            }`}>
              <div className="flex items-center gap-2">
                <Sliders size={18} className={isDarkMode ? 'text-white' : 'text-black'} />
                <h3 className="font-bold text-base">Engine Settings</h3>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-black hover:bg-gray-100'
                }`}
                title="Close settings"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Slider 1: LLM Temperature */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>LLM Temperature</span>
                  <span className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    isDarkMode ? 'bg-white text-black' : 'bg-black text-white'
                  }`}>
                    {temperature.toFixed(1)} {temperature === 0 ? '(Accurate)' : ''}
                  </span>
                </div>
                <input 
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
                    isDarkMode ? 'bg-gray-800 accent-blue-500' : 'bg-gray-100 accent-black'
                  }`}
                />
                <p className="text-[10px] text-gray-400 leading-snug">
                  Lower values force the engine to give exact, consistent answers. Set to 0.0 for absolute precision.
                </p>
              </div>

              {/* Slider 2: Top-K Retrieval */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Top-K Retrieval Passage Count</span>
                  <span className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    isDarkMode ? 'bg-white text-black' : 'bg-black text-white'
                  }`}>
                    {topK} {topK === 0 ? '(Strict / No Context)' : ''}
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value))}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
                    isDarkMode ? 'bg-gray-800 accent-blue-500' : 'bg-gray-100 accent-black'
                  }`}
                />
                <p className="text-[10px] text-gray-400 leading-snug">
                  The number of page segments extracted from the book for the AI to base its answer on. Set to 0 to only reply with basic knowledge.
                </p>
              </div>

              {/* Status Section */}
              <div className={`pt-4 border-t space-y-3 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">System Status</span>
                
                <div className="flex justify-between items-center text-xs py-1">
                  <span className="text-gray-500">Active Book Source</span>
                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{status?.bookName || "Rich Dad Poor Dad"}</span>
                </div>

                <div className="flex justify-between items-center text-xs py-1">
                  <span className="text-gray-500">API Connection Status</span>
                  {status?.hasApiKey ? (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60">READY</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/60">OFFLINE</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-6 border-t flex justify-end gap-3 transition-colors ${
              isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-gray-50 border-gray-100'
            }`}>
              <button
                onClick={() => {
                  clearChat();
                  setIsSettingsOpen(false);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
                  isDarkMode ? 'text-red-400 hover:bg-red-950/30' : 'text-red-600 hover:bg-red-50'
                }`}
              >
                Clear Memory
              </button>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className={`px-5 py-2 text-xs font-semibold rounded-xl transition-colors ${
                  isDarkMode ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-950'
                }`}
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
