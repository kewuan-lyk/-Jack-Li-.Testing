# Mutation Testing Report

For this testing, I use my Project 2: Cyberpunk Music Universe as my example.

## Baseline

Command: `node --test test.js`

Result before mutation testing: **24 passed, 0 failed**.

Each mutation below changed exactly one line in `testable-logic.mjs`. After each test run, I restored that line before applying the next mutation.

## Results

| Mutation | One-line code change | Tests that failed | Terminal error |
|---|---|---|---|
| 1: Remove validation | Line 32: removed `if (inQuotes) throw new Error('CSV contains an unclosed quoted field.');` | `throws the documented error for an unclosed quoted field` | `AssertionError [ERR_ASSERTION]: Missing expected exception.` The actual value was `undefined`; the test expected the documented error message. Result: **23 passed, 1 failed**. |
| 2: Change energy boundary | Line 44: changed `Math.min(100, energy)` to `Math.min(50, energy)` | `preserves values exactly on the upper boundaries`; `clamps values just above the upper boundaries` | `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal.` In both failures, actual `energy` was `50` and expected `energy` was `100`. Result: **22 passed, 2 failed**. |
| 3: Remove negative play-count check | Line 40: changed `if (isNaN(playCount) || playCount < 0)` to `if (isNaN(playCount))` | `clamps negative values to their lower boundaries` | `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal.` Actual `playCount` was `-1`; expected `playCount` was `0`. Result: **23 passed, 1 failed**. |
| 4: Reverse Spotify ID priority | Line 54: changed `if (track.spotifyId)` to `if (!track.spotifyId)` | `uses spotifyId as the identity when it exists`; `returns a stable fallback when identity properties are missing`; `deduplicates an incoming track with the same spotifyId`; `adds only the first occurrence of a new identity repeated within incoming tracks` | `AssertionError [ERR_ASSERTION]`. Examples: actual identity `song\|artist` instead of `spotify:spotify-1`; actual fallback `spotify:undefined` instead of `\|`; actual `added` values `1` instead of `0` and `2` instead of `1`. Result: **20 passed, 4 failed**. |
| 5: Reverse merge condition | Line 65: changed `if (!identities.has(identity))` to `if (identities.has(identity))` | `deduplicates an incoming track with the same spotifyId`; `deduplicates fallback identities without regard to letter case`; `adds only the first occurrence of a new identity repeated within incoming tracks` | `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal.` Actual `added` values were `1` instead of `0`, `1` instead of `0`, and `0` instead of `1`. Result: **21 passed, 3 failed**. |

## Fake-test check

No mutation survived. Every intentionally broken version produced at least one specific assertion failure, so none of these five experiments exposed a fake test. The suite uses exact equality, deep equality, and exception assertions rather than truthiness-only checks such as `assert.ok(result)`.

## Restoration verification

After restoring all five mutations, `node --test test.js` again reported **24 passed, 0 failed**. The restored SHA-1 for `testable-logic.mjs` was `aee4e5377d7b93336ce325b9941a53024b788c22`, identical to the pre-mutation hash.
