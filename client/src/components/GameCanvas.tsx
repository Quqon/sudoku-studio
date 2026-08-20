// Printed Puzzle Desk: React는 액자, Babylon은 종이 지면, 게임 모듈은 정확한 퍼즐 경험을 담당한다.
import { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameHandle } from "@/game/scene";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    let handle: GameHandle | null = null;
    let cancelled = false;

    createGameScene(engine, canvas).then((nextHandle) => {
      if (cancelled) {
        nextHandle.dispose();
        return;
      }
      handle = nextHandle;
      engine.runRenderLoop(() => nextHandle.scene.render());
    });

    const onResize = () => {
      engine.resize();
      handle?.resize();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      handle?.dispose();
      engine.dispose();
      startedRef.current = false;
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 h-full w-full outline-none" aria-label="Sudoku Studio 게임 보드" style={{ touchAction: "none" }} />;
}
