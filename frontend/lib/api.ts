/**
 * Typed API client for Yentellect backend.
 * 
 * SECURITY: All authenticated requests derive user identity from the
 * Supabase access token in the Authorization header. The backend
 * never trusts user IDs sent by the client; it verifies ownership
 * against the token's `sub` claim server-side.
 */

import { createClient } from "@/utils/supabase/client";

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
  title?: string;
  summary?: string;
  response: string;
  mode_target: ThinkingMode;
  turn_count: number;
  predicted_mode: ThinkingMode;
  confidence: number;
  signal_vector: SignalVector;
}

export interface TurnResponse {
  session_id: string;
  title?: string;
  summary?: string;
  response: string;
  predicted_mode: ThinkingMode;
  confidence: number;
  signal_vector: SignalVector;
  turn_count: number;
}

export interface SessionEndResponse {
  session_id: string;
  title?: string;
  narrative?: string;
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

export type CognitiveRegime =
  | "INACTIVE"
  | "FIXATED"
  | "COMPARTMENTALIZED"
  | "RIGID_ROUTINE"
  | "INTEGRATED";

export interface GraphDiagnostics {
  regime: CognitiveRegime;
  H_c: number;
  H_c_norm: number;
  h_rate: number;
  h_rate_norm: number;
  lambda_2: number;
  num_components: number;
}

export interface RecommendedBridge {
  node_u: string;
  node_v: string;
  node_u_name: string;
  node_v_name: string;
  fiedler_gap: number;
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
    type?: "concept" | "session" | "fusion";
    sessionId?: string;
    fusionParentIds?: string[];
    modeTarget?: string;
    status?: string;
    turnCount?: number;
  }>;
  links: Array<{
    source: string;
    target: string;
    weight: number;
    connectionCount: number;
    lastActivated: string;
    type?: "reinforcement" | "produced" | "fusion" | "similarity" | "spectral_bridge";
  }>;
  diagnostics?: GraphDiagnostics | null;
  recommendedBridge?: RecommendedBridge | null;
}

export interface SessionMetrics {
  metrics: Array<{
    metric_id: string;
    session_id: string;
  title?: string;
  summary?: string;
    modes_activated: string | string[];
    concepts_added: number;
    bridges_formed: number;
    session_duration_seconds: number;
    mode_scores: string | Record<string, number>;
    overall_score: number;
    created_at: string;
  }>;
}

export interface ModeScore {
  mode: ThinkingMode;
  label: string;
  score: number;
  color: string;
  sessions: number;
}

export interface CognitiveFingerprint {
  user_id: string;
  scores: ModeScore[];
  dominant: ThinkingMode | null;
  weakest: ThinkingMode | null;
  improvement_rate: number;
  total_sessions: number;
  total_concepts: number;
  total_connections: number;
  domains: string[];
}

export interface SessionSummary {
  session_id: string;
  title?: string;
  summary?: string;
  created_at: string;
  mode_target: ThinkingMode;
  modes_activated: string[];
  overall_score: number;
  concepts_added: number;
  bridges_formed: number;
  duration_minutes: number;
  turn_count: number;
}

export interface DashboardData {
  fingerprint: CognitiveFingerprint | null;
  recent_sessions: SessionSummary[];
  daily_suggestion: {
    suggested_mode: ThinkingMode;
    reason: string;
  };
  streak_days: number;
  last_session_date: string | null;
}

export interface SessionDetailResponse {
  session: {
    session_id: string;
  title?: string;
  summary?: string;
    user_id: string;
    mode_target: ThinkingMode;
    predicted_mode: ThinkingMode;
    status: string;
    turn_count: number;
    started_at: string;
    ended_at: string | null;
  };
  turns: {
    turn_id: string;
    turn_number: number;
    user_input: string;
    response: string;
    predicted_mode: string;
    confidence: number;
    created_at: string;
  }[];
}

export interface SessionHistoryResponse {
  sessions: SessionSummary[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    return data.session.access_token;
  }
  return "guest_token";
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user?.id) {
    return data.user.id;
  }
  if (typeof window !== "undefined") {
    let guestId = localStorage.getItem("yentellect_guest_id");
    if (!guestId) {
      guestId = "00000000-0000-4000-8000-000000000001";
      localStorage.setItem("yentellect_guest_id", guestId);
    }
    return guestId;
  }
  return "00000000-0000-4000-8000-000000000001";
}

async function getSafeApiError(response: Response): Promise<string> {
  // Use generic error messages to prevent information leakage
  if (response.status === 401) return "Please sign in again.";
  if (response.status === 403) return "You do not have access to this resource.";
  if (response.status === 404) return "The requested resource was not found.";
  if (response.status === 429) return "Too many requests. Please wait and try again.";
  if (response.status >= 500) return "The service is temporarily unavailable. Please try again.";

  try {
    const body = await response.json();
    const detail = typeof body?.detail === "string" ? body.detail : null;
    // Only return specific error messages if they're safe (not containing secrets)
    if (detail && detail.length <= 140 && !/(secret|token|key|password|https?:\/\/|api_key)/i.test(detail)) {
      return detail;
    }
  } catch {
    // Ignore parse errors and use a generic message below.
  }

  return "Request failed. Please try again.";
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(await getSafeApiError(response));
  }

  return response.json();
}

export async function startSession(
  openingMessage: string
): Promise<SessionStartResponse> {
  const userId = await getCurrentUserId();
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

export async function getProfile(): Promise<CognitiveProfile> {
  const userId = await getCurrentUserId();
  return fetchJson<CognitiveProfile>(`/profile/${userId}`);
}

export async function getProfileMetrics(
  limit = 20
): Promise<SessionMetrics> {
  const userId = await getCurrentUserId();
  return fetchJson<SessionMetrics>(`/profile/${userId}/metrics?limit=${limit}`);
}

export async function getGraph(): Promise<D3GraphData> {
  const userId = await getCurrentUserId();
  return fetchJson<D3GraphData>(`/graph/${userId}`);
}

export async function getDashboard(): Promise<DashboardData> {
  const userId = await getCurrentUserId();
  return fetchJson<DashboardData>(`/dashboard/${userId}`);
}

export async function getFingerprint(): Promise<CognitiveFingerprint> {
  const userId = await getCurrentUserId();
  return fetchJson<CognitiveFingerprint>(`/dashboard/fingerprint/${userId}`);
}

export async function getSessionHistory(
  page = 1,
  limit = 20
): Promise<SessionHistoryResponse> {
  const userId = await getCurrentUserId();
  return fetchJson<SessionHistoryResponse>(
    `/dashboard/history/${userId}?page=${page}&limit=${limit}`
  );
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

export function getModeName(mode?: ThinkingMode | string): string {
  if (!mode) return "General";
  const upper = mode.toUpperCase().trim();
  const names: Record<string, string> = {
    CONVERGENT: "Convergent",
    DIVERGENT: "Divergent",
    ANALOGICAL: "Analogical",
    METACOGNITIVE: "Metacognitive",
    SYSTEMS: "Systems",
    DMN: "Default Mode (DMN)",
  };
  return names[upper] || (mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase());
}

export async function getSession(sessionId: string): Promise<SessionDetailResponse> {
  return fetchJson<SessionDetailResponse>(`/sessions/${sessionId}`);
}

export async function getSessionMetrics(): Promise<SessionMetrics> {
  const userId = await getCurrentUserId();
  return fetchJson<SessionMetrics>(`/sessions/metrics?user_id=${userId}`);
}

export interface FusionResponse {
  fusion_concept_id: string;
  name: string;
  domain: string;
  description?: string;
  emergentProperty?: string;
  isomorphismMapping?: string;
  falsifiableTest?: string;
  is_fusion: boolean;
  fusion_parent_ids: string[];
  thinkingMode: ThinkingMode;
}

export interface SynthesizedConceptResponse {
  fusionConceptId: string;
  name: string;
  domain: string;
  description?: string;
  emergentProperty?: string;
  isomorphismMapping?: string;
  falsifiableTest?: string;
  thinkingMode: ThinkingMode;
  fusionParentIds?: string[];
  coarsening?: {
    regime: CognitiveRegime;
    lambda2: number;
    entropy: number;
    theoreticalDrop: number;
  };
}

export async function fuseSessions(
  sessionAId: string,
  sessionBId: string
): Promise<FusionResponse> {
  return fetchJson<FusionResponse>("/graph/fuse", {
    method: "POST",
    body: JSON.stringify({
      session_a_id: sessionAId,
      session_b_id: sessionBId,
    }),
  });
}

export async function synthesizeConcepts(
  userId: string,
  nodeUId: string,
  nodeVId: string,
  coarsen: boolean = true
): Promise<SynthesizedConceptResponse> {
  return fetchJson<SynthesizedConceptResponse>("/graph/synthesize", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      node_u_id: nodeUId,
      node_v_id: nodeVId,
      coarsen,
    }),
  });
}
