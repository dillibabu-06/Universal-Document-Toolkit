# Universal Toolkit OS

**Universal Toolkit OS** is a premium, local-first Document Operating System designed to replace scattered file managers with a highly optimized, beautifully crafted digital workspace. Built for maximum privacy, it combines a blisteringly fast Rust core with an intuitive glassmorphic React interface to manage, secure, and visualize your documents.

<p align="center">
  <img src="docs/assets/dashboard.png" alt="Universal Toolkit OS Dashboard" width="800">
</p>

---

## 🌟 Key Features

### 📁 Unified Explorer & Smart Organization
- **Blazing Fast Indexing:** Powered by Rust and SQLite FTS5, navigate and search hundreds of thousands of files with zero latency.
- **Visual File Management:** Beautifully categorized documents with instant previews for PDFs, Office files, and media.
- **Document Timeline:** View the complete chronological history of your documents, including creation, modification, and vault movements.

### 🔍 Search Intelligence
- **Offline Semantic Search:** Instantly locate files across your entire machine using high-performance Full-Text Search.
- **Knowledge Graph:** Discover hidden connections between files through relationship mapping and visual network analysis.

### 🛡️ Enterprise-Grade Security Vault

<p align="center">
  <img src="docs/assets/vault.png" alt="Security Vault" width="600">
</p>

- **Zero-Knowledge Encryption:** Secure sensitive documents (e.g., tax forms, personal IDs, financial statements) using AES-256-GCM encryption.
- **In-Memory Decryption:** Files remain fully encrypted on disk. Viewing securely decrypts content straight to memory for maximum privacy.
- **Vault Export & Backup:** Export your entire vault as a secure ZIP archive for cold storage.

### 📊 Reporting & Analytics Center
- **Workspace Insights:** Visualize your storage distribution, document categories, and disk health in a sleek analytics dashboard.
- **One-Click Exports:** Export workspace metrics and file listings directly to CSV, XLSX, and PDF formats for compliance and auditing.

### 🛠️ Built-in Productivity Studios
- **PDF Studio:** High-performance, offline PDF viewer directly integrated into the dashboard.
- **Office Studio:** Preview Word, Excel, and CSV files natively without requiring external heavy applications.
- **Media Studio:** Gallery-style image visualization and management.

### 💾 Complete Data Portability
- **Backup & Restore:** Generate encrypted `.sdwbak` archives containing your entire settings, database, and configurations. Never lose a workspace environment.
- **Local-First Design:** No cloud requirements, no subscriptions, and zero telemetry. Your data never leaves your device.

---

## 🏛️ Architecture Overview

The application is built on a high-performance stack prioritizing speed, security, and aesthetics:

1. **`src-tauri/` (Desktop Window & Commands)**: A lightweight Rust backend powered by Tauri for executing core system commands, cryptographic operations, and thread orchestration.
2. **`database/` (SQLite Unified Storage)**: An optimized SQLite layer handling FTS5 indexes, timelines, versioning, and document relationship graphs.
3. **`src/` (React UI)**: A highly polished React 18 interface utilizing TailwindCSS and `@tanstack/react-virtual` to smoothly render massive file directories at 60FPS.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) (v18+)
- [Rust](https://rustup.rs/) (1.70+)

### Installation & Build

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dillibabu-06/Universal-Document-Toolkit.git
   cd Universal-Document-Toolkit
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Run the local development server:**
   ```bash
   npm run tauri dev
   ```

4. **Build for Production (Installers):**
   ```bash
   npm run tauri build
   ```
   *(This will generate the `.dmg`, `.app`, `.msi`, or `.AppImage` files in the `target/release/bundle/` directory depending on your OS).*

---

## 🤝 Contributing
Universal Toolkit OS is a polished release. Pull requests, bug reports, and issues are strictly monitored. Feel free to open a discussion or report issues in the GitHub tracker!

## 📜 License
MIT License
