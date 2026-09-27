import assert from 'node:assert/strict';
import test from 'node:test';
import { dateRangeShort, dateFileStamp, nazwaPliku } from './druk.js';

test('daty na wydruku jak w Pomocniku: tytuł i nazwa pliku', () => {
  assert.equal(dateRangeShort({ data: '2026-10-12', dataDo: '' }), '12.10');
  assert.equal(dateRangeShort({ data: '2026-10-12', dataDo: '2026-10-14' }), '12-14.10');
  assert.equal(dateRangeShort({ data: '2026-09-30', dataDo: '2026-10-02' }), '30.09-02.10');
  assert.equal(dateRangeShort({ data: '', dataDo: '' }), '');
  assert.equal(dateFileStamp({ data: '2026-10-12', dataDo: '2026-10-14' }), '12-14.10.26');
  assert.equal(dateFileStamp({ data: '2026-12-30', dataDo: '2027-01-02' }), '30.12.26-02.01.27');
  assert.equal(nazwaPliku({ nazwa: 'Wesele: sala A/B', data: '2026-10-12', dataDo: '' }, '2026-09-27'), 'Wesele- sala A-B 12.10.26.pdf');
  assert.equal(nazwaPliku({ nazwa: '', data: '', dataDo: '' }, '2026-09-27'), 'Lista sprzętu 27.09.26.pdf');
});
