import type { RoomId, SystemType } from "../constants";
import {
  OUTSIDE_TEMP,
  COMFORT_TEMP_MIN,
  COMFORT_TEMP_MAX,
  CRITICAL_TEMP_HOT,
  CRITICAL_TEMP_COLD,
  CRITICAL_AIR_MIN,
} from "../constants";
import type { RoomState, PipeConnection, ChaosEffect, CharacterState } from "./types";

const PERSON_HEAT_PER_10 = 0.02;
const PERSON_AIR_DRAIN_PER_10 = 0.06;
/** Zusaetzliche Waerme durch Rechner/Server – Computerraum braucht dauerhafte Kuehlung (~10% weniger als vorher) */
const COMPUTER_HEAT_FACTOR = 0.225;

const BASE_PEOPLE: Record<RoomId, number> = {
  turnhalle: 25,
  computerraum: 15,
  werkstaette: 20,
  lehrerzimmer: 8,
  aula: 50,
};

const STATUS_TEXTS: Record<CharacterState, (string | null)[]> = {
  normal: [null],
  overheated: [
    "Hilfe, mein Geodreieck schmilzt!",
    "Ist das hier die Sauna?!",
    "Wer hat die Sahara bestellt?",
  ],
  frozen: [
    "Meine Finger sind Eiszapfen!",
    "Zitternde Schueler ueberall!",
    "Brauche dringend heissen Kakao!",
  ],
  asleep: [
    "Zzz... Mathe war noch nie so langweilig...",
    "Synchron-Sekundenschlaf eingeleitet!",
    "Alle pennen! Luft! LUFT!",
  ],
};
const OUTSIDE_DRIFT = 0.008;
const HEATING_POWER = 0.33;
const COOLING_POWER = 0.15;
/** Erhöht, damit Lüftung bei vielen Personen (z.B. Aula 60+) mithalten kann */
const VENTILATION_AIR = 0.6;
const VENTILATION_TEMP_STABILIZE = 0.05;

export function createInitialRoomState(id: RoomId): RoomState {
  return {
    id,
    temperature: 22,
    airQuality: 55 + Math.random() * 20,
    satisfaction: 80,
    characterState: "normal",
    criticalSince: null,
    peopleCount: BASE_PEOPLE[id],
    statusText: null,
  };
}

function computeCharacterState(temp: number, air: number): CharacterState {
  if (air < CRITICAL_AIR_MIN) return "asleep";
  if (temp >= CRITICAL_TEMP_HOT) return "overheated";
  if (temp <= CRITICAL_TEMP_COLD) return "frozen";
  return "normal";
}

function computeSatisfaction(temp: number, air: number): number {
  let s = 100;
  if (temp < COMFORT_TEMP_MIN)
    s -= (COMFORT_TEMP_MIN - temp) * 5;
  else if (temp > COMFORT_TEMP_MAX)
    s -= (temp - COMFORT_TEMP_MAX) * 5;
  if (temp >= CRITICAL_TEMP_HOT || temp <= CRITICAL_TEMP_COLD)
    s -= 40;
  if (air < CRITICAL_AIR_MIN) s -= 50;
  else if (air < 50) s -= (50 - air) * 0.5;
  return Math.max(0, Math.min(100, s));
}

function pickStatusText(state: CharacterState, roomId: RoomId, now: number): string | null {
  const opts = STATUS_TEXTS[state];
  const idx = Math.floor((roomId.charCodeAt(0) + now / 3000) % 1000) % opts.length;
  return opts[idx];
}

export function tickRoomSimulation(
  room: RoomState,
  connections: PipeConnection[],
  roomConnections: PipeConnection[],
  chaosEffects: ChaosEffect[],
  systemOutages: Set<SystemType>,
  deltaMs: number,
  now: number,
  turboMultiplier = 1
): RoomState {
  const dt = deltaMs / 1000;
  let temp = room.temperature;
  let air = room.airQuality;

  const peopleDelta = chaosEffects.reduce((s, e) => s + (e.peopleDelta ?? 0), 0);
  const effectivePeople = Math.max(1, room.peopleCount + peopleDelta);
  const personFactor = effectivePeople / 10;

  temp += (OUTSIDE_TEMP - temp) * OUTSIDE_DRIFT * dt;
  temp += PERSON_HEAT_PER_10 * personFactor * dt;
  if (room.id === "computerraum") {
    temp += COMPUTER_HEAT_FACTOR * dt;
  }
  air -= PERSON_AIR_DRAIN_PER_10 * personFactor * dt;

  for (const conn of roomConnections) {
    if (systemOutages.has(conn.fromSystem)) continue;
    const p = conn.powerLevel / 100;
    switch (conn.fromSystem) {
      case "heating":
        temp += HEATING_POWER * p * dt;
        break;
      case "cooling":
        temp -= COOLING_POWER * p * dt;
        break;
      case "ventilation":
        air = Math.min(100, air + VENTILATION_AIR * p * turboMultiplier * dt);
        temp += (20 - temp) * VENTILATION_TEMP_STABILIZE * p * dt;
        break;
    }
  }

  for (const eff of chaosEffects) {
    if (eff.temperature) temp += eff.temperature * dt;
    if (eff.airQuality) air += eff.airQuality * dt;
  }

  temp = Math.max(0, Math.min(50, temp));
  air = Math.max(0, Math.min(100, air));

  const charState = computeCharacterState(temp, air);
  const satisfaction = computeSatisfaction(temp, air);
  const isCritical =
    charState !== "normal" || satisfaction < 30;
  const criticalSince =
    isCritical
      ? room.criticalSince ?? Date.now()
      : null;
  const statusText = pickStatusText(charState, room.id, now);

  return {
    ...room,
    temperature: temp,
    airQuality: air,
    satisfaction,
    characterState: charState,
    criticalSince,
    peopleCount: room.peopleCount,
    statusText,
  };
}
