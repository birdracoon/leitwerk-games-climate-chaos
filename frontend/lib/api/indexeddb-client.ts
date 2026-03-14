import type { SessionResponse, LeaderboardEntry } from "./client";

const DB_NAME = "leitwerk-game";
const DB_VERSION = 1;
const STORE_SESSIONS = "sessions";
const STORE_SCORES = "scores";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: "token" });
      }
      if (!db.objectStoreNames.contains(STORE_SCORES)) {
        const scoreStore = db.createObjectStore(STORE_SCORES, {
          autoIncrement: true,
        });
        scoreStore.createIndex("totalScore", "totalScore", { unique: false });
      }
    };
  });
}

export async function createSession(playerName: string): Promise<SessionResponse> {
  const token = crypto.randomUUID();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, "readwrite");
    const store = tx.objectStore(STORE_SESSIONS);
    store.put({ token, playerName, createdAt: Date.now() });
    tx.oncomplete = () => {
      db.close();
      resolve({ token, playerName });
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function startGame(_token: string): Promise<void> {
  // No-op: kein serverseitiger State noetig
}

export async function submitScore(
  token: string,
  survivalTimeSeconds: number,
  efficiencyQuotient: number
): Promise<void> {
  const db = await openDb();
  const playerName = await new Promise<string>((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, "readonly");
    const store = tx.objectStore(STORE_SESSIONS);
    const req = store.get(token);
    req.onsuccess = () => {
      const session = req.result as { playerName: string } | undefined;
      resolve(session?.playerName ?? "Unbekannt");
    };
    req.onerror = () => reject(req.error);
  });

  const totalScore = Math.floor(survivalTimeSeconds * efficiencyQuotient);
  const entry = {
    playerName,
    totalScore,
    survivalTimeSeconds,
    efficiencyQuotient,
    submittedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SCORES, "readwrite");
    const store = tx.objectStore(STORE_SCORES);
    store.add(entry);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getLeaderboard(top = 10): Promise<LeaderboardEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SCORES, "readonly");
    const store = tx.objectStore(STORE_SCORES);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = req.result as Array<{
        playerName: string;
        totalScore: number;
        survivalTimeSeconds: number;
        efficiencyQuotient: number;
      }>;
      const all = rows
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, top)
        .map((r) => ({
          playerName: r.playerName,
          totalScore: r.totalScore,
          survivalTimeSeconds: r.survivalTimeSeconds,
          efficiencyQuotient: r.efficiencyQuotient,
        }));
      db.close();
      resolve(all);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}
