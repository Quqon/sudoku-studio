export type CellValue = number;
export type Board = CellValue[][];
export type Difficulty = "쉬움" | "보통" | "어려움";

export const CLUE_COUNT: Record<Difficulty, number> = {
  쉬움: 42,
  보통: 34,
  어려움: 27,
};

export const HINT_LIMIT: Record<Difficulty, number> = {
  쉬움: 5,
  보통: 3,
  어려움: 2,
};

export const TIME_LIMIT_SECONDS: Record<Difficulty, number> = {
  쉬움: 10 * 60,
  보통: 7 * 60,
  어려움: 5 * 60,
};

const BASE_SOLUTION: Board = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const cloneBoard = (board: Board): Board => board.map((row) => [...row]);

function shuffled<T>(values: T[]): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
}

function shuffledGroups(): number[] {
  return shuffled([0, 1, 2]).flatMap((group) => shuffled([0, 1, 2]).map((inside) => group * 3 + inside));
}

export interface Puzzle {
  solution: Board;
  given: boolean[][];
  values: Board;
  difficulty: Difficulty;
}

export function createPuzzle(difficulty: Difficulty): Puzzle {
  const rowOrder = shuffledGroups();
  const columnOrder = shuffledGroups();
  const digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const digitMap = new Map<number, number>(digits.map((value, index) => [index + 1, value]));

  const solution = rowOrder.map((row) =>
    columnOrder.map((column) => digitMap.get(BASE_SOLUTION[row][column]) ?? BASE_SOLUTION[row][column]),
  );
  const values = cloneBoard(solution);
  const given = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => false));
  const openCells = shuffled(Array.from({ length: 81 }, (_, index) => index)).slice(CLUE_COUNT[difficulty]);

  openCells.forEach((index) => {
    const row = Math.floor(index / 9);
    const column = index % 9;
    values[row][column] = 0;
  });

  values.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      given[rowIndex][columnIndex] = value !== 0;
    });
  });

  return { solution, given, values, difficulty };
}
