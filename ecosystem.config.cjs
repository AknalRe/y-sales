const path = require("node:path");

const cwd = __dirname;
const facePython = process.platform === "win32"
  ? path.join(cwd, ".venv-face", "Scripts", "python.exe")
  : path.join(cwd, ".venv-face", "bin", "python");

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
    },
  ],
};
