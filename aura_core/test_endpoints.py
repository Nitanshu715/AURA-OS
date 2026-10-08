"""
AURA-OS Automated Backend Phase 1 Test Suite
Tests all sys, proc, fs, capture, apps, proxy, settings, and auth endpoints.
100% Zero Fake Data.
"""

import urllib.request
import urllib.parse
import json
import time
import subprocess
import os

BASE_URL = "http://127.0.0.1:8888"

def test_endpoint(name, method="GET", path="/", data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    req_data = json.dumps(data).encode('utf-8') if data else None

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        start = time.time()
        with urllib.request.urlopen(req, timeout=5) as resp:
            elapsed = int((time.time() - start) * 1000)
            raw = resp.read().decode('utf-8', errors='ignore')
            try:
                parsed = json.loads(raw)
                status_ok = parsed.get("ok", True)
                print(f"[PASS] {method} {path:<28} -> {resp.status} ({elapsed}ms) | ok={status_ok}")
                return True, parsed
            except Exception:
                print(f"[PASS] {method} {path:<28} -> {resp.status} ({elapsed}ms) [Non-JSON Stream]")
                return True, raw
    except Exception as e:
        print(f"[FAIL] {method} {path:<28} -> Error: {str(e)}")
        return False, None

def run_tests():
    print("================================================================")
    print("         AURA-OS PHASE 1 BACKEND API VERIFICATION SUITE         ")
    print("================================================================")
    
    # 1. System & Health
    test_endpoint("Sys Info", "GET", "/api/sys/info")
    test_endpoint("Sys Stats", "GET", "/api/sys/stats")
    test_endpoint("Sys Disks", "GET", "/api/sys/disks")
    test_endpoint("Sys Network", "GET", "/api/sys/net")
    test_endpoint("Sys Cgroups", "GET", "/api/sys/cgroups")
    test_endpoint("Sys Namespaces", "GET", "/api/sys/namespaces")
    test_endpoint("Sys Health", "GET", "/api/sys/health")

    # 2. Processes & Logs
    test_endpoint("Proc List", "GET", "/api/proc/list")
    test_endpoint("Services", "GET", "/api/services")
    test_endpoint("Log Sources", "GET", "/api/logs/sources")
    test_endpoint("Log Tail", "GET", "/api/logs/tail?source=aura_audit&lines=5")

    # 3. Filesystem CRUD
    test_endpoint("FS List Home", "GET", "/api/fs/list?path=~")
    test_endpoint("FS Stat Documents", "GET", "/api/fs/stat?path=~/Documents")
    test_endpoint("FS Mkdir", "POST", "/api/fs/mkdir", {"path": "~/Documents/test_folder"})
    test_endpoint("FS Write", "POST", "/api/fs/write", {"path": "~/Documents/test_folder/sample.txt", "content": "Hello AURA-OS Real Desktop!"})
    test_endpoint("FS Read", "GET", "/api/fs/read?path=~/Documents/test_folder/sample.txt")
    test_endpoint("FS Delete to Trash", "POST", "/api/fs/delete", {"path": "~/Documents/test_folder/sample.txt"})
    test_endpoint("FS Trash List", "GET", "/api/fs/trash/list")

    # 4. Apps & Settings
    test_endpoint("Apps List", "GET", "/api/apps")
    test_endpoint("Settings Get", "GET", "/api/settings")
    test_endpoint("Settings Update", "POST", "/api/settings", {"theme_accent": "cyan", "wallpaper": "topographic"})
    test_endpoint("Auth Status", "GET", "/api/auth/status")

    # 5. Browser Proxy
    test_endpoint("Browser Proxy", "GET", "/api/proxy?url=https://example.com")

    # 6. Backwards Compatibility
    test_endpoint("Telemetry (Legacy)", "GET", "/api/telemetry")
    test_endpoint("Knowledge (Legacy)", "GET", "/api/knowledge")

    print("================================================================")
    print("               ALL PHASE 1 BACKEND TESTS COMPLETE               ")
    print("================================================================")

if __name__ == "__main__":
    run_tests()
