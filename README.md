# 📄 Smart Document Workflow (SDW)

> A local-first desktop productivity platform built using Rust, Tauri, React, and SQLite that automatically organizes, indexes, searches, and automates document workflows—keeping 100% of user data completely offline and private.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![Rust](https://img.shields.io/badge/backend-rust-orange)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-alpha-yellow)

---

## 🚧 Current Project Status

Smart Document Workflow is currently in **active alpha development**.

The core platform architecture is complete, including:
- ✅ File indexing engine (multi-threaded, SHA-256, incremental)
- ✅ FTS5 full-text search with BM25 ranking
- ✅ Offline OCR text extraction (Tesseract)
- ✅ Automation workflow engine (IF/THEN rules)
- ✅ Duplicate detection and safe Trash deletion
- ✅ Cross-platform packaging (macOS `.dmg`, Windows `.msi`, Linux `.AppImage`)

The project is now focused on:
- 🔧 Stability and edge-case hardening
- ⚡ Performance tuning for large-scale folders (100k+ files)
- 🧪 Real-world testing and crash recovery
- 🎨 UX simplification
- 🪟 Windows & Linux validation

**Early adopters and contributors are welcome.**

---

## 📸 Screenshots

| Onboarding | Dashboard | Search |
|:---:|:---:|:---:|
| ![Onboarding](screenshots/onboarding.png) | ![Dashboard](screenshots/dashboard.png) | ![Search](screenshots/search.png) |

| Automation Rules | OCR Extraction |
|:---:|:---:|
| ![Automation](screenshots/automation.png) | ![OCR](screenshots/ocr.png) |

---

## ✨ Overview

**Smart Document Workflow** combines the power of:
- 🔍 **Everything Search** — blazing-fast FTS5 Spotlight-style search
- 🗂️ **Finder** — native folder management and file organization
- 🧠 **Obsidian** — local-first, no cloud dependency
- ⚡ **Raycast** — command palette with keyboard-first navigation
- 🛠️ **VSCode** — workspace-based productivity experience

Built for **SMEs, consultants, finance professionals, students, and office teams** who need a fast, private, offline document operating system.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Runtime | [Tauri v1](https://tauri.app) |
| Backend | Rust (modular workspace) |
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS (dark theme) |
| Database | SQLite via `rusqlite` + `r2d2` pool |
| Search | SQLite FTS5 with BM25 ranking |
| OCR | Tesseract via `rusty-tesseract` |
| Hashing | SHA-256 via `sha2` crate (64KB chunks) |
| File Watching | `notify` crate (macOS FSEvents / inotify) |
| State Management | Zustand |

---

## 📁 Project Structure

```
smart-document-workflow/
├── core/                    # sdw_core — domain models & error types
│   └── src/
│       ├── models.rs        # FileRecord, Workspace, Rule, DuplicateCluster...
│       └── error.rs         # AppError, Result<T>
│
├── database/                # SQLite pool, schema, repositories
│   └── src/
│       ├── schema.sql       # Tables, FTS5, indexes, triggers
│       └── repo/
│           ├── file_repo.rs      # FTS5 search, duplicates, pagination
│           ├── workspace_repo.rs
│           ├── rule_repo.rs
│           └── tag_repo.rs
│
├── indexing/                # Async recursive file scanner
│   └── src/
│       └── scanner.rs       # WalkDir + SHA-256 + progress channels
│
├── intelligence/            # OCR & content classification
│   └── src/
│       ├── ocr.rs           # Tesseract offline OCR
│       ├── pdf.rs           # PDF text extraction
│       └── classifier.rs    # Heuristic content classifier
│
├── automation/              # File watcher + rule engine
│   └── src/
│       ├── watcher.rs       # notify watcher + 500ms debounce
│       └── engine.rs        # Rule matching + action execution
│
├── src-tauri/               # Tauri app shell
│   └── src/
│       ├── commands.rs      # All IPC command handlers
│       ├── state.rs         # AppState (DB pool + watcher)
│       └── main.rs          # Tauri builder + command registration
│
└── src/                     # React frontend
    ├── App.tsx              # Main UI — all views and components
    ├── store/
    │   └── workspaceStore.ts  # Zustand store with Tauri IPC bindings
    └── types/
        └── index.ts         # TypeScript type definitions
```

---

## 🚀 Features

### 🗂️ Workspace Management
- Register any local folder as a monitored workspace
- Native OS folder picker dialog (`select_folder`)
- SQLite-persisted workspaces — survive app restarts
- Auto-reloads last active workspace on boot

### ⚡ File Indexing Engine
- Multi-threaded recursive `WalkDir` directory traversal
- Skips hidden folders (`.*`), system dirs, and oversized files
- SHA-256 hash computed in **64KB chunks** for memory efficiency
- Incremental scan — skips unmodified files using `modified_at` cache
- Real-time progress events streamed to the UI via Tauri IPC events

### 🔍 Spotlight FTS5 Search
- SQLite FTS5 virtual table (`files_fts`) with Porter/ASCII tokenizers
- BM25-ranked results in **under 10ms**
- Auto-synced via INSERT/UPDATE/DELETE triggers
- 150ms debounced input — live results as you type
- Command Palette (`⌘K`) shows real FTS5 matches + quick actions

### 🧠 Offline OCR Extraction
- Tesseract-powered offline OCR (zero cloud, zero API keys)
- Extracts searchable text from JPEG, PNG, and scanned PDFs
- Runs in background worker — never blocks the UI

### 🔁 Duplicate Detection
- Groups files by SHA-256 hash (`GROUP BY hash HAVING COUNT(*) > 1`)
- Sorts clusters by wasted disk space (largest first)
- **Safe deletion** — moves duplicates to system Trash (never `rm`)
- **Reveal in Finder** — opens parent folder in OS file manager

### 👁️ Live File Watchers
- Cross-platform `notify` daemon watching workspace folders
- 500ms debounce to batch rapid filesystem events
- Triggers incremental re-indexing on file create/modify
- Runs automation rule matching on new files

### 🤖 Automation Rules Engine
- IF/THEN rule builder (Zapier-style UI)
- Trigger on `on_create`, `on_modify`, `on_schedule`
- Actions: `Move`, `Rename`, `Tag`
- Full execution log with success/failure tracking

### ⌨️ Command Palette & Shortcuts
| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open Command Palette |
| `⌥1` | Workspace Inbox |
| `⌥2` | Document Explorer |
| `⌥3` | Duplicates View |
| `⌥4` | Automation Rules |
| `⌥5` | Workflow Logs |
| `Esc` | Close modals/palette |
| `↑ ↓` | Navigate palette results |
| `Enter` | Execute selected command |

---

## 🛢️ Database Schema

```sql
-- Core file catalog
CREATE TABLE files (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    extension TEXT NOT NULL,
    path TEXT UNIQUE NOT NULL,
    size INTEGER NOT NULL,
    hash TEXT NOT NULL,           -- SHA-256 for deduplication
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    indexed_at INTEGER NOT NULL,
    category TEXT NOT NULL        -- Auto-classified: Invoice, Resume, etc.
);

-- FTS5 instant search index (auto-synced via triggers)
CREATE VIRTUAL TABLE files_fts USING fts5(
    file_id UNINDEXED,
    filename,
    content,
    tokenize='porter ascii'
);

-- Performance indexes
CREATE INDEX idx_files_hash ON files(hash);
CREATE INDEX idx_files_extension ON files(extension);
CREATE INDEX idx_files_workspace ON files(workspace_id);
```

---

## ⚙️ Prerequisites

- **Rust** ≥ 1.70 — [rustup.rs](https://rustup.rs)
- **Node.js** ≥ 18 — [nodejs.org](https://nodejs.org)
- **Tauri CLI** prerequisites — [tauri.app/start](https://tauri.app/v1/guides/getting-started/prerequisites)
  - macOS: Xcode Command Line Tools
  - Windows: WebView2, Visual Studio Build Tools
  - Linux: `libwebkit2gtk-4.0-dev`, `libssl-dev`
- **Tesseract OCR** (for OCR features) — `brew install tesseract` / `apt install tesseract-ocr`

---

## 🧑‍💻 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/dillibabu-06/my_app.git
cd my_app
```

### 2. Install frontend dependencies
```bash
npm install
```

### 3. Run in development mode
```bash
npm run tauri dev
```

> This starts Vite (frontend) + Tauri (Rust backend) simultaneously. The app window opens automatically.

### 4. Build for production
```bash
npm run tauri build
```

Generates a `.dmg` (macOS), `.msi` (Windows), or `.deb/.AppImage` (Linux) installer in `target/release/bundle/`.

---

## 🗺️ Roadmap

| Version | Milestone | Status |
|---------|-----------|--------|
| `v0.1` | Workspace selection, recursive indexing, SQLite persistence | ✅ Done |
| `v0.2` | FTS5 Spotlight search, BM25 ranking, Command Palette | ✅ Done |
| `v0.3` | SHA-256 duplicate detection, safe Trash moves, Finder reveal | ✅ Done |
| `v0.4` | Live filesystem watchers, incremental re-indexing | ✅ Done |
| `v0.5` | Automation rules engine (Move/Rename/Tag) | ✅ Done |
| `v0.6` | OCR text extraction, PDF parsing, offline intelligence | ✅ Done |
| `v0.7` | Cross-platform packaging (macOS DMG, Windows MSI, Linux AppImage) | ✅ Done |
| `v1.0` | Performance hardening, stability, Windows/Linux validation | 🔜 In Progress |
| `v1.x` | AI-powered smart classification, cloud sync (optional) | 💡 Planned |

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend (Vite)               │
│  Zustand Store ◄──► Tauri IPC ◄──► Rust Commands   │
└──────────────────────────┬──────────────────────────┘
                           │ Tauri Bridge
┌──────────────────────────▼──────────────────────────┐
│                    Rust Backend                      │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ indexing │  │database  │  │   automation     │  │
│  │ scanner  │  │ r2d2     │  │ watcher + engine │  │
│  │ sha2     │  │ FTS5     │  │ notify crate     │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │             │                  │            │
│  ┌────▼─────────────▼──────────────────▼─────────┐  │
│  │         intelligence (OCR + Classifier)       │  │
│  │         rusty-tesseract + pdf-extract         │  │
│  └───────────────────────────────────────────────┘  │
│                  SQLite DB                          │
│           (smart_workflow.db)                       │
└─────────────────────────────────────────────────────┘
```

---

## 🔒 Privacy & Security

- **100% offline** — zero network requests, zero telemetry
- All data stored locally in SQLite under the OS app data directory
- File deletion always goes through **system Trash** — never permanent `rm`
- Path validation prevents directory traversal exploits
- Symlink canonicalization on workspace registration
- FTS5 input sanitized against injection attacks

---

## 🤝 Contributing

Contributions, bug reports, feature suggestions, and platform testing are welcome!

Areas where help is especially valuable:
- 🪟 **Windows testing** — validating builds and file path handling on Windows
- 🐧 **Linux testing** — AppImage validation and GTK compatibility
- 🧠 **OCR improvements** — language packs, accuracy tuning
- 🎨 **UI/UX polish** — accessibility, keyboard navigation, animations
- 📖 **Documentation** — guides, tutorials, API docs
- 📦 **Packaging validation** — auto-update, installer edge cases
- ⚡ **Performance profiling** — large-scale folder benchmarks

> **Before submitting large changes, please open an issue for discussion first.**

### Development Setup
```bash
npm install
npm run tauri dev
```

### Recommended Tools
- [Rust Analyzer](https://rust-analyzer.github.io/) — Rust IDE support
- [VS Code](https://code.visualstudio.com/) — Recommended editor
- Node.js 18+ — JavaScript runtime
- [SQLite Browser](https://sqlitebrowser.org/) — (optional) inspect the local DB

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Dillibabu** — [@dillibabu-06](https://github.com/dillibabu-06)

---

<p align="center">
  Built with ❤️ using Tauri · Rust · React · SQLite · Tesseract
</p>
