"use client";

import { useRef } from "react";
import { Application, extend, useTick } from "@pixi/react";
import { Container, Graphics, Text, Sprite, TilingSprite } from "pixi.js";
import { useGameStore } from "@/lib/engine/GameState";
import { BuildingBase, BuildingFurniture, BuildingCharacters, BuildingPanels, BuildingCriticalAlerts } from "./Building";
import { MachineRoomBackground, MachineRoomDevices } from "./MachineRoom";
import { PipeSystem } from "./PipeSystem";
import { DragPipe } from "./DragPipe";
import { DragEventLayer } from "./DragEventLayer";
import { ConnectionOverlay } from "./ConnectionOverlay";
import { CanvasSizeProvider, useCanvasSize } from "./CanvasSizeContext";

extend({ Container, Graphics, Text, Sprite, TilingSprite });

function GameLoop() {
  useTick((ticker) => {
    if (document.hidden) return;
    const delta = ticker.deltaMS ?? 16;
    useGameStore.getState().tick(Math.min(delta, 100));
  });
  return null;
}

function GameContent() {
  const { width, height } = useCanvasSize();

  return (
    <>
      <GameLoop />
      <pixiContainer x={0} y={0}>
        <BuildingBase width={width} height={height} />
        <BuildingFurniture width={width} height={height} />
        <BuildingCharacters width={width} height={height} />
        <MachineRoomBackground width={width} height={height} />
        <PipeSystem width={width} height={height} />
        <BuildingCriticalAlerts width={width} height={height} />
        <BuildingPanels width={width} height={height} />
        <MachineRoomDevices width={width} height={height} />
        <DragPipe width={width} height={height} />
      </pixiContainer>
    </>
  );
}

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full min-h-[400px]"
    >
      <CanvasSizeProvider containerRef={containerRef}>
        <ConnectionOverlay containerRef={containerRef} />
        <DragEventLayer containerRef={containerRef} />
        <Application
          width={800}
          height={600}
          backgroundColor={0x0f1419}
          resizeTo={containerRef}
          antialias
        >
          <GameContent />
        </Application>
      </CanvasSizeProvider>
    </div>
  );
}
