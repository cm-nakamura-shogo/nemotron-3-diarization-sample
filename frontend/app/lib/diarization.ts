export type Segment = {
  speaker: string;
  speaker_id: number;
  start: number;
  end: number;
  duration: number;
  confidence: number;
};

export type DiarizationResult = {
  metadata: {
    total_duration_sec: number;
    num_speakers_detected: number;
    speakers: string[];
  };
  segments: Segment[];
};

export const speakerColors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#f97316", "#64748b"];

export function formatTime(seconds: number) {
  const whole = Math.floor(Math.max(0, seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const sec = whole % 60;
  return `${hours ? `${hours.toString().padStart(2, "0")}:` : ""}${minutes.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}
