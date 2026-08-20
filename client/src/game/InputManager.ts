export type GameAction =
  | { type: "digit"; digit: number }
  | { type: "erase" }
  | { type: "undo" }
  | { type: "hint" }
  | { type: "validate" }
  | { type: "notes" }
  | { type: "new" }
  | { type: "move"; row: number; column: number };

export class InputManager {
  private readonly onKeyDown: (event: KeyboardEvent) => void;

  constructor(private readonly onAction: (action: GameAction) => void) {
    this.onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      let action: GameAction | null = null;
      if (/^[1-9]$/.test(event.key)) action = { type: "digit", digit: Number(event.key) };
      if (["Backspace", "Delete", "0"].includes(event.key)) action = { type: "erase" };
      if (event.key.toLowerCase() === "z") action = { type: "undo" };
      if (event.key.toLowerCase() === "h") action = { type: "hint" };
      if (event.key.toLowerCase() === "v") action = { type: "validate" };
      if (event.key.toLowerCase() === "n") action = { type: "notes" };
      if (event.key.toLowerCase() === "r") action = { type: "new" };
      if (event.key === "ArrowUp") action = { type: "move", row: -1, column: 0 };
      if (event.key === "ArrowDown") action = { type: "move", row: 1, column: 0 };
      if (event.key === "ArrowLeft") action = { type: "move", row: 0, column: -1 };
      if (event.key === "ArrowRight") action = { type: "move", row: 0, column: 1 };
      if (!action) return;
      event.preventDefault();
      this.onAction(action);
    };
    window.addEventListener("keydown", this.onKeyDown);
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
  }
}
