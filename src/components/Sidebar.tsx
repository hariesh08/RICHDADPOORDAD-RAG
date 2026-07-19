import React, { useRef, useState } from 'react';
import { 
  Book, RotateCcw, Sliders, Database, Cpu, 
  UploadCloud, CheckCircle2, XCircle, Loader2, Sparkles, X 
} from 'lucide-react';
import { SystemStatus } from '../types';

interface SidebarProps {
  status: SystemStatus | null;
  topK: number;
  setTopK: (val: number) => void;
  temperature: number;
  setTemperature: (val: number) => void;
  onReset: () => Promise<void>;
  onUpload: (fileBase64: string, fileName: string) => Promise<void>;
  isResetting: boolean;
  isUploading: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  status,
  topK,
  setTopK,
  temperature,
  setTemperature,
  onReset,
  onUpload,
  isResetting,
  isUploading,
  onClose
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle Drop Event
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  // Handle File Input Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };

  // Convert File to Base64 and send
  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported.');
      return;
    }

    // Limit to 20MB
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File size must be under 20MB.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        await onUpload(base64String, file.name);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to read PDF file.');
    }
  };

  const getAuthorName = (bookName: string) => {
    if (bookName.toLowerCase().includes('rich dad')) {
      return 'Robert T. Kiyosaki';
    }
    return 'Custom Document Ingest';
  };

  return (
    <aside className="w-full md:w-72 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto shrink-0" id="app-sidebar">
      {/* Brand Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-black rounded flex items-center justify-center text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="font-bold text-base tracking-tight text-gray-950">Rich Dad RAG</span>
        </div>
        <div className="flex items-center gap-2">
          {status?.hasApiKey ? (
            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200 uppercase tracking-wider">
              Ready
            </span>
          ) : (
            <span className="px-1.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-200 uppercase tracking-wider">
              No API
            </span>
          )}
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg md:hidden transition-colors ml-2"
              title="Close Sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col space-y-7">
        {/* Active Document */}
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Active Document</h3>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <p className="font-bold text-sm leading-tight text-gray-900 truncate" title={status?.bookName || 'Rich Dad Poor Dad'}>
              {status?.bookName || 'Rich Dad Poor Dad'}
            </p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">
              {status?.bookName ? getAuthorName(status.bookName) : 'Robert T. Kiyosaki'}
            </p>
          </div>
        </div>

        {/* System Metrics */}
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3.5">System Metrics</h3>
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between items-center pb-1.5 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Pages</span>
              <span className="font-bold text-gray-900 font-mono">{status?.totalPages || 336}</span>
            </div>
            <div className="flex justify-between items-center pb-1.5 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Chunks</span>
              <span className="font-bold text-gray-900 font-mono">{status?.chunksCount || 1420}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Vectors</span>
              <span className="font-bold text-gray-950 font-mono">FAISS</span>
            </div>
          </div>
        </div>

        {/* Models */}
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Models</h3>
          <div className="space-y-2.5 text-xs text-gray-700 font-medium">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>{status?.llmModel || 'Gemini 3.5 Flash'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span className="truncate" title={status?.embeddingModel || 'gemini-embedding-2-preview'}>
                {status?.embeddingModel || 'gemini-embedding-2-preview'}
              </span>
            </div>
          </div>
        </div>

        {/* Hyperparameters Controls */}
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            Hyperparameters
          </h3>
          <div className="space-y-4 bg-gray-50/50 p-3.5 rounded-xl border border-gray-200">
            {/* Top-K Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-600 font-medium">Top-K Retrieval</span>
                <span className="font-mono text-gray-900 font-bold">{topK}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={topK} 
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full accent-black h-1 bg-gray-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Temperature Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-600 font-medium">LLM Temperature</span>
                <span className="font-mono text-gray-900 font-bold">{temperature}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={temperature} 
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-black h-1 bg-gray-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Custom PDF Ingestion */}
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Custom Ingestion
          </h3>

          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 bg-white ${
              dragActive 
                ? 'border-black bg-gray-50 scale-[0.99]' 
                : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50/50'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              className="hidden"
            />
            
            {isUploading ? (
              <div className="flex flex-col items-center gap-1.5">
                <Loader2 size={18} className="text-black animate-spin" />
                <span className="text-xs font-semibold text-gray-700">Processing Book...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <UploadCloud size={18} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-700">Upload PDF Book</span>
                <span className="text-[9px] text-gray-400 font-medium">Drag & drop or click</span>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-[11px] flex gap-2 items-start border border-red-100 mt-2">
              <XCircle size={13} className="shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Clear Memory/Reset Action */}
      <div className="p-6 border-t border-gray-100 bg-white">
        <button
          onClick={onReset}
          disabled={isResetting || isUploading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-800 transition-colors disabled:opacity-50 shadow-sm"
        >
          {isResetting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
          Clear Memory
        </button>
      </div>
    </aside>
  );
}
