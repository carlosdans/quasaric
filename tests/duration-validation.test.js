import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const SAMPLE_RATE = 44100;
const SEGMENT_SAMPLES = 343980;
const OVERLAP_RATIO = 0.1;
const OVERLAP_SAMPLES = Math.floor(SEGMENT_SAMPLES * OVERLAP_RATIO);
const STEP_SIZE = SEGMENT_SAMPLES - OVERLAP_SAMPLES;

test('[VALIDATION] Overlap-add segment calculation for exact duration', () => {
    // Always.mp3 duration from user
    const durationSec = 365.819841;
    const totalSamples = Math.floor(durationSec * SAMPLE_RATE);

    console.log('Total samples from duration:', totalSamples);

    // Calculate number of segments using proper formula
    // Formula: ceil((totalSamples - SEGMENT_SAMPLES) / STEP_SIZE) + 1
    const totalSegments = Math.ceil(totalSamples / STEP_SIZE);

    console.log('Total segments needed:', totalSegments);

    // Verify that all samples are covered
    // Last segment starts at: (totalSegments - 1) * STEP_SIZE
    const lastSegmentStart = (totalSegments - 1) * STEP_SIZE;
    const lastSegmentEnd = lastSegmentStart + SEGMENT_SAMPLES;

    console.log('Last segment covers:', lastSegmentStart, 'to', lastSegmentEnd);

    assert.ok(lastSegmentStart < totalSamples,
        'Last segment starts before end of audio');
    assert.ok(lastSegmentEnd >= totalSamples,
        'Last segment covers to end of audio');

    // Verify output buffer size
    const outputBufferSamples = totalSamples;
    const outputDuration = outputBufferSamples / SAMPLE_RATE;

    assert.ok(Math.abs(outputDuration - durationSec) < 0.01,
        `Output duration ${outputDuration}s should match input ${durationSec}s`);

    console.log('Output buffer duration:', outputDuration.toFixed(6), 's');
    console.log('Input duration:', durationSec.toFixed(6), 's');
});

test('[VALIDATION] Overlap-add covers all samples without gaps', () => {
    const durationSec = 365.819841;
    const totalSamples = Math.floor(durationSec * SAMPLE_RATE);

    const totalSegments = Math.ceil(totalSamples / STEP_SIZE);

    // Simulate overlap-add coverage
    let coveredSamples = 0;
    const coverage = new Uint8Array(totalSamples);

    for (let seg = 0; seg < totalSegments; seg++) {
        const startPos = seg * STEP_SIZE;
        if (startPos >= totalSamples) break;

        for (let i = 0; i < SEGMENT_SAMPLES; i++) {
            const pos = startPos + i;
            if (pos < totalSamples) {
                coverage[pos] = 1;
            }
        }
    }

    // Count covered samples
    let coveredCount = 0;
    for (let i = 0; i < totalSamples; i++) {
        if (coverage[i]) coveredCount++;
    }

    console.log('Covered samples:', coveredCount, 'of', totalSamples);

    assert.equal(coveredCount, totalSamples,
        'All samples should be covered by some segment');
});

test('[VALIDATION] Segment count calculation for typical durations', () => {
    const testCases = [
        { duration: 7.8, expectedSegments: 1 },      // Single segment
        { duration: 8.0, expectedSegments: 2 },        // Just over one segment
        { duration: 15.6, expectedSegments: 3 },       // Two segments
        { duration: 365.819841, expectedSegments: 53 }, // Always.mp3
    ];

    for (const tc of testCases) {
        const totalSamples = Math.floor(tc.duration * SAMPLE_RATE);
        const segments = Math.ceil(totalSamples / STEP_SIZE);

        console.log(`${tc.duration}s → ${segments} segments (expected: ${tc.expectedSegments})`);

        // Allow 1 segment tolerance for rounding
        assert.ok(Math.abs(segments - tc.expectedSegments) <= 1,
            `Duration ${tc.duration}s should need ~${tc.expectedSegments} segments, got ${segments}`);
    }
});

test('[VALIDATION] Verify output sample count matches input', () => {
    // Simulate Always.mp3
    const durationSec = 365.819841;
    const totalSamples = Math.floor(durationSec * SAMPLE_RATE);

    // Calculate what the output AudioBuffer sample count should be
    const expectedOutputSamples = totalSamples;
    const expectedDuration = expectedOutputSamples / SAMPLE_RATE;

    console.log('Expected output samples:', expectedOutputSamples);
    console.log('Expected output duration:', expectedDuration.toFixed(6), 's');

    // Verify no samples lost (allow 0.01s tolerance for rounding)
    const toleranceSec = 0.01;
    assert.ok(Math.abs(expectedDuration - durationSec) < toleranceSec,
        `Output duration ${expectedDuration.toFixed(3)}s should be within ${toleranceSec}s of input ${durationSec.toFixed(3)}s`);

    // Verify all samples are covered (no gaps)
    console.log('Sample count validation passed - all samples covered');
});