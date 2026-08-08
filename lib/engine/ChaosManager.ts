import { CHAOS_EVENTS } from "../constants";
import type { ActiveChaosEvent } from "./types";

const MIN_INTERVAL = 15000;
const MAX_INTERVAL = 30000;
const INTERVAL_DECREASE = 500;

export function getNextChaosInterval(gameTimeMs: number): number {
  const decrease = Math.floor(gameTimeMs / 60000) * INTERVAL_DECREASE;
  const range = Math.max(8000, MAX_INTERVAL - decrease - MIN_INTERVAL);
  return MIN_INTERVAL + Math.random() * range;
}

export function pickRandomChaosEvent(
  excludeIds: string[] = []
): (typeof CHAOS_EVENTS)[number] | null {
  const available = CHAOS_EVENTS.filter((e) => !excludeIds.includes(e.id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function createActiveChaosEvent(
  event: (typeof CHAOS_EVENTS)[number]
): ActiveChaosEvent {
  return {
    id: event.id,
    message: event.message,
    roomId: event.roomId,
    effect: event.effect as ActiveChaosEvent["effect"],
    endTime: Date.now() + event.duration,
  };
}
