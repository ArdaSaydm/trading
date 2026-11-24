import json
import os
import sqlite3
import sys
import threading
import urllib.request
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(ROOT, "seviye.db")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
LOCK = threading.Lock()


def db():
    con = sqlite3.connect(DB)
    con.execute("CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated TEXT DEFAULT CURRENT_TIMESTAMP)")
    return con


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        pass

    def handle(self):
        try:
            super().handle()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass

    def send_json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/state":
            with LOCK, db() as con:
                rows = con.execute("SELECT key, value FROM state").fetchall()
            self.send_json(200, {k: json.loads(v) for k, v in rows})
            return
        if self.path in ("/", ""):
            self.path = "/seviye.html"
        super().do_GET()

    def do_POST(self):
        if self.path != "/api/hl":
            self.send_json(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length", 0))
        if length > 20000:
            self.send_json(400, {"error": "bad request"})
            return
        body = self.rfile.read(length)
        req = urllib.request.Request("https://api.hyperliquid.xyz/info", data=body, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = r.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            return
        except Exception as e:
            self.send_json(502, {"error": str(e)})

    def do_PUT(self):
        if not self.path.startswith("/api/state/"):
            self.send_json(404, {"error": "not found"})
            return
        key = unquote(self.path[len("/api/state/"):])
        length = int(self.headers.get("Content-Length", 0))
        if not key or length > 5_000_000:
            self.send_json(400, {"error": "bad request"})
            return
        try:
            value = json.loads(self.rfile.read(length).decode("utf-8"))
        except ValueError:
            self.send_json(400, {"error": "invalid json"})
            return
        with LOCK, db() as con:
            con.execute(
                "INSERT INTO state (key, value, updated) VALUES (?, ?, CURRENT_TIMESTAMP) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated = CURRENT_TIMESTAMP",
                (key, json.dumps(value, ensure_ascii=False)),
            )
        self.send_json(200, {"ok": True})


def main():
    db().close()
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://localhost:{PORT}/seviye.html"
    print(f"Seviye calisiyor: {url}")
    print(f"Kayit dosyasi: {DB}")
    print("Kapatmak icin Ctrl+C")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
