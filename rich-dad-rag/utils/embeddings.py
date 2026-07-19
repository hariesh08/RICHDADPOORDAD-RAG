from langchain_community.embeddings import HuggingFaceEmbeddings
import logging

logger = logging.getLogger(__name__)

def get_embedding_model(model_name: str = "all-MiniLM-L6-v2") -> HuggingFaceEmbeddings:
    """
    Initializes and caches the Hugging Face Sentence Transformers embedding model.
    
    Args:
        model_name (str): The name of the sentence-transformers model.
        
    Returns:
        HuggingFaceEmbeddings: The initialized embedding model object.
    """
    logger.info(f"Loading Sentence Transformers Embedding Model: {model_name}...")
    try:
        embeddings = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        logger.info("Embedding model loaded successfully.")
        return embeddings
    except Exception as e:
        logger.error(f"Failed to load embedding model: {e}")
        raise e
