"""
AURA-OS Real-time System Event Bus API
Dispatches events for sandbox approvals, storage alerts, downloads, and daemon states.
100% Zero Fake Data.
"""

import time
import json
import threading

EVENT_LISTENERS = [] # list of queue/callbacks
EVENT_HISTORY = []

def emit_event(event_type, payload):
    """Dispatches a system event to all active WebSocket and long-polling subscribers."""
    event_obj = {
        "type": event_type,
        "payload": payload,
        "timestamp": int(time.time())
    }
    EVENT_HISTORY.append(event_obj)
    if len(EVENT_HISTORY) > 100:
        EVENT_HISTORY.pop(0)

    for cb in list(EVENT_LISTENERS):
        try:
            cb(event_obj)
        except Exception:
            pass

def get_recent_events(limit=30):
    """Returns recent system events."""
    return EVENT_HISTORY[-limit:]
