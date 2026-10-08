/**
 * AURA-OS Client API Service
 * Encapsulates communication with backend HTTP endpoints.
 */

export class AuraAPI {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch current system telemetry (CPU, RAM, Disk, Namespaces, Isolation)
   */
  async getTelemetry() {
    try {
      const res = await fetch(`${this.baseUrl}/api/telemetry`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[API] Telemetry fetch fallback:', err);
      // Fallback synthetic telemetry if server is restarting
      return {
        os_name: "AURA-OS Linux 6.6.21-aura",
        cpu_arch: "x86_64",
        cpu_percent: Math.floor(12 + Math.random() * 8),
        memory: { total_mb: 4096, used_mb: 1240 + Math.floor(Math.random() * 40), free_mb: 2856, percent: 30.5 },
        disk: { total_gb: 32.0, used_gb: 4.8, free_gb: 27.2, percent: 15.0 },
        namespaces: ["pid", "mnt", "net", "ipc", "uts", "user"],
        isolation_supported: true
      };
    }
  }

  /**
   * Fetch knowledge records from memory daemon
   */
  async getKnowledge() {
    try {
      const res = await fetch(`${this.baseUrl}/api/knowledge`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[API] Knowledge fetch fallback:', err);
      return [];
    }
  }

  /**
   * Send user instruction/prompt to the agent engine
   * @param {string} message 
   */
  async sendInstruction(message) {
    const startTime = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      const durationMs = Math.round(performance.now() - startTime);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      data.latency_ms = durationMs;
      return data;
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        reply: `[ERROR] Connection failed: ${err.message}`,
        action: "error",
        latency_ms: durationMs
      };
    }
  }
}

export const api = new AuraAPI();
