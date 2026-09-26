import assert from 'node:assert/strict';
import test from 'node:test';
import { pickHeight } from './pobieranie.js';

test('pickHeight: preferowana, najbliższa niższa, a bez niższej najbliższa wyższa', () => {
  const h = [1080, 720, 360];
  assert.equal(pickHeight(h, 'best'), 1080);
  assert.equal(pickHeight(h, 720), 720);
  assert.equal(pickHeight(h, 1440), 1080);
  assert.equal(pickHeight(h, 480), 360);
  assert.equal(pickHeight(h, 240), 360);
  assert.equal(pickHeight([], 720), null);
});
