import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateProposal} from '../lib/bob/live';

// Tiny fixture: two allowed paths, each with a known "before" value.
const originals: Record<string, string | null> = {
  'lib/foo.ts': 'const x = 1;',
  'lib/bar.ts': null,
};

test('validateProposal rejects duplicate file paths', () => {
  const payload = JSON.stringify({
    explanation: 'fix',
    files: [
      {path: 'lib/foo.ts', after: 'const x = 2;'},
      {path: 'lib/foo.ts', after: 'const x = 3;'},
    ],
  });
  assert.throws(
    () => validateProposal(payload, originals),
    /unexpected or duplicate/i,
  );
});

test('validateProposal rejects a no-op proposal whose before and after are identical', () => {
  const payload = JSON.stringify({
    explanation: 'nothing changed',
    files: [
      {path: 'lib/foo.ts', after: 'const x = 1;'},
    ],
  });
  assert.throws(
    () => validateProposal(payload, originals),
    /no changes/i,
  );
});
