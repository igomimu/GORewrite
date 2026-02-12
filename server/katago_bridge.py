#!/usr/bin/env python3
"""
KataGo Bridge Server for SnapGoban Chrome Extension
Flask + WebSocket server that communicates with KataGo analysis engine
"""

import json
import subprocess
import threading
import queue
import os
import sys
import time
from typing import Optional, Dict, Any

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit

# Configuration
DEFAULT_CONFIG = {
    "katago_path": "",  # Path to katago executable
    "model_path": "",   # Path to model file (.bin.gz)
    "config_path": "",  # Path to analysis config file
    "default_rules": "japanese",
    "default_komi": 6.5,
    "default_max_visits": 100,
    "port": 5000
}

app = Flask(__name__)
CORS(app, origins=["chrome-extension://*", "http://localhost:*"])
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')


class KataGoManager:
    """Manages KataGo process lifecycle and communication"""

    def __init__(self, katago_path: str, model_path: str, config_path: str):
        self.katago_path = katago_path
        self.model_path = model_path
        self.config_path = config_path
        self.process: Optional[subprocess.Popen] = None
        self.response_callbacks: Dict[str, queue.Queue] = {}
        self.lock = threading.Lock()
        self.reader_thread: Optional[threading.Thread] = None
        self.stderr_thread: Optional[threading.Thread] = None
        self.is_running = False
        self.is_ready = False

    def start(self) -> bool:
        """Start KataGo analysis engine"""
        if self.is_running:
            return True

        try:
            cmd = [self.katago_path, "analysis", "-model", self.model_path]
            if self.config_path:
                cmd.extend(["-config", self.config_path])

            self.process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )

            self.is_running = True
            self.is_ready = False
            self.reader_thread = threading.Thread(target=self._read_responses, daemon=True)
            self.reader_thread.start()
            self.stderr_thread = threading.Thread(target=self._read_stderr, daemon=True)
            self.stderr_thread.start()

            # Wait for KataGo to be ready (up to 30 seconds)
            for _ in range(60):
                time.sleep(0.5)
                if self.is_ready:
                    break
                if self.process.poll() is not None:
                    print(f"KataGo process exited unexpectedly", file=sys.stderr)
                    self.is_running = False
                    return False

            if not self.is_ready:
                print(f"KataGo did not become ready in time", file=sys.stderr)
                self.stop()
                return False

            print(f"KataGo started successfully")
            return True

        except Exception as e:
            print(f"Failed to start KataGo: {e}", file=sys.stderr)
            self.is_running = False
            return False

    def stop(self):
        """Stop KataGo process"""
        self.is_running = False
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
            except Exception:
                self.process.kill()
            self.process = None

    def analyze(self, query: Dict[str, Any], timeout: float = 30.0) -> Dict[str, Any]:
        """Send analysis query and wait for response"""
        if not self.is_running or not self.process:
            return {"error": "KataGo is not running"}

        query_id = query.get("id", f"q_{time.time()}")
        query["id"] = query_id

        # Create response queue for this query
        response_queue: queue.Queue = queue.Queue()
        with self.lock:
            self.response_callbacks[query_id] = response_queue

        try:
            # Send query
            query_str = json.dumps(query) + "\n"
            self.process.stdin.write(query_str)
            self.process.stdin.flush()

            # Wait for response
            try:
                response = response_queue.get(timeout=timeout)
                return response
            except queue.Empty:
                return {"id": query_id, "error": "Analysis timeout"}

        finally:
            with self.lock:
                self.response_callbacks.pop(query_id, None)

    def _read_responses(self):
        """Background thread to read KataGo responses"""
        while self.is_running and self.process and self.process.stdout:
            try:
                line = self.process.stdout.readline()
                if not line:
                    if self.process.poll() is not None:
                        break
                    continue

                line = line.strip()
                if not line:
                    continue

                try:
                    response = json.loads(line)
                    query_id = response.get("id")

                    with self.lock:
                        if query_id and query_id in self.response_callbacks:
                            self.response_callbacks[query_id].put(response)
                        else:
                            # Broadcast to WebSocket clients if no callback waiting
                            socketio.emit('analysis_result', response)

                except json.JSONDecodeError as e:
                    print(f"Failed to parse KataGo response: {e}", file=sys.stderr)

            except Exception as e:
                if self.is_running:
                    print(f"Error reading KataGo output: {e}", file=sys.stderr)
                break

        print("KataGo reader thread stopped")

    def _read_stderr(self):
        """Background thread to read KataGo stderr (logs)"""
        while self.is_running and self.process and self.process.stderr:
            try:
                line = self.process.stderr.readline()
                if not line:
                    if self.process.poll() is not None:
                        break
                    continue

                line = line.strip()
                if line:
                    print(f"[KataGo] {line}")
                    # Check if KataGo is ready
                    if "ready to begin handling requests" in line.lower():
                        self.is_ready = True

            except Exception as e:
                if self.is_running:
                    print(f"Error reading KataGo stderr: {e}", file=sys.stderr)
                break

        print("KataGo stderr thread stopped")


# Global KataGo manager
katago: Optional[KataGoManager] = None
config: Dict[str, Any] = DEFAULT_CONFIG.copy()


def load_config():
    """Load configuration from config.json"""
    global config
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                config.update(loaded)
                print(f"Loaded config from {config_path}")
        except Exception as e:
            print(f"Failed to load config: {e}", file=sys.stderr)


def init_katago():
    """Initialize KataGo manager"""
    global katago
    if not config["katago_path"]:
        print("KataGo path not configured. Set katago_path in config.json", file=sys.stderr)
        return False

    if not config["model_path"]:
        print("Model path not configured. Set model_path in config.json", file=sys.stderr)
        return False

    katago = KataGoManager(
        config["katago_path"],
        config["model_path"],
        config.get("config_path", "")
    )
    return katago.start()


# REST API endpoints

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "katago_running": katago.is_running if katago else False
    })


@app.route('/analyze', methods=['POST'])
def analyze():
    """Analyze a position"""
    if not katago or not katago.is_running:
        return jsonify({"error": "KataGo is not running"}), 503

    query = request.json
    if not query:
        return jsonify({"error": "No query provided"}), 400

    # Apply defaults
    query.setdefault("rules", config["default_rules"])
    query.setdefault("komi", config["default_komi"])
    query.setdefault("maxVisits", config["default_max_visits"])

    result = katago.analyze(query)
    return jsonify(result)


@app.route('/start', methods=['POST'])
def start_katago():
    """Start KataGo engine"""
    if katago and katago.is_running:
        return jsonify({"status": "already_running"})

    if init_katago():
        return jsonify({"status": "started"})
    else:
        return jsonify({"error": "Failed to start KataGo"}), 500


@app.route('/stop', methods=['POST'])
def stop_katago():
    """Stop KataGo engine"""
    if katago:
        katago.stop()
    return jsonify({"status": "stopped"})


@app.route('/config', methods=['GET'])
def get_config():
    """Get current configuration (without sensitive paths)"""
    return jsonify({
        "default_rules": config["default_rules"],
        "default_komi": config["default_komi"],
        "default_max_visits": config["default_max_visits"],
        "katago_configured": bool(config["katago_path"]),
        "model_configured": bool(config["model_path"])
    })


# WebSocket handlers

@socketio.on('connect')
def handle_connect():
    print(f"Client connected")
    emit('status', {
        "katago_running": katago.is_running if katago else False
    })


@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected")


@socketio.on('analyze')
def handle_analyze(query):
    """Handle analysis request via WebSocket"""
    if not katago or not katago.is_running:
        emit('error', {"error": "KataGo is not running"})
        return

    # Apply defaults
    query.setdefault("rules", config["default_rules"])
    query.setdefault("komi", config["default_komi"])
    query.setdefault("maxVisits", config["default_max_visits"])

    # Run analysis in background thread
    def analyze_async():
        result = katago.analyze(query)
        socketio.emit('analysis_result', result)

    threading.Thread(target=analyze_async, daemon=True).start()


if __name__ == '__main__':
    load_config()

    # Try to start KataGo
    if config["katago_path"] and config["model_path"]:
        init_katago()
    else:
        print("=" * 50)
        print("KataGo not configured!")
        print("Please edit config.json and set:")
        print("  - katago_path: Path to KataGo executable")
        print("  - model_path: Path to model file (.bin.gz)")
        print("=" * 50)

    port = config.get("port", 5000)
    print(f"Starting server on http://127.0.0.1:{port}")
    socketio.run(app, host='127.0.0.1', port=port, debug=False)
