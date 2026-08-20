import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { InputManager, type GameAction } from "./InputManager";
import { SudokuGame } from "./SudokuGame";
import type { Difficulty } from "./puzzle";

const PAPER_URL = "/manus-storage/sudoku-studio-paper-texture_ec83aef1.png";
const MOTIF_URL = "/manus-storage/sudoku-studio-cobalt-motif_66cac189.png";
const MARK_URL = "/manus-storage/sudoku-studio-mark_9cd25c9e.png";
const REFERENCE_URL = "/manus-storage/sudoku-studio-visual-target_7e6e6dfd.png";

type ActionName = "digit" | "notes" | "erase" | "undo" | "hint" | "validate" | "new" | Difficulty;

interface HitTarget {
  x: number;
  y: number;
  width: number;
  height: number;
  action: ActionName;
  value?: number;
}

interface Layout {
  width: number;
  height: number;
  boardX: number;
  boardY: number;
  boardSize: number;
  sidebarX: number;
  sidebarY: number;
  sidebarWidth: number;
  compact: boolean;
}

interface Images {
  paper?: HTMLImageElement;
  motif?: HTMLImageElement;
  mark?: HTMLImageElement;
  reference?: HTMLImageElement;
}

const COLORS = {
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
};

export class GameWorld {
  readonly game = new SudokuGame(
    new URLSearchParams(window.location.search).has("paint") ? "어려움" : "보통",
    new URLSearchParams(window.location.search).has("demo"),
  );
  private readonly texture: DynamicTexture;
  private readonly context: CanvasRenderingContext2D;
  private readonly input: InputManager;
  private readonly onPointerDown: (event: PointerEvent) => void;
  private readonly images: Images = {};
  private hitTargets: HitTarget[] = [];
  private layout: Layout | null = null;
  private dirty = true;

  constructor(
    private readonly scene: Scene,
    private readonly canvas: HTMLCanvasElement,
    private readonly plane: Mesh,
    private readonly camera: FreeCamera,
  ) {
    this.texture = new DynamicTexture("sudoku-editorial-ui", { width: 1600, height: 900 }, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
    this.texture.hasAlpha = false;
    this.context = this.texture.getContext() as unknown as CanvasRenderingContext2D;
    this.input = new InputManager((action) => this.handleAction(action));
    this.onPointerDown = (event) => this.handlePointer(event);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    if (new URLSearchParams(window.location.search).has("timeout")) this.game.forceTimeUpForPreview();
    if (new URLSearchParams(window.location.search).has("paint")) this.game.forcePaintEventForPreview();
    this.loadImages();
    this.resize();
  }

  update(deltaSeconds: number) {
    if (this.game.tick(deltaSeconds)) this.dirty = true;
    if (this.dirty) this.draw();
  }

  resize() {
    const width = Math.max(320, Math.round(this.canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2)));
    const height = Math.max(320, Math.round(this.canvas.clientHeight * Math.min(window.devicePixelRatio || 1, 2)));
    this.texture.scaleTo(width, height);
    const aspect = width / height;
    this.camera.orthoLeft = -aspect;
    this.camera.orthoRight = aspect;
    this.camera.orthoTop = 1;
    this.camera.orthoBottom = -1;
    this.plane.scaling.x = aspect;
    this.plane.scaling.y = 1;
    this.dirty = true;
  }

  getTexture() {
    return this.texture;
  }

  dispose() {
    this.input.dispose();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.texture.dispose();
  }

  private loadImages() {
    const load = (key: keyof Images, url: string) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        this.images[key] = image;
        this.dirty = true;
      };
      image.src = url;
    };
    load("paper", PAPER_URL);
    load("motif", MOTIF_URL);
    load("mark", MARK_URL);
    load("reference", REFERENCE_URL);
  }

  private handleAction(action: GameAction) {
    if (action.type === "digit") this.game.setDigit(action.digit);
    if (action.type === "erase") this.game.erase();
    if (action.type === "undo") this.game.undo();
    if (action.type === "hint") this.game.hint();
    if (action.type === "validate") this.game.validate();
    if (action.type === "notes") this.game.toggleNotes();
    if (action.type === "new") this.game.newGame();
    if (action.type === "move") this.game.moveSelection(action.row, action.column);
    this.dirty = true;
  }

  private handlePointer(event: PointerEvent) {
    const layout = this.layout;
    if (!layout) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * layout.width;
    const y = ((event.clientY - rect.top) / rect.height) * layout.height;
    const hit = [...this.hitTargets].reverse().find((target) => x >= target.x && x <= target.x + target.width && y >= target.y && y <= target.y + target.height);
    if (hit) {
      if (hit.action === "digit" && hit.value) this.game.setDigit(hit.value);
      if (hit.action === "notes") this.game.toggleNotes();
      if (hit.action === "erase") this.game.erase();
      if (hit.action === "undo") this.game.undo();
      if (hit.action === "hint") this.game.hint();
      if (hit.action === "validate") this.game.validate();
      if (hit.action === "new") this.game.newGame();
      if (["쉬움", "보통", "어려움"].includes(hit.action)) this.game.newGame(hit.action as Difficulty);
      this.dirty = true;
      return;
    }
    const { boardX, boardY, boardSize } = layout;
    if (x >= boardX && x <= boardX + boardSize && y >= boardY && y <= boardY + boardSize) {
      const cell = boardSize / 9;
      this.game.select(Math.min(8, Math.floor((y - boardY) / cell)), Math.min(8, Math.floor((x - boardX) / cell)));
      this.dirty = true;
      return;
    }
  }

  private getLayout(width: number, height: number): Layout {
    const compact = width / height < 1.18 || width < 740;
    if (compact) {
      const touchLayout = width <= 560;
      const boardSize = touchLayout
        ? Math.min(width * 0.66, height * 0.36)
        : Math.min(width * 0.75, height * 0.39);
      return {
        width,
        height,
        boardX: (width - boardSize) / 2,
        boardY: Math.max(70, height * 0.09),
        boardSize,
        sidebarX: touchLayout ? width * 0.04 : width * 0.06,
        sidebarY: Math.max(70, height * 0.09) + boardSize + Math.max(16, height * 0.02),
        sidebarWidth: touchLayout ? width * 0.92 : width * 0.88,
        compact,
      };
    }
    const boardSize = Math.min(height * 0.72, width * 0.52);
    const boardX = Math.max(width * 0.065, (width - (boardSize + width * 0.36)) * 0.42);
    return {
      width,
      height,
      boardX,
      boardY: Math.max(108, height * 0.15),
      boardSize,
      sidebarX: boardX + boardSize + Math.max(42, width * 0.045),
      sidebarY: Math.max(108, height * 0.15),
      sidebarWidth: Math.min(width * 0.3, width - (boardX + boardSize + width * 0.08)),
      compact,
    };
  }

  private draw() {
    const width = this.context.canvas.width;
    const height = this.context.canvas.height;
    const ctx = this.context;
    const layout = this.getLayout(width, height);
    this.layout = layout;
    this.hitTargets = [];
    ctx.clearRect(0, 0, width, height);
    this.drawBackground(ctx, layout);
    this.drawHeader(ctx, layout);
    this.drawBoard(ctx, layout);
    this.drawSidebar(ctx, layout);
    if (this.game.completed) this.drawCompletion(ctx, layout);
    else if (this.game.timedOut) this.drawTimeUp(ctx, layout);
    this.texture.update();
    this.dirty = false;
  }

  private drawBackground(ctx: CanvasRenderingContext2D, layout: Layout) {
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, layout.width, layout.height);
    if (this.images.paper) {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(this.images.paper, 0, 0, layout.width, layout.height);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(0, 0, layout.width, layout.height);
    ctx.strokeStyle = "rgba(34,33,30,0.055)";
    ctx.lineWidth = 1;
    const spacing = Math.max(34, Math.round(layout.height / 21));
    for (let y = spacing * 2; y < layout.height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(layout.width, y + 0.5);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(40,84,197,0.06)";
    ctx.fillRect(0, 0, layout.width * 0.07, layout.height);
    ctx.fillStyle = COLORS.chartreuse;
    ctx.fillRect(layout.width * 0.069, layout.height * 0.086, 3, 38);
  }

  private drawHeader(ctx: CanvasRenderingContext2D, layout: Layout) {
    const touchHeader = layout.compact && layout.width <= 560;
    const x = layout.compact ? layout.width * (touchHeader ? 0.05 : 0.06) : layout.boardX;
    const y = touchHeader ? Math.max(14, layout.height * 0.024) : layout.height * 0.045;
    const markSize = touchHeader ? 28 : Math.min(48, layout.height * 0.055);
    if (this.images.mark) ctx.drawImage(this.images.mark, x, y, markSize, markSize);
    else this.drawFallbackMark(ctx, x, y, markSize);

    ctx.fillStyle = COLORS.ink;
    ctx.font = `700 ${Math.round(markSize * (touchHeader ? 0.62 : 0.68))}px "DM Serif Display", Georgia, serif`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("SUDOKU", x + markSize + (touchHeader ? 8 : 13), y + markSize * 0.58);
    ctx.fillStyle = COLORS.cobalt;
    ctx.font = `700 ${touchHeader ? 7 : Math.max(10, Math.round(markSize * 0.22))}px "IBM Plex Sans KR", sans-serif`;
    ctx.letterSpacing = "0.18em";
    ctx.fillText("STUDIO / NO. 09", x + markSize + (touchHeader ? 9 : 16), y + markSize * 0.9);
    ctx.letterSpacing = "0px";

    const buttonWidth = touchHeader ? 66 : layout.compact ? layout.width * 0.19 : Math.min(132, layout.width * 0.12);
    const buttonHeight = touchHeader ? 28 : Math.max(30, layout.height * 0.048);
    const buttonX = layout.compact
      ? layout.width - layout.width * (touchHeader ? 0.05 : 0.06) - buttonWidth
      : layout.sidebarX + layout.sidebarWidth - buttonWidth;
    this.drawButton(ctx, buttonX, y + (touchHeader ? 0 : 4), buttonWidth, buttonHeight, "새 게임", "new", false, layout);

    if (!layout.compact) {
      ctx.fillStyle = COLORS.softInk;
      ctx.font = `500 ${Math.max(10, Math.round(layout.height * 0.014))}px "IBM Plex Sans KR", sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText("정확한 한 수를 위한 조용한 시간", Math.max(x + markSize + 215, buttonX - 18), y + buttonHeight * 0.65);
      ctx.textAlign = "left";
    }
  }

  private drawFallbackMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    const unit = size / 4;
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        if (row === 1 && column === 1) continue;
        ctx.fillStyle = row === 2 && column === 0 ? COLORS.cobalt : COLORS.ink;
        ctx.fillRect(x + column * unit, y + row * unit, unit * 0.62, unit * 0.62);
      }
    }
  }

  private drawBoard(ctx: CanvasRenderingContext2D, layout: Layout) {
    const { boardX, boardY, boardSize } = layout;
    const cell = boardSize / 9;
    ctx.fillStyle = "rgba(255,253,248,0.82)";
    ctx.fillRect(boardX - 2, boardY - 2, boardSize + 4, boardSize + 4);

    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        const x = boardX + column * cell;
        const y = boardY + row * cell;
        const selected = this.game.selected?.row === row && this.game.selected?.column === column;
        const conflict = this.game.conflictKeys.has(`${row}:${column}`) || this.game.mistakeKeys.has(`${row}:${column}`);
        const hinted = this.game.isHinted(row, column);
        if (this.game.isRelated(row, column)) {
          ctx.fillStyle = "rgba(40,84,197,0.075)";
          ctx.fillRect(x, y, cell, cell);
        }
        if (this.game.isSameSelectedNumber(row, column)) {
          ctx.fillStyle = "rgba(40,84,197,0.12)";
          ctx.fillRect(x, y, cell, cell);
        }
        if (conflict) {
          ctx.fillStyle = "rgba(201,83,58,0.15)";
          ctx.fillRect(x, y, cell, cell);
        }
        if (hinted) {
          ctx.fillStyle = "rgba(186,216,66,0.24)";
          ctx.fillRect(x + cell * 0.08, y + cell * 0.08, cell * 0.84, cell * 0.84);
        }
        if (selected) {
          ctx.fillStyle = "rgba(186,216,66,0.28)";
          ctx.fillRect(x, y, cell, cell);
          ctx.strokeStyle = COLORS.cobalt;
          ctx.lineWidth = Math.max(2, cell * 0.035);
          ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
        }
      }
    }

    ctx.strokeStyle = "rgba(34,33,30,0.26)";
    for (let index = 0; index <= 9; index += 1) {
      ctx.lineWidth = index % 3 === 0 ? Math.max(2.2, cell * 0.045) : Math.max(0.7, cell * 0.014);
      const offset = index === 9 ? -ctx.lineWidth / 2 : ctx.lineWidth / 2;
      ctx.beginPath();
      ctx.moveTo(boardX + index * cell + offset, boardY);
      ctx.lineTo(boardX + index * cell + offset, boardY + boardSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(boardX, boardY + index * cell + offset);
      ctx.lineTo(boardX + boardSize, boardY + index * cell + offset);
      ctx.stroke();
    }

    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        const x = boardX + column * cell;
        const y = boardY + row * cell;
        const value = this.game.values[row][column];
        const conflict = this.game.conflictKeys.has(`${row}:${column}`) || this.game.mistakeKeys.has(`${row}:${column}`);
        const hinted = this.game.isHinted(row, column);
        if (value) {
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `${this.game.given[row][column] ? 700 : 600} ${Math.round(cell * 0.52)}px "IBM Plex Sans KR", sans-serif`;
          ctx.fillStyle = conflict ? COLORS.vermilion : hinted ? COLORS.hintInk : this.game.given[row][column] ? COLORS.ink : COLORS.cobalt;
          ctx.fillText(String(value), x + cell / 2, y + cell / 2 + cell * 0.025);
          if (hinted) {
            ctx.fillStyle = COLORS.hintInk;
            ctx.fillRect(x + cell * 0.76, y + cell * 0.76, Math.max(3, cell * 0.11), Math.max(3, cell * 0.11));
          }
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
        } else if (this.game.notes[row][column].length) {
          this.drawNotes(ctx, x, y, cell, this.game.notes[row][column]);
        }
      }
    }

    if (this.game.paintEventRemaining > 0) {
      for (let row = 0; row < 9; row += 1) {
        for (let column = 0; column < 9; column += 1) {
          if (this.game.isPainted(row, column)) {
            this.drawPaintMask(ctx, boardX + column * cell, boardY + row * cell, cell, row, column);
          }
        }
      }
    }

    ctx.fillStyle = COLORS.softInk;
    ctx.font = `700 ${Math.max(9, Math.round(cell * 0.12))}px "IBM Plex Sans KR", sans-serif`;
    ctx.letterSpacing = "0.12em";
    ctx.fillText("PUZZLE FIELD", boardX, boardY - Math.max(13, cell * 0.26));
    ctx.textAlign = "right";
    ctx.fillText(`${this.game.difficulty} · 9 × 9`, boardX + boardSize, boardY - Math.max(13, cell * 0.26));
    ctx.textAlign = "left";
    ctx.letterSpacing = "0px";
  }

  private drawPaintMask(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, row: number, column: number) {
    const seed = (row + 1) * 37 + (column + 1) * 19;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 1, y + 1, cell - 2, cell - 2);
    ctx.clip();
    ctx.fillStyle = "rgba(40,84,197,0.9)";
    for (let index = 0; index < 6; index += 1) {
      const angle = (seed + index * 61) * 0.11;
      const centerX = x + cell * (0.5 + Math.cos(angle) * 0.18);
      const centerY = y + cell * (0.5 + Math.sin(angle * 1.3) * 0.18);
      const radius = cell * (0.3 + ((seed + index * 17) % 9) * 0.012);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,252,245,0.34)";
    ctx.lineWidth = Math.max(1, cell * 0.035);
    for (let index = 0; index < 2; index += 1) {
      const start = y + cell * (0.25 + index * 0.28);
      ctx.beginPath();
      ctx.moveTo(x - cell * 0.05, start);
      ctx.bezierCurveTo(x + cell * 0.3, start - cell * 0.18, x + cell * 0.68, start + cell * 0.18, x + cell * 1.05, start - cell * 0.04);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawNotes(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, notes: number[]) {
    ctx.fillStyle = COLORS.cobalt;
    ctx.font = `600 ${Math.max(8, Math.round(cell * 0.15))}px "IBM Plex Sans KR", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    notes.forEach((note) => {
      const index = note - 1;
      const noteX = x + ((index % 3) + 0.5) * (cell / 3);
      const noteY = y + (Math.floor(index / 3) + 0.55) * (cell / 3);
      ctx.fillText(String(note), noteX, noteY);
    });
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  private drawSidebar(ctx: CanvasRenderingContext2D, layout: Layout) {
    const { sidebarX: x, sidebarY: y, sidebarWidth: width, compact } = layout;
    const touchLayout = compact && layout.width <= 560;
    const scale = compact ? Math.max(0.8, layout.height / 1500) : 1;
    const labelSize = touchLayout ? Math.max(10, Math.round(layout.height * 0.013)) : compact ? Math.max(9, Math.round(layout.height * 0.012 * scale)) : Math.max(10, Math.round(layout.height * 0.014 * scale));
    const titleSize = compact ? Math.max(25, Math.round(layout.height * 0.035)) : Math.max(25, Math.round(layout.height * 0.043 * scale));
    const line = Math.max(1, layout.height * 0.0015);
    const progress = this.game.getProgress();
    const hintsRemaining = this.game.getHintsRemaining();
    const panelHeight = compact
      ? layout.height - y - (touchLayout ? 8 : 12)
      : Math.min(layout.height - y - Math.max(24, layout.height * 0.03), Math.max(720, layout.height * 0.74));

    ctx.fillStyle = "rgba(255,252,245,0.66)";
    ctx.fillRect(x, y, width, panelHeight);
    ctx.strokeStyle = "rgba(34,33,30,0.14)";
    ctx.lineWidth = line;
    ctx.strokeRect(x + line / 2, y + line / 2, width - line, panelHeight - line);
    if (compact && this.images.motif) {
      ctx.save();
      ctx.globalAlpha = 0.13;
      const motifHeight = Math.min(panelHeight * 0.25, width * 0.6);
      ctx.drawImage(this.images.motif, x + width * 0.18, y + panelHeight - motifHeight - 16, width * 0.78, motifHeight);
      ctx.restore();
    }

    const pad = touchLayout ? Math.max(14, width * 0.047) : compact ? Math.max(14, width * 0.055) : Math.max(16, width * 0.09);
    ctx.fillStyle = COLORS.softInk;
    ctx.font = `700 ${labelSize}px "IBM Plex Sans KR", sans-serif`;
    ctx.letterSpacing = "0.15em";
    ctx.fillText("MARGIN NOTES", x + pad, y + pad + labelSize);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = this.game.isLowOnTime() ? COLORS.vermilion : COLORS.ink;
    ctx.font = `400 ${titleSize}px "DM Serif Display", Georgia, serif`;
    ctx.fillText(this.game.formatTime(), x + pad, y + pad + labelSize + titleSize + 8);
    ctx.fillStyle = COLORS.softInk;
    ctx.font = `500 ${labelSize}px "IBM Plex Sans KR", sans-serif`;
    ctx.textAlign = "right";
    const limitMinutes = Math.ceil(this.game.timeLimitSeconds / 60);
    ctx.fillText(`타임어택 ${limitMinutes}분 · ${progress.filled}/${progress.total} 채움 · 힌트 ${hintsRemaining}/${this.game.hintLimit}`, x + width - pad, y + pad + labelSize + titleSize + 2);
    ctx.textAlign = "left";

    const difficultyY = y + pad + labelSize + titleSize + (touchLayout ? 14 : compact ? 18 : 34);
    const gap = compact ? 4 : 6;
    const tabWidth = (width - pad * 2 - gap * 2) / 3;
    const tabHeight = touchLayout ? 30 : compact ? Math.max(23, labelSize * 2.2) : Math.max(28, labelSize * 2.4);
    (["쉬움", "보통", "어려움"] as Difficulty[]).forEach((difficulty, index) => {
      this.drawButton(ctx, x + pad + index * (tabWidth + gap), difficultyY, tabWidth, tabHeight, difficulty, difficulty, this.game.difficulty === difficulty, layout);
    });

    const progressY = difficultyY + tabHeight + (touchLayout ? 17 : compact ? 17 : 24);
    ctx.fillStyle = "rgba(34,33,30,0.1)";
    ctx.fillRect(x + pad, progressY, width - pad * 2, 5);
    ctx.fillStyle = COLORS.cobalt;
    ctx.fillRect(x + pad, progressY, (width - pad * 2) * progress.ratio, 5);

    const actionY = progressY + (touchLayout ? 17 : compact ? 20 : 28);
    const actionGap = compact ? 4 : 7;
    const actionWidth = (width - pad * 2 - actionGap) / 2;
    const actionHeight = touchLayout ? 32 : compact ? Math.max(25, labelSize * 2.35) : Math.max(31, labelSize * 2.65);
    this.drawButton(ctx, x + pad, actionY, actionWidth, actionHeight, this.game.noteMode ? "메모 ON" : "메모", "notes", this.game.noteMode, layout);
    this.drawButton(ctx, x + pad + actionWidth + actionGap, actionY, actionWidth, actionHeight, "되돌리기", "undo", false, layout);
    this.drawButton(ctx, x + pad, actionY + actionHeight + actionGap, actionWidth, actionHeight, `힌트 · ${hintsRemaining}회`, "hint", false, layout, undefined, false, hintsRemaining === 0);
    this.drawButton(ctx, x + pad + actionWidth + actionGap, actionY + actionHeight + actionGap, actionWidth, actionHeight, "검증", "validate", false, layout);

    const numberY = actionY + actionHeight * 2 + actionGap + (touchLayout ? 16 : compact ? 17 : 24);
    ctx.fillStyle = COLORS.softInk;
    ctx.font = `700 ${labelSize}px "IBM Plex Sans KR", sans-serif`;
    ctx.letterSpacing = "0.12em";
    ctx.fillText("NUMBER TRAY", x + pad, numberY);
    ctx.letterSpacing = "0px";
    const numGap = touchLayout ? 5 : compact ? 4 : 6;
    const numWidth = (width - pad * 2 - numGap * 2) / 3;
    const numHeight = touchLayout ? Math.max(40, Math.min(46, width * 0.12)) : compact ? Math.max(24, labelSize * 2.4) : Math.max(33, labelSize * 2.9);
    for (let index = 0; index < 9; index += 1) {
      const row = Math.floor(index / 3);
      const column = index % 3;
      this.drawButton(ctx, x + pad + column * (numWidth + numGap), numberY + (touchLayout ? 10 : compact ? 9 : 12) + row * (numHeight + numGap), numWidth, numHeight, String(index + 1), "digit", false, layout, index + 1, true);
    }
    const eraseY = numberY + (touchLayout ? 10 : compact ? 9 : 12) + 3 * (numHeight + numGap) + (touchLayout ? 3 : compact ? 3 : 5);
    const eraseHeight = touchLayout ? 36 : compact ? Math.max(24, labelSize * 2.25) : Math.max(29, labelSize * 2.45);
    this.drawButton(ctx, x + pad, eraseY, width - pad * 2, eraseHeight, "지우기", "erase", false, layout);

    const messageHeight = compact ? 27 : 34;
    const footerReserve = compact ? 18 : 26;
    const messageTop = Math.min(
      y + panelHeight - footerReserve - messageHeight,
      eraseY + eraseHeight + (touchLayout ? 14 : compact ? 18 : 24),
    );
    ctx.fillStyle = "rgba(40,84,197,0.09)";
    ctx.fillRect(x + pad, messageTop, width - pad * 2, messageHeight);
    ctx.fillStyle = COLORS.cobalt;
    ctx.font = `500 ${Math.max(10, labelSize * 0.95)}px "IBM Plex Sans KR", sans-serif`;
    ctx.fillText(this.game.lastMessage, x + pad + 10, messageTop + messageHeight * 0.61, width - pad * 2 - 20);

    ctx.fillStyle = COLORS.softInk;
    ctx.font = `500 ${Math.max(9, labelSize * 0.86)}px "IBM Plex Sans KR", sans-serif`;
    ctx.fillText(compact ? "N 메모 · H 힌트 · V 검증" : "N 메모 · H 힌트 · V 검증 · Z 되돌리기", x + pad, y + panelHeight - (compact ? 10 : 13));
  }

  private drawButton(
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
    ctx.fillStyle = disabled ? "rgba(34,33,30,0.05)" : active ? COLORS.cobalt : "rgba(255,255,255,0.54)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = disabled ? "rgba(34,33,30,0.11)" : active ? COLORS.cobalt : "rgba(34,33,30,0.24)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.fillStyle = disabled ? COLORS.softInk : active ? "#ffffff" : number ? COLORS.cobalt : COLORS.ink;
    ctx.font = `${number ? 700 : 600} ${number ? Math.max(16, height * 0.54) : Math.max(10, height * 0.34)}px ${number ? "\"DM Serif Display\", Georgia, serif" : "\"IBM Plex Sans KR\", sans-serif"}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + width / 2, y + height / 2 + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    if (!disabled) this.hitTargets.push({ x, y, width, height, action, value });
  }

  private drawCompletion(ctx: CanvasRenderingContext2D, layout: Layout) {
    ctx.fillStyle = "rgba(34,33,30,0.28)";
    ctx.fillRect(0, 0, layout.width, layout.height);
    const width = Math.min(layout.width * 0.55, 540);
    const height = Math.min(layout.height * 0.35, 300);
    const x = (layout.width - width) / 2;
    const y = (layout.height - height) / 2;
    ctx.fillStyle = "rgba(255,252,245,0.98)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.fillStyle = COLORS.chartreuse;
    ctx.fillRect(x, y, 8, height);
    ctx.fillStyle = COLORS.cobalt;
    ctx.font = `700 ${Math.max(12, height * 0.06)}px "IBM Plex Sans KR", sans-serif`;
    ctx.letterSpacing = "0.16em";
    ctx.fillText("PUZZLE COMPLETE", x + width * 0.13, y + height * 0.27);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = COLORS.ink;
    ctx.font = `400 ${Math.max(30, height * 0.18)}px "DM Serif Display", Georgia, serif`;
    ctx.fillText("정확한 한 수였습니다.", x + width * 0.13, y + height * 0.5);
    ctx.fillStyle = COLORS.softInk;
    ctx.font = `500 ${Math.max(12, height * 0.065)}px "IBM Plex Sans KR", sans-serif`;
    ctx.fillText(`남은 시간 ${this.game.formatTime()} · ${this.game.difficulty} 난이도`, x + width * 0.13, y + height * 0.65);
    this.drawButton(ctx, x + width * 0.13, y + height * 0.74, width * 0.43, height * 0.14, "다음 퍼즐", "new", false, layout);
  }

  private drawTimeUp(ctx: CanvasRenderingContext2D, layout: Layout) {
    ctx.fillStyle = "rgba(34,33,30,0.38)";
    ctx.fillRect(0, 0, layout.width, layout.height);
    const width = Math.min(layout.width * 0.86, 540);
    const height = Math.min(Math.max(layout.height * 0.42, 248), 300);
    const x = (layout.width - width) / 2;
    const y = (layout.height - height) / 2;
    ctx.fillStyle = "rgba(255,252,245,0.98)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.fillStyle = COLORS.vermilion;
    ctx.fillRect(x, y, 8, height);
    ctx.font = `700 ${Math.max(12, height * 0.06)}px "IBM Plex Sans KR", sans-serif`;
    ctx.letterSpacing = "0.16em";
    ctx.fillText("TIME UP", x + width * 0.13, y + height * 0.27);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = COLORS.ink;
    const title = "시간이 끝났습니다.";
    const titleX = x + width * 0.13;
    const titleMaxWidth = width * 0.74;
    let titleSize = Math.min(Math.max(24, height * 0.18), Math.max(24, titleMaxWidth / 4.8));
    ctx.font = `400 ${titleSize}px "DM Serif Display", Georgia, serif`;
    while (ctx.measureText(title).width > titleMaxWidth && titleSize > 20) {
      titleSize -= 1;
      ctx.font = `400 ${titleSize}px "DM Serif Display", Georgia, serif`;
    }
    ctx.fillText(title, titleX, y + height * 0.5, titleMaxWidth);
    ctx.fillStyle = COLORS.softInk;
    ctx.font = `500 ${Math.max(12, height * 0.065)}px "IBM Plex Sans KR", sans-serif`;
    ctx.fillText(`${this.game.difficulty} · ${Math.ceil(this.game.timeLimitSeconds / 60)}분 타임어택`, x + width * 0.13, y + height * 0.65);
    this.drawButton(ctx, x + width * 0.13, y + height * 0.74, width * 0.43, height * 0.14, "다시 도전", "new", false, layout);
  }
}
