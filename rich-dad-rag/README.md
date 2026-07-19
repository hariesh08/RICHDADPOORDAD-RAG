# Rich Dad Poor Dad - Retrieval-Augmented Generation (RAG) Chatbot

A high-performance, modular, and production-ready Python RAG chatbot designed to answer questions **strictly and exclusively** from Robert Kiyosaki's financial classic, *"Rich Dad Poor Dad"*. It leverages a local FAISS vector store, SentenceTransformers embeddings, and Google Gemini Flash to ensure extremely reliable, non-hallucinatory Q&A with strict page-number citations.

---

## 🚀 Key Features

* **Strict Fact-Checking (RAG)**: Uses top-K semantic search to extract relevant page passages. If the answer is not in the text, it responds: *"I couldn't find that information in the provided book."* (Zero hallucinations).
* **Page Citations**: Always attributes facts to specific page numbers found in the text.
* **Streamlit UI**: A clean, minimalist black, white, and light-gray dashboard featuring a custom conversation panel, dynamic suggestions, typing indicators, and adjustable Top-K sliders.
* **PDF Ingestion & Customization**: Features full-text ingestion with page number tracking using PyMuPDF (`fitz`), character chunking with `RecursiveCharacterTextSplitter`, and local vector persistence using FAISS.
* **Exportable Sessions**: Download full session logs instantly as Markdown files.

---

## 📁 Project Structure

```text
rich-dad-rag/
├── app.py              # Streamlit Main App entry point
├── ingest.py           # Ingestion pipeline (Loads, chunks, and embeds the PDF)
├── chatbot.py          # Chatbot logic wrapping FAISS and Gemini LLM via LangChain
├── requirements.txt    # Python dependencies
├── .env.example        # Environment variable blueprint
├── README.md           # Documentation
├── books/              # Storage directory for book PDFs
│   └── rich_dad_poor_dad.pdf
├── vectorstore/        # Saved FAISS indexes
└── utils/
    ├── config.py       # Centered constants and hyper-parameter configurations
    ├── pdf_loader.py   # Extracts page-by-page text from PDFs using PyMuPDF
    ├── chunker.py      # Splits text recursively into standard overlapping chunks
    ├── embeddings.py   # Load and wraps SentenceTransformer ('all-MiniLM-L6-v2')
    ├── retriever.py    # Standardizes FAISS index loading, building, and searching
    └── prompt.py       # Holds the strict systemic RAG prompt instructions
```

---

## 🛠️ Step-by-Step Installation

### 1. Prerequisites
Ensure you have **Python 3.9 to 3.11** installed on your system.

### 2. Set Up Virtual Environment
Create and activate a virtual environment to isolate project packages:

```bash
# Create environment
python -m venv venv

# Activate on Linux/macOS
source venv/bin/activate

# Activate on Windows
venv\Scripts\activate
```

### 3. Install Dependencies
Install all required libraries using pip:

```bash
pip install -r requirements.txt
```

### 4. API Key Configuration
Create a `.env` file from the example blueprint:

```bash
cp .env.example .env
```

Open `.env` and configure your Google Gemini API key:
```env
GEMINI_API_KEY="AIzaSyYourActualGoogleGeminiKeyHere"
```

### 5. PDF Book Ingestion
Place your PDF copy of **Rich Dad Poor Dad** inside the `books/` folder and rename it exactly to `rich_dad_poor_dad.pdf`. Then, run the ingestion pipeline script:

```bash
python ingest.py
```
This will:
1. Parse the PDF page-by-page.
2. Build 700-character chunks with a 150-character overlap.
3. Generate local vector embeddings using `all-MiniLM-L6-v2`.
4. Compile and save the FAISS vector index files under the `vectorstore/` directory.

### 6. Run the Streamlit Dashboard
Launch the front-end interface:

```bash
streamlit run app.py
```

Open `http://localhost:8501` in your browser to start querying the book!

---

## 🔮 Future Enhancements
* **Advanced Hybrid Search**: Combine dense embeddings (FAISS) with sparse keyword retrieval (BM25) to further improve search accuracy.
* **Auto-Correction & Query Expansion**: Use Gemini to automatically refine or expand user questions prior to vector search.
* **Multimodal RAG**: Extract figures and tables from the book and query visual charts using multimodal Gemini vision.
