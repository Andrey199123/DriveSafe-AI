import { spawn } from 'node:child_process';

const forwardedArgs = process.argv.slice(2);
const isWindows = process.platform === 'win32';

const children = [];

const spawnTask = (command, args, label) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: isWindows,
    env: process.env,
  });

  children.push(child);

  child.on('error', (error) => {
    console.error(`Failed to start ${label}:`, error.message);
    process.exitCode = 1;
  });

  child.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`${label} exited with code ${code}.`);
      for (const activeChild of children) {
        if (activeChild !== child && !activeChild.killed) {
          activeChild.kill('SIGINT');
        }
      }
      process.exit(code);
    }

    if (signal) {
      console.error(`${label} exited due to signal ${signal}.`);
      for (const activeChild of children) {
        if (activeChild !== child && !activeChild.killed) {
          activeChild.kill('SIGINT');
        }
      }
      process.exit(1);
    }
  });

  return child;
};

const frontend = spawnTask('npx', ['vite', '--open', ...forwardedArgs], 'frontend');
const backend = spawnTask('npx', ['convex', 'dev'], 'backend');

const shutdown = (signal) => {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', () => {
  shutdown('SIGTERM');
});

const keepAlive = () => {
  if (frontend.exitCode !== null && frontend.exitCode !== 0) {
    process.exit(frontend.exitCode);
  }

  if (backend.exitCode !== null && backend.exitCode !== 0) {
    process.exit(backend.exitCode);
  }

  setTimeout(keepAlive, 250);
};

keepAlive();
