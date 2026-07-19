# Rich Dad Poor Dad - RAG Chatbot

An advanced Retrieval-Augmented Generation (RAG) chatbot that answers questions using information retrieved exclusively from Robert Kiyosaki's book *"Rich Dad Poor Dad"*.

Built with React, Express, and the Gemini API.

## Features

- **Strict RAG enforcement** - Answers only from book context; responds with a fallback message when information is unavailable
- **Page-level citations** - Every answer references specific page numbers from the book
- **Custom PDF ingestion** - Upload any PDF to build a custom knowledge base
- **Dark mode** - Toggle between light and dark themes
- **Session export** - Download chat history as Markdown
- **Configurable parameters** - Adjust temperature and top-K retrieval at runtime

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```
   npm install
   ```
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. Run the app:
   ```
   npm run dev
   ```

The app will start on `http://localhost:3000`.

## Python Implementation

A separate Python/Streamlit version is available in the `rich-dad-rag/` directory using FAISS and local embeddings.

```bash
cd rich-dad-rag
pip install -r requirements.txt
python ingest.py
streamlit run app.py
```

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS
- **Backend:** Express.js, TypeScript
- **Embeddings:** Gemini Embedding API
- **LLM:** Gemini Flash
