import fitz  # PyMuPDF
from typing import List, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_pdf_text(pdf_path: str) -> List[Dict[str, Any]]:
    """
    Loads a PDF file and extracts text page-by-page.
    
    Args:
        pdf_path (str): Path to the PDF file.
        
    Returns:
        List[Dict[str, Any]]: A list of dictionaries containing:
            - "text": The extracted string text of the page
            - "page_number": The 1-based page number
            - "source": The path of the PDF file
    """
    pages_data = []
    
    try:
        logger.info(f"Opening PDF file from: {pdf_path}")
        doc = fitz.open(pdf_path)
        
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_num = page_idx + 1
            
            try:
                text = page.get_text().strip()
                
                # Ignore empty pages
                if not text:
                    logger.warning(f"Skipping page {page_num} because it is empty.")
                    continue
                    
                pages_data.append({
                    "text": text,
                    "page_number": page_num,
                    "source": str(pdf_path)
                })
                
            except Exception as e:
                logger.error(f"Error extracting text from page {page_num}: {e}")
                
        doc.close()
        logger.info(f"Successfully loaded {len(pages_data)} pages from {pdf_path}")
        
    except Exception as e:
        logger.error(f"Error opening or reading PDF file: {e}")
        raise e
        
    return pages_data
