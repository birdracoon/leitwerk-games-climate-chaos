import type { RoomId, SystemType } from "../constants";

export type CharacterState = "normal" | "overheated" | "frozen" | "asleep";

export interface RoomState {
  id: RoomId;
  temperature: number;
  airQuality: number;
  satisfaction: number;
  characterState: CharacterState;
  criticalSince: number | null;
  peopleCount: number;
  statusText: string | null;
}

export interface PipeConnection {
  id: string;
  fromSystem: SystemType;
  toRoom: RoomId;
  powerLevel: number;
}

export interface ActiveChaosEvent {
  id: string;
  message: string;
  roomId: RoomId | null;
  effect: ChaosEffect;
  endTime: number;
}

export interface ChaosEffect {
  temperature?: number;
  airQuality?: number;
  systemOutage?: SystemType;
  peopleDelta?: number;
}

export interface GameState {
  rooms: Record<RoomId, RoomState>;
  connections: PipeConnection[];
  energyUsed: number;
  energyBudget: number;
  isBlackout: boolean;
  blackoutUntil: number | null;
  activeChaosEvents: ActiveChaosEvent[];
  systemOutages: Set<SystemType>;
  deviceOverloadStart: Record<SystemType, number | null>;
  brokenDevices: Set<SystemType>;
  deviceRepairStart: Record<SystemType, number | null>;
  gameOver: boolean;
  gameOverReason: string | null;
  survivalTimeMs: number;
  startTime: number | null;
}
