"""
AURA-OS Application Registry & Installer API
Manages built-in OS applications and installs third-party web apps into /home/aura/Apps.
100% Zero Fake Data.
"""

import os
import sys
import json
import shutil
import zipfile
import urllib.request
from api.fs import AURA_HOME

APPS_DIR = os.path.join(AURA_HOME, "Apps")
os.makedirs(APPS_DIR, exist_ok=True)

# Built-in Apps definition
BUILTIN_APPS = [
    {"id": "agent", "name": "AURA Copilot", "category": "AI & Automation", "version": "2.0.0", "icon": "agent", "type": "native", "description": "Autonomous OS Agent with isolated sandbox orchestration."},
    {"id": "terminal", "name": "Terminal", "category": "System", "version": "1.0.0", "icon": "terminal", "type": "native", "description": "Interactive VT100 bash shell backed by real Linux PTY."},
    {"id": "taskmgr", "name": "Task Manager", "category": "System", "version": "1.0.0", "icon": "monitor", "type": "native", "description": "Real-time process monitor, resource graphs, services, and cgroups."},
    {"id": "files", "name": "File Manager", "category": "Utilities", "version": "1.0.0", "icon": "files", "type": "native", "description": "Windows Explorer-style file manager with breadcrumbs and trash."},
    {"id": "browser", "name": "Browser", "category": "Internet", "version": "1.0.0", "icon": "globe", "type": "native", "description": "Web browser with honest proxy and download manager."},
    {"id": "snipping", "name": "Snipping Tool", "category": "Media", "version": "1.0.0", "icon": "camera", "type": "native", "description": "Screen and window capture with fly-to-corner animation."},
    {"id": "recorder", "name": "Screen Recorder", "category": "Media", "version": "1.0.0", "icon": "video", "type": "native", "description": "High-framerate video recording saved directly to Videos/Recordings."},
    {"id": "photos", "name": "Photos", "category": "Media", "version": "1.0.0", "icon": "image", "type": "native", "description": "Image gallery with slideshow and wallpaper manager."},
    {"id": "media", "name": "Media Player", "category": "Media", "version": "1.0.0", "icon": "music", "type": "native", "description": "Audio and video player connected to the live system activity visualizer."},
    {"id": "editor", "name": "Text Editor", "category": "Utilities", "version": "1.0.0", "icon": "terminal", "type": "native", "description": "Code and document editor with syntax highlighting."},
    {"id": "memory", "name": "Memory DB", "category": "System", "version": "2.0.0", "icon": "memory", "type": "native", "description": "AURA neural memory vector database management."},
    {"id": "sandbox", "name": "Sandbox Manager", "category": "System", "version": "2.0.0", "icon": "approvals", "type": "native", "description": "OverlayFS isolation diff review, approve, and discard."},
    {"id": "models", "name": "Model Hub", "category": "AI & Automation", "version": "1.0.0", "icon": "models", "type": "native", "description": "Ollama local inference runtime model repository."},
    {"id": "settings", "name": "Settings", "category": "System", "version": "1.0.0", "icon": "settings", "type": "native", "description": "Desktop personalizations, wallpaper, theme accents, and data sources."},
    {"id": "appcenter", "name": "App Center", "category": "Utilities", "version": "1.0.0", "icon": "grid", "type": "native", "description": "App store and package installer for third-party tools."}
]

def list_all_apps():
    """Lists built-in and installed third-party applications."""
    apps = list(BUILTIN_APPS)

    if os.path.exists(APPS_DIR):
        for app_id in os.listdir(APPS_DIR):
            manifest_p = os.path.join(APPS_DIR, app_id, "manifest.json")
            if os.path.exists(manifest_p):
                try:
                    with open(manifest_p, 'r', encoding='utf-8') as f:
                        manifest = json.load(f)
                        manifest["id"] = app_id
                        manifest["type"] = manifest.get("type", "web-app")
                        apps.append(manifest)
                except Exception:
                    continue

    return apps

def install_app_zip(zip_bytes, app_id=None):
    """Installs an app from a zip file containing manifest.json."""
    temp_zip = os.path.join(APPS_DIR, "_temp_install.zip")
    with open(temp_zip, 'wb') as f:
        f.write(zip_bytes)

    try:
        with zipfile.ZipFile(temp_zip, 'r') as z:
            # Check manifest
            if "manifest.json" not in z.namelist():
                os.remove(temp_zip)
                return {"ok": False, "error": "Zip does not contain manifest.json"}

            manifest_data = json.loads(z.read("manifest.json").decode('utf-8'))
            target_id = app_id or manifest_data.get("id", f"app_{int(time.time())}")
            dest_dir = os.path.join(APPS_DIR, target_id)
            os.makedirs(dest_dir, exist_ok=True)
            z.extractall(dest_dir)

        os.remove(temp_zip)
        return {"ok": True, "app_id": target_id, "manifest": manifest_data}
    except Exception as e:
        if os.path.exists(temp_zip):
            os.remove(temp_zip)
        return {"ok": False, "error": str(e)}

def uninstall_app(app_id):
    """Uninstalls a third-party application."""
    dest_dir = os.path.join(APPS_DIR, app_id)
    if not os.path.exists(dest_dir):
        return {"ok": False, "error": "App not installed"}

    shutil.rmtree(dest_dir, ignore_errors=True)
    return {"ok": True, "app_id": app_id}
