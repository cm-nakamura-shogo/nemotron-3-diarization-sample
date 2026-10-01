import argparse
import json
import time
from pathlib import Path
import av
import numpy as np
import torch
from transformers import AutoModelForAudioFrameClassification, AutoProcessor


def load_audio_in_memory(file_path: str, target_sr: int = 16000) -> np.ndarray:
    """外部CLIを使わず、Python内で直接webm等の音声を16kHzモノラルのfloat32配列にデコードする"""
    container = av.open(file_path)
    if not container.streams.audio:
        raise ValueError(f"音声ストリームが見つかりません: {file_path}")

    resampler = av.AudioResampler(format="flt", layout="mono", rate=target_sr)
    chunks = []

    for frame in container.decode(audio=0):
        for resampled_frame in resampler.resample(frame):
            chunks.append(resampled_frame.to_ndarray())

    for resampled_frame in resampler.resample(None):
        chunks.append(resampled_frame.to_ndarray())

    container.close()

    if not chunks:
        return np.array([], dtype=np.float32)

    return np.concatenate(chunks, axis=1).squeeze(0)


def main():
    parser = argparse.ArgumentParser(
        description="Nemotron-3-Diarization を使ったローカル話者分離CLI"
    )
    parser.add_argument(
        "input_audio",
        type=str,
        help="解析対象の音声ファイルパス (.webm, .wav, .mp3, .m4a など)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        default="diarization_result.json",
        help="結果JSONの出力先パス (デフォルト: diarization_result.json)",
    )
    parser.add_argument(
        "--device",
        type=str,
        default=None,
        help="推論デバイス (mps, cuda, cpu)。未指定時は自動判定",
    )
    args = parser.parse_args()

    input_path = Path(args.input_audio)
    if not input_path.exists():
        raise FileNotFoundError(f"入力ファイルが見つかりません: {input_path}")

    # 出力JSONパスの決定
    output_path = Path(args.output)
    if output_path.is_dir():
        json_path = output_path / "diarization_result.json"
    else:
        json_path = output_path
    json_path.parent.mkdir(parents=True, exist_ok=True)

    # デバイス決定
    if args.device:
        device = args.device
    elif torch.backends.mps.is_available():
        device = "mps"
    elif torch.cuda.is_available():
        device = "cuda"
    else:
        device = "cpu"
    print(f"Using device: {device}")

    # モデル・プロセッサの準備
    model_id = "nvidia/Nemotron-3-Diarization"
    print("Loading model and processor...")
    processor = AutoProcessor.from_pretrained(model_id)
    model = AutoModelForAudioFrameClassification.from_pretrained(model_id).to(
        device
    )
    model.eval()

    # 音声読み込み
    sampling_rate = 16000
    print(f"Reading audio from: {input_path}")
    audio = load_audio_in_memory(str(input_path), target_sr=sampling_rate)
    total_duration = round(len(audio) / sampling_rate, 2)
    print(f"Audio loaded: {total_duration}s")

    # 推論処理と速度計測
    inputs = processor(
        audio, sampling_rate=sampling_rate, return_tensors="pt"
    ).to(device)

    print("Diarizing...")
    if device == "mps":
        torch.mps.synchronize()
    elif device == "cuda":
        torch.cuda.synchronize()
    t_start = time.perf_counter()

    with torch.inference_mode():
        outputs = model(**inputs)
        logits = outputs.logits

    if device == "mps":
        torch.mps.synchronize()
    elif device == "cuda":
        torch.cuda.synchronize()
    elapsed_time = time.perf_counter() - t_start

    rtfx = round(total_duration / elapsed_time, 1) if elapsed_time > 0 else 0
    print(f"Done! {elapsed_time:.2f}s (Speed: {rtfx}x)")

    # 確率値の計算 (1フレーム=10ms)
    probs = torch.sigmoid(logits)[0].cpu().numpy()
    num_frames = probs.shape[0]

    segments_raw = processor.extract_speaker_dict(
        logits, inputs.attention_mask
    )[0]

    formatted_segments = []
    speakers_found = set()

    for idx, seg in enumerate(segments_raw):
        speaker_id = int(seg["Speaker"])
        start_time = round(float(seg["Start"]), 2)
        end_time = round(float(seg["End"]), 2)
        speakers_found.add(speaker_id)

        # 確信度（平均発話確率）の算出
        start_frame = int(np.clip(round(start_time * 100), 0, num_frames - 1))
        end_frame = int(np.clip(round(end_time * 100), 0, num_frames))
        if end_frame > start_frame:
            confidence = float(
                np.mean(probs[start_frame:end_frame, speaker_id])
            )
        else:
            confidence = float(probs[start_frame, speaker_id])

        formatted_segments.append(
            {
                "segment_id": idx,
                "speaker": f"speaker_{speaker_id}",
                "speaker_id": speaker_id,
                "start": start_time,
                "end": end_time,
                "duration": round(end_time - start_time, 2),
                "confidence": round(confidence, 4),
            }
        )

    # 結果JSONの作成
    result = {
        "metadata": {
            "source_file": str(input_path),
            "total_duration_sec": total_duration,
            "inference_time_sec": round(elapsed_time, 3),
            "rtfx": rtfx,
            "device": device,
            "num_speakers_detected": len(speakers_found),
            "speakers": sorted([f"speaker_{s}" for s in speakers_found]),
        },
        "segments": formatted_segments,
    }

    # JSON保存
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print("\n--- Summary ---")
    print(f"音声の長さ   : {total_duration} 秒")
    print(f"推論処理時間 : {elapsed_time:.3f} 秒 ({rtfx}倍速)")
    print(f"使用デバイス : {device}")
    print(f"検出話者数   : {len(speakers_found)}")
    print(f"セグメント数 : {len(formatted_segments)}")
    print(f"結果JSON     : {json_path}")


if __name__ == "__main__":
    main()
