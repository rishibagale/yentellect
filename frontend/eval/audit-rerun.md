# Lens eval report

Started: 2026-10-10T15:49:34.546Z · elapsed 225.7s · runs 12

## Bar

- A connection passes at **≥ 6/8** (0–2 on structural validity, non-obviousness, actionability, honesty).
- The lens passes when **≥ half the items produce one passing connection**, and the user answers yes to
  "did this give me a connection I would not have made alone?" on **≥ 3 items**.

## Runs

## Lens: analogical

### Quorum sensing (spec example) — analogical

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says bacterial cells emit a signal molecule and collectively change state once its concentration exceeds a threshold. I propose three structural analogies: (1) endocrine hormone feedback, (2) market price‑triggered entry, and (3) a fire‑alarm smoke detector, each mapping emitters, diffusible signal, threshold, and state change. Which of these mappings suggests a useful design principle for your distributed coordination protocol?

#### Connection 1 — analogy · high confidence

**Label:** HormonalFeedback (physiology)

**Summary:** Endocrine cells secrete a hormone that, when its blood concentration passes a physiological threshold, triggers organ‑wide responses.

**Mapping:**

| source | target |
|---|---|
| bacterial cell | endocrine cell |
| signal molecule | hormone |
| concentration threshold | physiological threshold |
| behavior switch | organ response |

**Transfers:** The idea of a distributed, diffusion‑based feedback loop that self‑regulates without a central controller can inform quorum‑based coordination algorithms.

**Breaks:** Hormone transport is mediated by circulatory flow and binding kinetics, not simple diffusion; also, endocrine targets are often pre‑specified rather than any node.

**Test:** Implement a simulated quorum protocol where each node’s “signal” decays with a flow‑like delay and compare convergence speed to a model of hormone diffusion in a vascular network.

#### Connection 2 — analogy · medium confidence

**Label:** PriceTrigger (economics)

**Summary:** Buyers and sellers post bids; when market price crosses a critical level, participants collectively enter or exit the market.

**Mapping:**

| source | target |
|---|---|
| cell | market participant |
| signal molecule | price quote |
| concentration | aggregate price level |
| threshold crossing | price trigger point |
| behavior switch | entry/exit decision |

**Transfers:** Treat the quorum threshold as a price‑signal that aggregates local offers, suggesting price‑based gossip mechanisms for load balancing.

**Breaks:** Economic price formation involves strategic bidding and expectations, whereas quorum sensing is purely biochemical and non‑strategic.

**Test:** Run a load‑balancing simulation where nodes adjust a shared price variable; measure whether a simple price‑threshold yields the same stability properties as quorum‑based switching.

#### Connection 3 — system · medium confidence

**Label:** SmokeAlarm (safety engineering)

**Summary:** Smoke particles diffuse; a sensor triggers an alarm once particle density exceeds a setpoint.

**Nodes:** `n1` Cell (emitter) [stock]; `n2` Signal Molecule (concentration) [stock]; `n3` Threshold Detector [flow]; `n4` Behavior Switch (gene expression) [stock]

**Edges:** `n1` —+→ `n2`; `n2` —+→ `n3`; `n3` —+→ `n4`

**Loops:** `n2 → n3` (reinforcing): Higher concentration accelerates detection

**Leverage:** Adjusting the detector sensitivity (threshold) changes the timing of the switch most dramatically.

**Assumptions:** Well‑mixed environment | Signal decay negligible on the decision timescale

**Touches user model:** Mirrors a distributed alarm where each node monitors a locally aggregated metric and triggers a coordinated response, useful for designing fault‑detection thresholds.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |


---

### Vaswani et al. 2017 — attention — analogical

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> Attention computes a weighted average of values, with weights set by how compatible a query is with each key. The following analogies illustrate similar relational structures. Which of these analogical mappings suggests a concrete experiment you could run on neural data?

#### Connection 1 — analogy · medium confidence

**Label:** marketPricing (economics)

**Summary:** A consumer (query) evaluates products (keys) via a utility function (compatibility) and allocates budget weights to purchase quantities (values).

**Mapping:**

| source | target |
|---|---|
| query | consumer |
| key | product |
| value | product attribute vector |
| compatibility function | utility function |
| weight | budget share / price weight |

**Transfers:** The idea that a scalar compatibility (utility) can be turned into a set of normalized weights that linearly combine attribute vectors, suggesting a way to model attentional gain as a budget allocation across neural representations.

**Breaks:** Economic agents optimize over constraints (budget) and may exhibit non‑linear saturation, whereas attention mechanisms in Transformers use softmax without explicit resource limits.

**Test:** Fit a softmax‑based utility model to choice data where each option's attribute vector is known, and compare the inferred weights to neural firing rates in a decision‑making task.

#### Connection 2 — analogy · high confidence

**Label:** diffractionPattern (optics)

**Summary:** An incident wave (query) interferes with a grating of slits (keys); the phase match (compatibility) determines the amplitude weight of each slit’s contribution (value) to the far‑field intensity (weighted sum).

**Mapping:**

| source | target |
|---|---|
| query | incident wavefront |
| key | individual slit position |
| value | wavelet emitted by slit |
| compatibility function | phase difference / path length difference |
| weight | interference amplitude factor |

**Transfers:** The principle that a scalar phase compatibility can be exponentiated and normalized to yield weights that linearly combine wavelets, mirroring softmax attention; suggests testing whether neural phase locking could serve as a compatibility metric for attentional selection.

**Breaks:** Diffraction relies on linear superposition of physical fields, while attention operates on abstract vector representations; also diffraction weights are not normalized to sum to one.

**Test:** Record local field potentials while presenting rhythmic stimuli, compute phase coherence between a ‘query’ stimulus and each neuronal population (keys), and see if the coherence‑derived weights predict the combined evoked response.

#### Connection 3 — analogy · medium confidence

**Label:** audioMixing (music production)

**Summary:** A mixing console knob (query) sets the gain (weight) for each channel (key); the audio signal on each channel (value) is then summed to produce the final mix (weighted average).

**Mapping:**

| source | target |
|---|---|
| query | fader position |
| key | audio channel |
| value | track waveform |
| compatibility function | mapping from fader to gain (often linear or dB‑log) |
| weight | gain coefficient applied to waveform |

**Transfers:** Shows how a single control can produce a normalized set of gains that linearly combine multiple streams, suggesting that a neural ‘control signal’ could act like a fader to weight competing representations.

**Breaks:** Audio mixing typically uses linear gain without a softmax normalization, and the fader is an explicit control rather than an emergent compatibility computation.

**Test:** In a task where subjects allocate attention between two visual streams, model their attentional allocation as a single latent fader variable and test whether the inferred gains match the observed BOLD modulation across streams.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |


---

### Granovetter 1973 — weak ties — analogical

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> Weak ties are portrayed as essential bridges that give individuals access to new opportunities and keep them integrated, while strong ties are dense, redundant bonds that can isolate groups. Below are three structural analogies that map these roles onto other domains. Which analogy feels most promising for generating a testable hypothesis about disease‑spread patterns in human contact networks?

#### Connection 1 — analogy · medium confidence

**Label:** metapopulation dispersal (ecology)

**Summary:** Occasional long‑distance dispersal events (weak ties) maintain gene flow across subpopulations, whereas dense local breeding connections (strong ties) can lead to inbreeding and local extinction (fragmentation).

**Mapping:**

| source | target |
|---|---|
| weak tie | rare long‑distance dispersal event |
| strong tie | frequent local breeding interaction |
| individual opportunities/integration | gene flow and recolonization of empty patches |
| fragmentation | inbreeding depression and local population collapse |

**Transfers:** The principle that sparse, bridging links sustain system‑wide cohesion while dense local links can create vulnerability to collapse.

**Breaks:** Ecological populations evolve over generations; human contact networks change on much shorter time scales and involve conscious choice.

**Test:** Simulate a metapopulation model where agents have a mix of rare long‑range contacts and many local contacts, then measure the speed and reach of a pathogen compared to a model with only local contacts.

#### Connection 2 — analogy · medium confidence

**Label:** supply‑chain flexibility (operations management)

**Summary:** Small, flexible suppliers (weak ties) provide novel components and resilience, while large, tightly integrated suppliers (strong ties) create bottlenecks that can fragment production flows.

**Mapping:**

| source | target |
|---|---|
| weak tie | small, peripheral supplier |
| strong tie | large, core supplier |
| individual opportunities/integration | access to diverse inputs and market reach |
| fragmentation | supply‑chain disruption when core supplier fails |

**Transfers:** The insight that a network benefits from peripheral, low‑intensity links for adaptability, whereas over‑reliance on dense core links creates systemic fragility.

**Breaks:** Supply chains involve contractual and economic constraints absent in social ties; the notion of “opportunity” differs from epidemiological exposure.

**Test:** Construct a stylized supply‑chain network model mirroring a contact network, vary the proportion of peripheral vs core suppliers, and observe how a shock (e.g., a supplier failure) propagates versus how a pathogen spreads.

#### Connection 3 — analogy · low confidence

**Label:** internet routing topology (computer science)

**Summary:** Low‑bandwidth, long‑haul links (weak ties) connect disparate autonomous systems and enable global reach, whereas high‑bandwidth, densely meshed local links (strong ties) can create routing loops that isolate subnets.

**Mapping:**

| source | target |
|---|---|
| weak tie | long‑haul, low‑capacity inter‑AS link |
| strong tie | high‑capacity intra‑AS mesh |
| individual opportunities/integration | ability of packets to reach distant networks |
| fragmentation | routing loops or black‑holes that cut off parts of the internet |

**Transfers:** The idea that sparse, bridging connections are crucial for global connectivity while dense local connectivity can paradoxically produce isolation under certain protocols.

**Breaks:** Network protocols enforce deterministic routing, unlike the stochastic nature of human interactions; also, bandwidth is a quantitative resource not directly analogous to tie strength.

**Test:** Create a network simulation where nodes have a mix of long‑haul low‑capacity edges and dense high‑capacity clusters, then measure the spread of a computer worm versus a biological pathogen on an analogous contact graph.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |


---

### Kahneman & Tversky 1979 — prospect theory — analogical

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> Prospect theory claims people judge outcomes relative to a reference point, are risk‑averse for gains, risk‑seeking for losses, and distort probabilities by overweighting rare events and underweighting common ones. The following analogies capture that relational pattern. Which element of the foraging analogy seems most promising to formalize a reference‑point‑dependent risk attitude in your control design?

#### Connection 1 — analogy · medium confidence

**Label:** foraging‑risk (behavioral ecology)

**Summary:** Animals modulate foraging risk based on current energy relative to a baseline, being cautious when above baseline and bold when below, and they overreact to rare high‑quality patches.

**Mapping:**

| source | target |
|---|---|
| reference point | baseline energy level |
| gains/losses | energy surplus/deficit |
| risk‑aversion/seeking | cautious vs. bold patch selection |
| probability weighting | disproportionate attention to rare high‑quality patches vs. common low‑quality patches |

**Transfers:** Use a reference‑dependent, sign‑sensitive gain policy in adaptive control, mirroring the cautious/bold switch.

**Breaks:** Foraging is driven by evolutionary fitness, not explicit utility; time scales and stochasticity differ from engineered systems.

**Test:** Implement a simple foraging‑inspired gain scheduler on a benchmark plant, simulate stochastic disturbances with known probability tails, and compare performance to a symmetric controller.

#### Connection 2 — analogy · medium confidence

**Label:** hysteresis (electronics)

**Summary:** A Schmitt trigger uses different upper and lower thresholds, yielding asymmetric response to rising versus falling inputs, analogous to risk‑aversion for positive deviations and risk‑seeking for negative ones, while its input conditioning amplifies rare spikes.

**Mapping:**

| source | target |
|---|---|
| reference point | midpoint threshold of the trigger |
| gains | input exceeding upper threshold |
| losses | input dropping below lower threshold |
| risk‑aversion | higher upper threshold (slower switch) |
| risk‑seeking | lower lower threshold (faster switch) |
| probability weighting | circuit’s noise‑shaping that magnifies infrequent spikes |

**Transfers:** Design a controller with asymmetric deadbands (different thresholds for positive vs. negative error) to emulate the gain asymmetry.

**Breaks:** The Schmitt trigger is deterministic hardware; it does not inherently implement probabilistic weighting, so the analogy stops at threshold asymmetry.

**Test:** Simulate a controller that switches gains at two asymmetric error thresholds and evaluate its response to disturbances drawn from heavy‑tailed vs. light‑tailed distributions.

#### Connection 3 — system · high confidence

**Label:** prospect‑feedback (control theory)

**Summary:** A feedback loop where the plant output is compared to a reference, a non‑linear utility block implements concave (risk‑averse) or convex (risk‑seeking) gain depending on sign, and a probability‑weighting block reshapes disturbance statistics before feedback.

**Nodes:** `n1` Plant output [variable]; `n2` Reference point [boundary]; `n3` Utility nonlinearity [stock]; `n4` Probability weighting [flow]; `n5` Controller [variable]

**Edges:** `n1` —+→ `n3`; `n2` —-→ `n3`; `n3` —+→ `n5`; `n4` —+→ `n5`; `n5` —+→ `n1` (delay)

**Loops:** `n1 → n3 → n5` (balancing): Positive error passes through concave utility → damping (risk‑aversion) | `n1 → n3 → n5` (reinforcing): Negative error passes through convex utility → amplification (risk‑seeking)

**Leverage:** Shape of the utility block (concave vs. convex) and the weighting function determine robustness to asymmetric disturbances.

**Assumptions:** Reference point is static or slowly varying | Probability weighting acts on disturbance statistics, not on control actions

**Touches user model:** Suggests implementing sign‑dependent gain scheduling together with a disturbance‑re‑weighting filter to mimic prospect‑theoretic behavior.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |


---

### Lotka–Volterra predator–prey — analogical

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says that without predators prey would grow exponentially, predators would die out without prey, and their encounters turn prey into predators, generating coupled oscillations. Three cross‑domain analogies are offered. Which mapping feels most promising for importing a methodological insight into your macro model?

#### Connection 1 — analogy · medium confidence

**Label:** chemical oscillator (chemistry)

**Summary:** In the Brusselator, species A autocatalytically reproduces (exponential) while species B decays without A, and their reaction A+B→2A converts B into A, producing oscillations.

**Mapping:**

| source | target |
|---|---|
| prey (self‑reinforcing growth) | species A (autocatalytic production) |
| predator (self‑decay) | species B (unstable without A) |
| encounter converting prey to predator | reaction A+B→2A converting B into more A |

**Transfers:** Use the linear stability analysis and Hopf bifurcation conditions from the Brusselator to assess when macro variables will oscillate.

**Breaks:** Chemical concentrations are conserved by mass balance; macro variables like output are not strictly conserved, and delays differ.

**Test:** Derive the Jacobian of your macro two‑sector model and compare its eigenvalues to the Brusselator’s Hopf condition for a range of parameter values.

#### Connection 2 — analogy · medium confidence

**Label:** rumor‑fact‑check dynamics (sociology / information diffusion)

**Summary:** Rumors spread exponentially when unchecked, fact‑checkers fade without rumors, and each fact‑checking interaction converts a rumor instance into a verified claim, yielding cyclical attention patterns.

**Mapping:**

| source | target |
|---|---|
| prey | rumor posts |
| predator | fact‑checking posts |
| encounter converting prey to predator | a user seeing a rumor and then posting a correction, turning that rumor into a fact‑checked item |

**Transfers:** Apply epidemic‑type threshold analysis (basic reproduction number) to estimate when macro‑level cycles of optimism/pessimism may emerge.

**Breaks:** Human attention spans introduce stochastic bursts and network topology effects absent in the simple LV equations.

**Test:** Collect time‑series of rumor volume and fact‑checking volume on a platform, fit a Lotka‑Volterra‑type model, and check for predicted phase‑lag and period.

#### Connection 3 — analogy · low confidence

**Label:** immune‑pathogen interaction (immunology)

**Summary:** Pathogen load expands exponentially without immune response; immune cells die off without antigen, and each encounter kills pathogens while proliferating immune cells, producing oscillatory infection cycles.

**Mapping:**

| source | target |
|---|---|
| prey | pathogen population |
| predator | effector immune cells |
| encounter converting prey to predator | antigen presentation triggering clonal expansion of immune cells |

**Transfers:** Borrow the concept of a threshold pathogen load that triggers a switch from damped to sustained oscillations.

**Breaks:** Immune systems have memory and adaptive components that add delayed feedback not present in the basic LV form.

**Test:** Model a simple SIR‑type system with logistic pathogen growth and compare the period of oscillations to empirical viral load data.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |


---

### Shannon 1948 — noisy channel — analogical

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt claims that encoding a message with redundancy lets a receiver recover the original despite channel corruption, achieving arbitrarily low error by exploiting the code's structure. Below are three cross‑domain analogies. Which mapping seems most promising for thinking about redundancy in cellular signaling pathways?

#### Connection 1 — analogy · medium confidence

**Label:** RAID6 (computer storage)

**Summary:** Redundant parity blocks let a storage system reconstruct lost data after disk failures.

**Mapping:**

| source | target |
|---|---|
| message | data block |
| redundancy | parity blocks (P and Q) |
| channel corruption | disk failure or bit‑flip error |
| receiver | reconstruction algorithm |
| code structure | RAID6 parity scheme (dual parity across disks) |

**Transfers:** The principle that dual redundancy plus a known algebraic relationship enables recovery from multiple independent failures, suggesting multi‑site redundancy in signaling could tolerate simultaneous perturbations.

**Breaks:** RAID assumes independent, random disk failures and a deterministic reconstruction algorithm; biological perturbations can be correlated and non‑binary, and the ‘decoder’ is a distributed network rather than a central algorithm.

**Test:** Implement a simulated signaling network where each node’s output is duplicated with two distinct downstream ‘parity’ sensors; then knock out two nodes and assess whether the original signal can be inferred from the parity sensors using linear algebra.

#### Connection 2 — analogy · medium confidence

**Label:** Byzantine quorum (distributed computing)

**Summary:** Multiple replicas and quorum rules let a system reach consensus despite faulty or malicious nodes.

**Mapping:**

| source | target |
|---|---|
| message | proposed value |
| redundancy | multiple replicas of the value |
| channel corruption | faulty or malicious node delivering wrong value |
| receiver | consensus algorithm (e.g., PBFT) |
| code structure | quorum and voting rules that guarantee agreement if < f faults |

**Transfers:** Shows that a structured voting scheme can tolerate a bounded number of errors, implying that signaling pathways could use redundant parallel routes with a ‘voting’ integration point to suppress noise.

**Breaks:** Consensus algorithms rely on discrete, synchronous rounds and known fault bounds; cellular signaling is continuous, stochastic, and lacks a clear round structure.

**Test:** Design a synthetic circuit where a downstream promoter integrates inputs from three parallel upstream promoters (redundant copies) using a threshold logic gate; introduce stochastic perturbations to one promoter and measure whether the output remains stable.

#### Connection 3 — analogy · low confidence

**Label:** musical score redundancy (performing arts)

**Summary:** Notation includes repeated motifs, time signatures, and harmonic cues that let performers infer missing notes when the sheet is damaged.

**Mapping:**

| source | target |
|---|---|
| message | melodic line |
| redundancy | repeated rhythmic/harmonic patterns |
| channel corruption | smudged or missing notes on the page |
| receiver | musician interpreting the score |
| code structure | musical grammar (key, meter, phrase structure) |

**Transfers:** Suggests that embedding predictable motifs in signaling cascades could allow downstream effectors to guess missing inputs, akin to predictive coding.

**Breaks:** Human musicians use extensive cultural knowledge and real‑time auditory feedback, which have no direct analogue in molecular networks; the ‘decoder’ is not algorithmic.

**Test:** Create a synthetic promoter that contains repeated transcription factor binding motifs; mutate a subset of motifs and assess whether downstream gene expression remains comparable to the wild‑type due to the remaining motif redundancy.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |


---

## Lens: systems

### Quorum sensing (spec example) — systems

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says bacteria emit a signal molecule and collectively change behavior when its concentration exceeds a threshold. This resembles distributed consensus where nodes broadcast messages and adopt a new state once a quorum is observed, and can be modeled as a simple system of signal production, concentration, detection, and behavior switch. Which boundary should we treat the extracellular concentration as—a globally shared variable or a distributed state subject to propagation delays?

#### Connection 1 — analogy · medium confidence

**Label:** distributed consensus (distributed systems)

**Summary:** Quorum sensing parallels consensus protocols that wait for a quorum before committing a state change.

**Mapping:**

| source | target |
|---|---|
| signal molecule release | message broadcast |
| concentration crossing threshold | quorum detection |
| collective behavior switch | state commit |

**Transfers:** the notion of a threshold-triggered collective decision

**Breaks:** Biological diffusion is continuous and noisy, whereas consensus messages are discrete and often ordered

**Test:** Implement a simulation where nodes change state only after receiving >N identical messages and compare latency and fault‑tolerance to the biological model

#### Connection 2 — system · low confidence

**Label:** quorum sensing loop (distributed systems)

**Summary:** A minimal stock‑flow model captures signal production, accumulation, detection, and behavior change.

**Nodes:** `n1` SignalProduction [flow]; `n2` SignalConcentration [stock]; `n3` ThresholdDetection [variable]; `n4` BehaviorState [stock]

**Edges:** `n1` —+→ `n2`; `n2` —+→ `n3`; `n3` —+→ `n4`; `n4` —+→ `n1`

**Loops:** `n1 → n2 → n3 → n4` (reinforcing): Behavior may increase signal release, creating positive feedback (inferred)

**Leverage:** Altering the threshold detection rule changes the timing and robustness of the behavior switch.

**Assumptions:** Signal degrades negligibly within the timescale considered (inferred) | All cells experience the same concentration instantly (global variable assumption)

**Touches user model:** Maps to a distributed system where a shared metric (e.g., load, version number) triggers a coordinated reconfiguration once a global condition is met.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |


---

### Vaswani et al. 2017 — attention — systems

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says attention computes a weighted average of values, with weights set by how compatible a query is with a set of keys. I model this as a small system of variables (query, keys, compatibility, weights, values, weighted average) and also draw an analogy to neural population coding where firing rates weight sensory features. Does the model need to include a feedback where the resulting weighted average updates the query representation?

#### Connection 1 — system · high confidence

**Label:** attention weighting (cognitive neuroscience)

**Summary:** A causal loop describing how query–key compatibility generates weights that combine values into a weighted average.

**Nodes:** `n1` Query [variable]; `n2` Keys [variable]; `n3` Compatibility [flow]; `n4` Weights [stock]; `n5` Values [variable]; `n6` WeightedAverage [stock]

**Edges:** `n1` —+→ `n3`; `n2` —+→ `n3`; `n3` —+→ `n4`; `n4` —+→ `n6`; `n5` —+→ `n6`

**Loops:** (none)

**Leverage:** Modifying the Compatibility calculation (e.g., scaling query–key dot product) changes the entire weighting cascade most strongly.

**Assumptions:** Compatibility is a deterministic function of query and keys (e.g., dot product). | Weights are normalized instantly (no temporal delay). | Values are static during a single attention operation.

**Touches user model:** Maps onto theories that attention gates sensory inputs by modulating neuronal gain; the weighted average parallels population read‑out of feature‑selective neurons.

#### Connection 2 — analogy · medium confidence

**Label:** population coding (cognitive neuroscience)

**Summary:** Attention weighting is analogous to neural population coding where each neuron's firing rate weights its contribution to a stimulus estimate.

**Mapping:**

| source | target |
|---|---|
| Query–Key compatibility | Tuning similarity between stimulus and neuron’s preferred feature |
| Weights | Neuron firing rates (gain) that scale contribution |
| Values | Sensory feature values encoded by each neuron |

**Transfers:** Method of weighted aggregation of information across a set of elements.

**Breaks:** Neural firing is noisy and temporally dynamic, whereas the attention formula is deterministic and instantaneous.

**Test:** Record neuronal populations while subjects attend to a cue; test whether the decoded stimulus estimate matches a weighted average using tuning similarity as weights.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |


---

### Granovetter 1973 — weak ties — systems

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt claims weak ties are essential for personal opportunities and community integration, while strong ties cause fragmentation. I model these as a small social‑network system relevant to disease spread. Does the assumed equivalence between weak ties and casual contacts hold across different pathogens?

#### Connection 1 — system · medium confidence

**Label:** Tie‑Network Epidemiology (epidemiology)

**Summary:** Weak ties boost integration and disease spread across groups; strong ties increase local fragmentation and also transmit disease within clusters.

**Nodes:** `n1` WeakTies [stock]; `n2` StrongTies [stock]; `n3` DiseaseTransmission [flow]; `n4` CommunityIntegration [variable]; `n5` NetworkFragmentation [variable]

**Edges:** `n1` —+→ `n4`; `n2` —+→ `n5`; `n1` —+→ `n3`; `n2` —+→ `n3`; `n4` —+→ `n1`

**Loops:** `n1 → n4` (reinforcing): More weak ties raise integration, which in turn encourages formation of more weak ties.

**Leverage:** Intervening on WeakTies (e.g., promoting casual cross‑group contacts) shifts both integration and cross‑community transmission most strongly.

**Assumptions:** Weak ties map onto casual, low‑frequency contacts that bridge otherwise separate subpopulations. | Strong ties map onto frequent, high‑intimacy contacts confined within subpopulations. | Disease transmission probability scales with contact frequency, regardless of tie strength.

**Touches user model:** Provides a structural rationale for incorporating bridging (weak) versus clustered (strong) contacts into network‑based epidemic models, potentially altering predictions of outbreak reach and control strategies.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |


---

### Kahneman & Tversky 1979 — prospect theory — systems

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt claims people judge outcomes relative to a reference, are risk‑averse for gains, risk‑seeking for losses, and distort probabilities. This can be cast as a feedback system where the reference point is the setpoint, the outcome generates an error, and the decision (control action) responds with asymmetric gain and probability‑weighted influence. How should the reference point be treated—as a fixed setpoint or a dynamic boundary?

#### Connection 1 — system · medium confidence

**Label:** Prospect‑theory feedback controller (control theory)

**Summary:** Prospect‑theory behavior maps onto a non‑linear feedback loop with asymmetric gain and probability weighting.

**Nodes:** `n1` Reference point [boundary]; `n2` Outcome [stock]; `n3` Error (gain/loss) [variable]; `n4` Probability weighting [variable]; `n5` Decision (control action) [flow]

**Edges:** `n1` —-→ `n3`; `n2` —+→ `n3`; `n3` —+→ `n5`; `n5` —-→ `n2`; `n4` —+→ `n5`

**Loops:** `n5 → n2 → n3 → n5` (balancing): Decision reduces error, but asymmetric gain can turn the loop reinforcing for loss‑type errors.

**Leverage:** Mapping from Error to Decision (the asymmetric gain function) – altering risk attitude changes system response most strongly.

**Assumptions:** Reference point is exogenous and static during a decision episode. | Error is computed linearly as Outcome – Reference. | Probability weighting acts multiplicatively on decision magnitude.

**Touches user model:** Shows prospect theory as a non‑linear controller, suggesting control designs that embed human‑like risk preferences or probability distortions for human‑in‑the‑loop systems.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |


---

### Lotka–Volterra predator–prey — systems

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says prey would grow without predators, predators would die without prey, and their encounters turn prey into predators, creating coupled oscillations. I map this to a macro model where output (GDP) expands absent investment demand, investment falls without output, and transactions convert output into new capital, producing endogenous cycles. Does your macro framework treat external shocks as a boundary that caps exponential output growth?

#### Connection 1 — system · medium confidence

**Label:** output‑investment predator‑prey analog (macroeconomics)

**Summary:** A two‑stock system (output and investment) with conversion links reproduces Lotka‑Volterra‑type oscillations.

**Nodes:** `n1` Output (GDP) [stock]; `n2` Investment (Capital demand) [stock]; `n3` Environment [boundary]

**Edges:** `n3` —+→ `n1`; `n1` —+→ `n2`; `n2` —-→ `n1`

**Loops:** `n1 → n2` (balancing): Output fuels investment, which in turn drains output, yielding oscillations.

**Leverage:** Altering the conversion rate (edge n1→n2) or the natural growth rate (edge n3→n1) changes cycle amplitude and period most strongly.

**Assumptions:** Closed economy with no exogenous shocks. | Constant conversion coefficients. | No policy interventions (e.g., fiscal/monetary) acting as additional flows.

**Touches user model:** Provides a mechanistic basis for endogenous business‑cycle dynamics without relying on external shocks, suggesting that policy levers could target the conversion link to dampen volatility.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |


---

### Shannon 1948 — noisy channel — systems

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says that encoding a message with redundancy lets a receiver correct channel errors and drive the error probability arbitrarily low by exploiting the code’s structure. The system model below maps that idea onto genetic information, and an analogy links error‑correcting codes to DNA proofreading. Which boundary should we set for the system – only intrinsic cellular mechanisms or also external interventions such as gene editing?

#### Connection 1 — system · medium confidence

**Label:** genetic error correction (molecular biology)

**Summary:** Redundant genetic information together with repair activity forms a balancing loop that reduces mutation‑derived errors.

**Nodes:** `n1` Redundant Genetic Information [stock]; `n2` DNA Repair Activity [variable]; `n3` Mutation Input [flow]; `n4` Error Rate [stock]; `n5` Functional Protein Output [stock]

**Edges:** `n1` —+→ `n2`; `n3` —+→ `n4`; `n2` —-→ `n4`; `n4` —-→ `n5`; `n4` —+→ `n2`

**Loops:** `n4 → n2` (balancing): Higher error upregulates repair, which then lowers error.

**Leverage:** Increasing redundancy (n1) or enhancing repair activity (n2) yields the greatest reduction in error rate.

**Assumptions:** Redundancy is accessible to repair mechanisms. | Repair activity can be up‑regulated proportionally to observed error. | Error rate directly limits functional protein output.

**Touches user model:** Helps design synthetic gene circuits with built‑in redundancy to achieve arbitrarily low expression error, mirroring Shannon's principle.

#### Connection 2 — analogy · medium confidence

**Label:** DNA proofreading (molecular biology)

**Summary:** Error‑correcting codes correspond to DNA polymerase proofreading and exonuclease repair.

**Mapping:**

| source | target |
|---|---|
| redundancy in the code | degeneracy of the genetic code |
| structured code constraints | enzyme active‑site specificity |
| algorithmic error correction | exonuclease proofreading activity |

**Transfers:** Method of detecting mismatches and correcting them.

**Breaks:** Biological repair is stochastic and limited by energy, whereas engineered codes are deterministic and can be arbitrarily strong.

**Test:** Compare mutation rates of polymerases with and without exonuclease domains; mimic added redundancy in synthetic DNA storage and measure error reduction.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |


---
