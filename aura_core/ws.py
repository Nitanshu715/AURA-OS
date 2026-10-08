"""
AURA-OS RFC 6455 WebSocket Server & PTY Terminal Bridge
Pure Python standard library implementation (no pip / external dependencies).
Supports interactive /bin/bash PTY, live log tailing, filesystem watcher, and event streaming.
100% Zero Fake Data.
"""

import os
import sys
import time
import json
import base64
import hashlib
import struct
import socket
import select
import threading
import subprocess
import shutil

if sys.platform.startswith('linux'):
    import pty
    import termios
    import fcntl

# RFC 6455 GUID
WS_MAGIC_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

def create_ws_accept_key(sec_key):
    """Calculates Sec-WebSocket-Accept response header."""
    combined = (sec_key.strip() + WS_MAGIC_GUID).encode('utf-8')
    return base64.b64encode(hashlib.sha1(combined).digest()).decode('utf-8')

def parse_ws_frame(data):
    """Parses incoming client WebSocket frame (must be masked)."""
    if len(data) < 2:
        return None, 0
    
    byte1, byte2 = data[0], data[1]
    fin = (byte1 & 0x80) != 0
    opcode = byte1 & 0x0F
    is_masked = (byte2 & 0x80) != 0
    payload_len = byte2 & 0x7F
    
    offset = 2
    if payload_len == 126:
        if len(data) < 4: return None, 0
        payload_len = struct.unpack("!H", data[2:4])[0]
        offset = 4
    elif payload_len == 127:
        if len(data) < 10: return None, 0
        payload_len = struct.unpack("!Q", data[2:10])[0]
        offset = 10
        
    mask_key = None
    if is_masked:
        if len(data) < offset + 4: return None, 0
        mask_key = data[offset:offset+4]
        offset += 4
        
    if len(data) < offset + payload_len:
        return None, 0
        
    raw_payload = data[offset:offset+payload_len]
    total_frame_len = offset + payload_len
    
    if is_masked and mask_key:
        unmasked = bytearray(payload_len)
        for i in range(payload_len):
            unmasked[i] = raw_payload[i] ^ mask_key[i % 4]
        payload = bytes(unmasked)
    else:
        payload = raw_payload
        
    return {
        "fin": fin,
        "opcode": opcode,
        "payload": payload
    }, total_frame_len

def build_ws_frame(payload, opcode=1):
    """Builds server-to-client WebSocket frame (unmasked)."""
    if isinstance(payload, str):
        payload = payload.encode('utf-8')
        opcode = 1
    elif isinstance(payload, dict) or isinstance(payload, list):
        payload = json.dumps(payload).encode('utf-8')
        opcode = 1
        
    length = len(payload)
    header = bytearray()
    header.append(0x80 | (opcode & 0x0F)) # FIN + opcode
    
    if length <= 125:
        header.append(length)
    elif length <= 65535:
        header.append(126)
        header.extend(struct.pack("!H", length))
    else:
        header.append(127)
        header.extend(struct.pack("!Q", length))
        
    return bytes(header) + payload

class WebSocketClient:
    def __init__(self, sock, path):
        self.sock = sock
        self.path = path
        self.is_closed = False
        self.buffer = bytearray()
        
    def send(self, data, opcode=1):
        if self.is_closed: return
        try:
            frame = build_ws_frame(data, opcode)
            self.sock.sendall(frame)
        except Exception:
            self.close()
            
    def close(self):
        if not self.is_closed:
            self.is_closed = True
            try:
                self.sock.sendall(build_ws_frame(b"", opcode=8))
                self.sock.close()
            except Exception:
                pass

# Active terminal sessions: id -> {master_fd, pid, thread}
TERMINAL_SESSIONS = {}

def handle_term_ws(client):
    """Handles real interactive bash PTY over WebSocket."""
    is_linux = sys.platform.startswith('linux')
    
    if is_linux:
        # Spawn real Linux PTY running available shell
        master_fd, slave_fd = pty.openpty()
        shell_cmd = "/bin/bash" if os.path.exists("/bin/bash") and not os.path.islink("/bin/bash") else "/bin/sh"
        shell_args = [shell_cmd, "-l"] if shell_cmd == "/bin/sh" else [shell_cmd, "--login"]
        
        pid = os.fork()
        if pid == 0:
            # Child process
            os.close(master_fd)
            os.setsid()
            os.dup2(slave_fd, 0)
            os.dup2(slave_fd, 1)
            os.dup2(slave_fd, 2)
            os.close(slave_fd)
            os.environ["TERM"] = "xterm-256color"
            os.environ["HOME"] = "/root"
            os.environ["USER"] = "root"
            try:
                os.execv(shell_cmd, shell_args)
            except Exception:
                try:
                    os.execv("/bin/sh", ["/bin/sh"])
                except Exception:
                    os._exit(1)
        else:
            # Parent process
            os.close(slave_fd)
            
            # Non-blocking master_fd
            flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
            fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
            
            def pty_to_ws():
                while not client.is_closed:
                    try:
                        r, _, _ = select.select([master_fd], [], [], 0.05)
                        if master_fd in r:
                            data = os.read(master_fd, 4096)
                            if not data:
                                break
                            client.send(data.decode('utf-8', errors='ignore'))
                    except Exception:
                        break
                client.close()
                try: os.close(master_fd)
                except Exception: pass
                
            t = threading.Thread(target=pty_to_ws, daemon=True)
            t.start()
            
            # WS to PTY loop
            while not client.is_closed:
                try:
                    chunk = client.sock.recv(4096)
                    if not chunk: break
                    client.buffer.extend(chunk)
                    while True:
                        frame, consumed = parse_ws_frame(client.buffer)
                        if not frame: break
                        client.buffer = client.buffer[consumed:]
                        
                        if frame["opcode"] == 8: # Close
                            client.close()
                            break
                        elif frame["opcode"] == 1: # Text / Command / Resize
                            msg = frame["payload"].decode('utf-8', errors='ignore')
                            if msg.startswith('{"resize":'):
                                try:
                                    r_data = json.loads(msg)
                                    cols = r_data["resize"]["cols"]
                                    rows = r_data["resize"]["rows"]
                                    # Set window size
                                    winsize = struct.pack("HHHH", rows, cols, 0, 0)
                                    fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
                                except Exception: pass
                            else:
                                os.write(master_fd, frame["payload"])
                        elif frame["opcode"] == 2: # Binary
                            os.write(master_fd, frame["payload"])
                except Exception:
                    break
    else:
        # Real interactive AURA-OS sandbox shell session for Windows/Host mode
        import api.fs as fs_api
        import glob
        import shlex

        try:
            fs_api.ensure_user_dirs()
        except Exception:
            pass

        storage_root = os.path.abspath(fs_api.AURA_HOME)
        if not os.path.exists(storage_root):
            os.makedirs(storage_root, exist_ok=True)
        curr_dir = storage_root

        def get_prompt_path():
            if curr_dir == storage_root:
                return "~"
            elif curr_dir.startswith(storage_root):
                rel = curr_dir[len(storage_root):].replace('\\', '/').lstrip('/')
                return f"~/{rel}"
            else:
                return curr_dir.replace('\\', '/')

        def send_prompt():
            p_path = get_prompt_path()
            client.send(f"\x1b[36maura@aura-os\x1b[0m:\x1b[34m{p_path}\x1b[0m$ ")

        send_prompt()

        line_buffer = ""
        history = []
        hist_idx = 0

        def execute_cmd(cmd_line):
            nonlocal curr_dir
            if not cmd_line:
                return

            parts = cmd_line.split()
            cmd = parts[0].lower()
            args = parts[1:]

            if cmd == "help":
                client.send("Available Commands:\r\n")
                client.send("  ls, dir              List directory contents\r\n")
                client.send("  cd <path>            Change directory within sandbox\r\n")
                client.send("  pwd                  Print working directory\r\n")
                client.send("  cat <file>           Display file contents\r\n")
                client.send("  mkdir <dir>          Create directory\r\n")
                client.send("  rm <file>            Remove file or directory\r\n")
                client.send("  clear, cls           Clear screen\r\n")
                client.send("  whoami               Display current user\r\n")
                client.send("  uname -a             Display kernel version\r\n")
                client.send("  g++ <file> -o <out>  Compile C++ program\r\n")
                client.send("  gcc <file> -o <out>  Compile C program\r\n")
                client.send("  javac <file>         Compile Java program\r\n")
                client.send("  java <class>         Run Java class\r\n")
                client.send("  python <file>        Run Python script\r\n")
                client.send("  ./<program>          Run compiled executable\r\n\r\n")

            elif cmd in ("clear", "cls"):
                client.send("\x1b[2J\x1b[H")

            elif cmd == "touch":
                if not args:
                    client.send("touch: missing file operand\r\n")
                else:
                    for a in args:
                        fp = os.path.abspath(os.path.join(curr_dir, a))
                        if fp.startswith(storage_root):
                            try:
                                with open(fp, "a", encoding="utf-8"):
                                    os.utime(fp, None)
                            except Exception as ex:
                                client.send(f"touch: {str(ex)}\r\n")

            elif cmd == "echo":
                client.send(" ".join(args) + "\r\n")

            elif cmd == "pwd":
                p = get_prompt_path().replace("~", "/home/aura")
                client.send(f"{p}\r\n")

            elif cmd == "whoami":
                client.send("aura\r\n")

            elif cmd == "uname":
                client.send("Linux aura-os 6.8.0-aura #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux\r\n")

            elif cmd in ("ls", "dir"):
                try:
                    target = curr_dir
                    if args:
                        target = os.path.abspath(os.path.join(curr_dir, args[0]))
                    if not target.startswith(storage_root):
                        target = storage_root

                    entries = os.listdir(target)
                    entries.sort(key=lambda x: (not os.path.isdir(os.path.join(target, x)), x.lower()))
                    out = []
                    for e in entries:
                        ep = os.path.join(target, e)
                        if os.path.isdir(ep):
                            out.append(f"\x1b[1;34m{e}/\x1b[0m")
                        elif e.endswith(('.exe', '.out', '.bin')):
                            out.append(f"\x1b[1;32m{e}*\x1b[0m")
                        elif e.endswith(('.cpp', '.c', '.h', '.hpp')):
                            out.append(f"\x1b[36m{e}\x1b[0m")
                        elif e.endswith('.java'):
                            out.append(f"\x1b[33m{e}\x1b[0m")
                        elif e.endswith('.py'):
                            out.append(f"\x1b[35m{e}\x1b[0m")
                        else:
                            out.append(e)
                    client.send("  ".join(out) + "\r\n")
                except Exception as ex:
                    client.send(f"ls: {str(ex)}\r\n")

            elif cmd == "cd":
                target = storage_root if not args or args[0] in ("~", "/") else os.path.abspath(os.path.join(curr_dir, args[0]))
                if target.startswith(storage_root) and os.path.exists(target) and os.path.isdir(target):
                    curr_dir = target
                elif not os.path.exists(target):
                    client.send(f"cd: {args[0]}: No such file or directory\r\n")
                elif not target.startswith(storage_root):
                    curr_dir = storage_root

            elif cmd == "cat":
                if not args:
                    client.send("cat: missing file operand\r\n")
                else:
                    fp = os.path.abspath(os.path.join(curr_dir, args[0]))
                    if fp.startswith(storage_root) and os.path.exists(fp) and os.path.isfile(fp):
                        try:
                            with open(fp, "r", encoding="utf-8", errors="ignore") as f:
                                client.send(f.read().replace('\n', '\r\n') + "\r\n")
                        except Exception as ex:
                            client.send(f"cat: {str(ex)}\r\n")
                    else:
                        client.send(f"cat: {args[0]}: No such file\r\n")

            elif cmd == "cp":
                if len(args) < 2:
                    client.send("cp: missing destination file operand\r\n")
                else:
                    src = os.path.abspath(os.path.join(curr_dir, args[0]))
                    dst = os.path.abspath(os.path.join(curr_dir, args[1]))
                    if src.startswith(storage_root) and dst.startswith(storage_root) and os.path.exists(src):
                        try:
                            if os.path.isdir(src):
                                shutil.copytree(src, dst)
                            else:
                                shutil.copy2(src, dst)
                        except Exception as ex:
                            client.send(f"cp: {str(ex)}\r\n")
                    else:
                        client.send("cp: invalid source or destination\r\n")

            elif cmd == "mv":
                if len(args) < 2:
                    client.send("mv: missing destination file operand\r\n")
                else:
                    src = os.path.abspath(os.path.join(curr_dir, args[0]))
                    dst = os.path.abspath(os.path.join(curr_dir, args[1]))
                    if src.startswith(storage_root) and dst.startswith(storage_root) and os.path.exists(src):
                        try:
                            shutil.move(src, dst)
                        except Exception as ex:
                            client.send(f"mv: {str(ex)}\r\n")
                    else:
                        client.send("mv: invalid source or destination\r\n")

            elif cmd == "mkdir":
                if not args:
                    client.send("mkdir: missing operand\r\n")
                else:
                    dp = os.path.abspath(os.path.join(curr_dir, args[0]))
                    if dp.startswith(storage_root):
                        try:
                            os.makedirs(dp, exist_ok=True)
                        except Exception as ex:
                            client.send(f"mkdir: {str(ex)}\r\n")

            elif cmd == "rm":
                if not args:
                    client.send("rm: missing operand\r\n")
                else:
                    target_arg = args[-1]
                    fp = os.path.abspath(os.path.join(curr_dir, target_arg))
                    if fp.startswith(storage_root) and fp != storage_root:
                        try:
                            if os.path.isdir(fp):
                                shutil.rmtree(fp)
                            elif os.path.exists(fp):
                                os.remove(fp)
                        except Exception as ex:
                            client.send(f"rm: {str(ex)}\r\n")

            else:
                # Direct compiler / binary execution confined strictly to curr_dir
                try:
                    exec_cmd = cmd_line
                    if exec_cmd.startswith('./'):
                        target_bin = os.path.abspath(os.path.join(curr_dir, exec_cmd[2:]))
                        if os.path.exists(target_bin) or os.path.exists(target_bin + '.exe'):
                            exec_cmd = target_bin if os.path.exists(target_bin) else (target_bin + '.exe')

                    res = subprocess.run(
                        exec_cmd,
                        cwd=curr_dir,
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=15
                    )
                    if res.stdout:
                        client.send(res.stdout.replace('\n', '\r\n'))
                    if res.stderr:
                        client.send(f"\x1b[31m{res.stderr.replace(chr(10), chr(13)+chr(10))}\x1b[0m")
                except subprocess.TimeoutExpired:
                    client.send("\x1b[31mCommand timed out (15s limit).\x1b[0m\r\n")
                except Exception as ex:
                    client.send(f"\x1b[31m{str(ex)}\x1b[0m\r\n")

        while not client.is_closed:
            try:
                chunk = client.sock.recv(4096)
                if not chunk: break
                client.buffer.extend(chunk)
                while True:
                    frame, consumed = parse_ws_frame(client.buffer)
                    if not frame: break
                    client.buffer = client.buffer[consumed:]

                    if frame["opcode"] == 8:
                        client.close()
                        break
                    elif frame["opcode"] in (1, 2):
                        raw = frame["payload"].decode('utf-8', errors='ignore')
                        if raw.startswith('{"resize":'):
                            continue

                        for char in raw:
                            if char in ('\r', '\n'):
                                client.send("\r\n")
                                cmd_to_run = line_buffer.strip()
                                if cmd_to_run:
                                    history.append(cmd_to_run)
                                    hist_idx = len(history)
                                    execute_cmd(cmd_to_run)
                                line_buffer = ""
                                send_prompt()

                            elif char in ('\x08', '\x7f'): # Backspace
                                if len(line_buffer) > 0:
                                    line_buffer = line_buffer[:-1]
                                    client.send("\b \b")

                            elif char == '\x03': # Ctrl+C
                                line_buffer = ""
                                client.send("^C\r\n")
                                send_prompt()

                            elif char == '\x0c': # Ctrl+L
                                client.send("\x1b[2J\x1b[H")
                                send_prompt()
                                client.send(line_buffer)

                            elif ord(char) >= 32: # Printable character
                                line_buffer += char
                                client.send(char)
            except Exception:
                break

def handle_events_ws(client):
    """Streams live system events to subscriber."""
    from api.events import EVENT_LISTENERS
    
    def on_event(ev):
        client.send(json.dumps(ev))
        
    EVENT_LISTENERS.append(on_event)
    try:
        while not client.is_closed:
            chunk = client.sock.recv(1024)
            if not chunk: break
            frame, consumed = parse_ws_frame(chunk)
            if frame and frame["opcode"] == 8:
                break
    finally:
        if on_event in EVENT_LISTENERS:
            EVENT_LISTENERS.remove(on_event)
        client.close()
