/** Convert the render clock to the position currently reaching the listener. */
export function audibleSamplePosition(position: number, latencySeconds: number, sampleRate: number, tempo: number): number {
  const latency = Number.isFinite(latencySeconds) ? Math.max(0, latencySeconds) : 0;
  const rate = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 44100;
  const speed = Number.isFinite(tempo) && tempo > 0 ? tempo : 1;
  return Math.max(0, position - latency * rate * speed);
}
