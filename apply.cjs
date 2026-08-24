const fs = require('fs');

const file = 'client/src/game/GameWorld.ts';
let content = fs.readFileSync(file, 'utf-8').replace(/\r\n/g, '\n');

// 5. Hardcoded colors replacements to THEMES (Do this FIRST to avoid corrupting THEMES)
content = content.replace(/COLORS\./g, 'THEMES[this.theme].');
content = content.replace(/"rgba\(255,255,255,0\.28\)"/g, 'THEMES[this.theme].bgOverlay');
content = content.replace(/"rgba\(34,33,30,0\.055\)"/g, 'THEMES[this.theme].bgLines');
content = content.replace(/"rgba\(255,253,248,0\.82\)"/g, 'THEMES[this.theme].boardBg');
content = content.replace(/"rgba\(34,33,30,0\.26\)"/g, 'THEMES[this.theme].boardLines');
content = content.replace(/"rgba\(255,252,245,0\.66\)"/g, 'THEMES[this.theme].sidebarBg');
content = content.replace(/"rgba\(34,33,30,0\.14\)"/g, 'THEMES[this.theme].sidebarBorder');
content = content.replace(/"rgba\(34,33,30,0\.1\)"/g, 'THEMES[this.theme].progressBg');

// 1. THEMES
const colorsOld = `const COLORS = {
  ink: "#22211e",
  softInk: "#64615b",
  cobalt: "#2854c5",
  cobaltPale: "#dfe8fb",
  hintInk: "#617918",
  paper: "#f6f0e6",
  paperDeep: "#ece3d4",
  chartreuse: "#bad842",
  vermilion: "#c9533a",
  rule: "#b8b0a4",
};`;
// wait! The COLORS. strings were replaced with THEMES[this.theme].!
// But the object declaration is still const COLORS = { ... };
// So we can still replace it.

const themesNew = `const THEMES = {
  light: {
    ink: "#22211e",
    softInk: "#64615b",
    cobalt: "#2854c5",
    cobaltPale: "#dfe8fb",
    hintInk: "#617918",
    paper: "#f6f0e6",
    paperDeep: "#ece3d4",
    chartreuse: "#bad842",
    vermilion: "#c9533a",
    rule: "#b8b0a4",
    bgOverlay: "rgba(0,0,0,0.1)",
    boardBg: "rgba(255,253,248,0.82)",
    sidebarBg: "rgba(255,252,245,0.66)",
    sidebarBorder: "rgba(34,33,30,0.14)",
    bgLines: "rgba(34,33,30,0.055)",
    boardLines: "rgba(34,33,30,0.26)",
    progressBg: "rgba(34,33,30,0.1)",
    buttonShadow: "rgba(0, 0, 0, 0.2)",
    buttonBg: "rgba(255,255,255,0.54)",
    buttonDisabled: "rgba(34,33,30,0.05)",
    buttonBorder: "rgba(34,33,30,0.24)",
    buttonBorderDisabled: "rgba(34,33,30,0.11)"
  },
  dark: {
    ink: "#ffffff",
    softInk: "#a1a1aa",
    cobalt: "#6366f1",
    cobaltPale: "#3730a3",
    hintInk: "#22c55e",
    paper: "#09090b",
    paperDeep: "#18181b",
    chartreuse: "#10b981",
    vermilion: "#ef4444",
    rule: "#3f3f46",
    bgOverlay: "rgba(0,0,0,0.1)",
    boardBg: "rgba(24,24,27,0.82)",
    sidebarBg: "rgba(24,24,27,0.66)",
    sidebarBorder: "rgba(255,255,255,0.14)",
    bgLines: "rgba(255,255,255,0.05)",
    boardLines: "rgba(255,255,255,0.2)",
    progressBg: "rgba(255,255,255,0.1)",
    buttonShadow: "rgba(0, 0, 0, 0.4)",
    buttonBg: "rgba(255,255,255,0.08)",
    buttonDisabled: "rgba(255,255,255,0.05)",
    buttonBorder: "rgba(255,255,255,0.15)",
    buttonBorderDisabled: "rgba(255,255,255,0.1)"
  }
};`;
content = content.replace(colorsOld, themesNew);

// 2. Class Constructor & properties
content = content.replace(
  'private dirty = true;',
  'private dirty = true;\n\n  theme: "light" | "dark" = "light";'
);
content = content.replace(
  'private readonly camera: FreeCamera,\n  ) {',
  'private readonly camera: FreeCamera,\n    theme: "light" | "dark"\n  ) {'
);
content = content.replace(
  'canvas.addEventListener("pointerdown", this.onPointerDown);',
  'canvas.addEventListener("pointerdown", this.onPointerDown);\n    this.theme = theme;'
);
content = content.replace(
  'getTexture() {',
  'setTheme(theme: "light" | "dark") {\n    this.theme = theme;\n    this.dirty = true;\n  }\n\n  getTexture() {'
);

// 3. Confirm Dialog
const oldConfirm = `      if (hit.action === "new") this.game.newGame();
      if (["쉬움", "보통", "어려움"].includes(hit.action)) this.game.newGame(hit.action as Difficulty);`;
const newConfirm = `      if (hit.action === "new") {
        if (window.confirm("진행 중인 게임이 초기화됩니다. 계속하시겠습니까?")) this.game.newGame();
      }
      if (["쉬움", "보통", "어려움"].includes(hit.action)) {
        if (window.confirm("진행 중인 게임이 초기화됩니다. 계속하시겠습니까?")) this.game.newGame(hit.action as Difficulty);
      }`;
content = content.replace(oldConfirm, newConfirm);

// 4. Mobile Layout Width
const oldLayout = `      const boardSize = touchLayout
        ? Math.min(width * 0.66, height * 0.36)
        : Math.min(width * 0.75, height * 0.39);`;
const newLayout = `      const boardSize = touchLayout
        ? Math.min(width * 0.85, height * 0.45)
        : Math.min(width * 0.75, height * 0.45);`;
content = content.replace(oldLayout, newLayout);

// 6. drawNotes font size
const oldNotes = `    ctx.font = \`600 \${Math.max(8, Math.round(cell * 0.15))}px "IBM Plex Sans KR", sans-serif\`;`;
const newNotes = `    ctx.font = \`700 \${Math.max(12, Math.round(cell * 0.23))}px "IBM Plex Sans KR", sans-serif\`;`;
content = content.replace(oldNotes, newNotes);

// 7. drawSidebar layout heights and messageTop
const oldActionHeight = `const actionHeight = touchLayout ? 32 : compact ? Math.max(25, labelSize * 2.35) : Math.max(31, labelSize * 2.65);`;
const newActionHeight = `const actionHeight = touchLayout ? 44 : compact ? Math.max(30, labelSize * 2.35) : Math.max(31, labelSize * 2.65);`;
content = content.replace(oldActionHeight, newActionHeight);

const oldNumHeight = `const numHeight = touchLayout ? Math.max(40, Math.min(46, width * 0.12)) : compact ? Math.max(24, labelSize * 2.4) : Math.max(33, labelSize * 2.9);`;
const newNumHeight = `const numHeight = touchLayout ? Math.max(44, Math.min(50, width * 0.14)) : compact ? Math.max(28, labelSize * 2.4) : Math.max(33, labelSize * 2.9);`;
content = content.replace(oldNumHeight, newNumHeight);

const oldEraseHeight = `const eraseHeight = touchLayout ? 36 : compact ? Math.max(24, labelSize * 2.25) : Math.max(29, labelSize * 2.45);`;
const newEraseHeight = `const eraseHeight = touchLayout ? 44 : compact ? Math.max(30, labelSize * 2.25) : Math.max(36, labelSize * 2.45);`;
content = content.replace(oldEraseHeight, newEraseHeight);

const oldMessageTop = `    const messageTop = Math.min(
      y + panelHeight - footerReserve - messageHeight,
      eraseY + eraseHeight + (touchLayout ? 14 : compact ? 18 : 24),
    );`;
const newMessageTop = `    const messageTop = eraseY + eraseHeight + (touchLayout ? 14 : compact ? 18 : 24);`;
content = content.replace(oldMessageTop, newMessageTop);

// 8. paper texture theming
const oldPaperDraw = `    if (this.images.paper) {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(this.images.paper, 0, 0, layout.width, layout.height);
      ctx.globalAlpha = 1;
    }`;
const newPaperDraw = `    if (this.images.paper && this.theme === "light") {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(this.images.paper, 0, 0, layout.width, layout.height);
      ctx.globalAlpha = 1;
    } else if (this.images.paper && this.theme === "dark") {
      ctx.globalAlpha = 0.05;
      ctx.drawImage(this.images.paper, 0, 0, layout.width, layout.height);
      ctx.globalAlpha = 1;
    }`;
content = content.replace(oldPaperDraw, newPaperDraw);

// 9. drawButton
const oldDrawButton = `  private drawButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    action: ActionName,
    active: boolean,
    layout: Layout,
    value?: number,
    number = false,
    disabled = false,
  ) {
    ctx.fillStyle = disabled ? "rgba(34,33,30,0.05)" : active ? THEMES[this.theme].cobalt : "rgba(255,255,255,0.54)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = disabled ? "rgba(34,33,30,0.11)" : active ? THEMES[this.theme].cobalt : "rgba(34,33,30,0.24)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.fillStyle = disabled ? THEMES[this.theme].softInk : active ? "#ffffff" : number ? THEMES[this.theme].cobalt : THEMES[this.theme].ink;
    ctx.font = \`\${number ? 700 : 600} \${number ? Math.max(16, height * 0.54) : Math.max(10, height * 0.34)}px \${number ? "\\"DM Serif Display\\", Georgia, serif" : "\\"IBM Plex Sans KR\\", sans-serif"}\`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + width / 2, y + height / 2 + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    if (!disabled) this.hitTargets.push({ x, y, width, height, action, value });
  }`;

const newDrawButton = `  private drawButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    action: ActionName,
    active: boolean,
    layout: Layout,
    value?: number,
    number = false,
    disabled = false,
  ) {
    const radius = 2;
    ctx.save();
    
    // Add shadow
    if (!disabled) {
      ctx.shadowColor = active ? \`\${THEMES[this.theme].cobalt}66\` : THEMES[this.theme].buttonShadow;
      ctx.shadowBlur = active ? 12 : 6;
      ctx.shadowOffsetY = 3;
    }

    ctx.fillStyle = disabled ? THEMES[this.theme].buttonDisabled : active ? THEMES[this.theme].cobalt : THEMES[this.theme].buttonBg;
    ctx.beginPath();
    
    // Polyfill for roundRect
    if (ctx.roundRect) {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    ctx.fill();
    
    // Reset shadow for stroke & text
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.strokeStyle = disabled ? THEMES[this.theme].buttonBorderDisabled : active ? THEMES[this.theme].cobalt : THEMES[this.theme].buttonBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.fillStyle = disabled ? THEMES[this.theme].softInk : active ? "#ffffff" : number ? THEMES[this.theme].cobalt : THEMES[this.theme].ink;
    ctx.font = \`\${number ? 700 : 600} \${number ? Math.max(16, height * 0.54) : Math.max(10, height * 0.34)}px \${number ? "\\"DM Serif Display\\", Georgia, serif" : "\\"IBM Plex Sans KR\\", sans-serif"}\`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + width / 2, y + height / 2 + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    
    ctx.restore();
    if (!disabled) this.hitTargets.push({ x, y, width, height, action, value });
  }`;
content = content.replace(oldDrawButton, newDrawButton);

fs.writeFileSync(file, content, 'utf-8');

// Re-write scene.ts because we reset everything
let sceneContent = fs.readFileSync('client/src/game/scene.ts', 'utf-8').replace(/\r\n/g, '\n');
sceneContent = sceneContent.replace(
  'resize: () => void;',
  'resize: () => void;\n  setTheme: (theme: "light" | "dark") => void;'
);
sceneContent = sceneContent.replace(
  'export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {',
  'export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement, theme: "light" | "dark"): Promise<GameHandle> {'
);
sceneContent = sceneContent.replace(
  'const world = new GameWorld(scene, canvas, plane, camera);',
  'const world = new GameWorld(scene, canvas, plane, camera, theme);'
);
sceneContent = sceneContent.replace(
  'resize: () => world.resize(),',
  'resize: () => world.resize(),\n    setTheme: (t) => world.setTheme(t),'
);
fs.writeFileSync('client/src/game/scene.ts', sceneContent, 'utf-8');

// Also update App.tsx and GameCanvas.tsx
const gcPath = 'client/src/components/GameCanvas.tsx';
let gcContent = fs.readFileSync(gcPath, 'utf-8').replace(/\r\n/g, '\n');
const newGcContent = `// Printed Puzzle Desk: React는 액자, Babylon은 종이 지면, 게임 모듈은 정확한 퍼즐 경험을 담당한다.
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
}`;
fs.writeFileSync(gcPath, newGcContent, 'utf-8');

const appPath = 'client/src/App.tsx';
const newAppContent = `// Printed Puzzle Desk: 불필요한 프레임을 없애고, 전체 화면의 종이 지면과 퍼즐 보드에만 집중한다.
import GameCanvas from "@/components/GameCanvas";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

function SudokuApp() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="relative h-full w-full">
      <GameCanvas theme={theme} />
      {toggleTheme && (
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 right-4 z-50 bg-background/50 backdrop-blur-sm border-0 bg-transparent text-current opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
        </Button>
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider switchable defaultTheme="dark">
      <SudokuApp />
    </ThemeProvider>
  );
}

export default App;
`;
fs.writeFileSync(appPath, newAppContent, 'utf-8');

console.log('Successfully applied all changes');
