from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Dict, Any
from langchain_core.documents import Document
import uuid

def split_pages_into_chunks(
    pages_data: List[Dict[str, Any]], 
    chunk_size: int = 700, 
    chunk_overlap: int = 150
) -> List[Document]:
    """
    Splits page text into small chunks while preserving metadata and page numbers.
    
    Args:
        pages_data (List[Dict[str, Any]]): Pages containing text and metadata
        chunk_size (int): Max size of each chunk
        chunk_overlap (int): Overlap size between adjacent chunks
        
    Returns:
        List[Document]: List of LangChain Document objects ready for embedding
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    
    documents = []
    
    for page in pages_data:
        text = page["text"]
        page_num = page["page_number"]
        source = page["source"]
        
        # Split page text
        page_chunks = splitter.split_text(text)
        
        for i, chunk in enumerate(page_chunks):
            # Form unique chunk id
            chunk_id = f"chunk-{page_num}-{i}-{str(uuid.uuid4())[:8]}"
            
            # Prepare LangChain document
            doc = Document(
                page_content=chunk,
                metadata={
                    "chunk_id": chunk_id,
                    "page_number": page_num,
                    "source": source,
                }
            )
            documents.append(doc)
            
    return documents
