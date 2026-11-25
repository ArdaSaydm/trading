import json
import os
import socket
import sqlite3
import sys
import threading
import urllib.error
import urllib.request
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import time
from urllib.parse import parse_qs, unquote, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(ROOT, "seviye.db")
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
PORT = int(ARGS[0]) if ARGS else 8000
LAN = "--lan" in sys.argv
BG = "--bg" in sys.argv
LOCK = threading.Lock()
CG = {"global": "https://api.coingecko.com/api/v3/global", "markets": "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1"}
CG_CACHE = {}
YF_CACHE = {}
CMC_CACHE = {}
CMC_G = {"5m", "15m", "1h", "1d"}
CMC_C = {"1h", "1d"}
CMC_IDS = {"825", "3408"}
YF_I = {"5m", "15m", "60m", "1d", "1wk", "1mo"}
YF_R = {"5d", "1mo", "2y", "60d", "730d", "max"}
CG_LOCK = threading.Lock()


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

    def end_headers(self):
        if not any(h.lower().startswith(b"cache-control") for h in getattr(self, "_headers_buffer", [])):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

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
        if self.path.split("?")[0] == "/api/cmc":
            self.send_cmc()
            return
        if self.path.split("?")[0] == "/api/info":
            self.send_json(200, {"lan": LAN, "port": PORT, "ips": lan_ips() if LAN else []})
            return
        if self.path.split("?")[0] == "/api/yf":
            self.send_yf()
            return
        if self.path.split("?")[0] == "/api/cg":
            self.send_cg()
            return
        if self.path in ("/", ""):
            self.path = "/seviye.html"
        super().do_GET()

    def send_cmc(self):
        qs = parse_qs(urlparse(self.path).query)
        g = lambda k: (qs.get(k) or [""])[0]
        kind, iv, a, b, cid = g("t"), g("iv"), g("a"), g("b"), g("id")
        if not (a.isdigit() and b.isdigit()) or (kind == "g" and iv not in CMC_G) or (kind == "c" and (iv not in CMC_C or cid not in CMC_IDS)) or kind not in ("g", "c"):
            self.send_json(400, {"error": "bad request"})
            return
        if kind == "g":
            url = "https://api.coinmarketcap.com/data-api/v3/global-metrics/quotes/historical?format=chart&interval=%s&timeStart=%s&timeEnd=%s" % (iv, a, b)
        else:
            url = "https://api.coinmarketcap.com/data-api/v3/cryptocurrency/historical?id=%s&convertId=2781&timeStart=%s&timeEnd=%s&interval=%s" % (cid, a, b, iv)
        hit = CMC_CACHE.get(url)
        if not hit or time.time() - hit[0] > 60:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=20) as r:
                    hit = (time.time(), r.read())
                if len(CMC_CACHE) > 300:
                    CMC_CACHE.clear()
                CMC_CACHE[url] = hit
            except Exception:
                if not hit:
                    self.send_json(502, {"error": "cmc"})
                    return
        data = hit[1]
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def send_yf(self):
        qs = parse_qs(urlparse(self.path).query)
        sym, iv, rng = (qs.get("s") or [""])[0], (qs.get("i") or [""])[0], (qs.get("r") or [""])[0]
        if not sym or len(sym) > 20 or not all(c.isalnum() or c in ".^-=" for c in sym) or iv not in YF_I or rng not in YF_R:
            self.send_json(400, {"error": "bad request"})
            return
        key = (sym, iv, rng)
        hit = YF_CACHE.get(key)
        if not hit or time.time() - hit[0] > 20:
            span = "period1=0&period2=%d" % (int(time.time()) + 86400) if rng == "max" else "range=" + rng
            url = "https://query1.finance.yahoo.com/v8/finance/chart/%s?%s&interval=%s&includePrePost=false" % (sym, span, iv)
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=20) as r:
                    hit = (time.time(), r.read())
                if len(YF_CACHE) > 200:
                    YF_CACHE.clear()
                YF_CACHE[key] = hit
            except urllib.error.HTTPError as e:
                self.send_json(e.code if e.code in (400, 404) else 502, {"error": "yahoo"})
                return
            except Exception:
                if not hit:
                    self.send_json(502, {"error": "yahoo"})
                    return
        data = hit[1]
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def send_cg(self):
        k = (parse_qs(urlparse(self.path).query).get("k") or [""])[0]
        if k not in CG:
            self.send_json(404, {"error": "not found"})
            return
        with CG_LOCK:
            hit = CG_CACHE.get(k)
            if not hit or time.time() - hit[0] > 240:
                try:
                    req = urllib.request.Request(CG[k], headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
                    with urllib.request.urlopen(req, timeout=15) as r:
                        hit = (time.time(), r.read())
                    CG_CACHE[k] = hit
                except Exception:
                    if hit:
                        CG_CACHE[k] = (time.time() - 120, hit[1])
        if not hit:
            self.send_json(502, {"error": "coingecko"})
            return
        data = hit[1]
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

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


def lan_ips():
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.append(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            if ip not in ips and not ip.startswith("127.") and (ip.startswith("192.168.") or ip.startswith("10.") or ip.startswith("172.")):
                ips.append(ip)
    except OSError:
        pass
    return ips


def main():
    db().close()
    url = f"http://localhost:{PORT}/seviye.html"
    try:
        server = ThreadingHTTPServer(("0.0.0.0" if LAN else "127.0.0.1", PORT), Handler)
    except OSError:
        if not BG:
            print("Seviye zaten calisiyor, tarayici aciliyor.")
            webbrowser.open(url)
        return
    print(f"Seviye calisiyor: {url}")
    if LAN:
        for ip in lan_ips():
            print(f"Telefondan: http://{ip}:{PORT}")
    print(f"Kayit dosyasi: {DB}")
    print("Kapatmak icin Ctrl+C")
    if not BG:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
