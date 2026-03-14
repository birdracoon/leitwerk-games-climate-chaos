import { create } from "zustand";
import { ROOM_IDS } from "../constants";
import type { RoomId, SystemType } from "../constants";
import {
  createInitialRoomState,
  tickRoomSimulation,
} from "./RoomSimulation";
import {
  calculateEnergyUsed,
  calculateWerkstaetteMachineLoad,
  isOverloaded,
  getBlackoutEndTime,
} from "./EnergyManager";
import {
  getNextChaosInterval,
  pickRandomChaosEvent,
  createActiveChaosEvent,
} from "./ChaosManager";
import {
  CRITICAL_STATE_DURATION_MS,
  MAX_ENERGY,
  DEVICE_OVERLOAD_THRESHOLD,
  DEVICE_OVERLOAD_DURATION_MS,
  DEVICE_REPAIR_DURATION_MS,
  SYSTEM_TYPES,
} from "../constants";
import type {
  GameState as GameStateType,
  RoomState,
  PipeConnection,
  ActiveChaosEvent,
} from "./types";

export interface DragState {
  active: boolean;
  fromSystem: SystemType | null;
  currentX: number;
  currentY: number;
}

interface GameStore extends GameStateType {
  nextChaosAt: number;
  dragState: DragState | null;
  selectedMachine: SystemType | null;
  selectMachine: (system: SystemType | null) => void;
  addConnection: (from: SystemType, to: RoomId) => void;
  removeConnection: (id: string) => void;
  setPowerLevel: (id: string, level: number) => void;
  startDrag: (system: SystemType, x: number, y: number) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: (x: number, y: number, roomId?: RoomId) => void;
  tick: (deltaMs: number) => void;
  startGame: () => void;
  reset: () => void;
}

const initialRooms = Object.fromEntries(
  ROOM_IDS.map((id) => [id, createInitialRoomState(id)])
) as Record<RoomId, RoomState>;

export const useGameStore = create<GameStore>((set, get) => ({
  rooms: { ...initialRooms },
  connections: [],
  energyUsed: 0,
  energyBudget: MAX_ENERGY,
  isBlackout: false,
  blackoutUntil: null,
  activeChaosEvents: [],
  systemOutages: new Set(),
  deviceOverloadStart: {
    heating: null,
    cooling: null,
    ventilation: null,
  } as Record<SystemType, number | null>,
  brokenDevices: new Set<SystemType>(),
  deviceRepairStart: {
    heating: null,
    cooling: null,
    ventilation: null,
  } as Record<SystemType, number | null>,
  gameOver: false,
  gameOverReason: null,
  survivalTimeMs: 0,
  startTime: null,
  nextChaosAt: 0,
  dragState: null,
  selectedMachine: null,

  selectMachine: (system) => {
    set({ selectedMachine: system });
  },

  addConnection: (from, to) => {
    set((s) => {
      if (s.connections.some((c) => c.fromSystem === from && c.toRoom === to))
        return {};
      const id = `conn-${from}-${to}-${Date.now()}`;
      const conn: PipeConnection = { id, fromSystem: from, toRoom: to, powerLevel: 50 };
      return { connections: [...s.connections, conn] };
    });
  },

  removeConnection: (id) => {
    set((s) => ({
      connections: s.connections.filter((c) => c.id !== id),
    }));
  },

  setPowerLevel: (id, level) => {
    set((s) => ({
      connections: s.connections.map((c) =>
        c.id === id ? { ...c, powerLevel: Math.max(0, Math.min(100, level)) } : c
      ),
    }));
  },

  startDrag: (system, x, y) => {
    set({
      dragState: { active: true, fromSystem: system, currentX: x, currentY: y },
    });
  },

  updateDrag: (x, y) => {
    set((s) =>
      s.dragState?.active
        ? { dragState: { ...s.dragState!, currentX: x, currentY: y } }
        : {}
    );
  },

  endDrag: (x, y, roomId) => {
    const state = get();
    if (!state.dragState?.active || !state.dragState.fromSystem) {
      set({ dragState: null });
      return;
    }
    const from = state.dragState.fromSystem;
    set({ dragState: null });
    if (roomId) {
      get().addConnection(from, roomId);
    } else {
      get().selectMachine(from);
    }
  },

  startGame: () => {
    set({
      startTime: Date.now(),
      nextChaosAt: Date.now() + getNextChaosInterval(0),
      gameOver: false,
      gameOverReason: null,
    });
  },

  reset: () => {
    set({
      rooms: Object.fromEntries(
        ROOM_IDS.map((id) => [id, createInitialRoomState(id)])
      ) as Record<RoomId, RoomState>,
      connections: [],
      energyUsed: 0,
      isBlackout: false,
      blackoutUntil: null,
      activeChaosEvents: [],
      systemOutages: new Set(),
      deviceOverloadStart: {
        heating: null,
        cooling: null,
        ventilation: null,
      } as Record<SystemType, number | null>,
      brokenDevices: new Set<SystemType>(),
      deviceRepairStart: {
        heating: null,
        cooling: null,
        ventilation: null,
      } as Record<SystemType, number | null>,
      gameOver: false,
      gameOverReason: null,
      survivalTimeMs: 0,
      startTime: null,
      nextChaosAt: 0,
      selectedMachine: null,
    });
  },

  tick: (deltaMs) => {
    const state = get();
    if (state.gameOver) return;

    let {
      rooms,
      connections,
      isBlackout,
      blackoutUntil,
      activeChaosEvents,
      systemOutages,
      deviceOverloadStart,
      brokenDevices,
      deviceRepairStart,
      nextChaosAt,
    } = state;

    const now = Date.now();

    if (!isBlackout) {
      const newOverloadStart = { ...deviceOverloadStart };
      const newRepairStart = { ...deviceRepairStart };
      const newBroken = new Set(brokenDevices);
      let newConnections = connections;
      const connsBySystem = Map.groupBy(connections, (c) => c.fromSystem);

      for (const type of SYSTEM_TYPES) {
        const typeConns = connsBySystem.get(type) ?? [];
        const totalPower = typeConns.reduce((s, c) => s + c.powerLevel, 0);
        const start = newOverloadStart[type];

        if (totalPower > DEVICE_OVERLOAD_THRESHOLD) {
          if (start === null) {
            newOverloadStart[type] = now;
          } else if (now - start >= DEVICE_OVERLOAD_DURATION_MS) {
            newBroken.add(type);
            newRepairStart[type] = now;
            newOverloadStart[type] = null;
            newConnections = newConnections.map((c) =>
              c.fromSystem === type ? { ...c, powerLevel: 0 } : c
            );
          }
        } else {
          newOverloadStart[type] = null;
        }
      }

      for (const type of SYSTEM_TYPES) {
        if (newBroken.has(type) && newRepairStart[type] != null) {
          if (now - newRepairStart[type] >= DEVICE_REPAIR_DURATION_MS) {
            newBroken.delete(type);
            newRepairStart[type] = null;
          }
        }
      }

      deviceOverloadStart = newOverloadStart;
      deviceRepairStart = newRepairStart;
      brokenDevices = newBroken;
      connections = newConnections;
    }
    const survivalTimeMs = state.startTime ? now - state.startTime : 0;

    if (isBlackout && blackoutUntil && now >= blackoutUntil) {
      isBlackout = false;
      blackoutUntil = null;
      systemOutages = new Set();
    }

    const stillActive = state.activeChaosEvents.filter((e) => e.endTime > now);
    systemOutages = new Set<SystemType>();
    for (const e of stillActive) {
      if (e.effect.systemOutage) systemOutages.add(e.effect.systemOutage);
    }
    activeChaosEvents = stillActive;

    const effectiveOutages = new Set([...systemOutages, ...brokenDevices]);

    const energyUsed = isBlackout ? 0 : calculateEnergyUsed(connections, rooms);
    if (!isBlackout) {
      if (isOverloaded(energyUsed)) {
        isBlackout = true;
        blackoutUntil = getBlackoutEndTime();
        connections = connections.map((c) => ({ ...c, powerLevel: 0 }));
      } else {
        const newRooms: Record<RoomId, RoomState> = {} as Record<RoomId, RoomState>;
        const connsByRoom = Map.groupBy(connections, (c) => c.toRoom);
        for (const roomId of ROOM_IDS) {
          const room = rooms[roomId];
          const roomConns = connsByRoom.get(roomId) ?? [];
          const chaosForRoom = activeChaosEvents.filter(
            (e) =>
              (e.roomId === roomId || e.roomId === null) &&
              (e.effect.temperature || e.effect.airQuality || e.effect.peopleDelta)
          );
          const chaosEffects = chaosForRoom.map((e) => e.effect);
          newRooms[roomId] = tickRoomSimulation(
            room,
            connections,
            roomConns,
            chaosEffects,
            effectiveOutages,
            deltaMs,
            now
          );
        }
        rooms = newRooms;

        for (const room of Object.values(rooms)) {
          if (room.criticalSince && now - room.criticalSince >= CRITICAL_STATE_DURATION_MS) {
            set({
              gameOver: true,
              gameOverReason: `${room.characterState}:${room.id}`,
              survivalTimeMs,
            });
            return;
          }
        }
      }
    }

    if (now >= nextChaosAt && !isBlackout) {
      const event = pickRandomChaosEvent();
      if (event) {
        const active = createActiveChaosEvent(event);
        activeChaosEvents = [...activeChaosEvents, active];
      }
      nextChaosAt = now + getNextChaosInterval(survivalTimeMs);
    }

    set({
      rooms,
      connections,
      energyUsed: isBlackout ? 0 : energyUsed,
      isBlackout,
      blackoutUntil,
      activeChaosEvents,
      systemOutages,
      deviceOverloadStart,
      brokenDevices,
      deviceRepairStart,
      nextChaosAt,
      survivalTimeMs,
    });
  },
}));
