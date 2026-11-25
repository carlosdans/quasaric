import type { Precision } from '../models.ts';

/** Compact ONNX exports contain float16 tensors; WebGPU can run them only when shader-f16 is supported. */
export function gpuSupportsPrecision(features: { has(name: string): boolean }, precision: Precision): boolean {
  return precision === 'full' || features.has('shader-f16');
}
