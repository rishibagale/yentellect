/**
 * Yentellect workbench — Sample research document for first-run onboarding.
 * Provides a seminal mathematical physics paper with LaTeX formulas
 * so any new visitor can immediately explore the editor, KaTeX preview,
 * and Socratic lenses without friction.
 */
import { putDoc, type WorkDoc } from "./db";

export const SAMPLE_DOC_ID = "paper:sample-navier-stokes";

export const SAMPLE_DOC: WorkDoc = {
  id: SAMPLE_DOC_ID,
  kind: "paper",
  title: "On the Navier-Stokes Millennium Prize Problem",
  authors: ["Clay Mathematics Institute", "Charles L. Fefferman"],
  year: "2000",
  source: "arxiv",
  url: "https://www.claymath.org/millennium-problems/navier-stokes-equation/",
  abstract:
    "The Navier-Stokes equations describe the motion of fluids (liquids and gases). The challenge is to make substantial mathematical progress toward a mathematical theory which might unlock the ease with which nature produces solutions, or prove that smooth, physically reasonable solutions do not always exist in three dimensions.",
  body: `# On the Navier-Stokes Millennium Prize Problem

> **Authors:** Charles L. Fefferman (Clay Mathematics Institute)  
> **Field:** Mathematical Physics / Nonlinear Partial Differential Equations  
> **Source:** Clay Millennium Prize Benchmark

---

## 1. Physical Statement

The motion of an incompressible fluid in three-dimensional space $\\mathbb{R}^3$ is governed by the classical **Navier-Stokes equations**:

$$
\\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u} \\cdot \\nabla)\\mathbf{u} = -\\frac{1}{\\rho}\\nabla p + \\nu \\nabla^2 \\mathbf{u} + \\mathbf{f}(\\mathbf{x}, t)
$$

subject to the divergence-free incompressibility condition:

$$
\\nabla \\cdot \\mathbf{u} = 0
$$

where:
- $\\mathbf{u}(\\mathbf{x}, t) = (u_1, u_2, u_3)$ is the velocity vector field of the fluid,
- $p(\\mathbf{x}, t)$ is the scalar pressure field,
- $\\rho > 0$ is the constant fluid density,
- $\\nu > 0$ is the kinematic viscosity,
- $\\mathbf{f}(\\mathbf{x}, t)$ is an externally applied body force.

---

## 2. The Millennium Problem

For physically realistic initial velocity $\\mathbf{u}_0(\\mathbf{x})$ that is smooth ($C^\\infty$) and satisfies finite energy:

$$
\\int_{\\mathbb{R}^3} |\\mathbf{u}_0(\\mathbf{x})|^2 \\, d\\mathbf{x} < \\infty
$$

do smooth, physically reasonable solutions exist globally for all time $t \\ge 0$, or can the nonlinear vortex stretching term:

$$
(\\mathbf{u} \\cdot \\nabla)\\mathbf{u}
$$

concentrate vorticity $\\boldsymbol{\\omega} = \\nabla \\times \\mathbf{u}$ into finite-time blow-up singularities?

---

## 3. Socratic Discussion Questions

1. **Analogical Lens**: What is a structural analogue to vortex stretching in non-fluid dynamical systems (e.g. gravitational collapse, economic cascades, or wave turbulence)?
2. **Systems Lens**: How does the feedback loop between velocity gradients and energy dissipation prevent or permit finite-time singularities?
`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/** Put the sample document into Dexie library and return it. */
export async function loadSampleDoc(): Promise<WorkDoc> {
  await putDoc(SAMPLE_DOC);
  return SAMPLE_DOC;
}

