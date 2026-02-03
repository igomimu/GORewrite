// KataGo Analysis Engine Protocol Types

export type StoneColorKG = 'B' | 'W';

export interface KataGoQuery {
  id: string;
  moves: [StoneColorKG, string][]; // ["B", "Q4"], ["W", "D16"]
  initialStones?: [StoneColorKG, string][];
  rules: string; // "tromp-taylor", "chinese", "japanese"
  komi: number;
  boardXSize: number;
  boardYSize: number;
  analyzeTurns?: number[];
  maxVisits?: number;
  includeOwnership?: boolean;
  includePolicy?: boolean;
  includePVVisits?: boolean;
}

export interface KataGoMoveInfo {
  move: string;           // "Q16" or "pass"
  visits: number;
  winrate: number;        // 0-1
  scoreLead: number;      // Points ahead (+ = current player)
  scoreStdev: number;
  prior: number;          // Policy prior 0-1
  utility: number;
  lcb: number;            // Lower confidence bound
  order: number;          // 0 = best move
  pv: string[];           // Principal variation
  pvVisits?: number[];    // Visits at each PV position
}

export interface KataGoRootInfo {
  currentPlayer: StoneColorKG;
  winrate: number;
  scoreLead: number;
  scoreStdev: number;
  visits: number;
  thisHash?: string;
  symHash?: string;
}

export interface KataGoResponse {
  id: string;
  turnNumber: number;
  moveInfos: KataGoMoveInfo[];
  rootInfo: KataGoRootInfo;
  ownership?: number[];   // Flattened boardXSize * boardYSize array, -1 to 1
  policy?: number[];      // Move probabilities
  isDuringSearch?: boolean;
  error?: string;
}

export interface AnalysisOptions {
  maxVisits?: number;
  rules?: string;
  komi?: number;
  includeOwnership?: boolean;
  includePolicy?: boolean;
  includePVVisits?: boolean;
}

export interface AnalysisState {
  isConnected: boolean;
  isAnalyzing: boolean;
  lastResult: KataGoResponse | null;
  error: string | null;
  serverUrl: string;
  autoAnalyze: boolean;
}

// UI用の変換済み推奨手情報
export interface SuggestedMove {
  x: number;              // GORewrite座標 (1-indexed)
  y: number;
  rank: number;           // 1 = best
  winrate: number;        // 0-100 percentage
  scoreLead: number;
  visits: number;
  pv: { x: number; y: number; color: StoneColorKG }[];  // 変化図
}

// 領域情報（盤面座標に変換済み）
export interface OwnershipData {
  ownership: number[][];  // -1 (white) to +1 (black) per intersection
}

// 検討結果（UI表示用）
export interface AnalysisResult {
  currentPlayer: StoneColorKG;
  winrate: number;        // 0-100 percentage for current player
  scoreLead: number;      // Points ahead for current player
  visits: number;
  suggestedMoves: SuggestedMove[];
  ownership?: OwnershipData;
}
