import { execSync } from 'child_process';
const ps = execSync('ps -ef', { encoding: 'utf8' });
const lines = ps.split('\n');
for (const line of lines) {
  if (line.includes('tsx') || line.includes('node') || line.includes('vite')) {
    const parts = line.trim().split(/\s+/);
    const pid = parseInt(parts[1], 10);
    // Don't kill our own test-kill2 process
    if (pid !== process.pid && !line.includes('test-kill2')) {
      try {
        process.kill(pid, 9);
        console.log('Killed PID', pid);
      } catch(e) {}
    }
  }
}
