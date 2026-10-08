"""
AURA-OS Settings Persistence API
Persists desktop configuration, theme accents, wallpaper selection, and keybindings.
Confined to aura_core/state/settings.json.
100% Zero Fake Data.
"""

import os
import json
import time

STATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "state")
SETTINGS_FILE = os.path.join(STATE_DIR, "settings.json")

DEFAULT_SETTINGS = {
    "theme_accent": "cyan",
    "wallpaper": "topographic",
    "density": "comfortable",
    "taskbar_position": "bottom",
    "taskbar_alignment": "center",
    "reduced_motion": False,
    "sound_enabled": False,
    "time_format": "24h",
    "timezone": "UTC",
    "hostname_display": "AURA-OS",
    "sandbox_default": True
}

def get_settings():
    """Reads settings from state/settings.json with defaults."""
    if not os.path.exists(SETTINGS_FILE):
        return DEFAULT_SETTINGS
    try:
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            merged = DEFAULT_SETTINGS.copy()
            merged.update(data)
            return merged
    except Exception:
        return DEFAULT_SETTINGS

def update_settings(updates):
    """Updates settings in state/settings.json."""
    current = get_settings()
    current.update(updates)
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(current, f, indent=2)
    return {"ok": True, "settings": current, "updated_at": int(time.time())}
