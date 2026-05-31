# Universal Toolkit OS

**Universal Toolkit OS** is a highly performant, local-first Document Operating System designed for enterprise-scale folder indexing, processing, and automation. It unifies a Rust-based desktop core with Python-driven extraction engines and an interactive React UI.

---

## 🌟 Key Features

### 🔍 Search Intelligence & Fast Indexing
- **Semantic FTS5 Database**: Instantly query hundreds of thousands of files with real-time Full-Text Search backed by an optimized SQLite database.
- **Natural Language Parsing**: Use intent-based queries like `invoices over $500` or `contracts from Acme` via a built-in NLP query parser.
- **Recursive Rayon Crawlers**: Lightning-fast, multi-threaded directory indexing with live file-watching to instantly log new document events.

### 🧠 Deep Extraction (OCR & NLP)
- **Delegated Python Pipeline**: Heavy lifting (Tesseract OCR, PyPDF extractions) is safely pushed to non-blocking Python process queues.
- **Smart Entity Extraction**: Automatically extracts Metadata like Vendor Names, Invoice Amounts, Skills (from Resumes), and Emails.

### ⚙️ Visual Automation Studio
- **DAG Workflow Engine**: Build Zapier-style automations locally. Visually string together tasks: e.g., `PDF Scanned -> OCR -> Extract Amount -> Rename -> Move to Finance Folder`.
- **Topological Execution**: Evaluates complex workflows sequentially with execution logs and rollback mechanisms.

### 🧩 Plugin Marketplace (WASM)
- Extensible at its core. Browse, install, and execute third-party WASM plugins securely inside the application sandbox (e.g., Notion Exporters, GitHub Archivers).

### 🔒 Enterprise Security Vault
- **AES-256-GCM Encryption**: Secure sensitive files inside password-protected, encrypted local vaults.
- **Secure Previews**: Memory-safe temporary decryption mechanisms prevent sensitive files from remaining exposed on the local filesystem.

### 💾 Backup & Recovery
- Complete data portability. Export `.sdwbak` archives containing your entire settings, FTS database, workflows, and plugins to ensure you never lose a workspace config.

---

## 🏛️ Architecture Overview

The monorepo operates on a clean separation of concerns to maximize responsiveness:

1. **`src-tauri/` (Desktop Window & Commands)**: Rust-based Tauri backend executing commands, orchestrating the file-watchers, and managing app state.
2. **`backend/` (FastAPI Sidecar)**: Dedicated Python engine specifically running background OCR pools, Excel parsing, and PDF layout analysis.
3. **`database/` (SQLite Unified Storage)**: All Rust threads and Python queues read/write to a unified `smart_workflow.db` managed by Refinery migrations.
4. **`automation/` (Workflows & Events)**: Monitors file changes (`Notify`) and evaluates automation graphs.
5. **`src/` (React UI)**: A premium glassmorphic React 18 interface heavily utilizing `@tanstack/react-virtual` to smoothly render 100,000+ files at 60FPS.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) (v18+)
- [Rust](https://rustup.rs/) (1.70+)
- [Python](https://python.org) (3.10+) with `uvicorn` and `fastapi`.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dillibabu-06/Universal-Document-Toolkit.git
   cd Universal-Document-Toolkit
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run tauri dev
   ```

---

## 🤝 Contributing
As this project is in an active testing phase, pull requests and issues are strictly monitored. Stay tuned for further documentation regarding the WASM plugin SDK!

## 📜 License
MIT License
