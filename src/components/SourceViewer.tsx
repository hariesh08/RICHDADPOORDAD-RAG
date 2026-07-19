import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Percent, Bookmark } from 'lucide-react';
import { SourceChunk } from '../types';

interface SourceViewerProps {
  sources: SourceChunk[];
  confidenceScore?: number;
  isDarkMode?: boolean;
}

export default function SourceViewer({ sources, confidenceScore, isDarkMode }: SourceViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className={`mt-3 border rounded-xl overflow-hidden transition-colors ${
      isDarkMode ? 'border-gray-800 bg-[#111827]/30' : 'border-gray-100 bg-gray-50/50'
    }`}>
      {/* Header Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 text-xs font-medium transition-colors text-left ${
          isDarkMode 
            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40' 
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpen size={13} className="text-gray-400 shrink-0" />
          <span>Retrieved {sources.length} <span className="hidden sm:inline">matching</span> passages</span>
          {confidenceScore !== undefined && confidenceScore > 0 && (
            <span className={`font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 text-[10px] transition-colors ${
              isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}>
              <Percent size={10} /> Confidence: {Math.round(confidenceScore * 100)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] self-end sm:self-auto shrink-0">
          <span>{isOpen ? 'COLLAPSE' : 'EXPAND'}</span>
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
      </button>

      {/* Expandable Chunks list */}
      {isOpen && (
        <div className={`border-t p-3 space-y-3 max-h-80 overflow-y-auto transition-colors ${
          isDarkMode 
            ? 'border-gray-800 bg-[#111827] divide-y divide-gray-800' 
            : 'border-gray-100 bg-white divide-y divide-gray-50'
        }`}>
          {sources.map((src, idx) => (
            <div key={src.id || idx} className="pt-3 first:pt-0 space-y-1.5 text-xs">
              {/* Chunk Meta Header */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <div className="flex items-center gap-1.5">
                  <Bookmark size={11} className={isDarkMode ? 'text-white' : 'text-black'} />
                  <span className={`font-bold transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{src.source}</span>
                  {src.chapter && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>{src.chapter}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                    isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'
                  }`}>Page {src.pageNumber}</span>
                  <span className="text-gray-400">Score: {(typeof src.similarity === 'number' && isFinite(src.similarity) ? src.similarity : 0).toFixed(3)}</span>
                </div>
              </div>

              {/* Chunk text content */}
              <p className={`leading-relaxed font-sans p-2.5 rounded-lg border italic transition-colors ${
                isDarkMode 
                  ? 'text-gray-300 bg-[#111827]/40 border-gray-800' 
                  : 'text-gray-600 bg-gray-50/50 border-gray-100'
              }`}>
                "{src.text}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
