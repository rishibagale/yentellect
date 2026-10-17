# Lens eval report

Started: 2026-10-17T12:45:28.685Z · elapsed 224.4s · runs 12

## Bar

- A connection passes at **≥ 6/8** (0–2 on structural validity, non-obviousness, actionability, honesty).
- The lens passes when **≥ half the items produce one passing connection**, and the user answers yes to
  "did this give me a connection I would not have made alone?" on **≥ 3 items**.

## Runs

## Lens: analogical

### Quorum sensing (spec example) — analogical

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says bacterial cells emit a signal molecule and collectively switch behavior once its concentration exceeds a threshold. Below are two cross‑domain analogies that preserve the same relational pattern. Which analogy feels most promising for informing your quorum‑based coordination protocol?

#### Connection 1 — analogy · medium confidence

**Label:** traffic_brake_lights (transportation)

**Summary:** Vehicles emit brake‑light signals; drivers brake when local brake‑light density crosses a perceptual threshold.

**Mapping:**

| source | target |
|---|---|
| cell | vehicle |
| signal molecule | brake light illumination |
| concentration threshold | perceived brake‑light density threshold |
| behavior switch | driver initiates braking |

**Transfers:** A decentralized threshold‑based activation rule that can be implemented with local sensing and no central coordinator.

**Breaks:** Brake‑light perception is visual and subject to line‑of‑sight constraints, unlike diffusion which is isotropic; also drivers may react with delays not present in bacterial response.

**Test:** Run a microscopic traffic simulation where each vehicle emits a binary brake‑light signal; vary the density of braking vehicles and measure the point at which non‑braking drivers begin to brake, checking for a sharp transition.

#### Connection 2 — analogy · medium confidence

**Label:** social_media_virality (online social dynamics)

**Summary:** Users share a piece of content; the platform amplifies it once the share count exceeds an algorithmic threshold.

**Mapping:**

| source | target |
|---|---|
| cell | social media user |
| signal molecule | content share (post) |
| concentration threshold | share‑count trigger for algorithmic boost |
| behavior switch | platform promotes content to wider audience |

**Transfers:** A collective decision emerging from local actions without explicit coordination, suggesting a design where nodes raise a flag that triggers a system‑wide mode change.

**Breaks:** The platform’s boost is a top‑down act rather than a pure emergent property; users may also be influenced by external trends, breaking the closed‑system assumption of diffusion.

**Test:** Instrument a micro‑blogging service to log share counts in real time; introduce a synthetic piece of content and observe whether a sharp increase in exposure occurs at a predictable share count, matching a threshold model.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |


---

### Vaswani et al. 2017 — attention — analogical

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> Attention computes a weighted average of values, with weights derived from the compatibility between a query and a set of keys. The three analogies below map query‑key‑value‑compatibility‑weighting onto (1) collaborative filtering, (2) catalytic selectivity in chemistry, and (3) packet routing in telecommunications. Which of these mappings suggests the most testable hypothesis for neural attention?

#### Connection 1 — analogy · medium confidence

**Label:** collaborativeFiltering (recommenderSystems)

**Summary:** A user (query) is matched to item profiles (keys); similarity scores (compatibility) weight predicted ratings (values) into a final recommendation (weighted average).

**Mapping:**

| source | target |
|---|---|
| query | activeUser |
| keys | itemProfiles |
| values | predictedRatings |
| compatibility function | similarityMetric |
| weighted average | aggregatedScore |

**Transfers:** Method of computing a relevance‑weighted aggregate can inspire how neural populations combine stimulus‑specific activity based on task‑relevant similarity.

**Breaks:** Recommender systems typically operate on sparse, static rating matrices, whereas neural attention weights are dense and dynamically recomputed per moment.

**Test:** Compute similarity between a task cue (query) and each neuron's tuning vector (key) and test whether the resulting weighted sum predicts downstream population activity better than an unweighted sum.

#### Connection 2 — analogy · low confidence

**Label:** catalyticSelectivity (chemicalCatalysis)

**Summary:** A catalyst (query) interacts with multiple substrates (keys); binding affinities (compatibility) weight each reaction pathway’s product yield (values) into the overall rate (weighted average).

**Mapping:**

| source | target |
|---|---|
| query | catalyst |
| keys | substrateMolecules |
| values | productYields |
| compatibility function | bindingAffinity |
| weighted average | overallReactionRate |

**Transfers:** Viewing attention as a selective catalyst suggests that neurons with high affinity to a cognitive goal may disproportionately drive network output.

**Breaks:** Chemical reactions obey physical rate laws and thermodynamics; neural attention weights are learned parameters, not fixed physicochemical constants.

**Test:** Manipulate the ‘affinity’ of a subset of neurons to a task cue (e.g., via optogenetic gain) and measure whether the change in downstream activity follows the predicted weighted‑rate model.

#### Connection 3 — analogy · medium confidence

**Label:** packetRouting (telecommunications)

**Summary:** A router (query) compares a packet header to routing table entries (keys); metric scores (compatibility) weight the selection of next‑hop interfaces (values) into a load‑balanced forwarding decision (weighted average).

**Mapping:**

| source | target |
|---|---|
| query | routerDecisionEngine |
| keys | routingTableEntries |
| values | nextHopInterfaces |
| compatibility function | routingMetric |
| weighted average | loadBalancedForwarding |

**Transfers:** Treating attention as dynamic routing implies the brain flexibly reallocates information flow based on moment‑by‑moment similarity to task demands.

**Breaks:** Routing tables are often static or slowly updated, whereas attention weights can change every processing step; also network traffic is engineered, not biologically constrained.

**Test:** Implement a simulated neural network where each layer routes its output to downstream units using a per‑input similarity metric, then compare performance and energy use to a standard feed‑forward architecture.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |


---

### Granovetter 1973 — weak ties — analogical

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt claims that weak ties, despite criticism, are essential for personal opportunity and community integration, whereas strong ties promote fragmentation. Below are three cross‑domain analogies that capture this relational pattern. Which analogy seems most promising for generating a testable hypothesis about contact patterns in disease spread?

#### Connection 1 — analogy · medium confidence

**Label:** pollination (ecology)

**Summary:** Generalist pollinators (weak ties) link many plant species, sustaining community cohesion; specialist pollinators (strong ties) create tightly knit modules that can fragment the network.

**Mapping:**

| source | target |
|---|---|
| weak tie | generalist pollinator (visits many plant species) |
| strong tie | specialist pollinator (visits few, closely related plants) |
| individual opportunity | plant's access to diverse pollen sources |
| community integration | overall plant‑pollinator network connectivity |
| fragmentation | modularization of the pollination network |

**Transfers:** The idea that low‑strength, cross‑cluster links sustain system‑wide flow can be transferred to epidemiological contact networks as a design principle for maintaining surveillance reach.

**Breaks:** Pollination is a mutualistic, largely non‑reciprocal interaction, whereas human ties involve bidirectional social exchange and behavioral feedback.

**Test:** Construct a bipartite plant‑pollinator network and measure how removal of generalist versus specialist pollinators changes network diameter and disease‑like cascade reach; compare the pattern to simulated removal of weak versus strong social ties.

#### Connection 2 — analogy · high confidence

**Label:** software (software engineering)

**Summary:** Loosely coupled modules (weak ties) enable system integration and flexibility; tightly coupled modules (strong ties) create brittle, fragmented architectures.

**Mapping:**

| source | target |
|---|---|
| weak tie | loose coupling (e.g., API interface) |
| strong tie | tight coupling (e.g., shared global state) |
| individual opportunity | module's ability to reuse functionality from many others |
| community integration | overall system composability |
| fragmentation | failure propagation being confined to isolated subsystems |

**Transfers:** The principle that sparse, well‑defined interfaces promote global reach can inform the design of contact‑tracing apps that rely on minimal, cross‑group data sharing.

**Breaks:** Software modules are engineered deliberately, while social ties emerge organically; the cost structures differ markedly.

**Test:** Simulate an epidemic on two synthetic contact graphs: one where edges represent loose API‑style links (low weight, high betweenness) and another where edges are dense, intra‑group links; compare outbreak size and speed.

#### Connection 3 — analogy · low confidence

**Label:** transport (urban transportation)

**Summary:** Minor roads (weak ties) provide alternative routes that keep the city connected; major highways (strong ties) can create bottlenecks and segregate neighborhoods.

**Mapping:**

| source | target |
|---|---|
| weak tie | minor arterial road linking peripheral districts |
| strong tie | high‑capacity highway linking central hubs |
| individual opportunity | resident's access to distant services via minor roads |
| community integration | city‑wide traffic flow continuity |
| fragmentation | neighborhood isolation when highways dominate flow |

**Transfers:** The insight that low‑capacity, widespread links preserve network robustness could be applied to ensure that contact‑tracing strategies do not over‑focus on high‑frequency contacts.

**Breaks:** Traffic flow obeys physical constraints (capacity, speed limits) absent in social interaction; also, road networks are planned rather than emergent.

**Test:** Overlay a city’s road network with a synthetic disease‑spread model, varying the proportion of trips that use minor versus major roads; assess how the epidemic’s spatial spread correlates with network fragmentation metrics.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |


---

### Kahneman & Tversky 1979 — prospect theory — analogical

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> Prospect theory claims that outcomes are judged relative to a reference point, with concave (risk‑averse) valuation for gains, convex (risk‑seeking) for losses, and a nonlinear weighting that overstates small probabilities and understates large ones. Below are three cross‑domain analogies. Which mapping feels most promising for informing a control‑design perspective on reference‑based performance metrics?

#### Connection 1 — analogy · medium confidence

**Label:** priceElasticity (economics)

**Summary:** Consumer demand reacts asymmetrically to price changes around a reference price, with different elasticities for price rises vs drops and nonlinear perception of rare price shocks.

**Mapping:**

| source | target |
|---|---|
| reference point (outcome baseline) | reference price (consumer's expected price) |
| risk‑averse over gains (concave utility) | inelastic demand for price decreases (small price cuts yield modest quantity increase) |
| risk‑seeking over losses (convex utility) | elastic demand for price increases (small price hikes cause large quantity drop) |
| overweight small probabilities | consumer overreacts to rare, large discounts (e.g., flash sales) |
| underweight large probabilities | consumer underreacts to frequent, modest price changes |

**Transfers:** Use the elasticity framework to model how a control system might weight deviations from a setpoint differently depending on direction and rarity of disturbances.

**Breaks:** Economic demand involves voluntary choice, not physical constraints; probability weighting in economics is about perceived frequency, not stochastic weighting functions used in control.

**Test:** Construct a simulated demand curve with asymmetric elasticities and apply a stochastic price disturbance; compare the system's cost function with prospect‑theory‑style weighting to see if performance metrics improve.

#### Connection 2 — analogy · medium confidence

**Label:** neuronThreshold (neuroscience)

**Summary:** A neuron's membrane potential is evaluated relative to a resting baseline; excitatory inputs above threshold trigger spikes (risk‑seeking), inhibitory inputs below threshold suppress firing (risk‑averse), and synaptic events with low probability are amplified by dendritic integration.

**Mapping:**

| source | target |
|---|---|
| reference point | resting membrane potential |
| risk‑averse over gains | sub‑threshold depolarizations that fail to cause a spike (energy conserved) |
| risk‑seeking over losses | suprathreshold depolarizations that produce an all‑or‑none spike (large response) |
| overweight small probabilities | high synaptic gain for rare, coincident excitatory inputs (temporal summation) |
| underweight large probabilities | saturation of firing rate for frequent inputs (refractory period limits) |

**Transfers:** Adopt a threshold‑nonlinearity with direction‑dependent gain in a controller, and incorporate a probability‑dependent gain schedule analogous to synaptic integration.

**Breaks:** Neuronal spiking is binary and stochastic, whereas control actions are typically continuous; biological adaptation mechanisms (e.g., plasticity) have no direct counterpart in most engineered controllers.

**Test:** Implement a piecewise‑linear controller with a higher gain for negative error excursions and a lower gain for positive ones; add a stochastic gain modifier that boosts response to rare large disturbances and observe closed‑loop stability.

#### Connection 3 — analogy · low confidence

**Label:** staticKineticFriction (mechanics)

**Summary:** Friction opposes motion relative to a zero‑velocity reference; static friction resists small forces (risk‑averse), kinetic friction permits motion once the threshold is crossed (risk‑seeking), and the likelihood of encountering micro‑forces is weighted nonlinearly.

**Mapping:**

| source | target |
|---|---|
| reference point | zero‑velocity state |
| risk‑averse over gains | static friction resisting small applied forces (no motion) |
| risk‑seeking over losses | kinetic friction allowing larger motion once static threshold is exceeded |
| overweight small probabilities | enhanced sensitivity to rare, high‑amplitude shocks that overcome static friction |
| underweight large probabilities | diminished effect of frequent, low‑amplitude forces that stay within static regime |

**Transfers:** Model a control law with a dead‑zone (static friction) that switches to a lower‑gain regime (kinetic friction) after a threshold, and apply a probability‑based gain scaling for rare large disturbances.

**Breaks:** Friction is a physical dissipation mechanism, not a decision‑making process; probability weighting does not naturally arise in deterministic friction models.

**Test:** Simulate a mass‑spring‑damper with a dead‑zone controller that changes gain after a force threshold; inject disturbances with a heavy‑tailed distribution and compare energy consumption with and without a probability‑weighted gain adjustment.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |


---

### Lotka–Volterra predator–prey — analogical

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says prey would grow exponentially if predators were absent, predators would die out without prey, and their encounters turn prey into predators, generating coupled oscillations. Below are two structural analogies. Which mapping feels most promising for generating testable insights about macroeconomic cycles?

#### Connection 1 — analogy · medium confidence

**Label:** BZ reaction (chemical kinetics)

**Summary:** An autocatalytic chemical oscillator mirrors the prey‑predator feedback loop.

**Mapping:**

| source | target |
|---|---|
| prey (self‑reinforcing population) | reactant A (autocatalytic species) |
| predator (self‑decaying without prey) | intermediate B (unstable product that decays without A) |
| encounter converting prey to predator | reaction step A → B that consumes A to produce B |

**Transfers:** The mathematical form (Lotka‑Volterra equations) and conditions for sustained oscillations can be borrowed to test whether macro variables exhibit similar limit‑cycle behavior.

**Breaks:** Chemical reactions have fixed stoichiometry and temperature constraints; economic agents can change preferences, violating the fixed conversion rate assumption.

**Test:** Fit a two‑variable nonlinear ODE model to a pair of macro time series (e.g., investment and unemployment) and check for a closed orbit using phase‑plane analysis, analogous to the BZ reaction’s limit cycle.

#### Connection 2 — analogy · low confidence

**Label:** malware‑patch arms race (cybersecurity)

**Summary:** Malware spreads exponentially without patches, patches decay without malware, and infections trigger new patches, producing oscillatory attack‑defense cycles.

**Mapping:**

| source | target |
|---|---|
| prey exponential growth | unpatched vulnerable systems proliferating malware |
| predator decline without prey | security patches becoming obsolete without new malware |
| encounter converting prey to predator | malware infection prompting development and deployment of patches |

**Transfers:** The feedback loop suggests that introducing a delay in patch rollout could dampen cycles, a policy lever that could be explored for macro policy timing.

**Breaks:** Patch adoption is not a simple conversion; human decision‑making and heterogeneous networks break the one‑to‑one conversion assumption.

**Test:** Collect data on malware incident counts and patch release dates for a specific vulnerability, estimate a two‑stock model, and simulate whether adding a rollout lag reduces the amplitude of observed cycles.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |


---

### Shannon 1948 — noisy channel — analogical

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says that adding redundancy to a message lets a receiver correct errors introduced by a noisy channel by using the code's structure. The following analogies illustrate the same relational pattern in other fields. Which of these analogies suggests a concrete way to design a molecular assay that tolerates sequencing errors?

#### Connection 1 — analogy · medium confidence

**Label:** RAID (computer storage)

**Summary:** Redundant disk arrays recover lost data after disk failures using parity information.

**Mapping:**

| source | target |
|---|---|
| message | data block |
| redundancy | parity or mirroring across disks |
| channel corruption | disk failure or bit errors |
| receiver decoding | reconstruction algorithm using parity |

**Transfers:** The principle that systematic redundancy plus an algorithmic reconstruction can guarantee arbitrarily low data loss translates to designing assay barcodes with parity checks to correct sequencing errors.

**Breaks:** RAID assumes independent disk failures and deterministic parity; biological errors may be correlated and biochemical reactions introduce stochastic biases not captured by simple parity.

**Test:** Create a set of synthetic DNA barcodes with built‑in parity bits, sequence them with a known error profile, and measure whether the reconstruction algorithm can recover the original barcodes at the predicted error rate.

#### Connection 2 — analogy · medium confidence

**Label:** EnsembleLearning (machine learning)

**Summary:** Multiple models vote together; individual model errors are mitigated by aggregating predictions.

**Mapping:**

| source | target |
|---|---|
| message | true label or underlying pattern |
| redundancy | multiple independent classifiers |
| channel corruption | individual classifier mispredictions due to noise in training data |
| receiver decoding | aggregation rule (e.g., majority vote, weighted averaging) |

**Transfers:** Designing a panel of redundant probes or primers whose independent readouts are combined can reduce the impact of stochastic sequencing errors, analogous to ensemble voting.

**Breaks:** Ensemble methods rely on statistical independence of errors; probe failures in biology may be correlated (e.g., batch effects), violating the independence assumption.

**Test:** Run parallel qPCR assays targeting the same transcript with different primer sets, then combine Ct values using a weighted average to see if the combined estimate shows lower variance than any single assay.

#### Connection 3 — analogy · low confidence

**Label:** StructuralRedundancy (civil engineering)

**Summary:** Buildings use multiple load‑bearing members so that failure of one does not collapse the structure; the design exploits the geometry of the framework.

**Mapping:**

| source | target |
|---|---|
| message | intended load or force distribution |
| redundancy | multiple columns/beams sharing the load |
| channel corruption | failure or damage of a column |
| receiver decoding | the remaining structure redistributing load to maintain integrity |

**Transfers:** Conceptually, designing a molecular network where multiple pathways can compensate for loss of one component mirrors structural redundancy, suggesting multiplexed pathways to buffer against mutation.

**Breaks:** Physical load redistribution follows deterministic mechanics, whereas molecular compensation involves complex regulation and may not be as predictable.

**Test:** Engineer a synthetic gene circuit with three parallel promoters driving the same reporter; knock out each promoter individually and measure whether overall expression remains within a predefined tolerance.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |


---

## Lens: systems

### Quorum sensing (spec example) — systems

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says bacteria emit a signal molecule and collectively change state when its concentration exceeds a threshold. This can be modeled as a threshold‑driven state‑change system analogous to quorum‑based consensus in distributed systems. How should we treat the spatial mixing assumption as a system boundary?

#### Connection 1 — system · medium confidence

**Label:** Quorum‑threshold signaling (distributed systems)

**Summary:** Signal production, decay, and a concentration‑threshold trigger form a balancing feedback that mirrors quorum‑based consensus.

**Nodes:** `n1` Signal [stock]; `n2` Production [flow]; `n3` Decay [flow]; `n4` Threshold [boundary]; `n5` BehaviorSwitch [variable]

**Edges:** `n2` —+→ `n1`; `n3` —-→ `n1`; `n1` —+→ `n3`; `n1` —+→ `n5`

**Loops:** `n1 → n3` (balancing): Higher signal accelerates decay, limiting concentration.

**Leverage:** Changing Production (n2) or Decay (n3) rates shifts steady‑state signal level and thus the point at which the switch fires.

**Assumptions:** Well‑mixed environment (no spatial gradients) | Homogeneous cell population | Instantaneous detection of threshold crossing

**Touches user model:** Maps to quorum‑based consensus where nodes broadcast messages (Production) and commit when a message count exceeds a threshold, informing fault‑tolerant protocol design.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |


---

### Vaswani et al. 2017 — attention — systems

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says attention computes a weighted average of values, with weights set by how compatible a query is with a set of keys. I model this as a small system: query and keys generate a compatibility score, which creates weights, which combine with values to produce the output. Does your neural‑cognitive model treat the key set as static or dynamically updated?

#### Connection 1 — system · medium confidence

**Label:** attention computation (cognitive neuroscience)

**Summary:** A causal chain from query/key compatibility to weights to weighted‑average output.

**Nodes:** `n1` Query [variable]; `n2` Keys [variable]; `n3` Compatibility [variable]; `n4` Weights [variable]; `n5` Values [variable]; `n6` WeightedAverage (Output) [variable]

**Edges:** `n1` —+→ `n3`; `n2` —+→ `n3`; `n3` —+→ `n4`; `n4` —+→ `n6`; `n5` —+→ `n6`

**Loops:** (none)

**Leverage:** Altering the compatibility calculation (e.g., scaling or normalizing scores) most strongly changes the final output.

**Assumptions:** Compatibility is a deterministic function of query and keys. | Weights are normalized (e.g., softmax) but the normalization step is omitted for simplicity. | Keys and values are fixed during a single attention call.

**Touches user model:** Maps onto neural theories of attentional weighting (biased competition) where stimulus features (keys) compete for representation based on task goals (query).

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |


---

### Granovetter 1973 — weak ties — systems

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says weak ties are essential for personal opportunities and community integration, while strong ties cause fragmentation. I have modeled these ideas as a small system of tie types affecting integration and opportunity, and as an analogy to bridge contacts that link otherwise separate subpopulations in disease spread. Does the boundary of “community” refer to a geographic area or a social group?

#### Connection 1 — system · high confidence

**Label:** Tie-Integration System (epidemiology)

**Summary:** Weak ties boost integration and opportunity; strong ties increase fragmentation, which reduces integration.

**Nodes:** `n1` WeakTieFrequency [stock]; `n2` StrongTieDensity [stock]; `n3` CommunityIntegration [variable]; `n4` OpportunityAccess [variable]; `n5` CommunityFragmentation [variable]

**Edges:** `n1` —+→ `n3`; `n1` —+→ `n4`; `n2` —+→ `n5`; `n5` —-→ `n3`

**Loops:** `n1 → n3` (reinforcing): More integration creates more weak ties (e.g., new acquaintances) reinforcing integration.

**Leverage:** Increasing weak‑tie frequency (n1) yields the largest rise in integration (n3) and opportunity (n4).

**Assumptions:** Weak ties are random, low‑intensity contacts; strong ties are dense, high‑intensity clusters; integration is proxied by network connectivity.

**Touches user model:** Provides a mechanistic link between social network structure and epidemiological outcomes such as spread across clusters and access to health resources.

#### Connection 2 — analogy · medium confidence

**Label:** bridge contacts (epidemiology)

**Summary:** Weak ties correspond to bridge contacts that connect otherwise separate subpopulations, facilitating pathogen flow.

**Mapping:**

| source | target |
|---|---|
| weak tie | bridge contact |
| strong tie | core cluster contact |
| community integration | network connectivity across subpopulations |

**Transfers:** Concept of bridging edges that increase reach of transmission chains.

**Breaks:** Bridge contacts in disease spread are often high‑risk for transmission, whereas weak ties in Granovetter are valued for opportunity, not risk.

**Test:** Compare epidemic simulations on networks with varied weak‑tie (bridge) densities and measure changes in outbreak size versus measures of social opportunity.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |


---

### Kahneman & Tversky 1979 — prospect theory — systems

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt claims people evaluate outcomes relative to a reference point, are risk‑averse for gains, risk‑seeking for losses, and distort probabilities. This can be rendered as a feedback control system where the reference point is the setpoint, perceived error drives a bias‑adjusted controller, and probability weighting skews the controller’s gain. Should the reference point be treated as a fixed setpoint or a dynamic boundary in the control model?

#### Connection 1 — system · medium confidence

**Label:** Prospect‑Control Loop (control theory)

**Summary:** A feedback loop mapping reference‑point evaluation, risk attitude, and probability weighting onto control actions.

**Nodes:** `n1` Reference point [boundary]; `n2` Actual outcome [stock]; `n3` Perceived error [variable]; `n4` Risk attitude [variable]; `n5` Probability weighting [variable]; `n6` Control action [flow]; `n7` System state [stock]

**Edges:** `n2` —+→ `n3`; `n1` —-→ `n3`; `n3` —+→ `n4`; `n4` —+→ `n6`; `n5` —+→ `n6`; `n6` —-→ `n7`; `n7` —+→ `n2`

**Loops:** `n3 → n4 → n6 → n7 → n2 → n3` (balancing): Control action reduces perceived error, creating negative feedback.

**Leverage:** Altering the gain of the probability‑weighting node (n5) or the risk‑attitude mapping (n4) changes controller aggressiveness most strongly.

**Assumptions:** Reference point is exogenous and does not shift with time. | Probability weighting is a static non‑linear transformation of objective probabilities. | Risk attitude maps linearly from perceived error sign to controller gain.

**Touches user model:** Provides a behavioral augmentation to classic PID or state‑feedback designs, suggesting bias‑aware gain scheduling for systems interacting with human decision makers.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |


---

### Lotka–Volterra predator–prey — systems

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says prey would grow exponentially if predators were absent, predators would die off without prey, and encounters turn prey into predators, creating coupled oscillations. I map this to a two‑stock macro model (e.g., investment and debt) and also note the analogy to investment‑consumption cycles. Which boundary (e.g., closed economy vs. open) should we treat as fixed?

#### Connection 1 — system · medium confidence

**Label:** LV‑macro cycle (macroeconomics)

**Summary:** A two‑stock system of investment (prey) and debt (predator) with natural growth/decay and interaction‑driven conversion reproduces the Lotka‑Volterra dynamics.

**Nodes:** `n1` Investment stock [stock]; `n2` Debt stock [stock]; `n3` Investment growth [flow]; `n4` Debt decay [flow]; `n5` Debt‑financed investment [flow]; `n6` Debt repayment [flow]

**Edges:** `n1` —+→ `n3`; `n3` —+→ `n1`; `n2` —-→ `n4`; `n4` —-→ `n2`; `n1` —-→ `n5`; `n5` —+→ `n2`; `n2` —+→ `n6`; `n6` —-→ `n1`

**Loops:** `n1 → n3` (reinforcing): exponential investment growth without debt | `n1 → n5 → n2 → n4` (balancing): more debt fuels investment which later raises debt decay, creating oscillations

**Leverage:** Altering the conversion flow (n5) – e.g., credit constraints – changes cycle amplitude most.

**Assumptions:** Closed economy with no external financing | Linear interaction term (investment‑to‑debt conversion proportional to product of stocks) | No policy feedbacks other than the modeled flows

**Touches user model:** Provides a mechanistic basis for endogenous business‑cycle oscillations in macro models that treat investment and debt as interacting stocks.

#### Connection 2 — analogy · low confidence

**Label:** investment‑consumption cycle (macroeconomics)

**Summary:** Lotka‑Volterra predator‑prey dynamics resemble the classic investment‑consumption feedback where high investment spurs consumption, which later curtails investment.

**Mapping:**

| source | target |
|---|---|
| prey (exponential growth) | investment (expands when demand is low) |
| predator (decline without prey) | consumption pressure (weakens without investment) |
| encounters convert prey to predators | investment creates income that fuels consumption |

**Transfers:** the qualitative pattern of coupled oscillations and mutual dependence

**Breaks:** macroeconomic agents have expectations and policy that can break simple proportional conversion

**Test:** Simulate a two‑stock investment‑consumption model with Lotka‑Volterra equations and compare its cycle frequency to observed business‑cycle data.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |


---

### Shannon 1948 — noisy channel — systems

provider `groq` · model `openai/gpt-oss-120b` · key …WyJt · attempts 1

> The excerpt says that adding redundancy to a message lets a receiver undo channel errors and recover the original with arbitrarily low error by using the code’s structure. I linked this to the degeneracy of the genetic code (analogy) and built a simple system of encoded message, noise, errors, correction and recovered message (system). Does the model need a separate “repair enzyme activity” node to capture the biological implementation of error correction?

#### Connection 1 — analogy · medium confidence

**Label:** genetic code redundancy (molecular biology)

**Summary:** Redundant codons in DNA act like engineered redundancy in communication codes, enabling error correction by cellular mechanisms.

**Mapping:**

| source | target |
|---|---|
| redundant symbols in code | degenerate codons encoding same amino acid |
| receiver exploiting structure | DNA repair enzymes recognizing mismatches |
| arbitrarily small error probability | high fidelity of replication after repair |

**Transfers:** method of using redundancy for error correction

**Breaks:** Biological repair is not purely information‑theoretic; it depends on enzymatic kinetics and energy, not just code structure.

**Test:** Compare mutation rates in organisms with altered codon redundancy (e.g., recoded genomes) to predictions from Shannon‑type error‑correction models.

#### Connection 2 — system · high confidence

**Label:** noisy channel correction (information theory applied to biology)

**Summary:** A minimal feedback system where redundancy, noise, errors, and correction interact to produce a recovered message.

**Nodes:** `n1` EncodedMessage [stock]; `n2` ChannelNoise [flow]; `n3` Errors [stock]; `n4` ErrorCorrection [flow]; `n5` RecoveredMessage [stock]

**Edges:** `n1` —+→ `n3`; `n2` —+→ `n3`; `n3` —+→ `n4`; `n4` —-→ `n3`; `n4` —+→ `n5`

**Loops:** `n3 → n4` (balancing): More errors trigger correction, which reduces errors.

**Leverage:** Increasing redundancy (size of n1) amplifies the capacity of n4 to reduce n3, lowering final error.

**Assumptions:** Channel noise is random and memoryless. | ErrorCorrection can fully exploit code structure without delay. | Redundancy is sufficient to make error probability arbitrarily low.

**Touches user model:** Provides a quantitative framework for interpreting how DNA replication fidelity improves with sequence redundancy and repair pathways.

**Hand grade (0–2 each; pass ≥ 6/8):**

| # | structural | non-obvious | actionable | honest | total | pass? |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |


---
