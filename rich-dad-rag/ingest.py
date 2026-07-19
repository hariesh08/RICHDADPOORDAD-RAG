import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path to ensure utils can be imported
sys.path.append(str(Path(__file__).resolve().parent))

from utils.config import DEFAULT_PDF_PATH, FAISS_INDEX_PATH, CHUNK_SIZE, CHUNK_OVERLAP, EMBEDDING_MODEL_NAME
from utils.pdf_loader import load_pdf_text
from utils.chunker import split_pages_into_chunks
from utils.embeddings import get_embedding_model
from utils.retriever import create_vector_store

import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_ingestion(pdf_path: str = str(DEFAULT_PDF_PATH)) -> None:
    """
    Main ingestion pipeline.
    Loads PDF, chunks the text, computes embeddings, and saves the FAISS index.
    """
    load_dotenv()
    
    if not os.path.exists(pdf_path):
        logger.error(f"Target PDF file not found at: {pdf_path}")
        logger.info("Please place the 'rich_dad_poor_dad.pdf' inside the 'books/' directory first.")
        sys.exit(1)
        
    try:
        # 1. Load PDF
        logger.info("Step 1: Loading PDF and extracting text...")
        pages_data = load_pdf_text(pdf_path)
        
        # 2. Chunk text
        logger.info(f"Step 2: Splitting pages into chunks (Size: {CHUNK_SIZE}, Overlap: {CHUNK_OVERLAP})...")
        documents = split_pages_into_chunks(pages_data, CHUNK_SIZE, CHUNK_OVERLAP)
        logger.info(f"Generated {len(documents)} text chunks.")
        
        # 3. Load embeddings model
        logger.info(f"Step 3: Initializing Embedding Model: {EMBEDDING_MODEL_NAME}...")
        embeddings = get_embedding_model(EMBEDDING_MODEL_NAME)
        
        # 4. Create vector store and save locally
        logger.info("Step 4: Generating embeddings and building FAISS Vector Store...")
        create_vector_store(documents, embeddings, str(FAISS_INDEX_PATH))
        
        logger.info("=== Ingestion Pipeline Completed Successfully! ===")
        print(f"\nSuccess! FAISS Vector Store created with {len(documents)} chunks.")
        print(f"Index successfully saved to: {FAISS_INDEX_PATH}\n")
        
    except Exception as e:
        logger.error(f"An error occurred during ingestion: {e}")
        sys.exit(1)

if __name__ == "__main__":
    pdf_to_ingest = str(DEFAULT_PDF_PATH)
    if len(sys.argv) > 1:
        pdf_to_ingest = sys.argv[1]
    run_ingestion(pdf_to_ingest)
