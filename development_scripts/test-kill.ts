import { execSync } from 'child_process';
try {
  execSync('kill -9 $(lsof -t -i:3000)');
  console.log('Killed port 3000 process');
} catch(e) {
  console.log('No process found or error', e.message);
}
