import type { SystemType } from "@/lib/constants";

export interface MachineLayoutItem {
  type: SystemType;
  x: number;
  y: number;
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
}

export function getMachineLayout(width: number, height: number): {
  machineY: number;
  machineHeight: number;
  systems: MachineLayoutItem[];
} {
  const machineHeight = height * 0.3;
  const machineY = height - machineHeight;
  const pad = width * 0.02;
  const systemWidth = (width - pad * 4) / 3;
  const systemHeight = machineHeight * 0.4;

  return {
    machineY,
    machineHeight,
    systems: [
      {
        type: "heating",
        x: pad,
        y: machineY + machineHeight * 0.15,
        w: systemWidth,
        h: systemHeight,
        anchorX: systemWidth / 2,
        anchorY: systemHeight / 2,
      },
      {
        type: "cooling",
        x: pad * 2 + systemWidth,
        y: machineY + machineHeight * 0.15,
        w: systemWidth,
        h: systemHeight,
        anchorX: systemWidth / 2,
        anchorY: systemHeight / 2,
      },
      {
        type: "ventilation",
        x: pad * 3 + systemWidth * 2,
        y: machineY + machineHeight * 0.15,
        w: systemWidth,
        h: systemHeight,
        anchorX: systemWidth / 2,
        anchorY: systemHeight / 2,
      },
    ],
  };
}

export function getMachineAnchor(
  width: number,
  height: number,
  type: SystemType
): { x: number; y: number } {
  const { machineY, systems } = getMachineLayout(width, height);
  const sys = systems.find((s) => s.type === type);
  if (!sys) return { x: 0, y: 0 };
  return {
    x: sys.x + sys.anchorX,
    y: sys.y + sys.anchorY,
  };
}
