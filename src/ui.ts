/* DOM layer: grid, on-screen keyboard with letter states, stats panel,
 * daily mode (local date), dark-ish styling. */

import {
  ANSWERS,
  MAX_GUESSES,
  WORD_LEN,
  applyResult,
  dailyWord,
  emptyStats,
  evaluate,
  isWin,
  isValidWord,
  mergeKeyState,
  todayLocalDateString,
  type KeyState,
  type Stats,
  type Verdict,
} from "./core.ts";

const STORAGE = "kelimeavi-state";

interface Saved {
  answer: string;
  guesses: string[];
  date: string;
  stats: Stats;
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) {
      const saved = JSON.parse(raw) as Saved;
      if (saved.date === todayLocalDateString() && saved.answer) return saved;
    }
  } catch {
    /* fall through to a fresh game */
  }
  const answer = dailyWord();
  return { answer, guesses: [], date: todayLocalDateString(), stats: emptyStats() };
}

let saved: Saved = load();
let keyState: Record<string, KeyState> = {};
let current = "";
let finished = false;

function persist(): void {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(saved));
  } catch {
    /* storage unavailable: session-only play */
  }
}

function buildBoard(): void {
  const boardEl = document.getElementById("board") as HTMLElement;
  boardEl.innerHTML = "";
  for (let r = 0; r < MAX_GUESSES; r++) {
    for (let c = 0; c < WORD_LEN; c++) {
      const cellEl = document.createElement("div");
      cellEl.className = "cell";
      cellEl.dataset.row = String(r);
      cellEl.dataset.col = String(c);
      boardEl.appendChild(cellEl);
    }
  }
  buildKeyboard();
}

function buildKeyboard(): void {
  const kb = document.getElementById("keyboard") as HTMLElement;
  kb.innerHTML = "";
  const rows = ["euıoüpa", "rtyşghjkl", "zcvbnmöqwx", "⏎"];
  for (const row of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "kb-row";
    for (const letter of row) {
      if (letter === "⏎") {
        rowEl.appendChild(keyButton("⏎", "Enter"));
        rowEl.appendChild(keyButton("←", "Backspace"));
        continue;
      }
      rowEl.appendChild(keyButton(letter.toUpperCase(), letter));
    }
    kb.appendChild(rowEl);
  }
}

function keyButton(label: string, key: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "key";
  button.textContent = label;
  button.dataset.key = key;
  button.addEventListener("click", () => handleKey(key));
  return button;
}

function handleKey(key: string): void {
  if (finished) return;
  if (key === "Enter") {
    submit();
  } else if (key === "Backspace") {
    current = current.slice(0, -1);
  } else if (/^[a-zçğıöşü]$/.test(key) && current.length < WORD_LEN) {
    current += key;
  }
  paintCurrent();
}

function paintCurrent(): void {
  const row = saved.guesses.length;
  for (let c = 0; c < WORD_LEN; c++) {
    const cellEl = document.querySelector<HTMLDivElement>(
      `#board .cell[data-row="${row}"][data-col="${c}"]`,
    );
    if (cellEl) cellEl.textContent = (current[c] ?? "").toLocaleUpperCase("tr");
  }
}

function submit(): void {
  if (current.length !== WORD_LEN) {
    flash("5 harf gir");
    return;
  }
  if (!isValidWord(current)) {
    flash("kelime listede yok");
    return;
  }
  const verdicts: Verdict[] = evaluate(current, saved.answer);
  const row = saved.guesses.length;
  for (let c = 0; c < WORD_LEN; c++) {
    const cellEl = document.querySelector<HTMLDivElement>(
      `#board .cell[data-row="${row}"][data-col="${c}"]`,
    );
    if (!cellEl) continue;
    cellEl.classList.add(verdicts[c] as string);
  }
  saved.guesses.push(current);
  keyState = mergeKeyState(keyState, current, verdicts);
  paintKeyboard();

  if (isWin(verdicts)) {
    finished = true;
    saved.stats = applyResult(saved.stats, true);
    persist();
    flash(`TEBRİKLER! ${saved.guesses.length}/6`);
    return;
  }
  if (saved.guesses.length >= MAX_GUESSES) {
    finished = true;
    saved.stats = applyResult(saved.stats, false);
    persist();
    flash(`kelime: ${saved.answer.toLocaleUpperCase("tr")}`);
    return;
  }
  persist();
  current = "";
  paintCurrent();
}

function paintKeyboard(): void {
  document.querySelectorAll<HTMLButtonElement>("#keyboard .key").forEach((button) => {
    const key = button.dataset.key;
    if (key && keyState[key]) {
      button.classList.remove("correct", "present", "absent");
      button.classList.add(keyState[key] as string);
    }
  });
}

function paintStats(): void {
  const el = document.getElementById("stats") as HTMLElement;
  const stats: Stats = saved.stats ?? emptyStats();
  const rate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  el.textContent = `oynanan ${stats.played} · kazanma %${rate} · seri ${stats.currentStreak} (en iyi ${stats.maxStreak})`;
}

function flash(message: string): void {
  paintStats();
  const el = document.getElementById("status") as HTMLElement;
  el.textContent = message;
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 1200);
}

function newGame(): void {
  saved = { answer: dailyWord(), guesses: [], date: todayLocalDateString(), stats: saved.stats };
  keyState = {};
  current = "";
  finished = false;
  buildBoard();
  paintStats();
  persist();
}

function setup(): void {
  buildBoard();
  paintStats();
  document.getElementById("new-game")?.addEventListener("click", newGame);
  document.getElementById("daily")?.addEventListener("click", () => {
    saved = load();
    keyState = {};
    current = "";
    finished = saved.guesses.length >= MAX_GUESSES || saved.guesses.includes(saved.answer);
    buildBoard();
    replaySaved();
    paintStats();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter") handleKey("Enter");
    else if (event.key === "Backspace") handleKey("Backspace");
    else handleKey(event.key.toLocaleLowerCase("tr"));
  });
  // restore today's guesses from the save
  finished = saved.guesses.includes(saved.answer) || saved.guesses.length >= MAX_GUESSES;
  for (const guess of saved.guesses) {
    const verdicts: Verdict[] = evaluate(guess, saved.answer);
    const row = saved.guesses.indexOf(guess);
    for (let c = 0; c < WORD_LEN; c++) {
      const cellEl = document.querySelector<HTMLDivElement>(
        `#board .cell[data-row="${row}"][data-col="${c}"]`,
      );
      if (cellEl) {
        cellEl.textContent = guess.toLocaleUpperCase("tr")[c] ?? "";
        cellEl.classList.add(verdicts[c] as string);
      }
    }
    keyState = mergeKeyState(keyState, guess, verdicts);
  }
  paintKeyboard();
  paintStats();
}

function replaySaved(): void {
  for (const guess of saved.guesses) {
    const verdicts: Verdict[] = evaluate(guess, saved.answer);
    const row = saved.guesses.indexOf(guess);
    for (let c = 0; c < WORD_LEN; c++) {
      const cellEl = document.querySelector<HTMLDivElement>(
        `#board .cell[data-row="${row}"][data-col="${c}"]`,
      );
      if (cellEl) {
        cellEl.textContent = guess.toLocaleUpperCase("tr")[c] ?? "";
        cellEl.classList.add(verdicts[c] as string);
      }
    }
    keyState = mergeKeyState(keyState, guess, verdicts);
  }
  paintKeyboard();
}

void ANSWERS;

try {
  setup();
} catch (error) {
  document.body.dataset.error = String(error);
}
if (typeof document !== "undefined") {
  document.body.dataset.qa =
    `cells=${document.querySelectorAll("#board .cell").length}` +
    ` keys=${document.querySelectorAll("#keyboard .key").length}`;
}
