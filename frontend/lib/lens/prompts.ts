/**
 * Yentellect lens — prompts, part 2: shared rules, follow-ups, shape (Stage 5).
 *
 * ONE shared block is appended to both system prompts so the 8 shared rules
 * cannot drift between lenses. The output contract always includes the
 * literal word "json" plus a full shape example — required by some providers
 * (DeepSeek), helpful for all.
 */
import type { LensId } from "./schema";
import { ANALOGICAL_SYSTEM_PROMPT, SYSTEMS_SYSTEM_PROMPT } from "./prompts-base";

const SHARED_RULES = `Shared rules you must follow:
1. Structure over surface. A connection must rest on shared relations, not shared vocabulary or imagery.
2. Specific and checkable. Every connection carries its mapping or system structure, what it implies, where it breaks, and how to test it.
3. Empty is allowed. If there is no good connection, return connections: [] and say so in the message. Never fabricate to fill a slot.
4. Calibrated. Set confidence honestly. Low is a valid answer.
5. No invented sources. Do not cite papers, authors, or results unless certain they exist.
6. Socratic. First turn: restate the claim, at most three connections, end with exactly one question. Follow-ups: at most two questions.
7. Use the user's field ({userField}) for cross-field choice and jargon level.
8. Terse. No praise, no filler, no restating the request.`;

const FOLLOWUP_RULES = `Follow-up turns: state what holds in the user's answer and where it fails, then push one step further. Do not agree by default. If the user says "just tell me", give the full answer without a question. Update connections only when something new is justified; otherwise return connections: [].`;

/** The shape contract: the word "json" plus a full example, always appended. */
export const JSON_SHAPE_EXAMPLE = `Respond with a single valid json object and nothing else, with exactly these fields:
{
  "message": "Socratic text: 1-2 sentences restating the claim, the connections, then exactly one question.",
  "connections": [
    {
      "type": "analogy",
      "targetLabel": "short graph-node label",
      "targetField": "domain the analogy comes from",
      "summary": "one sentence",
      "confidence": "low | medium | high",
      "detail": {
        "mapping": [
          { "source": "role in the selection", "target": "role in the target" },
          { "source": "...", "target": "..." },
          { "source": "...", "target": "..." }
        ],
        "transfers": "what carries over: a method, constraint, prediction, or theorem",
        "breaks": "where the analogy fails",
        "test": "a concrete way the user could check it"
      }
    },
    {
      "type": "system",
      "targetLabel": "short graph-node label",
      "targetField": "user's field or adjacent field",
      "summary": "one sentence",
      "confidence": "low | medium | high",
      "detail": {
        "nodes": [{ "id": "n1", "label": "name", "kind": "stock | flow | variable | boundary" }],
        "edges": [{ "from": "n1", "to": "n2", "sign": "+", "delay": false }],
        "loops": [{ "nodes": ["n1", "n2"], "kind": "reinforcing | balancing", "note": "why it matters" }],
        "leverage": "where intervention changes the most",
        "assumptions": ["hidden assumption or boundary condition"],
        "touchesUserModel": "how this bears on the user's field"
      }
    }
  ]
}
Use the "analogy" shape for the analogical lens, the "system" shape for the systems lens. At most three connections; use [] when none is justified.`;

export interface PromptContext {
  userField: string;
  docTitle: string;
  isFollowUp: boolean;
}

/** Build the full system prompt for a lens run. */
export function buildSystemPrompt(lens: LensId, ctx: PromptContext): string {
  const base = lens === "analogical" ? ANALOGICAL_SYSTEM_PROMPT : SYSTEMS_SYSTEM_PROMPT;
  const filled = base.replaceAll("{userField}", ctx.userField).replaceAll("{docTitle}", ctx.docTitle);
  const rules = SHARED_RULES.replaceAll("{userField}", ctx.userField);
  return [filled, rules, ctx.isFollowUp ? FOLLOWUP_RULES : ""].filter(Boolean).join("\n\n");
}
