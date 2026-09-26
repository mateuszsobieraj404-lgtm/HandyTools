// Ekran Konto: połączenie z bazą Pomocnika List Sprzętu i logowanie jego kontem.
// Po zalogowaniu w menu pojawia się narzędzie „Pomocnik Remote” (tylko odczyt).
import { icon } from './icons.js';
import { esc } from './html.js';
import { polaczenie, profil, zalogowany, polacz, zaloguj, wyloguj, ROLA } from './tools/pomocnik/dane.js';

export function konto(el) {
  let zmien = false; // formularz połączenia otwarty mimo zapisanego połączenia
  let busy = false;
  let blad = '';

  function draw() {
    const p = polaczenie();
    const ja = profil();
    if (zalogowany() && ja) {
      el.innerHTML = `
        <section class="ht-section-block" aria-labelledby="k-pls">
          <h2 class="ht-section" id="k-pls">Pomocnik List Sprzętu</h2>
          <div class="ht-card">
            <span class="ht-well">${icon('konto', 'md')}</span>
            <span class="ht-card__text"><span class="ht-card-title">${esc(ja.nazwa || 'Zalogowano')}</span><span class="ht-caption">${esc(ROLA[ja.rola] ?? ja.rola ?? '')}</span></span>
          </div>
          <a class="ht-btn ht-btn--primary" href="#/narzedzie/pomocnik">${icon('listy', 'sm')}Otwórz Pomocnik Remote</a>
          <button type="button" class="ht-btn ht-btn--secondary" data-k="wyloguj" ${busy ? 'disabled' : ''}>Wyloguj</button>
          <span class="ht-caption">Wylogowanie dotyczy tylko tego telefonu. Pomocnik na komputerze zostaje zalogowany.</span>
        </section>`;
      return;
    }
    const form = !p?.ok || zmien; // do pierwszego udanego logowania adres i klucz są do poprawienia
    el.innerHTML = `
      <form class="ht-section-block" novalidate aria-labelledby="k-pls">
        <h2 class="ht-section" id="k-pls">Pomocnik List Sprzętu</h2>
        <p class="ht-lead">Zaloguj się kontem z Pomocnika, żeby na telefonie przeglądać listy i sprzęt. Tylko odczyt.</p>
        ${form ? `
        <div class="ht-field-group">
          <label class="ht-field-label" for="k-url">Adres bazy</label>
          <input class="ht-field" id="k-url" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://….supabase.co" value="${esc(p?.url ?? '')}">
        </div>
        <div class="ht-field-group">
          <label class="ht-field-label" for="k-key">Klucz publiczny</label>
          <input class="ht-field" id="k-key" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(p?.key ?? '')}">
          <span class="ht-caption">Oba są w Supabase: Project Settings → API. Zostają tylko w tym telefonie.</span>
        </div>` : `
        <div class="ht-section-head">
          <span class="ht-caption">Połączono z bazą</span>
          <button type="button" class="ht-btn-text" data-k="zmien">Zmień</button>
        </div>`}
        <div class="ht-field-group">
          <label class="ht-field-label" for="k-email">E-mail</label>
          <input class="ht-field" id="k-email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false">
        </div>
        <div class="ht-field-group">
          <label class="ht-field-label" for="k-pass">Hasło</label>
          <div class="ht-field-wrap">
            <input class="ht-field" id="k-pass" type="password" autocomplete="current-password" style="padding-right:84px">
            <button type="button" class="ht-btn-text ht-field__action" data-k="pokaz">Pokaż</button>
          </div>
          ${blad ? `<span class="ht-field-error" role="alert">${esc(blad)}</span>` : ''}
        </div>
        <button class="ht-btn ht-btn--primary" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Loguję…' : 'Zaloguj'}</button>
      </form>`;
  }

  el.onclick = async (e) => {
    const t = e.target.closest('[data-k]');
    if (!t || t.disabled) return;
    const k = t.dataset.k;
    if (k === 'pokaz') {
      const f = el.querySelector('#k-pass');
      f.type = f.type === 'password' ? 'text' : 'password';
      t.textContent = f.type === 'password' ? 'Pokaż' : 'Ukryj';
    }
    if (k === 'zmien') {
      zmien = true;
      draw();
    }
    if (k === 'wyloguj') {
      busy = true;
      draw();
      await wyloguj();
      busy = false;
      draw();
    }
  };

  el.onsubmit = async (e) => {
    e.preventDefault();
    const v = (id) => el.querySelector(id)?.value ?? '';
    const [url, key, email, haslo] = [v('#k-url'), v('#k-key'), v('#k-email'), v('#k-pass')];
    try {
      if (el.querySelector('#k-url')) polacz(url, key);
      if (!email.trim() || !haslo) throw new Error('Wpisz e-mail i hasło.');
      busy = true;
      blad = '';
      draw();
      await zaloguj(email, haslo);
      zmien = false;
    } catch (ex) {
      blad = ex.message;
    }
    busy = false;
    draw();
    // Po błędzie formularz rysuje się od nowa: wpisane pola wracają, hasło trzeba wpisać ponownie.
    [['#k-url', url], ['#k-key', key], ['#k-email', email]].forEach(([id, val]) => {
      const f = el.querySelector(id);
      if (f && val) f.value = val;
    });
  };

  draw();
}
