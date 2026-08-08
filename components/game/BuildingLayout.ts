import type { RoomId } from "@/lib/constants";

export interface RoomLayoutItem {
  id: RoomId;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function getRoomLayout(width: number, height: number): RoomLayoutItem[] {
  const pad = Math.min(width, height) * 0.01;
  const machineHeight = height * 0.3;
  const gap = height * 0.04;
  const buildingHeight = height - machineHeight - gap;
  const floor2Height = buildingHeight * 0.47;
  const floor1Height = buildingHeight * 0.53;

  return [
    {
      id: "turnhalle",
      x: pad,
      y: pad,
      w: width * 0.31 - pad * 1.5,
      h: floor2Height - pad * 1.5,
    },
    {
      id: "computerraum",
      x: width * 0.32 + pad * 0.5,
      y: pad,
      w: width * 0.31 - pad,
      h: floor2Height - pad * 1.5,
    },
    {
      id: "werkstaette",
      x: width * 0.64 + pad * 0.5,
      y: pad,
      w: width * 0.35 - pad * 1.5,
      h: floor2Height - pad * 1.5,
    },
    {
      id: "lehrerzimmer",
      x: pad,
      y: floor2Height + pad,
      w: width * 0.47 - pad * 1.5,
      h: floor1Height - pad * 1.5,
    },
    {
      id: "aula",
      x: width * 0.49 + pad * 0.5,
      y: floor2Height + pad,
      w: width * 0.5 - pad * 1.5,
      h: floor1Height - pad * 1.5,
    },
  ];
}
