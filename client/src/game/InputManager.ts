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
      const letterKey = event.key.toLowerCase();
      const physicalLetter = event.code.startsWith("Key") ? event.code.slice(3).toLowerCase() : "";
      const shortcut = /^[a-z]$/.test(letterKey) ? letterKey : physicalLetter;
      let action: GameAction | null = null;
      if (/^[1-9]$/.test(event.key)) action = { type: "digit", digit: Number(event.key) };
      if (["Backspace", "Delete", "0"].includes(event.key)) action = { type: "erase" };
      if (shortcut === "z") action = { type: "undo" };
      if (shortcut === "h") action = { type: "hint" };
      if (shortcut === "v") action = { type: "validate" };
      if (shortcut === "n") action = { type: "notes" };
      if (shortcut === "r") action = { type: "new" };
      if (event.key === "ArrowUp") action = { type: "move", row: -1, column: 0 };
      if (event.key === "ArrowDown") action = { type: "move", row: 1, column: 0 };
      if (event.key === "ArrowLeft") action = { type: "move", row: 0, column: -1 };
      if (event.key === "ArrowRight") action = { type: "move", row: 0, column: 1 };
      if (!action) return;
      event.preventDefault();
      if (event.repeat && action.type !== "move") return;
      this.onAction(action);
    };
    window.addEventListener("keydown", this.onKeyDown);
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
  }
}
