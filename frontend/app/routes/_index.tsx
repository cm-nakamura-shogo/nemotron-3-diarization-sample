import { basename, extname } from "node:path";
import { json, type MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useRef, useState, type SyntheticEvent } from "react";
import { AudioLines, Download } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Timeline } from "~/components/timeline";
import { formatTime, speakerColors } from "~/lib/diarization";
import { createViewerHtml } from "~/lib/standalone-html";
import { readResult, recordingPath } from "~/lib/files.server";

export const meta: MetaFunction = () => [{ title: "話者分離ビューアー" }];
export async function loader() {
  return json({
    result: await readResult(),
    recordingName: basename(recordingPath),
    audioOnly: [".mp3", ".wav", ".m4a", ".ogg", ".oga", ".flac", ".aac", ".opus"].includes(extname(recordingPath).toLowerCase()),
  }, { headers: { "Cache-Control": "no-store" } });
}

export default function Index() {
  const { result, recordingName, audioOnly } = useLoaderData<typeof loader>();
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const pendingSeek = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const activeSpeakers = result.metadata.speakers.filter((speaker) => result.segments.some(
    (segment) => segment.speaker === speaker && segment.start <= currentTime && segment.end > currentTime,
  ));

  function downloadHtml() {
    const html = createViewerHtml({ result, recordingName, audioOnly, colors: speakerColors });
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = recordingName.replace(/\.[^.]+$/, "") + "-viewer.html";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function seekAndPlay(time: number) {
    const media = mediaRef.current;
    if (!media) return;
    setCurrentTime(time);
    if (media.readyState === 0) { pendingSeek.current = time; return; }
    media.currentTime = time;
    try { await media.play(); setError(null); }
    catch { setError("プレイヤーの再生ボタンを押して再生してください。"); }
  }

  const mediaProps = {
    ref: (media: HTMLMediaElement | null) => { mediaRef.current = media; },
    src: "/media",
    controls: true,
    preload: "metadata" as const,
    "aria-label": "録音プレイヤー",
    onLoadedMetadata: () => {
      if (pendingSeek.current !== null) {
        const time = pendingSeek.current;
        pendingSeek.current = null;
        void seekAndPlay(time);
      }
    },
    onTimeUpdate: (event: SyntheticEvent<HTMLMediaElement>) => setCurrentTime(event.currentTarget.currentTime),
    onError: () => setError("録音を再生できませんでした。ファイルとブラウザーの対応を確認してください。"),
  };

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><AudioLines className="size-5" /></span>
        <div><h1 className="text-lg font-semibold">話者分離ビューアー</h1><p className="mt-1 text-xs text-muted-foreground">{recordingName} · {result.metadata.num_speakers_detected}話者 · {formatTime(result.metadata.total_duration_sec)}</p></div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={downloadHtml}><Download />HTMLダウンロード</Button>
      </header>

      <Card className="overflow-hidden shadow-none">
        {audioOnly ? <audio {...mediaProps} className="w-full p-4" /> : <video {...mediaProps} playsInline className="aspect-video max-h-[440px] w-full bg-black object-contain" />}
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="font-mono text-xs text-muted-foreground">{formatTime(currentTime)} / {formatTime(result.metadata.total_duration_sec)}</span>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-muted-foreground">発話中</span>
            {activeSpeakers.length ? activeSpeakers.map((speaker) => <span key={speaker} className="flex items-center gap-1.5 font-mono"><span className="size-2 rounded-full" style={{ background: speakerColors[result.metadata.speakers.indexOf(speaker) % speakerColors.length] }} />{speaker}</span>) : <span className="text-muted-foreground">—</span>}
          </div>
        </div>
      </Card>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Timeline result={result} currentTime={currentTime} onSeek={(time) => void seekAndPlay(time)} />
      <p className="text-xs text-muted-foreground">ダウンロードしたHTMLは、録音ファイルと同じフォルダに置いて開いてください。</p>
    </main>
  );
}
