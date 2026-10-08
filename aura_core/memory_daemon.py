import sqlite3
import json
import time
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.environ.get("AURA_MEM_DB", os.path.join(os.path.dirname(__file__), "aura_memory.db"))

class MemoryDaemon:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata TEXT,
                    timestamp REAL NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS knowledge (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL,
                    key TEXT UNIQUE NOT NULL,
                    value TEXT NOT NULL,
                    updated_at REAL NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS command_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    command TEXT NOT NULL,
                    output TEXT,
                    exit_code INTEGER,
                    executed_at REAL NOT NULL
                )
            """)
            conn.commit()

    def save_message(self, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> int:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            meta_json = json.dumps(metadata or {})
            cursor.execute(
                "INSERT INTO messages (role, content, metadata, timestamp) VALUES (?, ?, ?, ?)",
                (role, content, meta_json, time.time())
            )
            conn.commit()
            return cursor.lastrowid

    def get_recent_messages(self, limit: int = 15) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, role, content, metadata, timestamp FROM messages ORDER BY id DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            messages = []
            for r in reversed(rows):
                messages.append({
                    "id": r["id"],
                    "role": r["role"],
                    "content": r["content"],
                    "metadata": json.loads(r["metadata"]) if r["metadata"] else {},
                    "timestamp": r["timestamp"]
                })
            return messages

    def remember(self, category: str, key: str, value: str):
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO knowledge (category, key, value, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    category=excluded.category,
                    value=excluded.value,
                    updated_at=excluded.updated_at
            """, (category, key, value, time.time()))
            conn.commit()

    def recall(self, key: str) -> Optional[str]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM knowledge WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row["value"] if row else None

    def search_knowledge(self, query: str) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            wildcard = f"%{query}%"
            cursor.execute(
                "SELECT category, key, value, updated_at FROM knowledge WHERE key LIKE ? OR value LIKE ? ORDER BY updated_at DESC LIMIT 10",
                (wildcard, wildcard)
            )
            return [dict(r) for r in cursor.fetchall()]

    def log_command(self, command: str, output: str, exit_code: int):
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO command_history (command, output, exit_code, executed_at) VALUES (?, ?, ?, ?)",
                (command, output, exit_code, time.time())
            )
            conn.commit()

    def get_recent_commands(self, limit: int = 10) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT command, output, exit_code, executed_at FROM command_history ORDER BY id DESC LIMIT ?",
                (limit,)
            )
            return [dict(r) for r in cursor.fetchall()]

if __name__ == "__main__":
    mem = MemoryDaemon()
    mem.save_message("system", "AURA-OS Memory Daemon initialized.")
    mem.remember("system", "identity", "AURA-OS Cybernetic Engine v1.0")
    print("Recent messages:", mem.get_recent_messages())
    print("Recalled identity:", mem.recall("identity"))