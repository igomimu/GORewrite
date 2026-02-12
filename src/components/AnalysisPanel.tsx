// AI検討パネルコンポーネント
import { useState, useCallback } from 'react';
import { AnalysisResult, SuggestedMove, StoneColorKG, WinrateHistoryEntry } from '../types/katago';
import { formatWinrate, formatScoreLead } from '../utils/katagoUtils';
import WinrateGraph from './WinrateGraph';

interface AnalysisPanelProps {
  isConnected: boolean;
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  error: string | null;
  autoAnalyze: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onAnalyze: () => void;
  onAutoAnalyzeChange: (enabled: boolean) => void;
  onMoveClick?: (move: SuggestedMove) => void;
  onMoveHover?: (move: SuggestedMove | null) => void;
  onShowOwnership?: (show: boolean) => void;
  showOwnership?: boolean;
  maxVisits: number;
  onMaxVisitsChange: (visits: number) => void;
  // 勝率グラフ用
  winrateHistory?: WinrateHistoryEntry[];
  currentMoveNumber?: number;
  onGraphMoveClick?: (moveNumber: number, nodeId: string) => void;
}

export default function AnalysisPanel({
  isConnected,
  isAnalyzing,
  result,
  error,
  autoAnalyze,
  onConnect,
  onDisconnect,
  onAnalyze,
  onAutoAnalyzeChange,
  onMoveClick,
  onMoveHover,
  onShowOwnership,
  showOwnership = false,
  maxVisits,
  onMaxVisitsChange,
  winrateHistory = [],
  currentMoveNumber = 0,
  onGraphMoveClick,
}: AnalysisPanelProps) {
  const [hoveredMoveIndex, setHoveredMoveIndex] = useState<number | null>(null);

  const handleMoveHover = useCallback(
    (move: SuggestedMove | null, index: number | null) => {
      setHoveredMoveIndex(index);
      onMoveHover?.(move);
    },
    [onMoveHover]
  );

  // 勝率バーの色を決定
  const getWinrateBarColor = (winrate: number, player: StoneColorKG): string => {
    // 黒の勝率として表示
    const blackWinrate = player === 'B' ? winrate : 100 - winrate;
    if (blackWinrate >= 60) return 'bg-gray-800';
    if (blackWinrate <= 40) return 'bg-white border border-gray-300';
    return 'bg-gray-400';
  };

  // 推奨手の色を決定
  const getMoveColor = (rank: number, winrate: number): string => {
    if (rank === 1) return 'bg-green-100 border-green-400 text-green-800';
    if (winrate >= 45) return 'bg-blue-50 border-blue-200 text-blue-800';
    if (winrate >= 30) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-red-50 border-red-200 text-red-800';
  };

  return (
    <div className="bg-white border border-purple-200 rounded-lg shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-purple-50 px-3 py-2 border-b border-purple-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-purple-700 font-medium text-sm">AI検討</span>
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-400'
            }`}
            title={isConnected ? '接続中' : '未接続'}
          />
        </div>
        <button
          onClick={isConnected ? onDisconnect : onConnect}
          className={`text-xs px-2 py-1 rounded ${
            isConnected
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {isConnected ? '切断' : '接続'}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 text-red-700 text-xs px-3 py-2 border-b border-red-100">
          {error}
        </div>
      )}

      {/* コントロール */}
      {isConnected && (
        <div className="px-3 py-2 border-b border-gray-100 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className={`flex-1 text-xs px-3 py-1.5 rounded font-medium ${
                isAnalyzing
                  ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
            >
              {isAnalyzing ? '分析中...' : '分析'}
            </button>
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={autoAnalyze}
                onChange={(e) => onAutoAnalyzeChange(e.target.checked)}
                className="w-3 h-3"
              />
              自動
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">訪問数:</span>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={maxVisits}
              onChange={(e) => onMaxVisitsChange(parseInt(e.target.value))}
              className="flex-1 h-1"
            />
            <span className="text-xs text-gray-600 w-8">{maxVisits}</span>
          </div>

          {result?.ownership && (
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={showOwnership}
                onChange={(e) => onShowOwnership?.(e.target.checked)}
                className="w-3 h-3"
              />
              領域表示
            </label>
          )}
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="px-3 py-2 space-y-3">
          {/* 勝率バー */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-800 font-medium">黒</span>
              <span className="text-gray-500">白</span>
            </div>
            <div className="h-4 bg-white border border-gray-200 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-300 ${
                  result.currentPlayer === 'B'
                    ? getWinrateBarColor(result.winrate, 'B')
                    : getWinrateBarColor(100 - result.winrate, 'B')
                }`}
                style={{
                  width: `${
                    result.currentPlayer === 'B'
                      ? result.winrate
                      : 100 - result.winrate
                  }%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {formatWinrate(
                  result.currentPlayer === 'B'
                    ? result.winrate
                    : 100 - result.winrate
                )}
              </span>
              <span>
                {formatWinrate(
                  result.currentPlayer === 'B'
                    ? 100 - result.winrate
                    : result.winrate
                )}
              </span>
            </div>
          </div>

          {/* 勝率推移グラフ */}
          <WinrateGraph
            history={winrateHistory}
            currentMoveNumber={currentMoveNumber}
            onMoveClick={onGraphMoveClick}
            height={100}
          />

          {/* スコアリード */}
          <div className="text-center text-sm">
            <span className="text-gray-600">
              {formatScoreLead(result.scoreLead, result.currentPlayer)}
            </span>
            <span className="text-xs text-gray-400 ml-2">
              ({result.visits}回読み)
            </span>
          </div>

          {/* 推奨手リスト */}
          <div className="space-y-1">
            <div className="text-xs text-gray-500 font-medium">推奨手</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {result.suggestedMoves.slice(0, 5).map((move, index) => (
                <div
                  key={`${move.x}-${move.y}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-colors ${
                    getMoveColor(move.rank, move.winrate)
                  } ${hoveredMoveIndex === index ? 'ring-2 ring-purple-300' : ''}`}
                  onClick={() => onMoveClick?.(move)}
                  onMouseEnter={() => handleMoveHover(move, index)}
                  onMouseLeave={() => handleMoveHover(null, null)}
                >
                  <span className="w-5 h-5 flex items-center justify-center bg-white rounded text-xs font-bold">
                    {move.rank}
                  </span>
                  <span className="font-mono text-sm flex-1">
                    {String.fromCharCode(64 + move.x)}
                    {19 - move.y + 1}
                  </span>
                  <span className="text-xs">
                    {formatWinrate(move.winrate)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {move.visits}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 変化図プレビュー */}
          {hoveredMoveIndex !== null &&
            result.suggestedMoves[hoveredMoveIndex]?.pv.length > 0 && (
              <div className="text-xs text-gray-500 border-t border-gray-100 pt-2">
                <span className="font-medium">変化図: </span>
                {result.suggestedMoves[hoveredMoveIndex].pv
                  .slice(0, 5)
                  .map((m, i) => (
                    <span key={i} className="mr-1">
                      {m.color === 'B' ? '●' : '○'}
                      {String.fromCharCode(64 + m.x)}
                      {19 - m.y + 1}
                    </span>
                  ))}
                {result.suggestedMoves[hoveredMoveIndex].pv.length > 5 && '...'}
              </div>
            )}
        </div>
      )}

      {/* 未接続時のメッセージ */}
      {!isConnected && !error && (
        <div className="px-3 py-4 text-center text-xs text-gray-400">
          「接続」ボタンをクリックしてKataGoサーバーに接続してください
        </div>
      )}

      {/* 接続中・結果なしのメッセージ */}
      {isConnected && !result && !isAnalyzing && !error && (
        <div className="px-3 py-4 text-center text-xs text-gray-400">
          「分析」ボタンをクリックして局面を分析してください
        </div>
      )}
    </div>
  );
}
