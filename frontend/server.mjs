import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const frontendDir = dirname(fileURLToPath(import.meta.url));
const help = `Usage: node frontend/server.mjs [options]

  --audio <path>  音声・動画ファイル（既定: recording.webm）
  --json <path>   話者分離結果（既定: diarization_result.json）
  --port <port>  ポート番号（既定: 5173）
  --dev          開発サーバーを使用
  --help         このヘルプを表示

指定した相対パスは、コマンドを実行したディレクトリを基準に解決します。
省略時はリポジトリ直下のファイルを使用します。`;

try {
  const { values } = parseArgs({ options: {
    audio: { type: "string" },
    json: { type: "string" },
    port: { type: "string", default: "5173" },
    dev: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  } });
  if (values.help) {
    console.log(help);
  } else {
    const port = Number(values.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("--port は1〜65535で指定してください。");
    const audioPath = resolve(values.audio ?? resolve(frontendDir, "../recording.webm"));
    const jsonPath = resolve(values.json ?? resolve(frontendDir, "../diarization_result.json"));
    for (const path of [audioPath, jsonPath]) {
      if (!(await stat(path)).isFile()) throw new Error(`ファイルではありません: ${path}`);
    }
    JSON.parse(await readFile(jsonPath, "utf-8"));
    const cli = resolve(frontendDir, values.dev
      ? "node_modules/@remix-run/dev/dist/cli.js"
      : "node_modules/@remix-run/serve/dist/cli.js");
    if (!values.dev) {
      try { await stat(resolve(frontendDir, "build/server/index.js")); }
      catch { throw new Error("先に npm --prefix frontend run build を実行してください。"); }
    }
    console.log(`音声: ${audioPath}\nJSON: ${jsonPath}`);
    const child = spawn(process.execPath, [cli, ...(values.dev
      ? ["vite:dev", "--host", "127.0.0.1", "--port", String(port), "--strictPort"]
      : ["./build/server/index.js"])], {
      cwd: frontendDir,
      stdio: "inherit",
      env: { ...process.env, DIARIZATION_AUDIO_PATH: audioPath, DIARIZATION_JSON_PATH: jsonPath, PORT: String(port), HOST: "127.0.0.1" },
    });
    for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
    child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
    child.on("exit", (code, signal) => { process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1); });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
