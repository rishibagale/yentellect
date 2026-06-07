# Yentellect

**Cognitive Development Platform**

> *Most AI makes you more informed. Yentellect makes you think better.*

Yentellect is a production-grade AI system that builds a persistent cognitive model of the user across sessions, detects dominant and underdeveloped thinking modes from behavioral text signals, and delivers adaptive Socratic sessions targeting the weakest modes — specifically analogical reasoning, divergent thinking, and metacognitive awareness.

## The Six Thinking Modes

| Mode | What it trains | Neural basis |
|------|----------------|--------------|
| **Convergent** | Precision under constraint, focused problem-solving | Dorsolateral Prefrontal Cortex (DLPFC) |
| **Divergent** | Ideational fluency, creative generation, flexible thinking | DMN–DLPFC coupling |
| **Analogical** | Cross-domain structural mapping, relational reasoning | Frontopolar cortex (Brodmann 10) |
| **Metacognitive** | Reasoning about reasoning, calibration accuracy | Anterior Prefrontal Cortex |
| **Systems** | Causal chains, feedback loops, emergent properties | Inferior parietal + DLPFC |
| **DMN** | Open wandering, insight incubation, associative thinking | Posterior Cingulate + Medial PFC |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/rishibagale/yentellect.git
cd yentellect

# 2. Backend setup
cd backend
uv sync --all-extras              # Install dependencies
python -m spacy download en_core_web_sm  # Download spaCy model
cp ../.env.example .env           # Configure environment
uv run uvicorn backend.api.main:app --reload --port 8000

# 3. Frontend setup (in a new terminal)
cd ../frontend
npm install                        # Install dependencies
npm run dev                        # Start Next.js (port 3000)

# 4. Open http://localhost:3000
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js 14)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Session  │  │  Mode    │  │Knowledge │  │  Progress    │   │
│  │   Chat   │  │Indicator │  │  Graph   │  │    Chart     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│         │             │             │              │             │
│         └─────────────┴─────────────┴──────────────┘             │
│                            │                                    │
│                    Typed API Client                              │
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTP / JSON
┌────────────────────────────┼────────────────────────────────────┐
│                      Backend (FastAPI)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  LangGraph Session FSM                   │   │
│  │  INTAKE -> CLASSIFY -> SELECT -> RUN -> EVALUATE -> ... │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │              │              │              │           │
│  ┌──────┴────┐  ┌──────┴────┐  ┌──────┴────┐  ┌──────┴────┐    │
│  │  Signal   │  │  Mode     │  │ Knowledge │  │  Groq     │    │
│  │ Extractor │  │Classifier │  │   Graph   │  │ llama-3.3 │    │
│  │ (spaCy)   │  │(heuristic)│  │(NetworkX) │  │   LLM     │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
│         │              │              │              │           │
│         └──────────────┴──────────────┴──────────────┘           │
│                            │                                    │
│                  ┌─────────┴─────────┐                          │
│                  │  SQLite Database  │                          │
│                  │  + Ebbinghaus     │                          │
│                  │    Decay           │                          │
│                  └───────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

## Research Foundation

Yentellect is grounded in cognitive neuroscience and learning science:

- **Ebbinghaus Forgetting Curve**: Confidence decays as `c *= 0.9^days` without reinforcement
- **Socratic Method**: Exactly one question per turn (cognitive load minimization)
- **Zone of Proximal Development**: Target weakest mode (just above current level)
- **Hebbian Learning**: "Neurons that fire together wire together" - strengthens concept edges
- **Six Thinking Hats (de Bono)**: Mapped to the six neural circuits
- **Default Mode Network**: Insight emerges when prefrontal inhibition is reduced
- **Theory of Mind (Brodmann 10)**: Metacognition requires anterior prefrontal engagement

## License

MIT © 2024 Rishi Bagale