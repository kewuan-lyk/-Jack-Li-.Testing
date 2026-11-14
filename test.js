const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

describe('testable playlist logic', async () => {
  const {
    parseCSVRows,
    normalizeTrackMetrics,
    trackIdentity,
    mergeTrackCollections
  } = await import('./testable-logic.mjs');

  describe('parseCSVRows', () => {
    test('keeps commas inside quotes, unescapes doubled quotes, handles CRLF, and skips blank rows', () => {
      const csv = 'Track Name,Artist,Album\r\n"Hello, World","The ""Best"" Band",Demo\r\n\r\nFinal,Artist,Album';

      assert.deepEqual(parseCSVRows(csv), [
        ['Track Name', 'Artist', 'Album'],
        ['Hello, World', 'The "Best" Band', 'Demo'],
        ['Final', 'Artist', 'Album']
      ]);
    });

    test('returns an empty array for empty input', () => {
      assert.deepEqual(parseCSVRows(''), []);
    });

    test('returns an empty array for whitespace-only rows', () => {
      assert.deepEqual(parseCSVRows('   \n\r\n\t'), []);
    });

    test('keeps empty fields and the final row when there is no trailing newline', () => {
      assert.deepEqual(parseCSVRows('name,artist,album\nSong,,Single'), [
        ['name', 'artist', 'album'],
        ['Song', '', 'Single']
      ]);
    });

    test('throws the documented error for an unclosed quoted field', () => {
      assert.throws(
        () => parseCSVRows('name,artist\n"Unclosed,Artist'),
        { message: 'CSV contains an unclosed quoted field.' }
      );
    });

    test('throws a TypeError when the input has the wrong type', () => {
      assert.throws(() => parseCSVRows(null), TypeError);
    });
  });

  describe('normalizeTrackMetrics', () => {
    test('uses safe defaults when properties are missing', () => {
      assert.deepEqual(normalizeTrackMetrics({}), {
        playCount: 0,
        energy: 50,
        releaseYear: 2020
      });
    });

    test('preserves explicit zero play count and zero energy', () => {
      assert.deepEqual(normalizeTrackMetrics({ playCount: 0, energy: 0 }), {
        playCount: 0,
        energy: 0,
        releaseYear: 2020
      });
    });

    test('clamps negative values to their lower boundaries', () => {
      assert.deepEqual(normalizeTrackMetrics({
        playCount: -1,
        energy: -0.01,
        releaseYear: 1899
      }), {
        playCount: 0,
        energy: 0,
        releaseYear: 1900
      });
    });

    test('preserves values exactly on the lower boundaries', () => {
      assert.deepEqual(normalizeTrackMetrics({
        playCount: 0,
        energy: 0,
        releaseYear: 1900
      }), {
        playCount: 0,
        energy: 0,
        releaseYear: 1900
      });
    });

    test('preserves values exactly on the upper boundaries', () => {
      assert.deepEqual(normalizeTrackMetrics({
        playCount: 10,
        energy: 100,
        releaseYear: 2026
      }), {
        playCount: 10,
        energy: 100,
        releaseYear: 2026
      });
    });

    test('clamps values just above the upper boundaries', () => {
      assert.deepEqual(normalizeTrackMetrics({
        playCount: 10,
        energy: 100.01,
        releaseYear: 2027
      }), {
        playCount: 10,
        energy: 100,
        releaseYear: 2026
      });
    });

    test('replaces invalid numeric strings with defaults', () => {
      assert.deepEqual(normalizeTrackMetrics({
        playCount: 'not-a-number',
        energy: 'not-a-number',
        releaseYear: 'not-a-number'
      }), {
        playCount: 0,
        energy: 50,
        releaseYear: 2020
      });
    });

    test('accepts alternate fields and a nested album release date', () => {
      assert.deepEqual(normalizeTrackMetrics({
        plays: '12',
        energy: '45.5',
        album: { release_date: '2016-11-25' }
      }), {
        playCount: 12,
        energy: 45.5,
        releaseYear: 2016
      });
    });

    test('throws a TypeError for a null track instead of silently returning data', () => {
      assert.throws(() => normalizeTrackMetrics(null), TypeError);
    });
  });

  describe('trackIdentity and mergeTrackCollections', () => {
    test('uses spotifyId as the identity when it exists', () => {
      assert.equal(
        trackIdentity({ spotifyId: 'spotify-1', songName: 'Song', artist: 'Artist' }),
        'spotify:spotify-1'
      );
    });

    test('uses a case-insensitive song-name and artist fallback when spotifyId is missing', () => {
      assert.equal(
        trackIdentity({ songName: 'STARBOY', artist: 'THE WEEKND' }),
        trackIdentity({ songName: 'starboy', artist: 'the weeknd' })
      );
    });

    test('returns a stable fallback when identity properties are missing', () => {
      assert.equal(trackIdentity({}), '|');
    });

    test('returns an empty result when both collections are empty', () => {
      assert.deepEqual(mergeTrackCollections([], []), { merged: [], added: 0 });
    });

    test('deduplicates an incoming track with the same spotifyId', () => {
      const existing = [{ spotifyId: 'same-id', songName: 'Original', artist: 'Artist' }];
      const incoming = [{ spotifyId: 'same-id', songName: 'Renamed', artist: 'Other Artist' }];

      const result = mergeTrackCollections(existing, incoming);

      assert.equal(result.added, 0);
      assert.deepEqual(result.merged, existing);
    });

    test('deduplicates fallback identities without regard to letter case', () => {
      const existing = [{ songName: 'Local Demo', artist: 'Indie Artist' }];
      const incoming = [{ songName: 'local demo', artist: 'indie artist' }];

      const result = mergeTrackCollections(existing, incoming);

      assert.equal(result.added, 0);
      assert.equal(result.merged.length, 1);
    });

    test('adds only the first occurrence of a new identity repeated within incoming tracks', () => {
      const incoming = [
        { spotifyId: 'new-id', songName: 'New Song', artist: 'Artist' },
        { spotifyId: 'new-id', songName: 'Duplicate Name', artist: 'Other Artist' }
      ];

      const result = mergeTrackCollections([], incoming);

      assert.equal(result.added, 1);
      assert.equal(result.merged.length, 1);
      assert.equal(result.merged[0].songName, 'New Song');
    });

    test('does not mutate the input arrays or their track objects', () => {
      const existing = [{ spotifyId: 'old-id', songName: 'Old Song', artist: 'Artist' }];
      const incoming = [{ spotifyId: 'new-id', songName: 'New Song', artist: 'Artist' }];
      const existingSnapshot = structuredClone(existing);
      const incomingSnapshot = structuredClone(incoming);

      const result = mergeTrackCollections(existing, incoming);

      assert.deepEqual(existing, existingSnapshot);
      assert.deepEqual(incoming, incomingSnapshot);
      assert.notStrictEqual(result.merged[0], existing[0]);
      assert.notStrictEqual(result.merged[1], incoming[0]);
    });

    test('throws a TypeError when a collection has the wrong type', () => {
      assert.throws(() => mergeTrackCollections([], null), TypeError);
      assert.throws(() => mergeTrackCollections({}, []), TypeError);
    });
  });
});
