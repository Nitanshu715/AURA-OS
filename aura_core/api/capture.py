"""
AURA-OS Media Capture Storage API
Saves screenshots to Pictures/Screenshots and stream recordings to Videos/Recordings.
100% Zero Fake Data.
"""

import os
import sys
import time
import base64
from api.fs import AURA_HOME

SCREENSHOTS_DIR = os.path.join(AURA_HOME, "Pictures", "Screenshots")
RECORDINGS_DIR = os.path.join(AURA_HOME, "Videos", "Recordings")

os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
os.makedirs(RECORDINGS_DIR, exist_ok=True)

ACTIVE_RECORDINGS = {} # id -> filepath

def save_screenshot(png_bytes_or_b64):
    """Saves PNG bytes to Pictures/Screenshots/Screenshot_YYYY-MM-DD_HH-MM-SS.png."""
    timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"Screenshot_{timestamp}.png"
    filepath = os.path.join(SCREENSHOTS_DIR, filename)

    if isinstance(png_bytes_or_b64, str):
        # Handle data:image/png;base64,...
        if ',' in png_bytes_or_b64:
            png_bytes_or_b64 = png_bytes_or_b64.split(',', 1)[1]
        raw_bytes = base64.b64decode(png_bytes_or_b64)
    else:
        raw_bytes = png_bytes_or_b64

    with open(filepath, 'wb') as f:
        f.write(raw_bytes)

    return {
        "ok": True,
        "filename": filename,
        "path": filepath.replace('\\', '/'),
        "relative_path": f"Pictures/Screenshots/{filename}",
        "size_bytes": len(raw_bytes),
        "timestamp": int(time.time())
    }

def append_recording_chunk(rec_id, chunk_bytes):
    """Appends binary chunk to in-progress recording file."""
    if rec_id not in ACTIVE_RECORDINGS:
        timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"Recording_{timestamp}.webm"
        filepath = os.path.join(RECORDINGS_DIR, filename)
        ACTIVE_RECORDINGS[rec_id] = filepath

    filepath = ACTIVE_RECORDINGS[rec_id]
    with open(filepath, 'ab') as f:
        f.write(chunk_bytes)

    return {"ok": True, "rec_id": rec_id, "size_bytes": os.path.getsize(filepath)}

def finish_recording(rec_id):
    """Finalizes screen recording file."""
    if rec_id not in ACTIVE_RECORDINGS:
        return {"ok": False, "error": "Recording ID not found"}

    filepath = ACTIVE_RECORDINGS.pop(rec_id)
    filename = os.path.basename(filepath)
    size = os.path.getsize(filepath) if os.path.exists(filepath) else 0

    return {
        "ok": True,
        "filename": filename,
        "path": filepath.replace('\\', '/'),
        "relative_path": f"Videos/Recordings/{filename}",
        "size_bytes": size,
        "timestamp": int(time.time())
    }
