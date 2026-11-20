/**
 * Optional backend bridge for company logos and Google Sign-In.
 *
 * The demo has no API configured, so the data URL is stored with the partner
 * record in the local demo store. When `NEXT_PUBLIC_API_URL` is set, the logo
 * is uploaded through the backend's `/uploads/logo` endpoint instead and its
 * hosted URL is saved. A failed upload falls back to the local data URL so
 * the UI keeps working offline.
 */
/** Must include the backend's /api prefix, e.g. http://localhost:4000/api */
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export async function uploadCompanyLogo(input: {
  name: string;
  dataUrl: string;
  partnerId: string;
}): Promise<string> {
  if (!API_BASE) return input.dataUrl;

  try {
    const response = await fetch(`${API_BASE}/uploads/logo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Logo upload failed (${response.status})`);
    const data = (await response.json()) as { logoUrl?: string };
    if (!data.logoUrl) throw new Error("Logo upload returned no URL");
    return data.logoUrl;
  } catch (error) {
    console.warn("Company logo upload fell back to local storage:", error);
    return input.dataUrl;
  }
}

/** Workspace account returned by the backend after register/login. */
export interface WorkspaceSession {
  token: string;
  refreshToken: string;
  user: {
    subject: string;
    role: string;
    name: string;
    email?: string;
    platformRole?: string;
    company?: string | null;
    customerId?: string | null;
  };
}

const TOKEN_KEY = "rayviq.accessToken";
const REFRESH_KEY = "rayviq.refreshToken";

/** Persist the backend session so API calls can reuse it after a refresh. */
export function saveWorkspaceSession(session: WorkspaceSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, session.token);
  window.localStorage.setItem(REFRESH_KEY, session.refreshToken);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearWorkspaceSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

/** Create a persistent workspace account in MongoDB via the backend. */
export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
  role: string;
  company: string;
  phone: string;
  city?: string;
  state?: string;
}): Promise<WorkspaceSession> {
  if (!API_BASE) {
    throw new Error("Registration needs the backend configured (NEXT_PUBLIC_API_URL).");
  }
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json().catch(() => ({}))) as WorkspaceSession & {
    detail?: string;
    errors?: Record<string, string>;
  };
  if (!response.ok) {
    const fields = data.errors ? ` (${Object.keys(data.errors).join(", ")})` : "";
    throw new Error(data.detail ? `${data.detail}${fields}` : `Registration failed (${response.status}).`);
  }
  saveWorkspaceSession(data);
  return data;
}

/** Sign in with a registered workspace account (email + password). */
export async function loginWithPassword(email: string, password: string): Promise<WorkspaceSession | null> {
  if (!API_BASE) return null;
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email, password }),
  });
  if (response.status === 401) return null; // no registered account for this email
  const data = (await response.json().catch(() => ({}))) as WorkspaceSession & { detail?: string };
  if (!response.ok) throw new Error(data.detail ?? `Sign-in failed (${response.status}).`);
  saveWorkspaceSession(data);
  return data;
}

/** Verified Google profile returned by the backend after ID-token validation. */
export interface GoogleSignInResult {
  token: string;
  refreshToken: string;
  user: { subject: string; role: string; name: string };
  profile: { email: string; name: string };
}

/** Exchange a Google ID token for the platform session via the backend. */
export async function googleSignIn(idToken: string): Promise<GoogleSignInResult> {
  if (!API_BASE) {
    throw new Error("Google Sign-In needs the API configured (NEXT_PUBLIC_API_URL).");
  }
  const response = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = (await response.json().catch(() => ({}))) as GoogleSignInResult & {
    detail?: string;
  };
  if (!response.ok) {
    throw new Error(data.detail ?? `Google Sign-In failed (${response.status}).`);
  }
  return data;
}

/** One turn of the text-only RAYVIQ assistant conversation. */
export async function sendAssistantMessage(input: {
  message: string;
  history: { role: "user" | "assistant"; text: string }[];
  role?: string;
}): Promise<string> {
  if (!API_BASE) {
    throw new Error("The AI assistant needs the backend configured (NEXT_PUBLIC_API_URL).");
  }
  const response = await fetch(`${API_BASE}/assistant/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json().catch(() => ({}))) as {
    reply?: string;
    detail?: string;
  };
  if (!response.ok) {
    throw new Error(data.detail ?? `Assistant request failed (${response.status}).`);
  }
  if (!data.reply) throw new Error("The assistant returned an empty response.");
  return data.reply;
}
