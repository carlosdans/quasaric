"""Benchmark the exported ByteDance/Kong piano-only ONNX model on MAESTRO audio+MIDI."""
import json, sys
import numpy as np
import mido
import onnxruntime as ort

AUDIO_PATH, MIDI_PATH, MODEL_PATH = sys.argv[1:4]
SR, FPS, SEGMENT = 16000, 100, 16000 * 10
ONSET_THRESHOLD, OFFSET_THRESHOLD, FRAME_THRESHOLD = 0.3, 0.3, 0.1

def read_reference(path):
    midi = mido.MidiFile(path)
    ppq = midi.ticks_per_beat
    merged = mido.merge_tracks(midi.tracks)
    tick = 0
    tempos = [(0, 500000)]
    raw = []
    active = {}
    for msg in merged:
        tick += msg.time
        if msg.type == "set_tempo":
            tempos.append((tick, msg.tempo))
        elif msg.type == "note_on" and msg.velocity > 0:
            active.setdefault((msg.channel, msg.note), []).append(tick)
        elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
            q = active.get((msg.channel, msg.note))
            if q:
                raw.append((msg.note, q.pop(0), tick))
    tempos.sort(key=lambda x: x[0])
    segments = []
    last, seconds, us = 0, 0.0, 500000
    for t, new_us in tempos:
        if t < last: continue
        seconds += (t - last) * us / (ppq * 1e6)
        last, us = t, new_us
        segments.append((last, seconds, us))
    def to_seconds(target):
        seg = segments[0]
        for item in segments[1:]:
            if item[0] > target: break
            seg = item
        return seg[1] + (target - seg[0]) * seg[2] / (ppq * 1e6)
    return [
        {"pitch": pitch, "start": to_seconds(a), "end": to_seconds(b)}
        for pitch, a, b in raw if 21 <= pitch <= 108 and b > a
    ]

def binarize(reg, threshold, neighbour):
    frames, pitches = reg.shape
    binary = np.zeros_like(reg, dtype=np.float32)
    shift = np.zeros_like(reg, dtype=np.float32)
    for k in range(pitches):
        x = reg[:, k]
        for n in range(neighbour, frames - neighbour):
            if x[n] > threshold and all(x[n-i] >= x[n-i-1] and x[n+i] >= x[n+i+1] for i in range(neighbour)):
                binary[n, k] = 1
                if x[n-1] > x[n+1]:
                    den = x[n] - x[n+1]
                else:
                    den = x[n] - x[n-1]
                shift[n, k] = (x[n+1] - x[n-1]) / den / 2 if den else 0
    return binary, shift

def decode_notes(outputs):
    onset, onset_shift = binarize(outputs["reg_onset_output"], ONSET_THRESHOLD, 2)
    offset, offset_shift = binarize(outputs["reg_offset_output"], OFFSET_THRESHOLD, 4)
    frame, velocity = outputs["frame_output"], outputs["velocity_output"]
    notes = []
    for pitch in range(88):
        bgn = frame_disappear = offset_occur = None
        for i in range(len(onset)):
            if onset[i, pitch] == 1:
                if bgn is not None:
                    fin = max(i - 1, 0)
                    notes.append({"pitch": pitch + 21, "start": (bgn + onset_shift[bgn, pitch]) / FPS,
                                  "end": fin / FPS, "velocity": float(velocity[bgn, pitch])})
                    frame_disappear = offset_occur = None
                bgn = i
            if bgn is not None and i > bgn:
                if frame[i, pitch] <= FRAME_THRESHOLD and frame_disappear is None:
                    frame_disappear = i
                if offset[i, pitch] == 1 and offset_occur is None:
                    offset_occur = i
                if frame_disappear is not None:
                    if offset_occur is not None and offset_occur - bgn > frame_disappear - offset_occur:
                        fin = offset_occur
                    else:
                        fin = frame_disappear
                    notes.append({"pitch": pitch + 21, "start": (bgn + onset_shift[bgn, pitch]) / FPS,
                                  "end": (fin + offset_shift[fin, pitch]) / FPS,
                                  "velocity": float(velocity[bgn, pitch])})
                    bgn = frame_disappear = offset_occur = None
                if bgn is not None and (i - bgn >= 600 or i == len(onset) - 1):
                    notes.append({"pitch": pitch + 21, "start": (bgn + onset_shift[bgn, pitch]) / FPS,
                                  "end": (i + offset_shift[i, pitch]) / FPS,
                                  "velocity": float(velocity[bgn, pitch])})
                    bgn = frame_disappear = offset_occur = None
    return notes

def percentile(values, p):
    return float(np.percentile(values, p)) if values else None

def score(predicted, reference, tolerance=0.1):
    remaining = set(range(len(reference)))
    onset_abs, onset_signed, end_abs, end_signed = [], [], [], []
    tp = 0
    for note in sorted(predicted, key=lambda x: x["start"]):
        candidates = [(abs(reference[i]["start"] - note["start"]), i) for i in remaining
                      if reference[i]["pitch"] == note["pitch"]]
        candidates = [x for x in candidates if x[0] <= tolerance]
        if not candidates: continue
        _, best = min(candidates)
        remaining.remove(best); tp += 1
        onset_delta = (note["start"] - reference[best]["start"]) * 1000
        end_delta = (note["end"] - reference[best]["end"]) * 1000
        onset_abs.append(abs(onset_delta)); onset_signed.append(onset_delta)
        end_abs.append(abs(end_delta)); end_signed.append(end_delta)
    fp, fn = len(predicted) - tp, len(reference) - tp
    precision = tp / max(1, tp + fp); recall = tp / max(1, tp + fn)
    return {
        "predictedNotes": len(predicted), "truePositives": tp, "falsePositives": fp, "falseNegatives": fn,
        "precision": round(precision, 4), "recall": round(recall, 4),
        "f1": round(2 * precision * recall / max(1e-9, precision + recall), 4),
        "onsetAbsMs": {"median": percentile(onset_abs, 50), "p95": percentile(onset_abs, 95), "signedMedian": percentile(onset_signed, 50)},
        "keyReleaseAbsMs": {"median": percentile(end_abs, 50), "p95": percentile(end_abs, 95), "signedMedian": percentile(end_signed, 50)},
    }

audio = np.fromfile(AUDIO_PATH, dtype="<f4")
duration = len(audio) / SR
reference = [n for n in read_reference(MIDI_PATH) if n["start"] < duration]
padded = np.pad(audio, (0, int(np.ceil(len(audio) / SEGMENT) * SEGMENT) - len(audio)))
segments = []
pointer = 0
while pointer + SEGMENT <= len(padded):
    segments.append(padded[pointer:pointer+SEGMENT])
    pointer += SEGMENT // 2

opts = ort.SessionOptions()
opts.intra_op_num_threads = 2
opts.inter_op_num_threads = 1
session = ort.InferenceSession(MODEL_PATH, sess_options=opts, providers=["CPUExecutionProvider"])
input_name = session.get_inputs()[0].name
output_names = [x.name for x in session.get_outputs()]
collected = {name: [] for name in output_names}
print("Kong ONNX input:", session.get_inputs()[0].shape, input_name)
print("Kong ONNX outputs:", output_names)
for i, segment in enumerate(segments):
    values = session.run(output_names, {input_name: segment[None, :].astype(np.float32)})
    for name, value in zip(output_names, values):
        collected[name].append(value)
    print("Kong inference segment", i + 1, "/", len(segments))

def deframe(values):
    x = np.concatenate(values, axis=0)
    if len(x) == 1:
        return x[0]
    x = x[:, :-1, :]
    t = x.shape[1]
    parts = [x[0, :int(t * 0.75), :]]
    for i in range(1, len(x) - 1):
        parts.append(x[i, int(t * 0.25):int(t * 0.75), :])
    parts.append(x[-1, int(t * 0.25):, :])
    return np.concatenate(parts, axis=0)

outputs = {name: deframe(values) for name, values in collected.items()}
frames = int(len(audio) / SR * FPS)
outputs = {name: value[:frames] for name, value in outputs.items()}
predicted = decode_notes(outputs)
report = {
    "dataset": "MAESTRO v3.0.0 held-out test performance",
    "model": "ByteDance High-resolution Piano Transcription (Kong et al.), ONNX export",
    "audioSeconds": round(duration, 2), "segments": len(segments),
    "referenceNotes": len(reference),
    "metrics": score(predicted, reference),
}
print("KONG PIANO MODEL BENCHMARK")
print(json.dumps(report, indent=2))
if not predicted:
    raise RuntimeError("Kong model returned no note events")
