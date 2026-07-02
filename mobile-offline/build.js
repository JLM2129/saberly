const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const offlineRoot = path.resolve(__dirname);
const frontendRoot = path.resolve(offlineRoot, '..', 'frontend');
const frontendDist = path.join(frontendRoot, 'dist');
const targetApp = path.join(offlineRoot, 'app');

const log = (message) => console.log(`[mobile-offline] ${message}`);

if (!fs.existsSync(frontendRoot)) {
  console.error('[mobile-offline] No se encontró la carpeta frontend. Asegúrate de ejecutar este script desde el repositorio principal.');
  process.exit(1);
}

log('Construyendo frontend con VITE_API_URL=/api...');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const result = spawnSync(npmCmd, ['run', 'build'], {
  cwd: frontendRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    VITE_API_URL: '/api'
  }
});

if (result.error) {
  console.error('[mobile-offline] Error al lanzar npm:', result.error);
}
if (result.status !== 0) {
  console.error('[mobile-offline] Falló la construcción del frontend. Revisa los errores anteriores.');
  process.exit(result.status || 1);
}

if (!fs.existsSync(frontendDist)) {
  console.error('[mobile-offline] No se creó frontend/dist. Revisa el proceso de build del frontend.');
  process.exit(1);
}

log('Copiando frontend/dist a mobile-offline/app...');

if (fs.existsSync(targetApp)) {
  fs.rmSync(targetApp, { recursive: true, force: true });
}
fs.mkdirSync(targetApp, { recursive: true });

const copyRecursive = (src, dest) => {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
};

copyRecursive(frontendDist, targetApp);

log('Build offline completado. Ahora puedes ejecutar `npm start` dentro de mobile-offline.');
