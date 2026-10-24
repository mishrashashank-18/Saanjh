const { spawn } = require('child_process');
const path = require('path');

console.log('\n🚀 Starting Saanjh (Frontend on :8443 + Backend on :5000)...\n');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// 1. Start Backend Server
const backend = spawn(npmCmd, ['--prefix', 'backend', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

// 2. Start Frontend Vite Server
const frontend = spawn(npmCmd, ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

function cleanup() {
  console.log('\nGracefully terminating Saanjh servers...');
  try {
    backend.kill();
  } catch {}
  try {
    frontend.kill();
  } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
