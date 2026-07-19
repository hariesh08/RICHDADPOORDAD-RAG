import React from 'react';
import { Sparkles } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  isDarkMode?: boolean;
}

const QUESTIONS = [
  {
    topic: 'Core Rules',
    text: 'What is Rule Number One according to the book?',
    desc: 'The single most critical rule of financial literacy.'
  },
  {
    topic: 'Financial Literacy',
    text: 'What is the difference between an asset and a liability?',
    desc: 'The fundamental definition that separates the rich and poor.'
  },
  {
    topic: 'Real Estate',
    text: 'Why does Robert Kiyosaki say a house is a liability and not an asset?',
    desc: 'Explaining the monthly cash outflow of primary residences.'
  },
  {
    topic: 'Financial Intelligence',
    text: 'What are the four components of a high Financial IQ?',
    desc: 'Accounting, Investing, Understanding Markets, and the Law.'
  },
  {
    topic: 'Taxes & Corporations',
    text: 'How do the rich avoid heavy taxes legally?',
    desc: 'Using corporate frameworks to earn, spend, and pay tax on what remains.'
  },
  {
    topic: 'The Mindset',
    text: 'What is the pattern of the "Rat Race"?',
    desc: 'How fear and greed lock people into repeating career patterns.'
  }
];

export default function SuggestedQuestions({ onSelect, isDarkMode }: SuggestedQuestionsProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 text-gray-400">
        <Sparkles size={14} className="text-amber-500" />
        <span className="text-xs font-semibold uppercase tracking-wider">Suggested Questions to Try</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(q.text)}
            className={`text-left p-4 rounded-xl border transition-all group flex flex-col justify-between h-full hover:shadow-sm ${
              isDarkMode 
                ? 'border-gray-800 bg-[#111827] hover:border-gray-700 hover:bg-gray-800/40' 
                : 'border-gray-200 bg-white hover:border-black/30 hover:bg-gray-50/50'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-gray-400">
                {q.topic}
              </span>
              <h4 className={`text-xs font-semibold leading-snug transition-colors ${
                isDarkMode ? 'text-white group-hover:text-blue-400' : 'text-gray-950 group-hover:text-black'
              }`}>
                {q.text}
              </h4>
            </div>
            <p className={`text-[10px] mt-2 line-clamp-2 transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {q.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
