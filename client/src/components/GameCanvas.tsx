// Printed Puzzle Desk: React는 액자, Babylon은 종이 지면, 게임 모듈은 정확한 퍼즐 경험을 담당한다.
import { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameHandle } from "@/game/scene";

interface GameCanvasProps {
  theme: "light" | "dark";
}

export default function GameCanvas({ theme }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const handleRef = useRef<GameHandle | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    let cancelled = false;

    // Use current theme from closure or ref, but it's safe to use initial theme here.
    createGameScene(engine, canvas, theme).then((nextHandle) => {
      if (cancelled) {
        nextHandle.dispose();
        return;
      }
      handleRef.current = nextHandle;
      engine.runRenderLoop(() => nextHandle.scene.render());
    });

    const onResize = () => {
      engine.resize();
      handleRef.current?.resize();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      handleRef.current?.dispose();
      engine.dispose();
      startedRef.current = false;
    };
  }, []); // Only run once on mount

  useEffect(() => {
    if (handleRef.current) {
      handleRef.current.setTheme(theme);
    }
  }, [theme]);

  return <canvas ref={canvasRef} className="fixed inset-0 h-full w-full outline-none" aria-label="Sudoku Studio 게임 보드" style={{ touchAction: "none" }} />;
}