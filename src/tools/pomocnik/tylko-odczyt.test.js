// Strażnik: Pomocnik Remote tylko czyta bazę. Logowanie jest kontem właściciela, które na serwerze
// może wszystko, więc jedyną barierą przed przypadkowym zapisem jest ten kod. Zapis = osobna decyzja.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('./', import.meta.url);
const files = [new URL('../pomocnik.js', import.meta.url), ...readdirSync(dir).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js')).map((f) => new URL(f, dir)), new URL('../../konto.js', import.meta.url)];

test('Pomocnik Remote: żadnych zapisów do bazy', () => {
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const bad of ['.insert(', '.update(', '.upsert(', '.delete(', '.rpc(', '.storage', '.functions']) {
      assert.ok(!src.includes(bad), `${f.pathname.split('/').pop()} zawiera ${bad}`);
    }
  }
});
