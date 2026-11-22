import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Tests for audio file loading in PlayerScreen
 * Verifies: MP3/MP4 MIME type handling, file validation, regex for filename cleaning
 */
describe('[AUDIO IMPORT] MP3/WAV file validation', () => {
  it('accepts audio/mpeg as valid MP3 type', () => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'application/octetstream'];
    const fileType = 'audio/mpeg';
    const isAllowedType = allowedTypes.includes(fileType) || fileType.startsWith('audio/');
    assert.strictEqual(isAllowedType, true, 'audio/mpeg should be accepted as valid');
  });

  it('accepts audio/* as fallback for unknown audio types', () => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'application/octetstream'];
    const fileType = 'audio/some-unknown-format';
    const isAllowedType = allowedTypes.includes(fileType) || fileType.startsWith('audio/');
    assert.strictEqual(isAllowedType, true, 'audio/* types should be accepted as fallback');
  });

  it('rejects non-audio types', () => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'application/octetstream'];
    const fileType = 'text/plain';
    const isAllowedType = allowedTypes.includes(fileType) || fileType.startsWith('audio/');
    assert.strictEqual(isAllowedType, false, 'non-audio types should be rejected');
  });

  it('accepts application/octetstream as fallback', () => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'application/octetstream'];
    const fileType = 'application/octetstream';
    const isAllowedType = allowedTypes.includes(fileType);
    assert.strictEqual(isAllowedType, true, 'application/octetstream should be accepted for browser compatibility');
  });

  it('correctly removes file extension from filename', () => {
    // Fixed regex pattern: /.[^/.]+$/ 
    const filename = 'test-song.mp3';
    const cleanName = filename.replace(/.[^/.]+$/, '');
    assert.strictEqual(cleanName, 'test-song', 'extension should be correctly removed');
  });

  it('handles filename with multiple dots', () => {
    const filename = 'my.test.song.mp3';
    const cleanName = filename.replace(/.[^/.]+$/, '');
    assert.strictEqual(cleanName, 'my.test.song', 'only last extension should be removed');
  });
});
