import assert from 'node:assert/strict';
import test from 'node:test';
import { toSeconds, formatTime } from './time.js';

test('toSeconds', () => {
  assert.equal(toSeconds(''), null);
  assert.equal(toSeconds(undefined), null);
  assert.equal(toSeconds('65'), 65);
  assert.equal(toSeconds('1:05'), 65);
  assert.equal(toSeconds('1:02:03'), 3723);
  assert.ok(Number.isNaN(toSeconds('1:75')));
  assert.ok(Number.isNaN(toSeconds('abc')));
  assert.ok(Number.isNaN(toSeconds('1:2:3:4')));
});

test('formatTime', () => {
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(3723), '1:02:03');
  assert.equal(formatTime(9), '0:09');
});
