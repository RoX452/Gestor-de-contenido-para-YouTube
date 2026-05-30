import { execSync } from 'child_process';
console.log(execSync('ps -ef', { encoding: 'utf-8' }));
