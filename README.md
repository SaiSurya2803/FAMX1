# 🧬 Kinsutra AI — Advanced Family Relationship & Kinship Graph Engine

**Kinsutra AI** is an intelligent, anthropology-backed family tree graph application and relationship calculation engine powered by **Lounsbury Kinship Algebra 2.0** and **Kinsutra AI Agent**.

---

## ✨ Features

### 1. 🤖 Kinsutra AI Agent (Auto-Build & Text Corrector)
- **Natural Language Parsing**: Paste arbitrary multi-paragraph family relationship stories (e.g. *"Kiran is father of Bheema. Sujatha is mother of Bheema..."*).
- **LLM API Integration**: Works with Google Gemini API & OpenAI API REST endpoints.
- **Zero-Setup AI Fallback**: Includes a high-performance heuristic spell-corrector that automatically handles shorthand (*"ftr"*, *"s/o"*, *"wf"*) and Indian kinship terms without needing an API key.
- **Excel & CSV Importer**: Supports multi-member rows (`Name, Father, Mother, Spouse, Children`) and relation-pair rows with automatic deduplication.

### 2. 🌲 Top-Down Subtree Hierarchical Tree Layout
- **Classic Org-Chart Structure**: Top Tier (Grandparents), Tier 1 (Parents/Uncles), Tier 2 (Children/Cousins), Tier 3 (Grandchildren).
- **Zero Criss-Cross Overlap**: Subtree bounding boxes ensure family branches never entangle or cross lines.
- **Smooth Viewport Camera Animation**: GSAP camera centering and node position spring transitions.

### 3. 🐍 Python Lounsbury Kinship Algebra Backend Engine
- **Mathematical Precision**: Formal string reduction algebra (`+` for Ascent, `-` for Descent, `0` for Lateral, `=` for Affine).
- **Dravidian & Indo-Aryan Classification**: Distinguishes parallel cousins vs. cross-cousins (*Menarikam*).
- **Regional Languages**: Provides exact regional relationship terminology in **Hindi, Telugu, Tamil, Kannada, and Malayalam**.
- **FastAPI Server**: REST API endpoint at `/api/relationship`.

---

## 🚀 Quick Start

### 1. Run the Frontend (React + Vite)
```bash
# Install dependencies
npm install

# Start Vite Dev Server
npm run dev
```

### 2. Run the Backend API (FastAPI + Python)
```bash
# Navigate to backend directory
cd backend

# Install Python requirements
pip install fastapi uvicorn

# Start FastAPI server
uvicorn app.main:app --reload
```

---

## 🧪 Testing

```bash
# Run Frontend Production Build Check
npm run build

# Run Python Backend Kinship Relationship Test Suite
python -m unittest backend/app/relationships/tests/test_relationships.py
```

---

## 📁 Repository Structure

```
FAMX1/
├── src/
│   ├── components/
│   │   ├── agent/            # Kinsutra AI Agent Floating Drawer
│   │   └── graph/            # SVG Canvas, Nodes, Edges, & Toolbar Controls
│   ├── hooks/                # Top-Down Subtree Layout Engine (useGraphLayout.js)
│   ├── store/                # Family Store & Persistence (familyStore.js)
│   └── utils/                # AI Graph Parser & LLM Engine
├── backend/
│   └── app/
│       ├── main.py           # FastAPI Server Entrypoint
│       └── relationships/    # Lounsbury Kinship Algebra Engine & Tests
├── package.json
└── README.md
```

---

## 📜 License

MIT License © 2026 Sai Surya
