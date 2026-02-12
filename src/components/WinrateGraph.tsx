// 勝率推移グラフコンポーネント
import { useMemo } from 'react';
import { WinrateHistoryEntry } from '../types/katago';

interface WinrateGraphProps {
  history: WinrateHistoryEntry[];
  currentMoveNumber: number;
  onMoveClick?: (moveNumber: number, nodeId: string) => void;
  height?: number;
}

export default function WinrateGraph({
  history,
  currentMoveNumber,
  onMoveClick,
  height = 120,
}: WinrateGraphProps) {
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };
  const width = 300;

  const graphData = useMemo(() => {
    if (history.length === 0) return null;

    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const maxMove = Math.max(...history.map(h => h.moveNumber), 1);
    const xScale = (move: number) => padding.left + (move / maxMove) * innerWidth;
    const yScale = (winrate: number) => padding.top + ((100 - winrate) / 100) * innerHeight;

    // 分析済みのポイントのみでパスを作成
    const analyzedPoints = history.filter(h => h.isAnalyzed);
    if (analyzedPoints.length === 0) return null;

    const pathD = analyzedPoints
      .map((h, i) => {
        const x = xScale(h.moveNumber);
        const y = yScale(h.blackWinrate);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    return {
      innerWidth,
      innerHeight,
      xScale,
      yScale,
      pathD,
      analyzedPoints,
      maxMove,
    };
  }, [history, height]);

  if (!graphData) {
    return (
      <div
        className="bg-gray-50 border border-gray-200 rounded flex items-center justify-center text-xs text-gray-400"
        style={{ height }}
      >
        分析データなし
      </div>
    );
  }

  const { innerWidth, innerHeight, xScale, yScale, pathD, analyzedPoints, maxMove } = graphData;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="bg-gray-50 border border-gray-200 rounded"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* 背景グラデーション */}
      <defs>
        <linearGradient id="winrateGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#888888" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <rect
        x={padding.left}
        y={padding.top}
        width={innerWidth}
        height={innerHeight}
        fill="url(#winrateGradient)"
      />

      {/* 50%ライン */}
      <line
        x1={padding.left}
        y1={yScale(50)}
        x2={padding.left + innerWidth}
        y2={yScale(50)}
        stroke="#888"
        strokeWidth={1}
        strokeDasharray="4,4"
      />

      {/* Y軸ラベル */}
      <text x={padding.left - 5} y={yScale(100)} fontSize={8} textAnchor="end" fill="#666">100</text>
      <text x={padding.left - 5} y={yScale(50)} fontSize={8} textAnchor="end" fill="#666">50</text>
      <text x={padding.left - 5} y={yScale(0)} fontSize={8} textAnchor="end" fill="#666">0</text>

      {/* X軸 */}
      <line
        x1={padding.left}
        y1={padding.top + innerHeight}
        x2={padding.left + innerWidth}
        y2={padding.top + innerHeight}
        stroke="#ccc"
        strokeWidth={1}
      />

      {/* X軸ラベル */}
      <text x={padding.left} y={height - 5} fontSize={8} textAnchor="start" fill="#666">0</text>
      <text x={padding.left + innerWidth} y={height - 5} fontSize={8} textAnchor="end" fill="#666">{maxMove}</text>

      {/* 折れ線 */}
      <path
        d={pathD}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* データポイント */}
      {analyzedPoints.map((h) => (
        <circle
          key={h.nodeId}
          cx={xScale(h.moveNumber)}
          cy={yScale(h.blackWinrate)}
          r={h.moveNumber === currentMoveNumber ? 5 : 3}
          fill={h.moveNumber === currentMoveNumber ? '#ef4444' : '#3b82f6'}
          stroke="#fff"
          strokeWidth={1}
          className="cursor-pointer"
          onClick={() => onMoveClick?.(h.moveNumber, h.nodeId)}
        >
          <title>
            {h.moveNumber}手目: 黒{h.blackWinrate.toFixed(1)}%
          </title>
        </circle>
      ))}

      {/* 現在位置インジケーター */}
      {currentMoveNumber > 0 && (
        <line
          x1={xScale(currentMoveNumber)}
          y1={padding.top}
          x2={xScale(currentMoveNumber)}
          y2={padding.top + innerHeight}
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="2,2"
          opacity={0.5}
        />
      )}

      {/* 凡例 */}
      <g transform={`translate(${padding.left + 5}, ${padding.top + 5})`}>
        <rect x={0} y={0} width={8} height={8} fill="#000" opacity={0.7} />
        <text x={12} y={7} fontSize={8} fill="#333">黒有利</text>
      </g>
      <g transform={`translate(${padding.left + 5}, ${padding.top + innerHeight - 12})`}>
        <rect x={0} y={0} width={8} height={8} fill="#fff" stroke="#000" strokeWidth={0.5} />
        <text x={12} y={7} fontSize={8} fill="#333">白有利</text>
      </g>
    </svg>
  );
}
