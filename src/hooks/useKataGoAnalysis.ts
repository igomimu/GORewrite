// KataGo Analysis React Hook
import { useState, useCallback, useEffect, useRef } from 'react';
import { katagoClient } from '../services/katagoClient';
import { GameNode } from '../utils/treeUtilsV2';
import { AnalysisOptions, AnalysisResult, AnalysisState } from '../types/katago';

export interface UseKataGoAnalysisReturn extends AnalysisState {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  analyzePosition: (
    rootNode: GameNode,
    currentNodeId: string,
    boardSize: number,
    options?: AnalysisOptions
  ) => Promise<AnalysisResult | null>;
  setAutoAnalyze: (enabled: boolean) => void;
  setServerUrl: (url: string) => void;
  clearResult: () => void;
}

export function useKataGoAnalysis(): UseKataGoAnalysisReturn {
  const [state, setState] = useState<AnalysisState>({
    isConnected: false,
    isAnalyzing: false,
    lastResult: null,
    error: null,
    serverUrl: 'http://localhost:5000',
    autoAnalyze: false,
  });

  const lastAnalyzedPosition = useRef<string>('');

  // 接続状態変更を監視
  useEffect(() => {
    const unsubscribe = katagoClient.onConnectionChange((connected) => {
      setState((prev) => ({ ...prev, isConnected: connected }));
    });
    return unsubscribe;
  }, []);

  // 接続
  const connect = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, error: null }));

    // まずヘルスチェック
    const health = await katagoClient.checkHealth();
    if (!health) {
      setState((prev) => ({
        ...prev,
        error: 'サーバーに接続できません。サーバーが起動しているか確認してください。',
      }));
      return false;
    }

    if (!health.katago_running) {
      // KataGoを起動
      const started = await katagoClient.startKataGo();
      if (!started) {
        setState((prev) => ({
          ...prev,
          error: 'KataGoの起動に失敗しました。config.jsonを確認してください。',
        }));
        return false;
      }
    }

    setState((prev) => ({ ...prev, isConnected: true }));
    return true;
  }, []);

  // 切断
  const disconnect = useCallback(() => {
    katagoClient.disconnect();
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isAnalyzing: false,
      lastResult: null,
    }));
  }, []);

  // 局面を分析
  const analyzePosition = useCallback(
    async (
      rootNode: GameNode,
      currentNodeId: string,
      boardSize: number,
      options?: AnalysisOptions
    ): Promise<AnalysisResult | null> => {
      // 同じ局面は再分析しない
      const positionKey = `${currentNodeId}_${options?.maxVisits || 100}`;
      if (positionKey === lastAnalyzedPosition.current) {
        return state.lastResult as AnalysisResult | null;
      }

      setState((prev) => ({ ...prev, isAnalyzing: true, error: null }));

      try {
        const result = await katagoClient.analyzeHttp(
          rootNode,
          currentNodeId,
          boardSize,
          options
        );

        lastAnalyzedPosition.current = positionKey;
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          lastResult: result as any,
        }));
        return result;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : '分析に失敗しました';
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    [state.lastResult]
  );

  // 自動分析の切り替え
  const setAutoAnalyze = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, autoAnalyze: enabled }));
  }, []);

  // サーバーURLの設定
  const setServerUrl = useCallback((url: string) => {
    katagoClient.setServerUrl(url);
    setState((prev) => ({
      ...prev,
      serverUrl: url,
      isConnected: false,
    }));
  }, []);

  // 結果をクリア
  const clearResult = useCallback(() => {
    lastAnalyzedPosition.current = '';
    setState((prev) => ({
      ...prev,
      lastResult: null,
      error: null,
    }));
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    analyzePosition,
    setAutoAnalyze,
    setServerUrl,
    clearResult,
  };
}
