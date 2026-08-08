import * as api from "./client";
import * as idb from "./indexeddb-client";

const isLocal = process.env.NEXT_PUBLIC_STORAGE_MODE === "local";

export const createSession = isLocal ? idb.createSession : api.createSession;
export const startGame = isLocal ? idb.startGame : api.startGame;
export const submitScore = isLocal ? idb.submitScore : api.submitScore;
export const getLeaderboard = isLocal ? idb.getLeaderboard : api.getLeaderboard;

export type { SessionResponse, LeaderboardEntry } from "./client";
