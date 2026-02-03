// KataGo Bridge Server Client
import { KataGoResponse, AnalysisOptions } from '../types/katago';
import { GameNode } from '../utils/treeUtilsV2';
import { buildKataGoQuery, parseKataGoResponse } from '../utils/katagoUtils';
import type { AnalysisResult } from '../types/katago';

type ConnectionCallback = (connected: boolean) => void;
type AnalysisCallback = (result: AnalysisResult | null, error?: string) => void;

export class KataGoClient {
  private serverUrl: string;
  private ws: WebSocket | null = null;
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private analysisCallbacks: Map<string, AnalysisCallback> = new Map();
  private reconnectTimer: number | null = null;
  private _isConnected: boolean = false;

  constructor(serverUrl: string = 'http://localhost:5000') {
    this.serverUrl = serverUrl;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * サーバーのヘルスチェック
   */
  async checkHealth(): Promise<{ status: string; katago_running: boolean } | null> {
    try {
      const response = await fetch(`${this.serverUrl}/health`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error('Health check failed:', e);
    }
    return null;
  }

  /**
   * HTTP経由で分析リクエストを送信
   */
  async analyzeHttp(
    rootNode: GameNode,
    currentNodeId: string,
    boardSize: number,
    options?: AnalysisOptions
  ): Promise<AnalysisResult | null> {
    const query = buildKataGoQuery(rootNode, currentNodeId, boardSize, options);

    try {
      const response = await fetch(`${this.serverUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const result: KataGoResponse = await response.json();
      return parseKataGoResponse(result, boardSize);
    } catch (e) {
      console.error('Analysis request failed:', e);
      throw e;
    }
  }

  /**
   * WebSocket接続を開始
   */
  connectWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve(true);
        return;
      }

      // HTTPからWebSocketに変換
      const wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/socket.io/?transport=websocket';

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this._isConnected = true;
          this.notifyConnectionChange(true);
          resolve(true);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this._isConnected = false;
          this.ws = null;
          this.notifyConnectionChange(false);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this._isConnected = false;
          resolve(false);
        };

        this.ws.onmessage = (event) => {
          this.handleWebSocketMessage(event.data);
        };
      } catch (e) {
        console.error('WebSocket connection failed:', e);
        resolve(false);
      }
    });
  }

  /**
   * WebSocket接続を切断
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._isConnected = false;
    this.notifyConnectionChange(false);
  }

  /**
   * WebSocket経由で分析リクエストを送信
   */
  analyzeWebSocket(
    rootNode: GameNode,
    currentNodeId: string,
    boardSize: number,
    options?: AnalysisOptions,
    callback?: AnalysisCallback
  ): string | null {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      callback?.(null, 'WebSocket not connected');
      return null;
    }

    const query = buildKataGoQuery(rootNode, currentNodeId, boardSize, options);

    if (callback) {
      this.analysisCallbacks.set(query.id, callback);
    }

    // Socket.IOプロトコル形式でメッセージを送信
    const message = JSON.stringify(['analyze', query]);
    this.ws.send(`42${message}`);

    return query.id;
  }

  /**
   * 接続状態変更コールバックを登録
   */
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  private notifyConnectionChange(connected: boolean): void {
    this.connectionCallbacks.forEach((cb) => cb(connected));
  }

  private handleWebSocketMessage(data: string): void {
    try {
      // Socket.IOプロトコルをパース
      if (data.startsWith('42')) {
        const parsed = JSON.parse(data.slice(2));
        const [event, payload] = parsed;

        if (event === 'analysis_result') {
          this.handleAnalysisResult(payload);
        } else if (event === 'status') {
          console.log('Server status:', payload);
        } else if (event === 'error') {
          console.error('Server error:', payload);
        }
      }
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  }

  private handleAnalysisResult(response: KataGoResponse): void {
    const callback = this.analysisCallbacks.get(response.id);
    if (callback) {
      this.analysisCallbacks.delete(response.id);
      // ボードサイズを取得（クエリに含まれている必要がある）
      const boardSize = (response as any).boardXSize || 19;
      const result = parseKataGoResponse(response, boardSize);
      callback(result);
    }
  }

  /**
   * サーバーURLを変更
   */
  setServerUrl(url: string): void {
    if (this.serverUrl !== url) {
      this.disconnect();
      this.serverUrl = url;
    }
  }

  /**
   * KataGoを起動
   */
  async startKataGo(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/start`, {
        method: 'POST',
      });
      const result = await response.json();
      return result.status === 'started' || result.status === 'already_running';
    } catch (e) {
      console.error('Failed to start KataGo:', e);
      return false;
    }
  }

  /**
   * KataGoを停止
   */
  async stopKataGo(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/stop`, {
        method: 'POST',
      });
      const result = await response.json();
      return result.status === 'stopped';
    } catch (e) {
      console.error('Failed to stop KataGo:', e);
      return false;
    }
  }
}

// シングルトンインスタンス
export const katagoClient = new KataGoClient();
