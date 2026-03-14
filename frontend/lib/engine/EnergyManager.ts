import type { SystemType, RoomId } from "../constants";
import { MAX_ENERGY, BLACKOUT_DURATION_MS } from "../constants";
import type { PipeConnection, RoomState } from "./types";

const ENERGY_PER_SYSTEM: Record<SystemType, number> = {
  heating: 12,
  cooling: 15,
  ventilation: 8,
};

const WERKSTAETTE_BASE_LOAD = 5;
const WERKSTAETTE_PER_PERSON = 2.5;

export function calculateWerkstaetteMachineLoad(
  rooms: Record<RoomId, RoomState>
): number {
  const ws = rooms.werkstaette;
  if (!ws) return 0;
  return WERKSTAETTE_BASE_LOAD + ws.peopleCount * WERKSTAETTE_PER_PERSON;
}

export function calculateEnergyUsed(
  connections: PipeConnection[],
  rooms?: Record<RoomId, RoomState>
): number {
  let total = 0;
  for (const c of connections) {
    total += (ENERGY_PER_SYSTEM[c.fromSystem] * c.powerLevel) / 100;
  }
  if (rooms) {
    total += calculateWerkstaetteMachineLoad(rooms);
  }
  return Math.min(MAX_ENERGY * 2, total);
}

export function isOverloaded(energyUsed: number): boolean {
  return energyUsed > MAX_ENERGY;
}

export function getBlackoutEndTime(): number {
  return Date.now() + BLACKOUT_DURATION_MS;
}
