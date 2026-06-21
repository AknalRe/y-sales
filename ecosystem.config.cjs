const path = require("node:path");
const fs = require("node:fs");

const cwd = __dirname;
const facePython = process.platform === "win32"
  ? path.join(cwd, ".venv-face", "Scripts", "python.exe")
  : path.join(cwd, ".venv-face", "bin", "python");

// Load .env file and parse FACE_SERVICE_* variables so PM2 injects them
// into the face service process without requiring a separate config.json.
function loadFaceEnv() {
  const envPath = path.join(cwd, ".env");
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key.startsWith("FACE_SERVICE_")) {
      env[key] = val;
    }
  }
  return env;
}

module.exports = {
  apps: [
    {
      name: "yuksales-api",
      cwd,
      script: "pnpm",
      args: "--filter @yuksales/api start",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "yuksales-face-service",
      cwd,
      script: facePython,
      args: "services/face-service/app.py",
      interpreter: "none",
      env: {
        PYTHONUNBUFFERED: "1",
        ...loadFaceEnv(),
      },
    },
  ],
};
