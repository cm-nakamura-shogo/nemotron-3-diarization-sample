import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DiarizationResult } from "./diarization";

// npm runs the frontend scripts from frontend/, next to the existing files.
export const recordingPath = resolve(process.env.DIARIZATION_AUDIO_PATH ?? resolve(process.cwd(), "../recording.webm"));
const resultPath = resolve(process.env.DIARIZATION_JSON_PATH ?? resolve(process.cwd(), "../diarization_result.json"));

export async function readResult(): Promise<DiarizationResult> {
  try {
    return JSON.parse(await readFile(resultPath, "utf-8"));
  } catch {
    throw new Response("指定した話者分離結果のJSONを読み込めませんでした。", { status: 404 });
  }
}
