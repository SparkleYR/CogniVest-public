// CogniVest API utilities — targets FastAPI backend at localhost:8000
const API_BASE = "http://localhost:8000/api/v1";

// ── Types ──────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  state: "free_chat" | "onboarding";
  details_complete: boolean;
  user_details?: {
    name: string;
    email: string;
    age: string;
    income_net_worth: string;
    investment_goals: string;
    risk_tolerance: string;
  } | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse {
  status: string;
  user_id: string;
  role: "client" | "advisor";
  profile_id: string;
  access_token: string;
  refresh_token: string;
  name: string;
}

export interface SignupResponse {
  status: string;
  user_id: string;
  client_id?: string;
  advisor_id?: string;
  role: "client" | "advisor";
  message: string;
}

export interface UserProfile {
  user_id: string;
  role: "client" | "advisor";
  email: string;
  client?: {
    client_id: string;
    client_name: string;
    age: number | null;
    city: string | null;
    risk_label: string | null;
    goal_score: number | null;
    income_net_worth: string | null;
    investment_goals: string | null;
    status: string;
    engine_done: boolean;
    advisor_id?: string;
  };
  advisor?: {
    advisor_id: string;
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
    ria_number: string | null;
    is_active: boolean;
  };
}

// ── Advisor types ──────────────────────────────────────────────────

export interface AdvisorClient {
  client_id: string;
  client_name: string | null;
  age: number | null;
  occupation: string | null;
  city: string | null;
  risk_label: string | null;
  goal_score: number | null;
  critical_flags: number;
  panic_threshold_pct: number | null;
  behaviour_cost_10yr: number | null;
  total_current_value: number | null;
  xirr_pct: number | null;
  status: "new" | "active" | "review_due" | "churned";
  engine_done: boolean;
  twin_computed_at: string | null;
}

// ── Chat API ───────────────────────────────────────────────────────

export async function sendChatMessage(
  messages: ChatMessage[]
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Chat request failed");
  }
  return res.json();
}

export async function streamChatMessage(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onDone: (meta: {
    state: string;
    details_complete: boolean;
    user_details?: ChatResponse["user_details"];
  }) => void,
  onError: (err: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).detail || "Stream request failed");
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneFired = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data) continue;
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (parsed.error) { onError(String(parsed.error)); return; }
        if (parsed.done) {
          doneFired = true;
          onDone({
            state: String(parsed.state ?? "free_chat"),
            details_complete: Boolean(parsed.details_complete),
            user_details: (parsed.user_details as ChatResponse["user_details"]) ?? null,
          });
          return;
        }
        if (parsed.token) onToken(String(parsed.token));
      } catch { /* skip malformed chunks */ }
    }
  }

  // Fallback: stream closed without a done event — prevent UI from getting stuck
  if (!doneFired) {
    onDone({ state: "free_chat", details_complete: false, user_details: null });
  }
}

// ── Deep Onboarding API ────────────────────────────────────────────

export interface DeepOnboardingDoneEvent {
  done: true;
  details_complete: boolean;
  raw_profile?: Record<string, unknown>;
  behaviour_vectors?: unknown[];
}

export async function streamDeepOnboarding(
  clientId: string,
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onDone: (meta: DeepOnboardingDoneEvent) => void,
  onError: (err: string) => void,
  onStatus?: (status: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/deep-onboarding/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, messages }),
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    onError((err as Record<string, string>).detail || "Stream failed");
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneFired = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data) continue;
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (parsed.error) { onError(String(parsed.error)); return; }
        if (parsed.done) {
          doneFired = true;
          onDone({
            done: true,
            details_complete: Boolean(parsed.details_complete),
            raw_profile: parsed.raw_profile as Record<string, unknown> | undefined,
            behaviour_vectors: parsed.behaviour_vectors as unknown[] | undefined,
          });
          return;
        }
        if (parsed.status) { onStatus?.(String(parsed.status)); continue; }
        if (parsed.token) onToken(String(parsed.token));
      } catch { /* skip malformed */ }
    }
  }
  if (!doneFired) onDone({ done: true, details_complete: false });
}

export async function completeOnboarding(
  rawProfile: Record<string, unknown>
): Promise<{ run_id: string }> {
  const token = localStorage.getItem("cv_access_token") ?? "";
  const res = await fetch(`${API_BASE}/onboarding/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(rawProfile),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "Onboarding completion failed");
  return json;
}

export async function pollEngineDone(
  onReady: () => void,
  onTimeout: () => void,
  intervalMs = 3000,
  maxMs = 600000
): Promise<void> {
  const deadline = Date.now() + maxMs;
  const tick = async () => {
    if (Date.now() > deadline) { onTimeout(); return; }
    try {
      const profile = await getMe();
      if (profile?.client?.engine_done) { onReady(); return; }
    } catch { /* ignore — keep polling */ }
    setTimeout(tick, intervalMs);
  };
  setTimeout(tick, intervalMs);
}

// ── Auth API ───────────────────────────────────────────────────────

export async function signupClient(data: {
  name: string;
  email: string;
  password: string;
  age?: string;
  income_net_worth?: string;
  investment_goals?: string;
  risk_tolerance?: string;
}): Promise<SignupResponse> {
  const res = await fetch(`${API_BASE}/auth/signup/client`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "Signup failed");
  return json;
}

export async function signupAdvisor(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  city?: string;
  ria_number?: string;
}): Promise<SignupResponse> {
  const res = await fetch(`${API_BASE}/auth/signup/advisor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "Signup failed");
  return json;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "Login failed");

  // Store tokens
  localStorage.setItem("cv_access_token", json.access_token);
  localStorage.setItem("cv_refresh_token", json.refresh_token);
  localStorage.setItem("cv_user_role", json.role);
  localStorage.setItem("cv_user_name", json.name);
  localStorage.setItem("cv_profile_id", json.profile_id);

  return json;
}

export async function getMe(): Promise<UserProfile | null> {
  const token = localStorage.getItem("cv_access_token");
  if (!token) return null;

  try {
    const res = await fetch(
      `${API_BASE}/auth/me?access_token=${encodeURIComponent(token)}`
    );
    if (!res.ok) {
      logout();
      return null;
    }
    return res.json();
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("cv_access_token");
  localStorage.removeItem("cv_refresh_token");
  localStorage.removeItem("cv_user_role");
  localStorage.removeItem("cv_user_name");
  localStorage.removeItem("cv_profile_id");
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem("cv_access_token");
}

export function getStoredRole(): string | null {
  return localStorage.getItem("cv_user_role");
}

export function getStoredName(): string | null {
  return localStorage.getItem("cv_user_name");
}

// ── Twin Output types ───────────────────────────────────────────────

export interface TwinClientSummary {
  client_id: string;
  name: string;
  age: number;
  city: string;
  occupation: string;
  monthly_income: number;
  monthly_surplus: number;
  risk_label: string;
  twin_confidence: number;
  status: string;
  primary_concern: string;
}

export interface TwinHolding {
  name: string;
  asset_class: string;
  sub_type?: string;
  current_value: number;
  purchase_value?: number;
  gain_pct: number;
  weight_pct: number;
  holding_days?: number;
}

export interface TwinPortfolioSnapshot {
  total_invested: number;
  total_current_value: number;
  total_gain: number;
  abs_return_pct: number;
  xirr_pct: number;
  nifty_alpha_pp: number;
  asset_allocation: Record<string, number>;
  equity_cap_split: Record<string, number>;
  hhi_concentration: number;
  hhi_interpretation?: string;
  volatility_pct: number;
  var_95_1day_pct: number;
  shock_loss_20pct_inr: number;
  holdings: TwinHolding[];
}

export interface TwinBehaviourProfile {
  loss_aversion: number;
  panic_threshold_pct: number;
  patience_score: number;
  recency_bias: number;
  overconfidence: number;
  anchoring_strength: number;
  herding_tendency: number;
  primary_goal: string;
  goal_horizon_years: number;
  goal_confidence: number;
  anxiety_triggers: string[];
  positive_signals: string[];
  key_quotes: string[];
  simulation: {
    rational_median_10yr: number;
    behavioural_median_10yr: number;
    wealth_gap_inr: number;
    panic_rate_pct: number;
    p10_outcome: number;
    p90_outcome: number;
    percentile_series?: PercentileSeries;
    panic_events?: Array<{ year: number; drawdown_pct: number; value: number; cost: number; reentry_year: number | null }>;
    years?: number;
  };
  behaviour_cost_10yr_inr: number;
}

export interface PercentileSeries {
  years: number[];
  rational: { p10: number[]; p25: number[]; p50: number[]; p75: number[]; p90: number[] };
  behavioural: { p10: number[]; p25: number[]; p50: number[]; p75: number[]; p90: number[] };
}

export interface TwinGoal {
  goal_id: string;
  goal_type: string;
  goal_label: string;
  priority: number;
  horizon_years: number;
  target_today: number;
  target_inflation_adj: number;
  current_corpus: number;
  corpus_at_goal: number;
  monthly_sip: number;
  sip_future_value: number;
  total_projected: number;
  gap: number;
  sip_needed: number;
  sip_gap: number;
  on_track: boolean;
  feasibility_score: number;
  feasibility_label: string;
  return_assumption: number;
  advisor_note: string;
}

export interface TwinGoalSummary {
  overall_score: number;
  overall_verdict: string;
  total_sip_needed: number;
  total_sip_current: number;
  total_sip_gap: number;
  surplus_after_goals: number;
  emergency_fund_status: { current_months?: number; target_months?: number; status?: string; advised_amount?: number } | string;
  recommended_actions: { action: string; message: string; urgency: string }[];
}

export interface TwinFund {
  fund_name: string;
  category: string;
  asset_class?: string;
  allocation_pct: number;
  monthly_sip: number;
  tax_benefit: string;
  lock_in_years: number;
  why?: string;
}

export interface TwinTaxSavingProduct {
  product: string;
  monthly: number;
  annual: number;
  tax_saving: number;
  section: string;
  lock_in: number;
}

export interface TwinRecommendedPortfolio {
  allocation: { equity: number; debt: number; gold: number; liquid: number };
  total_monthly_sip: number;
  funds: TwinFund[];
  tax_saving_products: TwinTaxSavingProduct[];
  elss_sip: number;
  nps_monthly: number;
  ppf_annual: number;
  allocation_rationale: string;
  assumptions?: string[];
  disclaimers?: string[];
}

export interface TwinInsuranceFlag {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
}

export interface TwinInsurance {
  term: {
    recommended_cover: number;
    current_cover: number;
    coverage_gap: number;
    human_life_value: number;
    adequately_covered?: boolean;
  };
  health: {
    recommended_cover: number;
    current_cover: number;
    coverage_gap: number;
    adequately_covered?: boolean;
  };
  adequacy_score: number;
  flags: TwinInsuranceFlag[];
  action_items: { action: string; message: string; urgency: string }[];
}

export interface TwinTaxActionItem {
  action: string;
  message: string;
  saving_inr?: number;
  urgency: string;
}

export interface TwinTax {
  annual_income: number;
  tax_bracket: number;
  current_regime: string;
  optimal_regime: string;
  regime_saving_inr: number;
  total_80c_available: number;
  total_80c_utilised: number;
  total_80c_gap: number;
  total_potential_tax_saving: number;
  action_items: TwinTaxActionItem[];
}

export interface TwinFlag {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
}

export interface TwinOutput {
  client_summary: TwinClientSummary;
  portfolio_snapshot: TwinPortfolioSnapshot;
  behaviour_profile: TwinBehaviourProfile;
  goals: TwinGoal[];
  goal_summary: TwinGoalSummary;
  recommended_portfolio: TwinRecommendedPortfolio;
  insurance: TwinInsurance;
  tax: TwinTax;
  liabilities: {
    total_debt: number;
    home_loan?: number;
    credit_card?: number;
    foir_pct?: number;
    debt_concern_flag?: boolean;
  };
  succession: {
    has_will: boolean;
    nominees_updated: boolean;
    flags: string[];
  };
  flags: TwinFlag[];
  advisor_talking_points: string[];
  computed_at: string;
}

// ── Advisor API ─────────────────────────────────────────────────────

export async function getAdvisorClients(
  advisorId: string
): Promise<AdvisorClient[]> {
  const res = await fetch(`${API_BASE}/advisor/${advisorId}/clients`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).detail || "Failed to fetch clients");
  }
  return res.json();
}

export async function getClientTwin(
  advisorId: string,
  clientId: string
): Promise<TwinOutput> {
  const res = await fetch(
    `${API_BASE}/advisor/${advisorId}/client/${clientId}/twin`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as Record<string, string>).detail || "Failed to fetch client twin"
    );
  }
  return res.json();
}

// ── Twin Persona Chat (streaming) ──────────────────────────────────

export interface TwinCitation {
  vector_id: string;
  similarity: number;
  scenario_text: string;
  client_reaction: string;
  emotional_state: string;
  verbatim_quote: string;
  bias_tags: string[];
  intensity: number;
}

export interface TwinDoneMeta {
  citations: TwinCitation[];
  temperature: number;
  advisor_command?: boolean;
}

export async function streamTwinChat(
  advisorId: string,
  clientId: string,
  messages: { role: string; content: string }[],
  temperature: number,
  onToken: (token: string) => void,
  onDone: (meta: TwinDoneMeta) => void,
  onError: (err: string) => void
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/advisor/${advisorId}/client/${clientId}/twin/stream`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, temperature }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).detail || "Twin stream failed");
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneFired = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data) continue;
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (parsed.error) { onError(String(parsed.error)); return; }
        if (parsed.done) {
          doneFired = true;
          onDone({
            citations:       (parsed.citations as TwinCitation[]) ?? [],
            temperature:     Number(parsed.temperature ?? 0.5),
            advisor_command: Boolean(parsed.advisor_command),
          });
          return;
        }
        if (parsed.token) onToken(String(parsed.token));
      } catch { /* skip malformed */ }
    }
  }

  if (!doneFired) onDone({ citations: [], temperature });
}

export async function streamClientChat(
  clientId: string,
  messages: { role: string; content: string }[],
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/client/${clientId}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    onError((err as Record<string, string>).detail || "Request failed");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneFired = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data) continue;
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (parsed.error) { onError(String(parsed.error)); return; }
        if (parsed.done) { doneFired = true; onDone(); return; }
        if (parsed.token) onToken(String(parsed.token));
      } catch { /* skip malformed */ }
    }
  }

  if (!doneFired) onDone();
}

export async function askTwin(
  advisorId: string,
  clientId: string,
  question: string
): Promise<{ response: string }> {
  const res = await fetch(
    `${API_BASE}/advisor/${advisorId}/client/${clientId}/query`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as Record<string, string>).detail || "Failed to query twin"
    );
  }
  return res.json();
}

// ── Voice transcription ─────────────────────────────────────────────
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", audioBlob, "audio.webm");
  const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).detail || "Transcription failed");
  }
  const data = await res.json();
  return data.text as string;
}


// ── Market News ───────────────────────────────────────────────────────────────

export interface NewsItem {
  title: string;
  source: string;
  color_key: "amber" | "green" | "teal" | "accent";
  url: string;
  published_at: string; // ISO 8601
  summary: string;
}

export async function getMarketNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${API_BASE}/market-news`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
