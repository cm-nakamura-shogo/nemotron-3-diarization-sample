import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { formatTime, speakerColors, type DiarizationResult } from "~/lib/diarization";
import { cn } from "~/lib/utils";

type Props = { result: DiarizationResult; currentTime: number; onSeek: (time: number) => void };

export function Timeline({ result, currentTime, onSeek }: Props) {
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const duration = result.metadata.total_duration_sec;
  const ticks = Array.from({ length: 8 * zoom + 1 }, (_, index) => index * duration / (8 * zoom));

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const position = currentTime / duration * content.clientWidth;
    if (position < viewport.scrollLeft || position > viewport.scrollLeft + viewport.clientWidth - 12) {
      viewport.scrollLeft = Math.max(0, position - viewport.clientWidth / 3);
    }
  }, [currentTime, duration, zoom]);

  return (
    <section aria-label="話者ごとのタイムライン" className="overflow-hidden rounded-lg border bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="text-sm font-medium">話者タイムライン</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" aria-label="タイムラインを縮小" disabled={zoom === 1} onClick={() => setZoom(zoom / 2)}><Minus /></Button>
          <span className="w-8 text-center font-mono text-xs text-muted-foreground">{zoom}×</span>
          <Button variant="ghost" size="icon" className="size-7" aria-label="タイムラインを拡大" disabled={zoom === 8} onClick={() => setZoom(zoom * 2)}><Plus /></Button>
        </div>
      </div>
      <div className="flex border-t">
        <div className="w-24 shrink-0 border-r bg-white sm:w-32">
          <div className="h-8 border-b" />
          {result.metadata.speakers.map((speaker, index) => (
            <div key={speaker} className="flex h-14 items-center gap-2 border-b px-3 last:border-b-0 sm:px-4">
              <span className="size-2 shrink-0 rounded-full" style={{ background: speakerColors[index % speakerColors.length] }} />
              <span className="font-mono text-[11px] sm:text-xs">{speaker}</span>
            </div>
          ))}
        </div>
        <div ref={viewportRef} className="min-w-0 flex-1 overflow-x-auto">
          <div ref={contentRef} className="relative min-w-[480px]" style={{ width: `${zoom * 100}%` }}>
            <div className="relative h-8 border-b bg-slate-50">
              {ticks.map((tick, index) => <span key={index} className={cn("absolute top-2 font-mono text-[10px] text-muted-foreground", index === 0 ? "translate-x-1" : index === ticks.length - 1 ? "-translate-x-[110%]" : "-translate-x-1/2")} style={{ left: `${tick / duration * 100}%` }}>{formatTime(tick)}</span>)}
            </div>
            {result.metadata.speakers.map((speaker, index) => (
              <div key={speaker} className={cn("relative h-14 border-b last:border-b-0", index % 2 === 0 && "bg-slate-50/60")}>
                {ticks.map((tick, tickIndex) => <span key={tickIndex} className="pointer-events-none absolute inset-y-0 border-l border-slate-200/60" style={{ left: `${tick / duration * 100}%` }} />)}
                {result.segments.filter((segment) => segment.speaker === speaker).map((segment, segmentIndex) => {
                  const active = currentTime >= segment.start && currentTime < segment.end;
                  return <button key={segmentIndex} className={cn("absolute top-4 h-6 rounded-sm opacity-80 hover:z-20 hover:opacity-100 focus-visible:z-20", active && "z-10 opacity-100 ring-2 ring-slate-800 ring-offset-2")}
                    style={{ left: `${segment.start / duration * 100}%`, width: `max(2px, ${(segment.end - segment.start) / duration * 100}%)`, background: speakerColors[index % speakerColors.length] }}
                    title={`${speaker} · ${segment.start.toFixed(2)}–${segment.end.toFixed(2)}秒 · 信頼度 ${(segment.confidence * 100).toFixed(1)}%`}
                    aria-label={`${speaker} ${segment.start.toFixed(2)}秒から再生`} onClick={() => onSeek(segment.start)} />;
                })}
              </div>
            ))}
            <div className="pointer-events-none absolute inset-y-0 z-30 w-px bg-slate-900" style={{ left: `${Math.min(100, currentTime / duration * 100)}%` }}>
              <div className="absolute -left-[3px] top-7 size-1.5 rotate-45 bg-slate-900" />
            </div>
          </div>
        </div>
      </div>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground">区間をクリックすると、その位置から再生します。</p>
    </section>
  );
}
