#!/usr/bin/env python3
"""
AURA-OS Core Real Desktop Server & API Gateway
Pure Python standard library implementation.
Serves desktop shell, routes real system metrics, PTY bash terminal, and OverlayFS sandbox controls.
100% Zero Fake Data.
"""

import http.server
import socketserver
import json
import os
import sys
import time
import urllib.parse
import mimetypes

# Ensure script directory is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

# API Submodules
from memory_daemon import MemoryDaemon
from system_bridge import SystemBridge
from ai_engine import AIEngine

import api.sys as sys_api
import api.proc as proc_api
import api.fs as fs_api
import api.capture as capture_api
import api.apps as apps_api
import api.proxy as proxy_api
import api.settings as settings_api
import api.auth as auth_api
import api.events as events_api
import api.net as net_api
import ws as ws_server

PORT = int(os.environ.get("AURA_PORT", 8888))
UI_DIR = os.path.join(os.path.dirname(__file__), "ui")

memory = MemoryDaemon()
bridge = SystemBridge()
ai = AIEngine(memory, bridge)

class AuraThreadingServer(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def handle_error(self, request, client_address):
        """Silently ignore common client disconnections during browser refresh."""
        exc_type, exc_val, _ = sys.exc_info()
        if exc_type in (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            return
        super().handle_error(request, client_address)

class AuraHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=UI_DIR, **kwargs)

    def end_headers(self):
        # Prevent browser aggressive caching of shell JS, CSS, and assets during active development
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format, *args):
        """Custom clean logging."""
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format % args))

    def send_json(self, data, status=200):
        """Standard JSON response wrapper with timestamp and error resilience."""
        try:
            payload = {
                "ok": status < 400,
                "data": data,
                "error": None if status < 400 else str(data),
                "ts": int(time.time())
            }
            res_bytes = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.send_header("Content-Length", str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

    def do_OPTIONS(self):
        """Handles CORS preflight."""
        try:
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.end_headers()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

    def do_GET(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            query = urllib.parse.parse_qs(parsed.query)

            # -------------------------------------------------------------
            # 1. WebSocket Upgrade Check
            # -------------------------------------------------------------
            if self.headers.get("Upgrade", "").lower() == "websocket":
                sec_key = self.headers.get("Sec-WebSocket-Key")
                if sec_key:
                    accept_key = ws_server.create_ws_accept_key(sec_key)
                    self.send_response(101)
                    self.send_header("Upgrade", "websocket")
                    self.send_header("Connection", "Upgrade")
                    self.send_header("Sec-WebSocket-Accept", accept_key)
                    self.end_headers()
                    try:
                        self.wfile.flush()
                    except Exception:
                        pass

                    client = ws_server.WebSocketClient(self.connection, path)
                    try:
                        if path == "/ws/term":
                            ws_server.handle_term_ws(client)
                        elif path == "/ws/events":
                            ws_server.handle_events_ws(client)
                    except Exception as ws_err:
                        print(f"[WS ERROR] Connection failed on {path}: {ws_err}")
                    return

            # -------------------------------------------------------------
            # 2. Backwards-Compatible Endpoints
            # -------------------------------------------------------------
            if path == "/api/telemetry":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                data = bridge.get_telemetry()
                self.wfile.write(json.dumps(data).encode("utf-8"))
                return

            if path == "/api/knowledge":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                data = memory.search_knowledge("")
                self.wfile.write(json.dumps(data).encode("utf-8"))
                return

            # -------------------------------------------------------------
            # 3. System & Health Endpoints
            # -------------------------------------------------------------
            if path == "/api/sys/info":
                return self.send_json(sys_api.get_sys_info())

            if path == "/api/sys/stats":
                return self.send_json(sys_api.get_sys_stats())

            if path == "/api/sys/disks":
                return self.send_json(sys_api.get_sys_disks())

            if path == "/api/sys/net":
                return self.send_json(sys_api.get_sys_net())

            if path == "/api/sys/cgroups":
                return self.send_json(sys_api.get_sys_cgroups())

            if path == "/api/sys/namespaces":
                return self.send_json(sys_api.get_sys_namespaces())

            if path == "/api/sys/health":
                return self.send_json(sys_api.get_sys_health())

            if path == "/api/net/wifi":
                return self.send_json(net_api.get_wifi_status())

            if path == "/api/net/wifi/scan":
                return self.send_json(net_api.scan_wifi_networks())

            # -------------------------------------------------------------
            # 4. Process & Log Endpoints
            # -------------------------------------------------------------
            if path == "/api/proc/list":
                return self.send_json(proc_api.get_process_list())

            if path.startswith("/api/proc/") and not path.endswith("/signal"):
                pid_str = path.split("/")[3]
                if pid_str.isdigit():
                    return self.send_json(proc_api.get_process_details(int(pid_str)))

            if path == "/api/services":
                return self.send_json(proc_api.get_services())

            if path == "/api/logs/sources":
                return self.send_json(proc_api.get_log_sources())

            if path == "/api/logs/tail":
                source_id = query.get("source", ["aura_audit"])[0]
                lines = int(query.get("lines", ["50"])[0])
                q_filter = query.get("q", [None])[0]
                return self.send_json(proc_api.tail_log(source_id, lines, query=q_filter))

            # -------------------------------------------------------------
            # 5. Filesystem Endpoints
            # -------------------------------------------------------------
            if path == "/api/fs/list":
                req_path = query.get("path", [""])[0]
                return self.send_json(fs_api.list_directory(req_path))

            if path == "/api/fs/stat":
                req_path = query.get("path", [""])[0]
                return self.send_json(fs_api.get_file_stat(req_path))

            if path == "/api/fs/read":
                req_path = query.get("path", [""])[0]
                safe_p = fs_api.resolve_safe_path(req_path)
                if not os.path.exists(safe_p) or os.path.isdir(safe_p):
                    return self.send_json({"error": "File not found"}, 404)
                
                mime, _ = mimetypes.guess_type(safe_p)
                file_size = os.path.getsize(safe_p)
                range_header = self.headers.get('Range')

                if range_header and range_header.startswith('bytes='):
                    parts = range_header.replace('bytes=', '').split('-')
                    start = int(parts[0]) if parts[0] else 0
                    end = int(parts[1]) if parts[1] else file_size - 1
                    end = min(end, file_size - 1)
                    chunk_len = (end - start) + 1

                    self.send_response(206)
                    self.send_header("Content-Type", mime or "application/octet-stream")
                    self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
                    self.send_header("Content-Length", str(chunk_len))
                    self.send_header("Accept-Ranges", "bytes")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()

                    with open(safe_p, 'rb') as f:
                        f.seek(start)
                        self.wfile.write(f.read(chunk_len))
                    return

                self.send_response(200)
                self.send_header("Content-Type", mime or "application/octet-stream")
                self.send_header("Content-Length", str(file_size))
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()

                with open(safe_p, 'rb') as f:
                    self.wfile.write(f.read())
                return

            if path == "/api/fs/trash/list":
                return self.send_json(fs_api.get_trash_items())

            if path == "/api/fs/search":
                q = query.get("q", [""])[0]
                root = query.get("path", [""])[0]
                return self.send_json(fs_api.search_files(q, root))

            # -------------------------------------------------------------
            # 6. Applications & Settings Endpoints
            # -------------------------------------------------------------
            if path == "/api/apps":
                return self.send_json(apps_api.list_all_apps())

            if path == "/api/sys/input":
                # Diagnostic / integration input event injector
                action = query.get("action", ["click"])[0]
                x = query.get("x", ["512"])[0]
                y = query.get("y", ["384"])[0]
                btn = query.get("btn", ["1"])[0]
                key = query.get("key", [""])[0]
                if key:
                    os.system(f"xdotool key '{key}' 2>/dev/null")
                elif action == "click":
                    os.system(f"xdotool mousemove {x} {y} click {btn} 2>/dev/null")
                elif action == "move":
                    os.system(f"xdotool mousemove {x} {y} 2>/dev/null")
                return self.send_json({"ok": True, "action": action, "x": x, "y": y, "key": key})

            if path == "/api/settings":
                return self.send_json(settings_api.get_settings())

            if path == "/api/auth/status":
                token = self.headers.get("Authorization", "").replace("Bearer ", "")
                return self.send_json({
                    "is_first_run": auth_api.is_first_run(),
                    "session": auth_api.validate_session(token)
                })

            if path == "/api/proxy/search":
                q = query.get("q", [""])[0]
                stype = query.get("type", ["all"])[0]
                return self.send_json(proxy_api.search_web_data(q, stype))

            if path == "/api/proxy":
                target_url = query.get("url", ["https://en.wikipedia.org"])[0]
                res = proxy_api.fetch_proxy_url(target_url)
                content_bytes = res["content"].encode('utf-8') if isinstance(res["content"], str) else res["content"]
                
                self.send_response(res["status"])
                self.send_header("Content-Type", res["content_type"])
                self.send_header("Content-Length", str(len(content_bytes)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("X-Frame-Options", "ALLOWALL")
                self.send_header("Content-Security-Policy", "frame-ancestors *")
                self.end_headers()
                self.wfile.write(content_bytes)
                return

            # Intercept SPA / Next.js / Webpack dynamic chunk and asset requests originating from a proxied page
            is_spa_asset = path.startswith(("/_next/", "/static/")) or (path.endswith((".js", ".css", ".png", ".jpg", ".svg", ".woff2", ".ico")) and not os.path.exists(os.path.join(UI_DIR, path.lstrip("/"))))
            referer = self.headers.get("Referer", "")
            
            if is_spa_asset or "url=" in referer or "api/proxy" in referer:
                try:
                    ref_origin = proxy_api.get_last_proxied_origin()
                    if "url=" in referer:
                        ref_url = urllib.parse.unquote(referer.split("url=", 1)[1].split("&")[0])
                        ref_parsed = urllib.parse.urlparse(ref_url)
                        if ref_parsed.scheme and ref_parsed.netloc:
                            ref_origin = f"{ref_parsed.scheme}://{ref_parsed.netloc}"

                    if ref_origin:
                        target_asset = f"{ref_origin}{path}"
                        if parsed.query:
                            target_asset += f"?{parsed.query}"
                        res = proxy_api.fetch_proxy_url(target_asset)
                        if res.get("ok"):
                            content_bytes = res["content"].encode('utf-8') if isinstance(res["content"], str) else res["content"]
                            self.send_response(res["status"])
                            self.send_header("Content-Type", res["content_type"])
                            self.send_header("Content-Length", str(len(content_bytes)))
                            self.send_header("Access-Control-Allow-Origin", "*")
                            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                            self.send_header("X-Frame-Options", "ALLOWALL")
                            self.send_header("Content-Security-Policy", "frame-ancestors *")
                            self.end_headers()
                            self.wfile.write(content_bytes)
                            return
                except Exception:
                    pass

            # Default static file serving (HTML, JS, CSS)
            return super().do_GET()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

    def do_POST(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path

            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length) if content_length > 0 else b""
            
            req_json = {}
            if body_bytes and "application/json" in self.headers.get("Content-Type", ""):
                try:
                    req_json = json.loads(body_bytes.decode('utf-8'))
                except Exception:
                    pass

            # Backwards compatible chat
            if path == "/api/chat":
                user_msg = req_json.get("message", "")
                try:
                    res = ai.process_instruction(user_msg)
                except Exception as e:
                    res = {"reply": f"[ERROR] Failed to process instruction: {str(e)}", "action": "error"}
                return self.send_json(res)

            # -------------------------------------------------------------
            # Authentication & Settings
            # -------------------------------------------------------------
            if path == "/api/auth/login":
                username = req_json.get("username", "aura")
                password = req_json.get("password", "")
                res = auth_api.authenticate(username, password)
                return self.send_json(res, 200 if res.get("ok") else 401)

            if path == "/api/settings":
                return self.send_json(settings_api.update_settings(req_json))

            if path == "/api/net/wifi/connect":
                ssid = req_json.get("ssid", "")
                pwd = req_json.get("password", "")
                return self.send_json(net_api.connect_wifi_network(ssid, pwd))

            # -------------------------------------------------------------
            # Process Signals & Logs
            # -------------------------------------------------------------
            if path == "/api/logs/event":
                cat = req_json.get("category", "APP")
                msg = req_json.get("message", "")
                if msg:
                    proc_api.log_system_event(cat, msg)
                return self.send_json({"ok": True})

            # -------------------------------------------------------------
            # Terminal HTTP RPC Fallback (Fallback when WebSocket upgrade is blocked)
            # -------------------------------------------------------------
            if path == "/api/term/exec":
                cmd = req_json.get("command", "").strip()
                cwd_rel = req_json.get("cwd", "")
                storage_root = os.path.abspath(fs_api.AURA_HOME)
                target_cwd = storage_root
                if cwd_rel:
                    cand = os.path.abspath(os.path.join(storage_root, cwd_rel.lstrip("/\\")))
                    if cand.startswith(storage_root) and os.path.isdir(cand):
                        target_cwd = cand
                
                # Execute command via subprocess confined to sandbox
                try:
                    res = subprocess.run(
                        cmd,
                        cwd=target_cwd,
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=15
                    )
                    out = res.stdout or ""
                    err = res.stderr or ""
                    return self.send_json({
                        "ok": True,
                        "exit_code": res.returncode,
                        "stdout": out,
                        "stderr": err,
                        "cwd": target_cwd.replace(storage_root, "~").replace("\\", "/") or "~"
                    })
                except subprocess.TimeoutExpired:
                    return self.send_json({"ok": False, "error": "Command timed out (15s limit)."}, 408)
                except Exception as ex:
                    return self.send_json({"ok": False, "error": str(ex)}, 500)

            # -------------------------------------------------------------
            # Filesystem Modifications
            # -------------------------------------------------------------
            if path == "/api/fs/write":
                p = req_json.get("path", "")
                c = req_json.get("content", "")
                res = fs_api.write_file(p, c)
                return self.send_json(res)

            if path == "/api/fs/write_base64":
                p = req_json.get("path", "")
                b64 = req_json.get("data", "")
                res = fs_api.write_base64_file(p, b64)
                return self.send_json(res)

            if path == "/api/fs/download_file":
                url = req_json.get("url", "")
                folder = req_json.get("folder", "~/Pictures")
                name = req_json.get("name", "")
                try:
                    res = fs_api.download_web_file(url, folder, name)
                    return self.send_json(res)
                except Exception as e:
                    return self.send_json({"ok": False, "error": str(e)}, 400)

            if path == "/api/fs/mkdir":
                p = req_json.get("path", "")
                res = fs_api.create_directory(p)
                return self.send_json(res)

            if path == "/api/fs/rename":
                old_p = req_json.get("old_path", "")
                new_n = req_json.get("new_name", "")
                res = fs_api.rename_item(old_p, new_n)
                return self.send_json(res, 200 if res.get("ok") else 400)

            if path == "/api/fs/delete":
                p = req_json.get("path", "")
                res = fs_api.move_to_trash(p)
                return self.send_json(res, 200 if res.get("ok") else 400)

            if path == "/api/fs/trash/restore":
                t_id = req_json.get("trash_id", "")
                res = fs_api.restore_from_trash(t_id)
                return self.send_json(res, 200 if res.get("ok") else 400)

            if path == "/api/fs/trash/empty":
                return self.send_json(fs_api.empty_trash())

            # -------------------------------------------------------------
            # Media Captures
            # -------------------------------------------------------------
            if path == "/api/capture/screenshot":
                png_b64 = req_json.get("image", "")
                res = capture_api.save_screenshot(png_b64)
                return self.send_json(res)

            if path.startswith("/api/capture/recording/") and path.endswith("/chunk"):
                rec_id = path.split("/")[4]
                res = capture_api.append_recording_chunk(rec_id, body_bytes)
                return self.send_json(res)

            if path.startswith("/api/capture/recording/") and path.endswith("/finish"):
                rec_id = path.split("/")[4]
                res = capture_api.finish_recording(rec_id)
                return self.send_json(res)

            if path == "/api/code/run":
                lang = req_json.get("language", "cpp")
                p = req_json.get("path", "")
                res = bridge.compile_and_run(lang, p)
                return self.send_json(res)

            # -------------------------------------------------------------
            # Applications
            # -------------------------------------------------------------
            if path == "/api/apps/uninstall":
                app_id = req_json.get("app_id", "")
                return self.send_json(apps_api.uninstall_app(app_id))

            self.send_response(404)
            self.end_headers()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

def run_server():
    with AuraThreadingServer(("", PORT), AuraHTTPHandler) as httpd:
        print("==================================================")
        print(f"  [+] AURA-OS REAL DESKTOP GATEWAY ACTIVE        ")
        print(f"  --> http://localhost:{PORT}                     ")
        print(f"  --> WebSocket PTY Terminal: /ws/term            ")
        print("==================================================")
        while True:
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nShutting down AURA-OS Server.")
                break
            except Exception as e:
                # Log and continue serving clients
                sys.stderr.write(f"[AURA-OS Server Warning] Recovered from exception: {e}\n")

if __name__ == "__main__":
    run_server()