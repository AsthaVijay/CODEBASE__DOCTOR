const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findUser } = require('../src/controllers/users');
test('user lookup calls the supplied database', async () => {
  let called = false;
  const db = { query: async () => { called = true; return [{ id: 1 }]; } };
  assert.deepEqual(await findUser(db, 'demo@example.com'), [{ id: 1 }]);
  assert.equal(called, true);
});
