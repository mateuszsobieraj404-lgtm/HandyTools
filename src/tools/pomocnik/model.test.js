import assert from 'node:assert/strict';
import test from 'node:test';
import { lista, sprzet, zakresDat, grupujListy, wOknie, liczba, podsumowanie, poMagazynach, dodajDni } from './model.js';

const L = (id, dane) => lista({ id, dane });

test('lista i sprzęt: braki w danych dostają wartości domyślne', () => {
  const l = L('a', { pozycje: [{ nazwa: 'Kabel', ilosc: 4 }] });
  assert.equal(l.nazwa, 'Bez nazwy');
  assert.deepEqual(l.pozycje[0], { sprzetId: null, nazwa: 'Kabel', magazynId: null, ilosc: '4', uwagi: '', flaga: false });
  assert.equal(sprzet({ id: 's', dane: { stanMagazynowy: null } }).stan, null);
  assert.equal(sprzet({ id: 's', dane: { stanMagazynowy: 0 } }).stan, 0);
});

test('zakresDat: dzień, zakres w miesiącu, przez miesiące, inny rok', () => {
  assert.equal(zakresDat('2026-10-12', '', 2026), '12 paź');
  assert.equal(zakresDat('2026-10-12', '2026-10-14', 2026), '12–14 paź');
  assert.equal(zakresDat('2026-09-30', '2026-10-02', 2026), '30 wrz – 2 paź');
  assert.equal(zakresDat('2025-12-30', '2026-01-02', 2026), '30 gru 2025 – 2 sty');
  assert.equal(zakresDat('2026-10-12', '2026-10-10', 2026), '12 paź'); // dataDo wcześniejsza: ignorowana
  assert.equal(zakresDat('', '', 2026), '');
});

test('grupujListy: trwające są nadchodzące, kolejność w dniu, bez daty osobno', () => {
  const dzis = '2026-09-26';
  const g = grupujListy([
    L('stara', { nazwa: 'Stara', data: '2026-09-01' }),
    L('trwa', { nazwa: 'Trwa', data: '2026-09-25', dataDo: '2026-09-27' }),
    L('b', { nazwa: 'B', data: '2026-09-30', kolejnosc: 2 }),
    L('a', { nazwa: 'A', data: '2026-09-30' }),
    L('c', { nazwa: 'C', data: '2026-09-30', kolejnosc: 1 }),
    L('nowsza', { nazwa: 'Nowsza', data: '2026-09-20' }),
    L('x', { nazwa: 'X' }),
  ], dzis);
  assert.deepEqual(g.nadchodzace.map((l) => l.id), ['trwa', 'c', 'b', 'a']);
  assert.deepEqual(g.archiwum.map((l) => l.id), ['nowsza', 'stara']);
  assert.deepEqual(g.bezDaty.map((l) => l.id), ['x']);
});

test('wOknie: listy zahaczające o [dziś, dziś + dni]', () => {
  const ls = [L('w', { data: '2026-10-03' }), L('za', { data: '2026-10-04' }), L('trwa', { data: '2026-09-20', dataDo: '2026-09-26' }), L('po', { data: '2026-09-25' })];
  assert.deepEqual(wOknie(ls, '2026-09-26', 7).map((l) => l.id), ['trwa', 'w']);
  assert.equal(dodajDni('2026-12-30', 3), '2027-01-02');
});

test('liczba: liczby z przecinkiem, tekst to null', () => {
  assert.equal(liczba('4'), 4);
  assert.equal(liczba(' 2,5 '), 2.5);
  assert.equal(liczba('2 + 1'), null);
  assert.equal(liczba(''), null);
});

test('podsumowanie: sumy po sprzęcie i nazwie, tekst dopisany, brak na stanie', () => {
  const sp = [sprzet({ id: 's1', dane: { nazwa: 'Mikser', magazynId: 'm1', stanMagazynowy: 3 } })];
  const rows = podsumowanie([
    L('a', { nazwa: 'A', pozycje: [{ sprzetId: 's1', nazwa: 'Mikser', ilosc: '2' }, { nazwa: 'Taśma', ilosc: '1' }] }),
    L('b', { nazwa: 'B', pozycje: [{ sprzetId: 's1', nazwa: 'Mikser', ilosc: '2' }, { nazwa: 'taśma', ilosc: 'rolka' }, { nazwa: 'mikser', ilosc: '1' }] }),
  ], sp);
  const mikser = rows.find((r) => r.nazwa === 'Mikser' && r.stan === 3 && r.ilosc === '4');
  assert.ok(mikser, 'Mikser z id: 2 + 2');
  assert.equal(mikser.brak, true);
  assert.equal(mikser.magazynId, 'm1');
  assert.deepEqual(mikser.zrodla, [{ lista: 'A', ilosc: '2' }, { lista: 'B', ilosc: '2' }]);
  assert.equal(rows.find((r) => r.nazwa === 'Taśma').ilosc, '1 + rolka');
  assert.equal(rows.find((r) => r.nazwa === 'mikser').ilosc, '1'); // bez id: osobno, po nazwie
});

test('poMagazynach: kolejność magazynów, bez magazynu na końcu, sortowanie albo zachowanie', () => {
  const mags = [{ id: 'm2', nazwa: 'Drugi', kolejnosc: 2 }, { id: 'm1', nazwa: 'Pierwszy', kolejnosc: 1 }, { id: 'm3', nazwa: 'Pusty', kolejnosc: 3 }];
  const el = [{ nazwa: 'b', magazynId: 'm1', pozycja: 2 }, { nazwa: 'a', magazynId: 'm1', pozycja: 1 }, { nazwa: 'x', magazynId: null }, { nazwa: 'y', magazynId: 'm2' }];
  const g = poMagazynach(el, mags);
  assert.deepEqual(g.map((x) => x.nazwa), ['Pierwszy', 'Drugi', 'Bez magazynu']);
  assert.deepEqual(g[0].elementy.map((e) => e.nazwa), ['a', 'b']);
  assert.deepEqual(poMagazynach(el, mags, { zachowaj: true })[0].elementy.map((e) => e.nazwa), ['b', 'a']);
});
