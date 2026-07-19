export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: SourceChunk[];
  confidenceScore?: number;
}

export interface SourceChunk {
  id: string;
  text: string;
  pageNumber: number;
  chapter: string | null;
  source: string;
  similarity: number;
}

export interface SystemStatus {
  status: string;
  bookName: string;
  totalPages: number;
  chunksCount: number;
  embeddingModel: string;
  llmModel: string;
  hasApiKey: boolean;
}
