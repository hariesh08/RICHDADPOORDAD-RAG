from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_community.embeddings import HuggingFaceEmbeddings
from typing import List, Tuple, Any
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def create_vector_store(
    documents: List[Document], 
    embeddings: HuggingFaceEmbeddings, 
    save_path: str
) -> FAISS:
    """
    Creates a FAISS vector store from documents and saves it locally.
    """
    logger.info(f"Creating FAISS vector store with {len(documents)} documents...")
    try:
        db = FAISS.from_documents(documents, embeddings)
        db.save_local(save_path)
        logger.info(f"Vector store saved successfully to {save_path}")
        return db
    except Exception as e:
        logger.error(f"Error creating/saving FAISS vector store: {e}")
        raise e

def load_vector_store(
    save_path: str, 
    embeddings: HuggingFaceEmbeddings
) -> FAISS:
    """
    Loads an existing FAISS vector store index from local disk.
    """
    logger.info(f"Loading FAISS vector store from: {save_path}")
    if not Path(save_path).exists():
        raise FileNotFoundError(f"FAISS index path {save_path} does not exist.")
        
    try:
        db = FAISS.load_local(save_path, embeddings, allow_dangerous_deserialization=True)
        logger.info("Vector store loaded successfully.")
        return db
    except Exception as e:
        logger.error(f"Error loading FAISS vector store: {e}")
        raise e

def retrieve_similar_chunks(
    db: FAISS, 
    query: str, 
    top_k: int = 5
) -> List[Tuple[Document, float]]:
    """
    Retrieves the top K most similar chunks for a given search query.
    
    Returns:
        List[Tuple[Document, float]]: List of tuples containing Document and L2 distance or similarity score.
    """
    logger.info(f"Performing similarity search for query: '{query}' (Top K: {top_k})")
    try:
        # returns (Document, score)
        results = db.similarity_search_with_score(query, k=top_k)
        return results
    except Exception as e:
        logger.error(f"Error searching FAISS vector store: {e}")
        raise e
