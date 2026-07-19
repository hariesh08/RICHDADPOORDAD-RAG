import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
BOOKS_DIR = BASE_DIR / "books"
VECTORSTORE_DIR = BASE_DIR / "vectorstore"

# Ensure directories exist
BOOKS_DIR.mkdir(parents=True, exist_ok=True)
VECTORSTORE_DIR.mkdir(parents=True, exist_ok=True)

# File Paths
DEFAULT_PDF_PATH = BOOKS_DIR / "rich_dad_poor_dad.pdf"
FAISS_INDEX_PATH = VECTORSTORE_DIR / "faiss_index"

# Text Chunking Configs
CHUNK_SIZE = 700
CHUNK_OVERLAP = 150

# Models Configuration
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
LLM_MODEL_NAME = "gemini-1.5-flash"  # Using standard langchain-google-genai recommended model

# LLM Parameters
LLM_TEMPERATURE = 0.2
LLM_MAX_OUTPUT_TOKENS = 1024
