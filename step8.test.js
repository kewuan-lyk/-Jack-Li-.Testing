const test = require('node:test');
const assert = require('node:assert/strict');

test('track identity ignores surrounding whitespace in fallback fields', async () => {
  const { trackIdentity } = await import('./testable-logic.mjs');

  assert.equal(
    trackIdentity({ songName: ' Local Demo ', artist: ' Indie Artist ' }),
    trackIdentity({ songName: 'Local Demo', artist: 'Indie Artist' })
  );
});
