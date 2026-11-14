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


## Step 7: Red, then green

I intentionally changed the energy upper bound from `100` to `50` and committed the broken version.

- Red commit: [064d49b](https://github.com/kewuan-lyk/-Jack-Li-.Testing/commit/064d49bdaf2efbed411c0f78c2a95a19eca13411)
- Red Actions run: [tests run 2 — failed](https://github.com/kewuan-lyk/-Jack-Li-.Testing/actions/runs/43544176289)
- Failure: 22 tests passed and 2 failed because actual energy was `50` while the tests expected `100`.

I then restored the upper bound to `100` and committed the correction.

- Green commit: [a9bc8a9](https://github.com/kewuan-lyk/-Jack-Li-.Testing/commit/a9bc8a907e103d5e0ffb3a98c161974279df15d1)
- Green Actions run: [tests run 3 — passed](https://github.com/kewuan-lyk/-Jack-Li-.Testing/actions/runs/43544443404)
- Result: all 24 tests passed.

## Step 8: Verifier experiment

I added `step8.test.js`, a genuinely failing test that requires fallback track identities to ignore whitespace surrounding the individual song-name and artist fields.

- Failing-test commit: [be4aee1](https://github.com/kewuan-lyk/-Jack-Li-.Testing/commit/be4aee1fb217de3241ec64c4da3c9d9e21012d92)
- Failing Actions run: [tests run 4 — failed](https://github.com/kewuan-lyk/-Jack-Li-.Testing/actions/runs/43544617412)
- Before result: 25 tests total, 24 passed, 1 failed.
- Assertion: actual `local demo | indie artist`; expected `local demo|indie artist`.

### Agent instructions

The agent was instructed to reproduce the failure, diagnose it, modify only `testable-logic.mjs`, leave every test unchanged, run the complete suite, and return its commands, reasoning, and exact diff. It was explicitly told not to commit or push.

### Agent operations

1. Ran `node --test` and reproduced the single failure with exit code `1`.
2. Inspected `trackIdentity` and identified that trimming the completed `songName|artist` string removes only the outermost spaces, not spaces adjacent to the separator.
3. Changed one production-code line so `songName` and `artist` are converted to strings and trimmed independently before concatenation.
4. Ran `node --test` again and obtained 25 passed, 0 failed, exit code `0`.
5. Modified no tests and no unrelated production logic.

The preserved evidence files are:

- `STEP8_BEFORE.log` — failing test output summary
- `STEP8_AFTER.log` — passing test output summary
- `STEP8_AGENT_FIX.diff` — exact production-code diff

### Verified fix

- Fix commit: [4c3b9e1](https://github.com/kewuan-lyk/-Jack-Li-.Testing/commit/4c3b9e1ec07fc039a074b2b8abba43f07f68c47f)
- Successful Actions run: [tests run 5 — passed](https://github.com/kewuan-lyk/-Jack-Li-.Testing/actions/runs/43545224812)
- Final result: 25 tests passed, 0 failed.
