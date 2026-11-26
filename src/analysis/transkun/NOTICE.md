# Transkun attribution and model notice

Quasaric's optional piano-to-MIDI transcription engine is based on the Transkun v2 ONNX export and browser decoder.

- Model and architecture: Yujia Yan, Frank Cwitkowitz and Zhiyao Duan.
- Research: *Skipping the Frame-Level: Event-Based Piano Transcription with Neural Semi-CRFs* (NeurIPS 2021) and *Scoring Intervals Using Non-Hierarchical Transformer for Piano Transcription* (ISMIR 2024).
- Model export and decode specification: TuesdayCrowd, `TuesdayCrowd/transkun-onnx` on Hugging Face.
- Browser decoder reference: `manh9011/TranskunWeb`.
- License declared for the Transkun model/export: MIT. The model weights and front-end parameter assets are fetched at runtime from Hugging Face and are not redistributed in this repository.

This is an independent integration and is not affiliated with or endorsed by the original research authors or the export maintainers. Audio remains on the user's device; only model assets are downloaded.
