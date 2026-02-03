// KataGo座標変換ユーティリティ
import { BoardState, StoneColor } from '../components/GoBoard';
import { GameNode, getPath } from './treeUtilsV2';
import {
  KataGoQuery,
  KataGoResponse,
  StoneColorKG,
  SuggestedMove,
  AnalysisResult,
  OwnershipData,
  AnalysisOptions,
} from '../types/katago';

// GTP座標文字（Iをスキップ）
const GTP_LETTERS = 'ABCDEFGHJKLMNOPQRST';

/**
 * GORewrite座標 (1-indexed, 左上が(1,1)) からGTP座標へ変換
 * 例: (1, 1, 19) => "A19", (4, 4, 19) => "D16"
 */
export function toGtpCoord(x: number, y: number, boardSize: number): string {
  if (x < 1 || x > boardSize || y < 1 || y > boardSize) {
    return 'pass';
  }
  const col = GTP_LETTERS[x - 1];
  const row = boardSize - y + 1;
  return `${col}${row}`;
}

/**
 * GTP座標からGORewrite座標へ変換
 * 例: ("A19", 19) => {x: 1, y: 1}, ("D16", 19) => {x: 4, y: 4}
 */
export function fromGtpCoord(gtp: string, boardSize: number): { x: number; y: number } | null {
  if (!gtp || gtp.toLowerCase() === 'pass') {
    return null;
  }
  const col = GTP_LETTERS.indexOf(gtp[0].toUpperCase());
  if (col === -1) return null;

  const row = parseInt(gtp.slice(1), 10);
  if (isNaN(row)) return null;

  const x = col + 1;
  const y = boardSize - row + 1;

  if (x < 1 || x > boardSize || y < 1 || y > boardSize) {
    return null;
  }

  return { x, y };
}

/**
 * GORewriteの色をKataGo形式に変換
 */
export function toKataGoColor(color: StoneColor): StoneColorKG {
  return color === 'BLACK' ? 'B' : 'W';
}

/**
 * KataGoの色をGORewrite形式に変換
 */
export function fromKataGoColor(color: StoneColorKG): StoneColor {
  return color === 'B' ? 'BLACK' : 'WHITE';
}

/**
 * 盤面から初期配置の石を抽出（KataGo形式）
 */
export function extractInitialStones(
  rootBoard: BoardState,
  boardSize: number
): [StoneColorKG, string][] {
  const stones: [StoneColorKG, string][] = [];

  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const cell = rootBoard[y]?.[x];
      if (cell && cell.number === undefined) {
        // 番号なしの石は初期配置
        const gtpCoord = toGtpCoord(x + 1, y + 1, boardSize);
        stones.push([toKataGoColor(cell.color), gtpCoord]);
      }
    }
  }

  return stones;
}

/**
 * ゲームツリーから着手履歴を抽出（KataGo形式）
 */
export function extractMoveHistory(
  rootNode: GameNode,
  currentNodeId: string,
  boardSize: number
): [StoneColorKG, string][] {
  const path = getPath(rootNode, currentNodeId);
  const moves: [StoneColorKG, string][] = [];

  for (const node of path) {
    if (node.move) {
      const { x, y, color } = node.move;
      if (x > 0 && y > 0) {
        const gtpCoord = toGtpCoord(x, y, boardSize);
        moves.push([toKataGoColor(color), gtpCoord]);
      } else {
        // パス
        moves.push([toKataGoColor(color), 'pass']);
      }
    }
  }

  return moves;
}

/**
 * KataGoクエリを構築
 */
export function buildKataGoQuery(
  rootNode: GameNode,
  currentNodeId: string,
  boardSize: number,
  options: AnalysisOptions = {}
): KataGoQuery {
  const initialStones = extractInitialStones(rootNode.board, boardSize);
  const moves = extractMoveHistory(rootNode, currentNodeId, boardSize);

  return {
    id: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    moves,
    initialStones: initialStones.length > 0 ? initialStones : undefined,
    rules: options.rules || 'japanese',
    komi: options.komi ?? 6.5,
    boardXSize: boardSize,
    boardYSize: boardSize,
    maxVisits: options.maxVisits || 100,
    includeOwnership: options.includeOwnership ?? true,
    includePolicy: options.includePolicy ?? false,
    includePVVisits: options.includePVVisits ?? true,
  };
}

/**
 * KataGoレスポンスをUI用形式に変換
 */
export function parseKataGoResponse(
  response: KataGoResponse,
  boardSize: number
): AnalysisResult | null {
  if (response.error) {
    console.error('KataGo error:', response.error);
    return null;
  }

  const { rootInfo, moveInfos, ownership } = response;

  // 推奨手を変換
  const suggestedMoves: SuggestedMove[] = moveInfos
    .filter(m => m.move.toLowerCase() !== 'pass')
    .slice(0, 10)  // 上位10手
    .map((m, index) => {
      const coord = fromGtpCoord(m.move, boardSize);
      if (!coord) return null;

      // 変化図を変換
      const pv: SuggestedMove['pv'] = [];
      let pvColor: StoneColorKG = rootInfo.currentPlayer;
      for (const pvMove of m.pv.slice(0, 10)) {  // 最大10手
        const pvCoord = fromGtpCoord(pvMove, boardSize);
        if (pvCoord) {
          pv.push({ x: pvCoord.x, y: pvCoord.y, color: pvColor });
        }
        pvColor = pvColor === 'B' ? 'W' : 'B';
      }

      return {
        x: coord.x,
        y: coord.y,
        rank: index + 1,
        winrate: m.winrate * 100,
        scoreLead: m.scoreLead,
        visits: m.visits,
        pv,
      };
    })
    .filter((m): m is SuggestedMove => m !== null);

  // 領域情報を変換
  let ownershipData: OwnershipData | undefined;
  if (ownership && ownership.length === boardSize * boardSize) {
    const grid: number[][] = [];
    for (let y = 0; y < boardSize; y++) {
      const row: number[] = [];
      for (let x = 0; x < boardSize; x++) {
        // KataGoのownershipは行優先で左上から
        row.push(ownership[y * boardSize + x]);
      }
      grid.push(row);
    }
    ownershipData = { ownership: grid };
  }

  return {
    currentPlayer: rootInfo.currentPlayer,
    winrate: rootInfo.winrate * 100,
    scoreLead: rootInfo.scoreLead,
    visits: rootInfo.visits,
    suggestedMoves,
    ownership: ownershipData,
  };
}

/**
 * 勝率をパーセント文字列に変換
 */
export function formatWinrate(winrate: number): string {
  return `${winrate.toFixed(1)}%`;
}

/**
 * スコアリードを文字列に変換
 */
export function formatScoreLead(scoreLead: number, currentPlayer: StoneColorKG): string {
  const prefix = scoreLead > 0 ? '+' : '';
  const player = currentPlayer === 'B' ? '黒' : '白';
  return `${player} ${prefix}${scoreLead.toFixed(1)}目`;
}
