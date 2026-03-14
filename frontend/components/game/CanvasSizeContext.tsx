"use client";

import { createContext, useContext, useState, useEffect, useMemo } from "react";

interface CanvasSize {
  width: number;
  height: number;
  rect: { left: number; top: number; width: number; height: number } | null;
}

const CanvasSizeContext = createContext<CanvasSize>({
  width: 800,
  height: 600,
  rect: null,
});

export function CanvasSizeProvider({
  children,
  containerRef,
}: {
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [size, setSize] = useState<CanvasSize>({
    width: 800,
    height: 600,
    rect: null,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({
        width: el.clientWidth,
        height: el.clientHeight,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  const value = useMemo(
    () => size,
    [
      size.width,
      size.height,
      size.rect?.left,
      size.rect?.top,
      size.rect?.width,
      size.rect?.height,
    ]
  );

  return (
    <CanvasSizeContext.Provider value={value}>
      {children}
    </CanvasSizeContext.Provider>
  );
}

export function useCanvasSize() {
  const ctx = useContext(CanvasSizeContext);
  return { width: ctx.width, height: ctx.height };
}

export function useCanvasBounds() {
  return useContext(CanvasSizeContext);
}
