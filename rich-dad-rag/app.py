import os
import sys
import uuid
import datetime
from pathlib import Path
import streamlit as st

# Ensure utility classes can be found
sys.path.append(str(Path(__file__).resolve().parent))

from chatbot import RichDadRAGChatbot
from utils.config import DEFAULT_PDF_PATH, FAISS_INDEX_PATH, EMBEDDING_MODEL_NAME, LLM_MODEL_NAME
from utils.pdf_loader import load_pdf_text
from utils.chunker import split_pages_into_chunks
from utils.retriever import create_vector_store

# Set page configurations
st.set_page_config(
    page_title="Rich Dad Poor Dad RAG Chatbot",
    page_icon="📖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom minimal modern styling using CSS Injection
st.markdown("""
    <style>
    /* Global styles */
    .stApp {
        background-color: #fafafa;
        color: #111111;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    /* Header styling */
    .header-container {
        padding: 1.5rem 0;
        margin-bottom: 2rem;
        border-bottom: 1px solid #eaeaea;
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .header-title {
        font-size: 2.2rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        letter-spacing: -0.04em;
    }
    .header-subtitle {
        font-size: 1rem;
        color: #666666;
        margin-top: 0.25rem;
    }
    
    /* Rounded card containers */
    .custom-card {
        background-color: #ffffff;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    
    /* Source highlight styling */
    .source-box {
        background-color: #f5f5f5;
        border-left: 3px solid #111111;
        padding: 0.75rem 1rem;
        margin: 0.5rem 0;
        border-radius: 0 8px 8px 0;
        font-size: 0.9rem;
    }
    .source-meta {
        font-weight: 600;
        color: #000000;
        font-size: 0.8rem;
        text-transform: uppercase;
        margin-bottom: 0.25rem;
    }
    
    /* Custom buttons */
    .stButton>button {
        border-radius: 8px;
        border: 1px solid #000000;
        background-color: #000000;
        color: #ffffff;
        font-weight: 500;
        transition: all 0.2s ease;
    }
    .stButton>button:hover {
        background-color: #222222;
        border-color: #222222;
        color: #ffffff;
    }
    
    /* Secondary or outline buttons */
    div[data-testid="stSidebar"] .stButton>button {
        background-color: transparent;
        color: #111111;
        border: 1px solid #cccccc;
    }
    div[data-testid="stSidebar"] .stButton>button:hover {
        background-color: #f0f0f0;
        border-color: #999999;
        color: #111111;
    }
    </style>
""", unsafe_allowed_html=True)

# Helper: Load and cache the RAG chatbot
@st.cache_resource(show_spinner=False)
def get_chatbot_instance() -> RichDadRAGChatbot:
    return RichDadRAGChatbot()

# Helper: Convert conversation history to Markdown
def get_chat_markdown() -> str:
    md = f"# Rich Dad Poor Dad RAG Chatbot Session History\n"
    md += f"Exported on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    for msg in st.session_state.messages:
        role = "User" if msg["role"] == "user" else "Assistant"
        md += f"### {role} ({msg['timestamp']})\n"
        md += f"{msg['content']}\n\n"
    return md

# Initializing Session State
if "messages" not in st.session_state:
    st.session_state.messages = []
if "search_top_k" not in st.session_state:
    st.session_state.search_top_k = 5
if "dark_mode" not in st.session_state:
    st.session_state.dark_mode = False

# Application Header (Top Navigation)
st.markdown("""
    <div class="header-container">
        <div>
            <h1 class="header-title">📖 Rich Dad Poor Dad RAG Chatbot</h1>
            <p class="header-subtitle">Professional AI assistant trained exclusively on Robert Kiyosaki's financial classic.</p>
        </div>
    </div>
""", unsafe_allowed_html=True)

# Main UI layout columns: Sidebar + Chat Panel
sidebar_col, main_col = st.columns([1, 3])

# ----------------- SIDEBAR -----------------
with sidebar_col:
    st.markdown("### ⚙️ System Panel")
    
    # 1. API Key Status
    api_key_set = bool(os.getenv("GEMINI_API_KEY"))
    if api_key_set:
        st.success("✅ GEMINI_API_KEY is active")
    else:
        st.error("❌ GEMINI_API_KEY is missing!")
        api_input = st.text_input("Enter Gemini API Key:", type="password", key="gemini_key_input")
        if api_input:
            os.environ["GEMINI_API_KEY"] = api_input
            st.rerun()
            
    # 2. Vector DB Status & Book Metadata
    st.markdown("#### 📊 Vector Database Status")
    
    faiss_active = os.path.exists(str(FAISS_INDEX_PATH))
    if faiss_active:
        st.markdown("""
        <div class="custom-card" style="padding: 1rem;">
            <b>Index Status:</b> Ready (Loaded)<br>
            <b>Book:</b> Rich Dad Poor Dad<br>
            <b>Embedding:</b> <code>all-MiniLM-L6-v2</code><br>
            <b>LLM Model:</b> <code>gemini-1.5-flash</code>
        </div>
        """, unsafe_allowed_html=True)
    else:
        st.warning("⚠️ Local FAISS Index not found. Please upload a book PDF or click ingest to compile.")
        
    # 3. Dynamic Configuration Options (Bonus features)
    st.markdown("#### 🎛️ Retrieval Settings")
    st.session_state.search_top_k = st.slider(
        "Top-K Chunks to Retrieve",
        min_value=1,
        max_value=10,
        value=5,
        step=1,
        help="Number of retrieved sections injected as context into the prompt"
    )
    
    # Optional Dark Mode Toggle
    st.markdown("#### 🎨 Customization")
    dark_mode = st.toggle("Enable Dark Theme Visual Accents", value=st.session_state.dark_mode)
    if dark_mode != st.session_state.dark_mode:
        st.session_state.dark_mode = dark_mode
        st.rerun()
        
    # 4. Upload custom PDFs or additional chapters
    st.markdown("#### 📤 Upload Book/PDF")
    uploaded_file = st.file_uploader(
        "Upload additional PDF versions",
        type=["pdf"],
        help="Upload an additional PDF to recreate/extend the vector database."
    )
    
    if uploaded_file is not None:
        if st.button("Ingest Uploaded PDF", use_container_width=True):
            with st.spinner("Parsing and embedding PDF pages..."):
                try:
                    # Save file locally
                    temp_pdf_path = Path("books") / uploaded_file.name
                    temp_pdf_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(temp_pdf_path, "wb") as f:
                        f.write(uploaded_file.getbuffer())
                    
                    # Run RAG ingestion
                    pages_data = load_pdf_text(str(temp_pdf_path))
                    documents = split_pages_into_chunks(pages_data)
                    
                    # Rebuild chatbot & embed
                    chatbot = get_chatbot_instance()
                    create_vector_store(documents, chatbot.embeddings, str(FAISS_INDEX_PATH))
                    
                    # Clear cache to reload new vector store
                    st.cache_resource.clear()
                    st.success(f"Successfully loaded and index rebuilt for {uploaded_file.name}!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to ingest PDF: {e}")
                    
    # Ingest default book button
    if st.button("Force Rebuild Default Index", use_container_width=True):
        if os.path.exists(str(DEFAULT_PDF_PATH)):
            with st.spinner("Regenerating default embeddings..."):
                try:
                    # Run RAG ingestion
                    pages_data = load_pdf_text(str(DEFAULT_PDF_PATH))
                    documents = split_pages_into_chunks(pages_data)
                    chatbot = get_chatbot_instance()
                    create_vector_store(documents, chatbot.embeddings, str(FAISS_INDEX_PATH))
                    st.cache_resource.clear()
                    st.success("Default database successfully regenerated!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Injest error: {e}")
        else:
            st.error("Default book file 'books/rich_dad_poor_dad.pdf' not found. Please upload it above.")

# ----------------- MAIN PANEL (CHAT INTERFACE) -----------------
with main_col:
    # Quick controls (Clear Chat, Export Chat)
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        st.subheader("💬 Conversations")
    with col2:
        if st.button("🧹 Clear Conversation", use_container_width=True):
            st.session_state.messages = []
            st.rerun()
    with col3:
        if len(st.session_state.messages) > 0:
            md_content = get_chat_markdown()
            st.download_button(
                label="📥 Export Chat (Markdown)",
                data=md_content,
                file_name=f"rich_dad_rag_chat_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.md",
                mime="text/markdown",
                use_container_width=True
            )
            
    # Initialize Chatbot
    chatbot = None
    try:
        chatbot = get_chatbot_instance()
    except Exception as e:
        st.error(f"Failed to initialize chatbot components: {e}")
        
    # Render chat history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            st.caption(f"🕒 {message['timestamp']}")
            
            # Show sources under expander if assistant message had them
            if "sources" in message and message["sources"]:
                with st.expander("📚 View Retrieved Book Sources"):
                    for idx, src in enumerate(message["sources"]):
                        st.markdown(f"""
                        <div class="source-box">
                            <div class="source-meta">Chunk #{idx+1} - Page {src['page_number']} (Similarity score / distance: {src['similarity_score']:.3f})</div>
                            <div>"{src['text']}"</div>
                        </div>
                        """, unsafe_allowed_html=True)

    # Chat Input Box
    if prompt := st.chat_input("Ask any question from Rich Dad Poor Dad..."):
        # Display User message
        user_timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        st.session_state.messages.append({
            "role": "user",
            "content": prompt,
            "timestamp": user_timestamp
        })
        
        with st.chat_message("user"):
            st.markdown(prompt)
            st.caption(f"🕒 {user_timestamp}")
            
        # Generate Bot Response
        with st.chat_message("assistant"):
            if not chatbot:
                ans_text = "RAG Chatbot is currently unavailable. Please verify API keys and FAISS status."
                st.markdown(ans_text)
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": ans_text,
                    "timestamp": datetime.datetime.now().strftime("%H:%M:%S")
                })
            else:
                with st.spinner("Reading 'Rich Dad Poor Dad' context and analyzing..."):
                    # Call Python RAG Pipeline
                    result = chatbot.answer_question(prompt, top_k=st.session_state.search_top_k)
                    
                    ans_text = result["answer"]
                    sources = result["sources"]
                    
                    # Output Text
                    st.markdown(ans_text)
                    bot_timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                    st.caption(f"🕒 {bot_timestamp}")
                    
                    # If sources exist, output expanders
                    if sources:
                        with st.expander("📚 View Retrieved Book Sources"):
                            for idx, src in enumerate(sources):
                                st.markdown(f"""
                                <div class="source-box">
                                    <div class="source-meta">Chunk #{idx+1} - Page {src['page_number']} (Similarity score / distance: {src['similarity_score']:.3f})</div>
                                    <div>"{src['text']}"</div>
                                </div>
                                """, unsafe_allowed_html=True)
                                
                    # Cache in session state
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": ans_text,
                        "timestamp": bot_timestamp,
                        "sources": sources
                    })
                    st.rerun()
                    
    # Default placeholder prompt suggestions
    if len(st.session_state.messages) == 0:
        st.markdown("#### 💡 Quick Questions to Try:")
        suggestions = [
            "What is Rule Number One according to the book?",
            "What is the difference between an asset and a liability?",
            "Why does Robert Kiyosaki say a house is a liability and not an asset?",
            "What are the four components of a high Financial IQ?",
            "How do the rich avoid heavy taxes legally?",
            "What is the pattern of the 'Rat Race'?"
        ]
        
        cols = st.columns(2)
        for idx, sug in enumerate(suggestions):
            with cols[idx % 2]:
                if st.button(sug, use_container_width=True, key=f"sug-{idx}"):
                    # Treat button click as manual chat input
                    user_timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                    st.session_state.messages.append({
                        "role": "user",
                        "content": sug,
                        "timestamp": user_timestamp
                    })
                    st.rerun()
