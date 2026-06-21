const path = require("node:path");
const fs = require("node:fs");

const cwd = __dirname;

// Safely load FACE_SERVICE_* vars from .env so face service doesn't need config.json.
// Wrapped in try-catch so any .env parse error never breaks the API startup.
function loadFaceServiceEnv() {
  try {
    const envPath = path.join(cwd, ".env");
    if (!fs.existsSync(envPath)) return {};
    const result = {};
    const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx < 0) continue;
      const key = trimmed.slice(0, idx).trim();
      if (key.startsWith("FACE_SERVICE_")) {
        result[key] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      }
    }
    return result;
  } catch (_) {
    return {};
  }
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
      // Use PM2 native Python interpreter — the correct way to run .py scripts.
      // "interpreter: python3" tells PM2 to spawn: python3 <script>
      script: "services/face-service/app.py",
      interpreter: "python3",
      env: {
        PYTHONUNBUFFERED: "1",
        ...loadFaceServiceEnv(),
      },
    },
  ],
};
