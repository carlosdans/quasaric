/**
 * Stem names in HTDemucs ONNX model order
 * Model output: [drums, bass, other, vocals, guitar, piano]
 */
export const STEM_NAMES = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];
export const INSTRUMENT_NAMES = STEM_NAMES;
export const PISTOL_TRACK_INDEX = 6; // Piano is the last stem (index 6)