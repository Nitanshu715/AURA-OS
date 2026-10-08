# AURA-OS Backend API Wishlist for UI Enhancement

The following backend endpoints and capabilities are recommended to elevate real-time interaction in subsequent core iterations without breaking backward compatibility:

### 1. Server-Sent Events (SSE) / WebSocket Streaming
- **Endpoint:** `GET /api/stream` or `WS /api/ws`
- **Purpose:** Stream agent token generation in real time, line-by-line tool execution output, and live process output without waiting for full batch completion.

### 2. Sandbox Diff & Mutation API
- **Endpoint:** `GET /api/sandbox/diff`
- **Payload:** Returns a JSON object with upper layer filesystem deltas (`added: []`, `modified: []`, `deleted: []`).
- **Endpoint:** `POST /api/sandbox/commit`
- **Purpose:** Commits upper OverlayFS layer into the persistent rootfs.
- **Endpoint:** `POST /api/sandbox/rollback`
- **Purpose:** Discards upper OverlayFS directory and respawns a clean sandbox namespace.

### 3. Memory Daemon CRUD Endpoints
- **Endpoint:** `POST /api/knowledge`
  - Body: `{"category": "user", "key": "...", "value": "..."}`
- **Endpoint:** `DELETE /api/knowledge/:id`
- **Purpose:** Allow direct visual management and pruning of persisted knowledge records from the Inspector Memory tab.

### 4. High-Resolution Telemetry Stream
- **Endpoint:** `GET /api/telemetry/history`
- **Purpose:** Return the last 60 seconds of CPU, RAM, and disk I/O metrics on page reload to immediately populate sparkline buffers upon client connection.
