import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Tuple
from dotenv import load_dotenv

# Ensure import paths are resolved
sys.path.append(str(Path(__file__).resolve().parent))

from utils.config import FAISS_INDEX_PATH, EMBEDDING_MODEL_NAME, LLM_MODEL_NAME, LLM_TEMPERATURE
from utils.embeddings import get_embedding_model
from utils.retriever import load_vector_store, retrieve_similar_chunks
from utils.prompt import get_rag_prompt_template

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.documents import Document
import logging

logger = logging.getLogger(__name__)

class RichDadRAGChatbot:
    """
    Manages the FAISS retriever and Gemini LLM RAG pipelines.
    """
    def __init__(self):
        load_dotenv()
        self.embeddings = None
        self.vector_store = None
        self.llm = None
        self._initialize_components()
        
    def _initialize_components(self) -> None:
        """Loads embeddings, vector index, and Gemini LLM."""
        try:
            # 1. Initialize Embeddings
            self.embeddings = get_embedding_model(EMBEDDING_MODEL_NAME)
            
            # 2. Try loading local FAISS vector store
            if os.path.exists(str(FAISS_INDEX_PATH)):
                self.vector_store = load_vector_store(str(FAISS_INDEX_PATH), self.embeddings)
            else:
                logger.warning(f"Vector store index not found at {FAISS_INDEX_PATH}. Please run ingest.py first.")
                self.vector_store = None
                
            # 3. Initialize Gemini LLM using LangChain
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.error("GEMINI_API_KEY environment variable is not set!")
                self.llm = None
            else:
                logger.info(f"Initializing LangChain Google Gemini: {LLM_MODEL_NAME}...")
                self.llm = ChatGoogleGenerativeAI(
                    model=LLM_MODEL_NAME,
                    temperature=LLM_TEMPERATURE,
                    google_api_key=api_key,
                    max_output_tokens=1024,
                )
                logger.info("Gemini LLM initialized successfully.")
                
        except Exception as e:
            logger.error(f"Error initializing RAG components: {e}")
            
    def answer_question(self, question: str, top_k: int = 5) -> Dict[str, Any]:
        """
        Retrieves Top-K chunks and gets RAG answer from Gemini.
        """
        if not question.strip():
            return {"answer": "Please enter a valid question.", "sources": []}
            
        if not self.vector_store:
            return {
                "answer": "FAISS vector store is not ready. Please upload/ingest the PDF book first.",
                "sources": []
            }
            
        if not self.llm:
            return {
                "answer": "Google Gemini API client is not initialized. Please set your GEMINI_API_KEY environment variable.",
                "sources": []
            }
            
        try:
            # 1. Retrieve similar chunks (returns Tuple[Document, score])
            scored_results = retrieve_similar_chunks(self.vector_store, question, top_k)
            
            if not scored_results:
                return {
                    "answer": "I couldn't find any relevant passages in the book to answer your question.",
                    "sources": []
                }
                
            # 2. Format context for prompt
            documents = [doc for doc, score in scored_results]
            context_list = []
            sources_list = []
            
            for idx, (doc, score) in enumerate(scored_results):
                page_num = doc.metadata.get("page_number", "Unknown")
                text = doc.page_content
                
                context_list.append(f"[Source: Rich Dad Poor Dad - Page: {page_num}]\n{text}")
                
                sources_list.append({
                    "text": text,
                    "page_number": page_num,
                    "similarity_score": float(score)  # L2 distance in FAISS
                })
                
            context_string = "\n\n-----------------\n\n".join(context_list)
            
            # 3. Create prompt
            prompt_template = get_rag_prompt_template()
            formatted_prompt = prompt_template.format(context=context_string, question=question)
            
            # 4. Generate answer from Gemini LLM
            logger.info("Invoking Gemini via LangChain...")
            response = self.llm.invoke(formatted_prompt)
            answer_text = response.content
            
            return {
                "answer": answer_text,
                "sources": sources_list
            }
            
        except Exception as e:
            logger.error(f"Error answering RAG question: {e}")
            return {
                "answer": f"An error occurred while answering your question: {str(e)}",
                "sources": []
            }
