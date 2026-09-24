/* Pure game logic: evaluation with duplicate-letter correctness, daily
 * word selection by local date, statistics. No DOM here. */

export type Verdict = "correct" | "present" | "absent";

export const WORD_LEN = 5;
export const MAX_GUESSES = 6;

/** The answer list: hand-picked common Turkish five-letter words. */
export const ANSWERS: readonly string[] = [
  "kitap", "kalem", "masa", "elma", "armut", "kapak", "çicek", "balık",
  "ekmek", "sütlaç", "kavun", "karpuz", "kiraz", "erik", "muz",
  "deniz", "dalga", "kumsal", "fener", "gemi", "yelken", "liman",
  "orman", "ağaç", "yaprak", "kök", "çiçek", "bahçe", "toprak", "taş",
  "evren", "yıldız", "güneş", "ay", "bulut", "yağmur", "rüzgar", "fırtına",
  "kitaplık", "kütüphane", "defter", "kalemlik", "silgi", "çanta",
  "okul", "sınıf", "öğretmen", "öğrenci", "ders", "sınav", "karnem",
  "aile", "anne", "baba", "kardeş", "dede", "nine", "arkadaş", "komşu",
  "sevgi", "gülümse", "mutluluk", "huzur", "umut", "hayal", "dilek",
  "yolcu", "bilet", "tren", "otobüs", "uçak", "bisiklet", "araba",
  "mutfak", "banyo", "yatak", "salon", "balkon", "merdiven", "kapı",
  "kışlık", "yazlık", "bahar", "sonbahar", "kış", "yaz",
  "peynir", "zeytin", "çaydanlık", "bardak", "tabak", "kaşık", "çatal", "bıçak",
  "bal", "reçel", "tereyağı", "yoğurt", "çorba", "pilav", "kebap", "baklava",
  "şehir", "köy", "kasaba", "sokak", "cadde", "meydan", "park", "köprü",
  "dağ", "tepe", "vadi", "nehir", "göl", "şelale", "kaynak", "pınar",
];

/** Extra words accepted as guesses (not answers). */
export const EXTRA_VALID: readonly string[] = [
  "kale", "masa", "kelebek", "araba", "satır", "sesli", "izlem", "oyun",
  "tenis", "koşu", "yüzmek", "kazmak", "esnemek", "gülmek", "ağlamak",
  "masal", "öykü", "roman", "şiir", "şarkı", "müzik", "dans", "ritim",
];

export const VALID_WORDS: ReadonlySet<string> = new Set(
  [...ANSWERS, ...EXTRA_VALID].map((w) => w.toLowerCase()),
);

function normalize(word: string): string {
  return word.toLocaleLowerCase("tr").trim();
}

/** Wordle-style evaluation with correct duplicate-letter handling. */
export function evaluate(guess: string, answer: string): Verdict[] {
  const guessNorm = normalize(guess);
  const answerNorm = normalize(answer);
  if (guessNorm.length !== WORD_LEN || answerNorm.length !== WORD_LEN) {
    throw new Error("both words must be 5 letters");
  }
  const verdicts: Verdict[] = new Array(WORD_LEN).fill("absent");
  const remaining: Record<string, number> = {};

  for (let i = 0; i < WORD_LEN; i++) {
    if (guessNorm[i] === answerNorm[i]) {
      verdicts[i] = "correct";
    } else {
      remaining[answerNorm[i] as string] = (remaining[answerNorm[i] as string] ?? 0) + 1;
    }
  }
  for (let i = 0; i < WORD_LEN; i++) {
    if (verdicts[i] === "correct") continue;
    const letter = guessNorm[i] as string;
    if ((remaining[letter] ?? 0) > 0) {
      verdicts[i] = "present";
      remaining[letter] = (remaining[letter] as number) - 1;
    }
  }
  return verdicts;
}

export function isValidWord(word: string): boolean {
  return VALID_WORDS.has(normalize(word));
}

export function isWin(verdicts: Verdict[]): boolean {
  return verdicts.every((v) => v === "correct");
}

/** Deterministic daily index from the LOCAL date string, e.g. 2026-09-24.
 * Same day (local time) -> same word everywhere on this machine. */
export function dailyIndex(dateStr: string, listLength: number): number {
  let hash = 5381;
  for (const ch of dateStr) {
    hash = ((hash * 33) ^ ch.codePointAt(0)!) >>> 0;
  }
  return hash % listLength;
}

export function todayLocalDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dailyWord(now: Date = new Date()): string {
  return ANSWERS[dailyIndex(todayLocalDateString(now), ANSWERS.length)] as string;
}

/** Merge a guess's verdicts into the keyboard letter state:
 * correct beats present beats absent; never downgrade. */
export type KeyState = "correct" | "present" | "absent" | "unused";

export function mergeKeyState(current: Record<string, KeyState>, guess: string, verdicts: Verdict[]): Record<string, KeyState> {
  const rank: Record<KeyState, number> = { unused: 0, absent: 1, present: 2, correct: 3 };
  const out = { ...current };
  for (let i = 0; i < guess.length; i++) {
    const letter = normalize(guess[i]);
    const verdict = verdicts[i];
    const existing = (out[letter] ?? "unused") as KeyState;
    if (rank[verdict] > rank[existing]) {
      out[letter] = verdict;
    }
  }
  return out;
}

export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
}

export function emptyStats(): Stats {
  return { played: 0, wins: 0, currentStreak: 0, maxStreak: 0 };
}

/** Update stats after a finished game. */
export function applyResult(stats: Stats, won: boolean): Stats {
  const next: Stats = {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak: won ? stats.currentStreak + 1 : 0,
    maxStreak: Math.max(stats.maxStreak, won ? stats.currentStreak + 1 : stats.currentStreak),
  };
  return next;
}
