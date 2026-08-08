const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5224";

export interface SessionResponse {
  token: string;
  playerName: string;
}

export interface LeaderboardEntry {
  playerName: string;
  totalScore: number;
  survivalTimeSeconds: number;
  efficiencyQuotient: number;
}

const FETCH_TIMEOUT_MS = 10000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function createSession(playerName: string): Promise<SessionResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerName }),
  });
  if (!res.ok) throw new Error("Session konnte nicht erstellt werden");
  return res.json();
}

export async function startGame(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/game/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Spiel konnte nicht gestartet werden");
}

export async function submitScore(
  token: string,
  survivalTimeSeconds: number,
  efficiencyQuotient: number
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      survivalTimeSeconds,
      efficiencyQuotient,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Score konnte nicht eingereicht werden");
  }
}

export async function getLeaderboard(top = 10): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_BASE}/api/leaderboard?top=${top}`);
  if (!res.ok) throw new Error("Leaderboard konnte nicht geladen werden");
  return res.json();
}
