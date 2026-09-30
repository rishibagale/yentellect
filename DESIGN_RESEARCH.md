# Yentellect — Design Research (Research Workbench Redesign)

> Research brief for the workbench redesign ("quiet code editor × paper reader").
> Written **9/30/2026**. Status: informative — every finding traces to a source in §6.

---

## 0. Purpose & status

The operative spec is the workbench master prompt (title bar … acceptance criteria). This file is the
durable record of the research behind it, so the design choices survive past this conversation.

Rule: **spec-as-written, plus the corrections in §3, minus the deferred items in §5.**
Corrections (C1…C8) are authoritative and supersede the chat spec wherever they conflict.
Items in §5 ("Later") are explicitly *not* in scope for the build; each carries its motivating
evidence so the backlog is actionable rather than a list of hunches.

---

## 1. Method & limitations

### 1.1 What was used

- **Skills invoked:** `frontend-design` (aesthetic direction, the token/type/layout/signature
  process, the self-critique pass), `firecrawl-research-papers` and `firecrawl-search` (loaded;
  could not execute — see 1.2).
- **Direct web research + fetch, 11 sources (§2):** scholarly-reading HCI, sensemaking theory,
  prior-art tools (Zotero, Sioyek, Obsidian, Loopy, citation mappers), the W3C splitter pattern,
  the CodeMirror 6 decoration API, the arXiv API manual, and VS Code's workbench architecture.
- The synthesis-matrix convention was verified against a canonical teaching reference (Stanford
  TeachingWriting), not assumed from PKM blogs.

### 1.2 What failed

1. **Firecrawl CLI is installed (v1.20.0) but keyless mode is blocked from this IP**
   (`"your IP address looks suspicious ... can't be used without an API key"`). The 43M-abstract
   paper index was therefore unavailable; the literature pass ran on web search + direct fetches.
   A `FIRECRAWL_API_KEY` restores the paper-index workflow (`firecrawl research search-papers`,
   `related-papers`, `inspect-paper`, `read-paper`).
2. **Two key PDFs returned as raw binary and could not be parsed:** Pirolli & Card (2005) and
   Morabito & Chan (2021). Consequence: **nothing from Morabito & Chan is cited in this file**,
   and Pirolli & Card is cited for framing (schemas, the data/frame loop, leverage points as a
   concept) **only — not for the verbatim leverage-point list**.
3. The chat references "the lens spec prompt"; it was **not supplied**. Stage 5 stays deferred
   behind it.

### 1.3 Verify-on-install (flagged, not assumed)

- `linkLineDash` on the installed `react-force-graph-2d` version; fallback — draw dashes via
  `linkCanvasObject` (see 3/C5).
- Whether `export.arxiv.org` accepts browser `fetch` (CORS). The server-side proxy (3/C1) stands
  regardless, because the arXiv API Terms of Use require a descriptive User-Agent and modest
  request rates that a browser cannot set.
- Contrast ratios for `--text-dim` on `--bg-0` (target ≥ 4.5:1, WCAG AA) in the Stage 6
  accessibility pass.

## 2. Evidence

Each entry: **source → finding → consequence**. Only findings that are stated in, or directly
quoted from, the fetched material are recorded; inference is labelled as such (INFERENCE).

### 2.1 ScholarPhi — *Augmenting Scientific Papers with Just-in-Time, Position-Sensitive Definitions of Terms and Symbols* (CHI'21, Head et al.)

- **Source:** `https://ar5iv.labs.arxiv.org/html/2009.14237` (full paper, HTML).
- **Findings.**
  - Core premise, verbatim: *"Comprehension is often stymied when the information needed to
    understand a passage resides somewhere else—in another section, or in another paper."*
  - Four features shipped: (1) tooltips surfacing **position-sensitive** definitions, (2) a
    filter that **"declutters"** the paper (highlights usages, fades everything else) with
    visual scent of where matches live, (3) automatic equation diagrams exposing parallel
    definitions, (4) an auto-generated glossary.
  - Design principles used in its evaluation: stay **grounded in the text**, provide
    **visual scent**, **do not occlude text**, and *"reduce distractions by hiding irrelevant
    content, rather than showing additional interface widgets."*
  - Reported: a usability study showed the tool helps researchers of all experience levels;
    researchers were "eager" to have its definitions in everyday reading.
  - Quantitative anchor (Tenopir et al., cited in the paper): senior researchers spend
    **100+ hours a year reading, 100+ papers annually**.
- **Consequence.** The premise validates the whole product: our lens *is* "information residing
  elsewhere made adjacent." But the anti-widget principle **conflicts with a 360px lens panel**
  — hence the deferred margin-trace design (§5/L1).

### 2.2 Analogical search engine — Kang, Qian, Hope, Shahaf, Chan, Kittur (TOCHI'22)

- **Source:** `https://ar5iv.labs.arxiv.org/html/2205.15476` (full paper, HTML).
- **Findings.**
  - *"Ideation success is mediated by an intermediate level of matching on the problem
    abstraction."* Too close = surface match; too far = irrelevant.
  - Analogy-sourced papers yielded **5.3× more *creative adaptation* ideas** and significantly
    higher perceived novelty (**2.7 vs 2.3**, Welch's two-tailed t-test, `t = −5.53`,
    `p = 1.33×10⁻⁷`).
  - Participants warned that *"variance in results is much higher than using other search
    engines"* — they needed help judging relevance and trust.
- **Consequence.** The Analogical lens must expose **structural distance** and **where the
  analogy breaks** (§5/L5): `confidence`, `disanalogies`, and "Ask why" are trust mechanisms,
  not decoration.

### 2.3 LOOPY — Nicky Case, `https://lo0p.it/`

- **Findings.** Systems thinking by *"programming by drawing"* (circles and arrows, not code);
  *"play with simulations to ask 'what if' questions, and get an intuition for how the system
  works"*; goal: move users *"from thinking in systems, to talking in systems."*
- **Consequence.** A Systems connection cannot be prose. `SystemsDetail` (variables + signed
  causal chains + feedback loops classified reinforcing/balancing + emergent properties) is
  already causal-loop-shaped → the proposal card must **draw the loop** (§5/L4).

### 2.4 Citation-mapping critique (WisPaper)

*"Citation maps look convincing. A cluster of papers can feel like coverage, and an empty area
can feel like a research gap. Neither is automatically true."* Output is a candidate set, not
coverage. Maps answer "what is connected?", not "what should I include?", and work best once a
question exists. Yield: frame Graph as a map of *your reading* (§5/L3).

### 2.5 Obsidian graph-view critique (Dan Holloran) — `danholloran.me/posts/making-obsidians-graph-view-actually-useful`

*"The global graph is not for navigation"* — past a few hundred notes it is an unreadable
hairball; most people *"open once, stare at, and then never touch again."* Its real job is a
periodic **audit**: orphans, clusters, cluster health. The **local graph at depth 2 is the
sweet spot**; useful filters include an **orphans toggle** and per-topic filters. *"Resist the
urge to make your graph look beautiful … a procrastination trap."*
**Consequence.** Validates graph-as-tab-not-home; adds neighbourhood (depth 2) + an
**Unconnected filter** (§5/L3). No effort on graph cosmetics.

### 2.6 Synthesis matrix (Stanford TeachingWriting / NC State convention) — `teachingwriting.stanford.edu/synthesis-matrix`

Researchers are taught to build a **sources x themes/topics/keywords/codes matrix** to
*"synthesise points of agreement, disagreement, and divergence"*; *"emphasize synthesis over
summary."* A **"method" column is often overlooked** yet is frequently the real point of
divergence.
**Consequence.** The Connections drawer is a synthesis matrix; relabel it as one and add a
**Divergence** column fed by `disanalogies` (§5/L2).

### 2.7 Sioyek (keyboard-first PDF reader) — `sioyek-documentation.readthedocs.io/en/latest/usage.html`

`:` opens a **searchable command list**; `o`/`O` open file / recent; `t` searchable TOC;
`f` opens a link by typed number; **smart jump** follows a reference and `backspace` returns;
full **browser-like history across documents** (`prev_state`/`next_state`,
`Ctrl+Left/Right`); **"portals"** are a persistent link between two locations — the same
concept as our Connections; highlights, bookmarks, marks; data in `local.db`
(machine-specific) vs `shared.db` (syncable).
**Consequence.** Back/forward navigation is **first-class researcher behaviour** — the
drawer-to-jump loop needs a return path (§5/L6). "Portals" is the established name. The
local/shared split is precedent for our Dexie-local sync limitation.

### 2.8 Zotero 7 redesign — `zotero.org/blog/zotero-7/`

Replaced horizontal item-pane tabs with **collapsible vertical sections + side navigation**;
a **customizable header that stays visible when the section is collapsed**; shipped
**Compact vs Comfortable density** deliberately (*"Compact resembles the previous density,
while Comfortable … provides a more approachable experience"*); dark mode designed in from
the start; keyboard: collection search, filterable tabs menu; named plugin integration
points.
**Consequence.** The collapsed source card must keep **identity visible** (snippet + source
title) — explicit acceptance point (3/C7). A density switch is precedented (§5/L7).

### 2.9 W3C APG — Window Splitter pattern — `w3.org/WAI/ARIA/apg/patterns/windowsplitter/`

`role="separator"`; `aria-valuenow` / `aria-valuemin` / `aria-valuemax`; `aria-controls` to
the primary pane; `aria-labelledby` (or `aria-label`); Left/Right moves a **vertical**
splitter, Up/Down a **horizontal** one; **Enter collapses/restores**; Home/End, F6 optional.
**Consequence.** Exact spec for our three splitters (3/C3); Enter-to-collapse maps directly
onto our collapsible panels.

### 2.10 CodeMirror 6 — decoration API + the `$…$` thread

Sources: `codemirror.net/examples/decoration/` (four decoration types;
`Decoration.replace({widget})`; `WidgetType`; `MatchDecorator` with viewport-limited
regexps; `EditorView.atomicRanges`); forum thread *"Replacing text between dollar signs"*
(`discuss.codemirror.net/t/.../3850`), where the naive approach regressed ("anterior
expressions get back to normal") and the `MatchDecorator.createDeco(view)` / `updateDeco`
fix was **endorsed by the maintainer**. Documented constraint: decorations that change
vertical layout **must be provided directly** (StateField), not only via a ViewPlugin.
**Consequence.** De-risks the KaTeX work: inline math via ViewPlugin+atomicRanges,
`$$…$$` block math via StateField (3/C2).

### 2.11 arXiv API manual + Crossref — `info.arxiv.org/help/api/user-manual.html`

`export.arxiv.org/api/query?id_list=<id>` returns an Atom feed; entry elements: `<title>`,
`<summary>` (abstract), one `<author><name>` per author, `<published>`, `<updated>`,
`<arxiv:doi>`, `<arxiv:journal_ref>`, `<arxiv:primary_category>`. Terms of Use for the API
apply. DOI metadata lives at `https://api.crossref.org/works/{doi}` (CORS-enabled).
**Consequence.** Metadata mapping is confirmed; the import **must be a server route**
because the API expects a descriptive User-Agent and modest rates a browser cannot set (3/C1).

---

## 3. Corrections applied (C1…C8)

Authoritative. Each supersedes the chat spec wherever it conflicts.

**C1 — arXiv import is a server route** (`app/api/import/arxiv/route.ts`); DOI import stays
client-side via `https://api.crossref.org/works/{doi}`. Rationale (§2.11): descriptive
User-Agent + polite rates that a browser cannot set. Parse the Atom response with DOMParser
into `Doc.meta` (title, authors, year, source `'arxiv'`, abstract); body = abstract + pasted
text. No PDF parsing in v1.

**C2 — KaTeX rendering.** Inline `$…$` via `MatchDecorator` + `Decoration.replace({widget})` +
`EditorView.atomicRanges` (§2.10); `$$…$$` block math via a `StateField` providing decorations
directly (ViewPlugin-only is insufficient for layout-changing blocks).

**C3 — Splitters follow W3C APG Window Splitter** (§2.9): `role="separator"`,
`aria-valuenow/min/max`, `aria-controls` to the primary pane, `aria-labelledby`/`aria-label`;
Left/Right (vertical) or Up/Down (horizontal) to resize; **Enter collapses/restores**; min
positions at 0. Persist sizes + open/closed state.

**C4 — One command registry** feeds the palette, the keyboard shortcuts, and the Explorer
context menu (VS Code contribution-model precedent). The shortcut table and the palette
command list cannot drift out of sync.

**C5 — Dashes via `linkLineDash`; verify on install**, fallback to manual dash drawing in
`linkCanvasObject` if the installed version lacks it. (Analogy = dashed, system = solid is
load-bearing for the Graph tab.)

**C6 — Source Serif 4 for the document body; drop Space Grotesk.** The spec allowed either
Source Serif or Inter; serif pairs with KaTeX's Computer Modern-derived faces, so the body and
math read as one document. Space Grotesk (currently loaded for display) has no display role in
a workbench and is removed from `app/layout.tsx` — free restraint, one fewer font request.

**C7 — Collapsed source card keeps identity visible:** snippet + source title + range
(Zotero 7's persistent-header precedent, §2.8). Explicit acceptance point.

**C8 — Status-bar zeros are artifact state, not metrics.** Word count / kept count / save
state read `0` on an empty workspace — that is honest editor state. The "no zero-value
metric" rule targets scores, streaks, and assessments, all of which are deleted with their
components.

---

## 4. Operational effect on the stage plan

- **Stage 1** (shell): C3 splitters; C4 registry; C6 fonts; C8 status-bar content. Layout grid
  and palette as specified.
- **Stage 2** (data + Explorer): `commands.ts` registry feeds the context menu (C4); types
  verbatim from the spec.
- **Stage 3** (editor): C2 math pipeline; tabs, breadcrumb, selection toolbar as specified.
- **Stage 4** (import): C1 — arXiv **server route** + Crossref client-side.
- **Stage 5** (lens, deferred): thread as a log; proposal-card rendering per lens.
- **Stage 6** (drawer, graph, keys): C5 dash verification; C7 collapsed-card acceptance;
  drawer/graph as specified; Lighthouse a11y ≥ 90 with C3 as the mechanism for splitters.

---

## 5. Later — deferred additions (NOT in scope for the build)

**L1 — Margin trace (signature).** Kept connections live in the document margin as small
labelled markers anchored to their source range; hover ties marker↔panel. Evidence: §2.1
(ScholarPhi: grounded, non-occluding; knowledge should accrue in the text, not a panel).
Cost: a margin column constrains the 1024px minimum; behaviour at minimum width unresolved.

**L2 — Synthesis-matrix drawer.** Relabel the drawer as a synthesis matrix; add a
**Divergence** column fed by `disanalogies`. Evidence: §2.6 (agreement / disagreement /
divergence; the overlooked "method" column).

**L3 — Audit-style graph.** Add a neighbourhood view focused on the open doc (depth 2) and an
**Unconnected** filter (imported but never linked). Never imply field coverage. Evidence:
§2.4 (false coverage), §2.5 (local graph at depth 2; orphans; no cosmetics).

**L4 — Causal-loop cards.** Render Systems proposals as a compact causal-loop diagram
(nodes + signed arrows + reinforcing/balancing badges). Evidence: §2.3 (Loopy:
"programming by drawing").

**L5 — Distance and disanalogies.** Surface structural distance and the break-point of each
analogical proposal; let users steer abstraction. Evidence: §2.2 (intermediate-abstraction
sweet spot; high result variance needs trust mechanisms).

**L6 — Back/forward navigation.** Doc jumps and connection jumps push history; add a return
path (`Cmd+Alt+Left/Right` alongside the spec's table). Evidence: §2.7 (Sioyek smart-jump +
cross-document history is first-class researcher behaviour).

**L7 — Density switch.** Compact / Comfortable as a token swap. Evidence: §2.8 (Zotero 7
shipped it deliberately for researchers).

---

## 6. Sources

1. Head, Lo, Kang, Fok, Skjonsberg, Weld, Hearst — *Augmenting Scientific Papers with
   Just-in-Time, Position-Sensitive Definitions of Terms and Symbols* (CHI'21).
   `https://ar5iv.labs.arxiv.org/html/2009.14237`
2. Kang, Qian, Hope, Shahaf, Chan, Kittur — *Augmenting Scientific Creativity with an
   Analogical Search Engine* (TOCHI'22). `https://ar5iv.labs.arxiv.org/html/2205.15476`
3. Nicky Case — LOOPY: a tool for thinking in systems. `https://lo0p.it/`
4. WisPaper — *Citation mapping tools compared: ResearchRabbit, Litmaps, Connected Papers,
   and AI search*. `https://www.wispaper.ai/en/learn/citation-mapping-tools-compared`
5. Dan Holloran — *Making Obsidian's Graph View Actually Useful*.
   `https://danholloran.me/posts/making-obsidians-graph-view-actually-useful`
6. Stanford TeachingWriting — *Synthesis Matrix*.
   `https://teachingwriting.stanford.edu/synthesis-matrix`
7. Sioyek documentation — *Usage*. `https://sioyek-documentation.readthedocs.io/en/latest/usage.html`
8. Zotero Blog — *Zotero 7: Zotero, redesigned*. `https://zotero.org/blog/zotero-7/`
9. W3C WAI APG — *Window Splitter Pattern*.
   `https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/`
10. CodeMirror 6 — *Decoration example*. `https://codemirror.net/examples/decoration/`
11. CodeMirror forum — *Replacing text between dollar signs* (maintainer-endorsed approach).
    `https://discuss.codemirror.net/t/replacing-text-between-dollar-signs-for-mathml-expression/3850`
12. arXiv — *API User's Manual*. `https://info.arxiv.org/help/api/user-manual.html`
13. VS Code workbench-layer architecture (parts model, contributions, commands).
    `https://www.mintlify.com/microsoft/vscode/architecture/workbench-layer`
14. LitLLM — *A Toolkit for Scientific Literature Review* (Agarwal et al., 2024).
    `https://ar5iv.labs.arxiv.org/html/2402.01788` — contextual: RAG pipelines, grounded
    proposals, user-steerable retrieval. Read, not a design driver.

## 7. Rerun inputs

```text
workflow: design-research-brief
topic: researcher-facing workbench UI (IDE layout, paper reading, KaTeX editing,
       literature mapping, keyboard-first accessibility)
sources: 14 (2 full HCI papers, 6 tool docs, 2 API references, 4 design/technique references)
output: DESIGN_RESEARCH.md (evidence §2, corrections §3, deferred §5, sources §6)
blind_spots: Joen Chan synthesis-work line (PDF unparseable); Pirolli & Card verbatim
             leverage points (HTML mirror lacked them); firecrawl paper index (keyless-blocked)
```

*End of DESIGN_RESEARCH.md*
