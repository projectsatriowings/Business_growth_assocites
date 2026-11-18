/**
 * Helper script to detect and cleanly terminate any process occupying port 5000 (or PORT env var)
 * Works cross-platform on Windows (via netstat & taskkill) and Linux/macOS (via fuser / lsof).
 */
const { execSync } = require('child_process');

const targetPort = parseInt(process.env.PORT || '5000', 10);

function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync('netstat -ano').toString();
      const lines = output
        .split('\r\n')
        .filter((l) => (l.includes(`:${port} `) || l.includes(`:${port}\t`)) && l.includes('LISTENING'));

      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && Number(pid) !== process.pid) {
          pids.add(pid);
        }
      }

      if (pids.size > 0) {
        console.log(`🧹 Port ${port} is occupied by PID(s): ${Array.from(pids).join(', ')}. Freeing...`);
        for (const pid of pids) {
          try {
            execSync(`taskkill /F /PID ${pid}`);
            console.log(`✅ Terminated stale process PID ${pid}`);
          } catch (kErr) {
            // Already terminated or permission issue
          }
        }
      }
    } else {
      execSync(`fuser -k ${port}/tcp 2>/dev/null || true`);
    }
  } catch (err) {
    // Port is already free or netstat found nothing
  }
}

freePort(targetPort);
