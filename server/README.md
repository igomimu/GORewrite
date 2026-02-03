# KataGo Bridge Server

GORewrite Chrome拡張機能とKataGoを接続するブリッジサーバー。

## セットアップ

### 1. Python依存関係のインストール

```bash
pip install -r requirements.txt
```

### 2. config.jsonの設定

`config.json`を編集して、KataGoのパスを設定:

```json
{
  "katago_path": "C:/path/to/katago.exe",
  "model_path": "C:/path/to/model.bin.gz",
  "config_path": "C:/path/to/analysis_config.cfg",
  "default_rules": "japanese",
  "default_komi": 6.5,
  "default_max_visits": 100,
  "port": 5000
}
```

- `katago_path`: KataGo実行ファイルへのパス
- `model_path`: ニューラルネットワークモデルファイル（.bin.gz）へのパス
- `config_path`: (オプション) 分析設定ファイルへのパス
- `default_rules`: デフォルトのルール（japanese, chinese, korean, tromp-taylor）
- `default_komi`: デフォルトのコミ
- `default_max_visits`: デフォルトの訪問数
- `port`: サーバーポート（デフォルト: 5000）

### 3. サーバーの起動

Windowsの場合:
```
start_server.bat
```

コマンドラインの場合:
```bash
python katago_bridge.py
```

## API

### REST API

- `GET /health` - ヘルスチェック
- `POST /analyze` - 局面を分析
- `POST /start` - KataGoを起動
- `POST /stop` - KataGoを停止
- `GET /config` - 設定を取得

### WebSocket

- `connect` - 接続時にKataGoの状態を受信
- `analyze` - 分析リクエストを送信
- `analysis_result` - 分析結果を受信

## 分析リクエスト例

```json
{
  "id": "query_1",
  "moves": [["B", "Q4"], ["W", "D16"]],
  "rules": "japanese",
  "komi": 6.5,
  "boardXSize": 19,
  "boardYSize": 19,
  "maxVisits": 100,
  "includeOwnership": true
}
```

## トラブルシューティング

### KataGoが起動しない

1. `katago_path`が正しいか確認
2. `model_path`が正しいか確認
3. KataGoをコマンドラインで直接実行してエラーを確認

### 接続できない

1. サーバーが起動しているか確認
2. ポートが他のアプリで使用されていないか確認
3. ファイアウォールの設定を確認
