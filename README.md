# Research Workbench

**Socratic Research Workbench & Cognitive Agent Bridge**

> *Most AI makes you more informed. A good workbench makes you think better.*

Research Workbench is an interdisciplinary research platform designed for PhD researchers, scientists, and engineers. It bridges theoretical mathematics, physics, and empirical research with autonomous coding agents (Cline, Claude Code, Cursor, Codex).

Instead of treating AI as a mere copywriter or autocomplete tool, the workbench applies **Socratic Analogical and Systems reasoning** to uncover non-obvious structural isomorphisms, dynamic feedback loops, and mathematical parallels across distant disciplines.

---

## The Core Research Loop

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Research Workbench                              │
│                                                                        │
│  1. Ingestion: arXiv, DOI, bioRxiv, PubMed, Web Articles, PDF, Data    │
│  2. Note-taking: CodeMirror 6 + KaTeX live LaTeX equations ($...$)     │
│  3. Socratic Lenses: Highlight text → Analogical & Systems Probes      │
│  4. Knowledge Graph: 2D Force-Directed Graph of Kept Isomorphisms     │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                        Model Context Protocol (MCP)
                        http://127.0.0.1:8787/mcp
                                     │
┌────────────────────────────────────┴───────────────────────────────────┐
│                    Autonomous Coding Agents                            │
│              (Cline · Claude Code · Cursor · Codex)                    │
│                                                                        │
│  • Reads live active paper & governing LaTeX equations                 │
│  • Asks Socratic Lenses to solve architectural & mathematical bugs     │
│  • Injects discovered cross-domain analogies back into your graph      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## The Socratic Lenses

The workbench focuses deeply on the two most powerful cognitive faculties for breakthrough discovery:

| Lens | Focus | Relational Mechanism |
| :--- | :--- | :--- |
| **◈ Analogical Lens** | Cross-domain structural mapping | Extracts abstract relational topologies and maps roles 1-to-1 against established domains (e.g. Navier-Stokes turbulence cascades $\leftrightarrow$ financial market liquidity evaporation). |
| **⟳ Systems Lens** | Feedback loops & dynamics | Analyzes stocks, flows, delays, reinforcing/balancing feedback loops, and nonlinear tipping points. |

*(Beta modes for Convergent, Divergent, Metacognitive, and DMN thinking can be toggled on demand in Settings).*

---

## Model Context Protocol (MCP) Integration

The workbench runs a lightweight, native MCP server over **Server-Sent Events (SSE)** and **JSON-RPC 2.0** on `http://127.0.0.1:8787/mcp`.

Add this to your `cline_mcp_settings.json` or Cursor / Claude Desktop configuration:

```json
{
  "mcpServers": {
    "yentellect": {
      "url": "http://127.0.0.1:8787/mcp"
    }
  }
}
```

### Exposed Agent Tools
- `yentellect_get_current_paper`: Reads the active paper, equations, and researcher notes open in the editor.
- `yentellect_get_socratic_connections`: Retrieves structural isomorphisms and system dynamics models.
- `yentellect_ask_lens`: Triggers Socratic Analogical or Systems reasoning on any scientific text.
- `yentellect_add_connection`: Injects newly discovered analogies back into the workbench research graph.
- `yentellect_search_concepts`: Searches mapped concepts across disciplines.

---

## AI Engine Switcher (Three Tiers)

1. **🌐 Hosted Cloud AI**: Instant zero-config answers via Groq (Llama 3.3 70B) or Gemini 2.0 Flash.
2. **🔑 Bring Your Own Key (BYOK)**: Client-side browser direct calls to Anthropic (Claude 3.5 Sonnet), OpenAI (GPT-4o), OpenRouter (DeepSeek R1), Groq, or Google Gemini. Keys stay in your browser.
3. **💻 Local Machine / Command Prompt Bridge**: Free local inference via OpenCode models (`big-pickle`, `deepseek-v4.1-flash-free`) with automatic rate-limit failover, or local Ollama.

---

## Quick Start

### 1. Web Workbench (Next.js 14)
```bash
git clone https://github.com/rishibagale/yentellect.git
cd yentellect/frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 2. Local AI & MCP Bridge (Windows)
Run from Command Prompt without needing an IDE or complex runtime:
```cmd
curl -sL https://yentellect.vercel.app/bridge.bat -o bridge.bat && bridge.bat
```
This automatically initializes Bun, starts the bridge on `http://127.0.0.1:8787`, and activates the `/mcp` server.

---

## Architecture & Data Discipline

- **Storage**: Browser IndexedDB via Dexie (`yentellect.library.v1`). Your research notes never leave your machine unless explicitly synced.
- **Editor**: CodeMirror 6 with live markdown formatting, syntax highlighting, and KaTeX display/inline math.
- **Eval Harness**: Validated across 12-item benchmark with live LLMs achieving 100% pass rate on structural validity and honesty.
- **Design System**: Monochromatic dark theme (`--bg-0: #0c0d12`, `--accent: #5eb0ef`) with typography paired for research (JetBrains Mono for data/chrome, Source Serif 4 for prose).

---

## License

MIT © 2024–2026 Rishi Bagale
