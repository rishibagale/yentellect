/**
 * Typed API client for Yentellect backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ThinkingMode =
  | "CONVERGENT"
  | "DIVERGENT"
  | "ANALOGICAL"
  | "METACOGNITIVE"
  | "SYSTEMS"
  | "DMN";

export interface SignalVector {
  type_token_ratio: number;
  question_density: number;
  hedge_word_rate: number;
  self_correction_rate: number;
  cross_domain_refs: number;
  first_person_rate: number;
  sentence_complexity: number;
  ideational_fluency: number;
}

export interface ConceptNode {
  id: string;
  name: string;
  domain: string;
  confidence_score: number;
  last_reinforced: string;
  session_count: number;
  thinking_mode_association: ThinkingMode;
}

export interface GraphEdge {
  source_id: string;
  target_id: string;
  weight: number;
  connection_count: number;
  last_activated: string;
}

export interface CognitiveProfile {
  user_id: string;
  name: string;
  nodes: ConceptNode[];
  edges: GraphEdge[];
  dominant_mode: ThinkingMode | null;
  weakest_mode: ThinkingMode | null;
  session_count: number;
  created_at: string;
  updated_at: string;
}

export interface SessionStartResponse {
  session_id: string;
  response: string;
  mode_target: ThinkingMode;
  turn_count: number;
  predicted_mode: ThinkingMode;
  confidence: number;
  signal_vector: SignalVector;
}

export interface TurnResponse {
  session_id: string;
  response: string;
  predicted_mode: ThinkingMode;
  confidence: number;
  signal_vector: SignalVector;
  turn_count: number;
}

export interface SessionEndResponse {
  session_id: string;
  summary: {
    modes_activated: string[];
    concepts_added: number;
    bridges_formed: number;
    session_duration_seconds: number;
    mode_scores: Record<string, number>;
    overall_score: number;
  };
  modes_activated: string[];
  concepts_added: number;
  bridges_formed: number;
  session_duration: number;
}

export interface D3GraphData {
  nodes: Array<{
    id: string;
    name: string;
    domain: string;
    confidenceScore: number;
    lastReinforced: string;
    sessionCount: number;
    thinkingMode: ThinkingMode;
    isolated: boolean;
  }>;
  links: Array<{
    source: string;
    target: string;
    weight: number;
    connectionCount: number;
    lastActivated: string;
  }>;
}

export interface SessionMetrics {
  metrics: Array<{
    metric_id: string;
    session_id: string;
    modes_activated: string;
    concepts_added: number;
    bridges_formed: number;
    session_duration_seconds: number;
    mode_scores: string;
    overall_score: number;
    created_at: string;
  }>;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function startSession(
  userId: string,
  openingMessage: string
): Promise<SessionStartResponse> {
  return fetchJson<SessionStartResponse>("/sessions/start", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      opening_message: openingMessage,
    }),
  });
}

export async function sendTurn(
  sessionId: string,
  userInput: string
): Promise<TurnResponse> {
  return fetchJson<TurnResponse>(`/sessions/${sessionId}/turn`, {
    method: "POST",
    body: JSON.stringify({ user_input: userInput }),
  });
}

export async function endSession(
  sessionId: string
): Promise<SessionEndResponse> {
  return fetchJson<SessionEndResponse>(`/sessions/${sessionId}/end`, {
    method: "POST",
  });
}

export async function getProfile(userId: string): Promise<CognitiveProfile> {
  return fetchJson<CognitiveProfile>(`/profile/${userId}`);
}

export async function getProfileMetrics(
  userId: string,
  limit = 20
): Promise<SessionMetrics> {
  return fetchJson<SessionMetrics>(`/profile/${userId}/metrics?limit=${limit}`);
}

export async function getGraph(userId: string): Promise<D3GraphData> {
  return fetchJson<D3GraphData>(`/graph/${userId}`);
}

export function getModeColor(mode: ThinkingMode): string {
  const colors: Record<ThinkingMode, string> = {
    CONVERGENT: "#3B82F6",
    DIVERGENT: "#8B5CF6",
    ANALOGICAL: "#F59E0B",
    METACOGNITIVE: "#10B981",
    SYSTEMS: "#EF4444",
    DMN: "#6366F1",
  };
  return colors[mode] || "#6B7280";
}

export function getModeName(mode: ThinkingMode): string {
  return mode.charAt(0) + mode.slice(1).toLowerCase();
}