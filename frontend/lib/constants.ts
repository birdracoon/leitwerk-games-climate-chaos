export const BASE_PATH = "/climate-chaos";

export const ROOM_IDS = [
  "turnhalle",
  "computerraum",
  "werkstaette",
  "lehrerzimmer",
  "aula",
] as const;

export type RoomId = (typeof ROOM_IDS)[number];

export const ROOM_NAMES: Record<RoomId, string> = {
  turnhalle: "Turnhalle",
  computerraum: "Computerraum",
  werkstaette: "Werkstätte",
  lehrerzimmer: "Lehrerzimmer",
  aula: "Aula",
};

export const SYSTEM_TYPES = ["heating", "cooling", "ventilation"] as const;
export type SystemType = (typeof SYSTEM_TYPES)[number];

export const SYSTEM_NAMES: Record<SystemType, string> = {
  heating: "Wüsten-Föhn",
  cooling: "Polar-Blaster 3000",
  ventilation: "Frischwind-Turbine",
};

export const ADJECTIVES = [
  "Frostiger",
  "Glühender",
  "Turbulenter",
  "Dampfender",
  "Eisiger",
  "Brodelnder",
  "Windiger",
  "Flammender",
  "Schwitzender",
  "Zitternder",
  "Lüftiger",
  "Heißer",
];

export const NOUNS = [
  "Taschenrechner",
  "Zirkel",
  "Geodreieck",
  "Buntstift",
  "Radiergummi",
  "Overheadprojektor",
  "Schwamm",
  "Kreide",
  "Lineal",
  "Tafel",
  "Schulbuch",
  "Federmäppchen",
];

export const CHAOS_EVENTS = [
  {
    id: "turnhalle_fenster",
    message: "Der Turnlehrer hat alle Fenster aufgerissen!",
    roomId: "turnhalle" as RoomId,
    effect: { temperature: -0.5, airQuality: 0.15 },
    duration: 8000,
  },
  {
    id: "turnhalle_sportunterricht",
    message: "Doppelstunde Sport! 60 Schueler springen gleichzeitig Seil!",
    roomId: "turnhalle" as RoomId,
    effect: { temperature: 0.5, airQuality: -0.25, peopleDelta: 30 },
    duration: 8000,
  },
  {
    id: "computerraum_server",
    message: "Die Server im Informatikraum glühen!",
    roomId: "computerraum" as RoomId,
    effect: { temperature: 0.6, airQuality: -0.08 },
    duration: 6000,
  },
  {
    id: "computerraum_heizluefter",
    message: "Ein Schueler hat 3 Heizluefter im Computerraum angesteckt -- fuer seine kalten Haende!",
    roomId: "computerraum" as RoomId,
    effect: { temperature: 0.7, airQuality: -0.15 },
    duration: 6000,
  },
  {
    id: "werkstaette_schueler",
    message: "30 Schüler drängen in die Werkstätte!",
    roomId: "werkstaette" as RoomId,
    effect: { temperature: 0.25, airQuality: -0.35, peopleDelta: 30 },
    duration: 7000,
  },
  {
    id: "werkstaette_bohrmaschine",
    message: "Die Ständerbohrmaschine läuft seit Stunden – es wird heiß in der Werkstätte!",
    roomId: "werkstaette" as RoomId,
    effect: { temperature: 0.6, airQuality: -0.15 },
    duration: 10000,
  },
  {
    id: "lehrerzimmer_heizung",
    message: "Jemand hat die Heizung im Lehrerzimmer auf Maximum gedreht!",
    roomId: "lehrerzimmer" as RoomId,
    effect: { temperature: 0.5, airQuality: 0 },
    duration: 5000,
  },
  {
    id: "lehrerzimmer_fenster",
    message: "Die Fenster im Lehrerzimmer klemmen -- mal wieder!",
    roomId: "lehrerzimmer" as RoomId,
    effect: { temperature: -0.4, airQuality: -0.15 },
    duration: 8000,
  },
  {
    id: "aula_besucher",
    message: "Eine ganze Busladung Eltern stuermbt die Aula! 'Wo gibt's Kaffee?!'",
    roomId: "aula" as RoomId,
    effect: { temperature: 0.4, airQuality: -0.5, peopleDelta: 40 },
    duration: 12000,
  },
  {
    id: "feueralarm_uebung",
    message: "Feueralarm-Uebung! Alle Tueren auf! Temperatur sinkt ueberall!",
    roomId: null,
    effect: { temperature: -0.25, airQuality: 0.3 },
    duration: 6000,
  },
  {
    id: "lueftung_ausfall",
    message: "Die Lüftungsanlage macht komische Geräusche!",
    roomId: null,
    effect: { systemOutage: "ventilation" as SystemType },
    duration: 4000,
  },
] as const;

export const TICK_RATE_MS = 100;
export const OUTSIDE_TEMP = 2;
export const COMFORT_TEMP_MIN = 20;
export const COMFORT_TEMP_MAX = 24;
export const CRITICAL_TEMP_HOT = 28;
export const CRITICAL_TEMP_COLD = 16;
export const CRITICAL_AIR_MIN = 30;
export const CRITICAL_STATE_DURATION_MS = 20000;
export const MAX_ENERGY = 100;
export const BLACKOUT_DURATION_MS = 5000;
export const CHAOS_INTERVAL_MIN_MS = 15000;
export const CHAOS_INTERVAL_MAX_MS = 30000;

export const TURBO_AIR_THRESHOLD = 20;
export const TURBO_DURATION_MS = 5000;
export const TURBO_MULTIPLIER = 4;

export const DEVICE_OVERLOAD_THRESHOLD = 150;
export const DEVICE_OVERLOAD_DURATION_MS = 15000;
export const DEVICE_REPAIR_DURATION_MS = 22000;
