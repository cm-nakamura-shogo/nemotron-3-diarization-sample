import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import { createReadableStreamFromReadable, type LoaderFunctionArgs } from "@remix-run/node";
import { recordingPath } from "~/lib/files.server";
import { parseByteRange } from "~/lib/byte-range";

export async function loader({ request }: LoaderFunctionArgs) {
  const path = recordingPath;
  let size: number;
  try {
    const file = await stat(path);
    if (!file.isFile()) throw new Error("Not a file");
    size = file.size;
  } catch {
    throw new Response("録音ファイルが見つかりません", { status: 404 });
  }
  const types: Record<string, string> = {
    ".webm": "video/webm", ".mp4": "video/mp4", ".mp3": "audio/mpeg",
    ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".oga": "audio/ogg",
    ".flac": "audio/flac", ".aac": "audio/aac", ".opus": "audio/ogg",
  };
  const headers = new Headers({
    "Content-Type": types[extname(path).toLowerCase()] ?? "application/octet-stream",
    "Accept-Ranges": "bytes", "Cache-Control": "no-store",
  });
  const rangeHeader = request.headers.get("Range");
  const range = rangeHeader ? parseByteRange(rangeHeader, size) : null;
  if (rangeHeader && !range) {
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set("Content-Length", String(range ? range.end - range.start + 1 : size));
  if (range) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
  if (request.method === "HEAD") return new Response(null, { status: range ? 206 : 200, headers });
  const stream = createReadStream(path, range ?? undefined);
  const abort = () => stream.destroy();
  request.signal.addEventListener("abort", abort, { once: true });
  stream.on("close", () => request.signal.removeEventListener("abort", abort));
  return new Response(createReadableStreamFromReadable(stream), { status: range ? 206 : 200, headers });
}
