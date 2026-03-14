"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { Texture } from "pixi.js";
import { Assets, Texture as PixiTexture, Rectangle } from "pixi.js";

export interface CharacterTexturesMap {
  player: Texture | null;
  female: Texture | null;
  adventurer: Texture | null;
  soldier: Texture | null;
  zombie: Texture | null;
}

const CharacterTexturesContext = createContext<CharacterTexturesMap | null>(null);

const PNG_POSE_PATHS: Record<string, string[]> = {
  player: ["/kenney_platformer-characters/PNG/Player/Poses/player_idle.png"],
  female: [
    "/kenney_platformer-characters/PNG/Female/Poses/female_idle.png",
    "/kenney_platformer-characters/PNG/Woman/Poses/woman_idle.png",
  ],
  adventurer: ["/kenney_platformer-characters/PNG/Adventurer/Poses/adventurer_idle.png"],
  soldier: ["/kenney_platformer-characters/PNG/Soldier/Poses/soldier_idle.png"],
  zombie: ["/kenney_platformer-characters/PNG/Zombie/Poses/zombie_idle.png"],
};

const FALLBACK_SVG_PATHS: Record<string, string> = {
  player: "/kenney_platformer-characters/Vector/player_vector.svg",
  female: "/kenney_platformer-characters/Vector/female_vector.svg",
  adventurer: "/kenney_platformer-characters/Vector/adventurer_vector.svg",
  soldier: "/kenney_platformer-characters/Vector/soldier_vector.svg",
  zombie: "/kenney_platformer-characters/Vector/zombie_vector.svg",
};

const CHARACTER_KEYS = ["player", "female", "adventurer", "soldier", "zombie"] as const;

export function CharacterTexturesProvider({ children }: { children: ReactNode }) {
  const [textures, setTextures] = useState<CharacterTexturesMap>({
    player: null,
    female: null,
    adventurer: null,
    soldier: null,
    zombie: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCharacter(key: (typeof CHARACTER_KEYS)[number]): Promise<Texture | null> {
      const paths = PNG_POSE_PATHS[key];
      for (const path of paths) {
        try {
          const tex = (await Assets.load(path)) as Texture;
          if (cancelled) return null;
          return tex;
        } catch {
          continue;
        }
      }
      try {
        const tex = (await Assets.load(FALLBACK_SVG_PATHS[key])) as Texture;
        if (cancelled) return null;
        const w = tex.width;
        const h = tex.height;
        const frameW = Math.floor(w / 7);
        return new PixiTexture({
          source: tex.source,
          frame: new Rectangle(0, 0, frameW, h),
        });
      } catch {
        return null;
      }
    }

    async function load() {
      const texArray = await Promise.all(CHARACTER_KEYS.map((key) => loadCharacter(key)));
      if (cancelled) return;
      setTextures({
        player: texArray[0],
        female: texArray[1],
        adventurer: texArray[2],
        soldier: texArray[3],
        zombie: texArray[4],
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CharacterTexturesContext.Provider value={textures}>
      {children}
    </CharacterTexturesContext.Provider>
  );
}

export function useCharacterTextures() {
  return useContext(CharacterTexturesContext);
}

const TILESHEET_PATH = "/kenney_roguelike-indoors/Tilesheets/roguelikeIndoor_transparent.png";
const TILE_SIZE = 16;
const TILE_STRIDE = 17;

export interface RoomDekoTexturesMap {
  turnhalle: (import("pixi.js").Texture | null)[];
  computerraum: (import("pixi.js").Texture | null)[];
  werkstaette: (import("pixi.js").Texture | null)[];
  lehrerzimmer: (import("pixi.js").Texture | null)[];
  aula: (import("pixi.js").Texture | null)[];
}

const RoomDekoContext = createContext<RoomDekoTexturesMap | null>(null);

function tileFrame(col: number, row: number): Rectangle {
  return new Rectangle(col * TILE_STRIDE, row * TILE_STRIDE, TILE_SIZE, TILE_SIZE);
}

export function RoomDekoTexturesProvider({ children }: { children: ReactNode }) {
  const [deko, setDeko] = useState<RoomDekoTexturesMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const tex = (await Assets.load(TILESHEET_PATH)) as Texture;
        if (cancelled) return;
        const mk = (col: number, row: number) =>
          new PixiTexture({ source: tex.source, frame: tileFrame(col, row) });
        setDeko({
          turnhalle: [mk(2, 4), mk(5, 6)],
          computerraum: [mk(8, 5), mk(9, 5)],
          werkstaette: [mk(12, 8), mk(13, 8)],
          lehrerzimmer: [mk(3, 2), mk(4, 2)],
          aula: [mk(1, 3), mk(2, 3)],
        });
      } catch {
        if (!cancelled) setDeko(null);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <RoomDekoContext.Provider value={deko}>
      {children}
    </RoomDekoContext.Provider>
  );
}

export function useRoomDekoTextures() {
  return useContext(RoomDekoContext);
}

const FLOOR_TEXTURE_PATH = "/textures/floor_tile.png";

const FloorTextureContext = createContext<Texture | null>(null);

export function FloorTextureProvider({ children }: { children: ReactNode }) {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const tex = (await Assets.load(FLOOR_TEXTURE_PATH)) as Texture;
        if (!cancelled) setTexture(tex);
      } catch {
        try {
          const tex = (await Assets.load(TILESHEET_PATH)) as Texture;
          if (cancelled) return;
          const floorTile = new PixiTexture({
            source: tex.source,
            frame: tileFrame(1, 0),
          });
          if (!cancelled) setTexture(floorTile);
        } catch {
          if (!cancelled) setTexture(null);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <FloorTextureContext.Provider value={texture}>
      {children}
    </FloorTextureContext.Provider>
  );
}

export function useFloorTexture() {
  return useContext(FloorTextureContext);
}

const RACING_ASSETS: Record<string, string> = {
  cone: "/racing-pack/PNG/Objects/cone_straight.png",
  barrier: "/racing-pack/PNG/Objects/barrier_red.png",
};

const DEVICE_PATHS: Record<string, string> = {
  heating: "/warm.png",
  cooling: "/air-conditioner.png",
  ventilation: "/fan.png",
};

export interface DeviceTexturesMap {
  heating: Texture | null;
  cooling: Texture | null;
  ventilation: Texture | null;
}

const DeviceTexturesContext = createContext<DeviceTexturesMap | null>(null);

export function DeviceTexturesProvider({ children }: { children: ReactNode }) {
  const [textures, setTextures] = useState<DeviceTexturesMap>({
    heating: null,
    cooling: null,
    ventilation: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const results: DeviceTexturesMap = {
        heating: null,
        cooling: null,
        ventilation: null,
      };
      for (const [key, path] of Object.entries(DEVICE_PATHS)) {
        if (cancelled) return;
        try {
          results[key as keyof DeviceTexturesMap] =
            (await Assets.load(path)) as Texture;
        } catch {
          results[key as keyof DeviceTexturesMap] = null;
        }
      }
      if (!cancelled) setTextures(results);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <DeviceTexturesContext.Provider value={textures}>
      {children}
    </DeviceTexturesContext.Provider>
  );
}

export function useDeviceTextures() {
  return useContext(DeviceTexturesContext);
}

export interface RacingTexturesMap {
  cone: Texture | null;
  barrier: Texture | null;
}

const RacingTexturesContext = createContext<RacingTexturesMap | null>(null);

export function RacingTexturesProvider({ children }: { children: ReactNode }) {
  const [textures, setTextures] = useState<RacingTexturesMap>({
    cone: null,
    barrier: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const results: RacingTexturesMap = { cone: null, barrier: null };
      for (const [key, path] of Object.entries(RACING_ASSETS)) {
        if (cancelled) return;
        try {
          results[key as keyof RacingTexturesMap] =
            (await Assets.load(path)) as Texture;
        } catch {
          results[key as keyof RacingTexturesMap] = null;
        }
      }
      if (!cancelled) setTextures(results);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <RacingTexturesContext.Provider value={textures}>
      {children}
    </RacingTexturesContext.Provider>
  );
}

export function useRacingTextures() {
  return useContext(RacingTexturesContext);
}
