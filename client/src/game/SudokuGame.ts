import { createPuzzle, HINT_LIMIT, TIME_LIMIT_SECONDS, type Board, type Difficulty } from "./puzzle";

export interface CellPosition {
  row: number;
  column: number;
}

interface HistoryEntry {
  position: CellPosition;
  value: number;
  notes: number[];
}

const cloneBoard = (board: Board): Board => board.map((row) => [...row]);
const keyOf = (row: number, column: number) => `${row}:${column}`;

export class SudokuGame {
  difficulty: Difficulty = "보통";
  solution: Board = [];
  values: Board = [];
  given: boolean[][] = [];
  notes: number[][][] = [];
  selected: CellPosition | null = null;
  noteMode = false;
  showMistakes = false;
  conflictKeys = new Set<string>();
  mistakeKeys = new Set<string>();
  hintedKeys = new Set<string>();
  history: HistoryEntry[] = [];
  elapsedSeconds = 0;
  timeLimitSeconds = TIME_LIMIT_SECONDS["보통"];
  remainingSeconds = TIME_LIMIT_SECONDS["보통"];
  hintLimit = HINT_LIMIT["보통"];
  hintsUsed = 0;
  completed = false;
  timedOut = false;
  completedAt = 0;
  lastMessage = "칸을 선택해 숫자를 놓으세요.";
  private secondAccumulator = 0;

  constructor(difficulty: Difficulty = "보통", demo = false) {
    this.newGame(difficulty);
    if (demo) this.applyDemoState();
  }

  newGame(difficulty: Difficulty = this.difficulty) {
    const puzzle = createPuzzle(difficulty);
    this.difficulty = difficulty;
    this.solution = cloneBoard(puzzle.solution);
    this.values = cloneBoard(puzzle.values);
    this.given = puzzle.given.map((row) => [...row]);
    this.notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
    this.selected = null;
    this.noteMode = false;
    this.showMistakes = false;
    this.conflictKeys.clear();
    this.mistakeKeys.clear();
    this.hintedKeys.clear();
    this.history = [];
    this.elapsedSeconds = 0;
    this.timeLimitSeconds = TIME_LIMIT_SECONDS[difficulty];
    this.remainingSeconds = this.timeLimitSeconds;
    this.hintLimit = HINT_LIMIT[difficulty];
    this.hintsUsed = 0;
    this.completed = false;
    this.timedOut = false;
    this.completedAt = 0;
    this.secondAccumulator = 0;
    this.lastMessage = "새 타임어택 퍼즐을 준비했습니다.";
  }

  applyDemoState() {
    const emptyCells: CellPosition[] = [];
    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        if (!this.given[row][column]) emptyCells.push({ row, column });
      }
    }
    emptyCells.slice(4).forEach(({ row, column }) => {
      this.values[row][column] = this.solution[row][column];
    });
    this.selected = emptyCells[0] ?? null;
    this.elapsedSeconds = 266;
    this.remainingSeconds = Math.max(0, this.timeLimitSeconds - this.elapsedSeconds);
    this.lastMessage = "데모: 제한 시간 안에 마무리할 네 칸이 남았습니다.";
  }

  tick(deltaSeconds: number): boolean {
    if (this.completed || this.timedOut) return false;
    this.secondAccumulator += deltaSeconds;
    if (this.secondAccumulator < 1) return false;
    const seconds = Math.floor(this.secondAccumulator);
    this.elapsedSeconds += seconds;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - seconds);
    this.secondAccumulator -= seconds;
    if (this.remainingSeconds === 0) {
      this.timedOut = true;
      this.secondAccumulator = 0;
      this.lastMessage = "시간이 끝났습니다. 새 퍼즐로 다시 도전하세요.";
    }
    return true;
  }

  select(row: number, column: number) {
    if (this.timedOut) return;
    this.selected = { row, column };
    if (this.given[row][column]) this.lastMessage = "인쇄된 단서입니다.";
    else this.lastMessage = this.noteMode ? "메모를 기록하는 중입니다." : "숫자를 입력하거나 메모를 남기세요.";
  }

  moveSelection(rowDelta: number, columnDelta: number) {
    if (this.timedOut) return;
    const current = this.selected ?? { row: 4, column: 4 };
    const row = (current.row + rowDelta + 9) % 9;
    const column = (current.column + columnDelta + 9) % 9;
    this.select(row, column);
  }

  toggleNotes() {
    if (this.timedOut) return;
    this.noteMode = !this.noteMode;
    this.lastMessage = this.noteMode ? "메모 모드: 후보 숫자를 누적합니다." : "입력 모드: 큰 숫자를 놓습니다.";
  }

  setDigit(digit: number) {
    const position = this.selected;
    if (!position || this.given[position.row][position.column] || this.completed || this.timedOut) return;
    const { row, column } = position;
    this.remember(position);

    if (this.noteMode) {
      if (this.values[row][column] !== 0) {
        this.lastMessage = "큰 숫자가 있는 칸에는 메모를 쓸 수 없습니다.";
        return;
      }
      const existing = this.notes[row][column];
      this.notes[row][column] = existing.includes(digit)
        ? existing.filter((value) => value !== digit)
        : [...existing, digit].sort((left, right) => left - right);
      this.lastMessage = `후보 ${digit}을 ${this.notes[row][column].includes(digit) ? "기록" : "지움"}했습니다.`;
    } else {
      this.values[row][column] = digit;
      this.notes[row][column] = [];
      this.hintedKeys.delete(keyOf(row, column));
      this.lastMessage = `숫자 ${digit}을 놓았습니다.`;
      this.refreshValidity();
      this.checkCompletion();
    }
  }

  erase() {
    const position = this.selected;
    if (!position || this.given[position.row][position.column] || this.completed || this.timedOut) return;
    this.remember(position);
    this.values[position.row][position.column] = 0;
    this.notes[position.row][position.column] = [];
    this.hintedKeys.delete(keyOf(position.row, position.column));
    this.refreshValidity();
    this.lastMessage = "칸을 비웠습니다.";
  }

  undo() {
    const entry = this.history.pop();
    if (!entry || this.completed || this.timedOut) return;
    const { row, column } = entry.position;
    this.values[row][column] = entry.value;
    this.notes[row][column] = entry.notes;
    this.hintedKeys.delete(keyOf(row, column));
    this.selected = entry.position;
    this.refreshValidity();
    this.lastMessage = "마지막 입력을 되돌렸습니다.";
  }

  hint() {
    if (this.completed || this.timedOut) return;
    if (this.hintsUsed >= this.hintLimit) {
      this.lastMessage = `이 난이도의 힌트를 모두 사용했습니다. (${this.hintLimit}/${this.hintLimit})`;
      return;
    }
    const selectedIsEmpty = this.selected && !this.given[this.selected.row][this.selected.column] && this.values[this.selected.row][this.selected.column] === 0;
    const position = selectedIsEmpty ? this.selected : this.firstOpenCell();
    if (!position) {
      this.lastMessage = "힌트가 필요 없는 상태입니다. 모든 빈칸을 채웠습니다.";
      return;
    }
    this.remember(position);
    this.values[position.row][position.column] = this.solution[position.row][position.column];
    this.notes[position.row][position.column] = [];
    this.selected = position;
    this.hintedKeys.add(keyOf(position.row, position.column));
    this.hintsUsed += 1;
    this.refreshValidity();
    this.checkCompletion();
    this.lastMessage = `힌트 · ${position.row + 1}행 ${position.column + 1}열에 ${this.solution[position.row][position.column]}을 놓았습니다. (${this.getHintsRemaining()}회 남음)`;
  }

  validate() {
    if (this.timedOut) return;
    this.showMistakes = true;
    this.refreshValidity();
    const issueCount = this.conflictKeys.size + this.mistakeKeys.size;
    this.lastMessage = issueCount ? `${issueCount}개의 확인할 숫자가 있습니다.` : "지금까지의 숫자는 규칙에 맞습니다.";
  }

  getProgress() {
    let total = 0;
    let filled = 0;
    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        if (!this.given[row][column]) {
          total += 1;
          if (this.values[row][column] !== 0) filled += 1;
        }
      }
    }
    return { filled, total, ratio: total ? filled / total : 1 };
  }

  formatTime() {
    const minutes = Math.floor(this.remainingSeconds / 60).toString().padStart(2, "0");
    const seconds = (this.remainingSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  getTimeRatio() {
    return this.timeLimitSeconds ? this.remainingSeconds / this.timeLimitSeconds : 0;
  }

  isLowOnTime() {
    return this.remainingSeconds > 0 && this.remainingSeconds <= 60;
  }

  forceTimeUpForPreview() {
    this.remainingSeconds = 0;
    this.secondAccumulator = 0;
    this.timedOut = true;
    this.lastMessage = "시간이 끝났습니다. 새 퍼즐로 다시 도전하세요.";
  }

  isRelated(row: number, column: number) {
    const selected = this.selected;
    if (!selected) return false;
    return (
      row === selected.row ||
      column === selected.column ||
      (Math.floor(row / 3) === Math.floor(selected.row / 3) && Math.floor(column / 3) === Math.floor(selected.column / 3))
    );
  }

  isSameSelectedNumber(row: number, column: number) {
    const selected = this.selected;
    if (!selected) return false;
    const value = this.values[selected.row][selected.column];
    return value !== 0 && this.values[row][column] === value;
  }

  isHinted(row: number, column: number) {
    return this.hintedKeys.has(keyOf(row, column));
  }

  getHintsRemaining() {
    return Math.max(0, this.hintLimit - this.hintsUsed);
  }

  private firstOpenCell(): CellPosition | null {
    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        if (!this.given[row][column] && this.values[row][column] === 0) return { row, column };
      }
    }
    return null;
  }

  private remember(position: CellPosition) {
    const { row, column } = position;
    this.history.push({ position: { ...position }, value: this.values[row][column], notes: [...this.notes[row][column]] });
  }

  private refreshValidity() {
    this.conflictKeys.clear();
    this.mistakeKeys.clear();
    const inspect = (positions: CellPosition[]) => {
      const byValue = new Map<number, CellPosition[]>();
      positions.forEach((position) => {
        const value = this.values[position.row][position.column];
        if (!value) return;
        byValue.set(value, [...(byValue.get(value) ?? []), position]);
      });
      byValue.forEach((duplicates) => {
        if (duplicates.length > 1) duplicates.forEach(({ row, column }) => this.conflictKeys.add(keyOf(row, column)));
      });
    };

    for (let index = 0; index < 9; index += 1) {
      inspect(Array.from({ length: 9 }, (_, column) => ({ row: index, column })));
      inspect(Array.from({ length: 9 }, (_, row) => ({ row, column: index })));
    }
    for (let row = 0; row < 9; row += 3) {
      for (let column = 0; column < 9; column += 3) {
        inspect(Array.from({ length: 9 }, (_, offset) => ({ row: row + Math.floor(offset / 3), column: column + (offset % 3) })));
      }
    }

    if (this.showMistakes) {
      for (let row = 0; row < 9; row += 1) {
        for (let column = 0; column < 9; column += 1) {
          if (!this.given[row][column] && this.values[row][column] && this.values[row][column] !== this.solution[row][column]) {
            this.mistakeKeys.add(keyOf(row, column));
          }
        }
      }
    }
  }

  private checkCompletion() {
    const done = this.values.every((row, rowIndex) => row.every((value, columnIndex) => value === this.solution[rowIndex][columnIndex]));
    if (done) {
      this.completed = true;
      this.completedAt = performance.now();
      this.lastMessage = "완성했습니다. 훌륭한 논리였습니다.";
    }
  }
}
