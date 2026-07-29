// Minimal test that the nested example ships with. Exists so the generated
// tree shows a `test/` directory alongside `src/` and `lib/`.
const assert = require('node:assert');
const { add } = require('../src/lib/math');

assert.strictEqual(add(1, 2), 3);