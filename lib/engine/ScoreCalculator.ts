import type { RoomState } from "./types";
import type { RoomId } from "../constants";

export function calculateEfficiencyQuotient(
  rooms: Record<RoomId, RoomState>,
  energyUsed: number,
  energyBudget: number
): number {
  const roomIds = Object.keys(rooms) as RoomId[];
  const avgSatisfaction =
    roomIds.reduce((s, id) => s + rooms[id].satisfaction, 0) / roomIds.length;
  const energyRatio = energyUsed / energyBudget || 0.01;
  const raw = avgSatisfaction / 100 / Math.max(0.1, energyRatio);
  return Math.min(2, Math.max(0, raw * 0.5));
}

export function calculateTotalScore(
  survivalTimeSeconds: number,
  efficiencyQuotient: number
): number {
  return Math.floor(survivalTimeSeconds * efficiencyQuotient);
}
