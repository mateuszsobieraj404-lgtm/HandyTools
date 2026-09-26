// Serwer pobierania dla narzędzia „Pobieraczek”. Działa na komputerze w domu,
// telefon łączy się przez tunel HTTPS (Tailscale Funnel). Spec: .scratch/pobieranie/spec.md
//
// Uruchom: start-serwer.bat albo npm run server   (hasło w server/.env: HT_PASSWORD=...)
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { appendFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { toSeconds } from '../src/time.js';

const PORT = Number(process.env.PORT) || 8787;
const PASSWORD = process.env.HT_PASSWORD;
const PYTHON = process.env.HT_PYTHON || 'python';
// X, Instagram i Reddit ukrywają część treści przed niezalogowanymi (X: treść wrażliwa,
// Instagram: posty ze zdjęciami, Reddit: prawie wszystko). Dla tych serwisów bierzemy ciasteczka
// z przeglądarki, w której jesteś zalogowany. Firefox, bo Chrome i Edge szyfrują ciasteczka tak,
// że yt-dlp i gallery-dl ich nie odczytają. Inne serwisy (np. YouTube) idą bez logowania.
const COOKIES_BROWSER = process.env.HT_COOKIES_BROWSER || process.env.HT_X_COOKIES_BROWSER || 'firefox';
const COOKIE_HOSTS = /^(www\.|mobile\.|old\.|m\.)?(x|twitter|instagram|reddit)\.com$/i;
const cookieArgs = (url) => (COOKIE_HOSTS.test(new URL(url).hostname) ? ['--cookies-from-browser', COOKIES_BROWSER] : []);
const TMP = path.join(os.tmpdir(), 'handytools');
const TTL = 60 * 60 * 1000; // plik i podgląd czekają najwyżej godzinę
const PREVIEW_MAX = 30 * 60; // odtwarzacz podglądu do 30 min materiału, dłuższe: same stopklatki
const PICKER_MAX = 30; // najwięcej elementów z jednego posta (karuzela, pokaz slajdów, wątek)
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp'];
const LOG = path.join(import.meta.dirname, 'server.log'); // błędy do diagnozy (poza repo)

const CONTAINERS = ['mp4', 'mkv'];
const AUDIO = ['mp3', 'm4a', 'flac', 'wav'];
const BITRATES = [128, 192, 256, 320];
const MIME = { mp4: 'video/mp4', mkv: 'video/x-matroska', mp3: 'audio/mpeg', m4a: 'audio/mp4', flac: 'audio/flac', wav: 'audio/wav' };

if (!PASSWORD) {
  console.error('Brak hasła. Utwórz server/.env z linią HT_PASSWORD=twoje-haslo');
  process.exit(1);
}

// Serwisy często coś zmieniają; świeży yt-dlp (filmy) i gallery-dl (zdjęcia) przy każdym starcie.
// Bez sieci startujemy na starych wersjach.
console.log('Aktualizuję yt-dlp i gallery-dl…');
spawnSync(PYTHON, ['-m', 'pip', 'install', '-U', '-q', 'yt-dlp', 'gallery-dl'], { stdio: 'inherit' });

const jobs = new Map(); // id → { status, progress, stage, error, file, dir, created }
const previews = new Map(); // id → { video, frame, created }; źródła podglądu z /info
const pickers = new Map(); // id → { title, photos: [{ url, ext }], created }; zdjęcia z posta

/* --- pomocnicze ---------------------------------------------------------- */

const sha = (s) => createHash('sha256').update(String(s)).digest();
const authorized = (req) => timingSafeEqual(sha(req.headers.authorization), sha(`Bearer ${PASSWORD}`));

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) throw new Error('too big');
  }
  return JSON.parse(raw || '{}');
}

function validUrl(s) {
  try {
    return ['http:', 'https:'].includes(new URL(s).protocol);
  } catch {
    return false;
  }
}

// Nazwa pliku od użytkownika: bez znaków, których Windows i telefony nie lubią.
const safeName = (s) => String(s ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 150);

// Komunikaty yt-dlp → zdanie dla człowieka.
function explain(stderr) {
  const line = stderr.split('\n').filter((l) => l.startsWith('ERROR:')).pop() || stderr.trim().split('\n').pop() || '';
  if (/Unsupported URL/i.test(line)) return 'Ten serwis nie jest obsługiwany.';
  if (/\[twitter\].*(No video could be found|Video #\d+ is unavailable)/i.test(line)) {
    return 'X ukrywa ten film (zwykle treść wrażliwa). Zaloguj się na X w Firefoksie na komputerze i włącz w X: Ustawienia → Prywatność i bezpieczeństwo → Treści, które widzisz → pokazuj treści wrażliwe.';
  }
  if (/\[Instagram\].*There is no video in this post/i.test(line)) {
    return 'Instagram pokazuje ten post tylko zalogowanym. Zaloguj się na Instagram w Firefoksie na komputerze i sprawdź jeszcze raz.';
  }
  if (/DRM/i.test(line)) return 'Ta treść jest zabezpieczona (DRM) i nie da się jej pobrać.';
  if (/private|unavailable|removed|not exist|404/i.test(line)) return 'Materiał jest prywatny, usunięty albo niedostępny.';
  if (/sign in|log ?in|confirm you|cookies/i.test(line)) return 'Serwis wymaga zalogowania. Na razie nieobsługiwane.';
  if (/geo|country/i.test(line)) return 'Materiał jest niedostępny w Polsce.';
  return `Nie udało się: ${line.replace(/^ERROR:\s*/, '').slice(0, 160) || 'nieznany błąd'}`;
}

const log = (...parts) => appendFile(LOG, `${new Date().toISOString()} ${parts.join(' ')}\n`).catch(() => {});
const tail = (stderr) => String(stderr).trim().split('\n').slice(-3).join(' | ');

// Facebook dokleja do tytułu liczniki: „130K views · 2.8K reactions | Właściwy tytuł”.
const TITLE_FIX = ['--replace-in-metadata', 'title', String.raw`^[\d.,]+[KMB]? views · [\d.,]+[KMB]? reactions [|｜] `, ''];

const ytdlp = (args, onLine) => run(PYTHON, ['-m', 'yt_dlp', '--no-playlist', '--no-warnings', ...TITLE_FIX, ...args], onLine);

function run(cmd, args, onLine, timeoutMs) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { windowsHide: true });
    const timer = timeoutMs && setTimeout(() => p.kill(), timeoutMs);
    p.on('close', () => clearTimeout(timer));
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => {
      out += d;
      if (onLine) String(d).split(/\r?\n/).forEach((l) => l && onLine(l));
    });
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => resolve({ code, out, err }));
    p.on('error', (e) => resolve({ code: -1, out, err: `ERROR: ${e.message}` }));
  });
}

// Nagłówki, których serwis wymaga przy pobieraniu (User-Agent, Referer…), bez kompresji.
const srcHeaders = (f) => Object.fromEntries(Object.entries(f.http_headers || {}).filter(([k]) => !/^accept-encoding$/i.test(k)));

/* --- /info: tytuł, jakości, rozmiary, podgląd --------------------------------- */

// Zdjęcia z posta (gallery-dl: Instagram, TikTok, X, Reddit, Pinterest…). Tylko obrazy:
// filmy i dźwięk bierze yt-dlp. Zwraca { title, site, photos: [{ url, ext }] } albo null.
async function gallerydl(url) {
  const { out } = await run(PYTHON, ['-m', 'gallery_dl', ...cookieArgs(url), '-j', '--', url], null, 45_000);
  let messages;
  try {
    messages = JSON.parse(out);
  } catch {
    return null;
  }
  const photos = messages
    .filter((m) => m[0] === 3 && IMAGE_EXT.includes(String(m[2]?.extension).toLowerCase()))
    .slice(0, PICKER_MAX)
    .map((m) => ({ url: m[1], ext: String(m[2].extension).toLowerCase().replace('jpeg', 'jpg') }));
  const meta = messages.find((m) => m[0] === 2)?.[1] ?? {};
  const title = [meta.title, meta.content, meta.description, meta.desc].find((t) => typeof t === 'string' && t.trim());
  const clean = title?.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 120); // bez linków z opisu
  const site = meta.category ? meta.category[0].toUpperCase() + meta.category.slice(1) : ''; // „tiktok” → „Tiktok”
  return photos.length ? { title: clean, site, photos } : null;
}

async function info(req, res) {
  const { url, item } = await readJson(req);
  if (!validUrl(url)) return send(res, 400, { error: 'To nie wygląda na link (musi zaczynać się od http).' });
  const n = Number.isInteger(item) && item > 0 ? item : null; // wybrany film z posta z wieloma

  // Filmy (yt-dlp) i zdjęcia (gallery-dl) naraz. --playlist-items tnie długie listy
  // (np. link do kanału) i wybiera konkretny film z posta.
  const [yt, gallery] = await Promise.all([
    ytdlp([...cookieArgs(url), '-J', '--playlist-items', n ? String(n) : `1:${PICKER_MAX}`, '--', url]),
    n ? null : gallerydl(url),
  ]);
  let j = yt.code === 0 ? JSON.parse(yt.out) : null;
  const entries = j?._type === 'playlist' ? (j.entries || []).filter((e) => e?.formats?.some((f) => f.vcodec && f.vcodec !== 'none')) : null;
  const hasVideo = (v) => v?.formats?.some((f) => f.vcodec && f.vcodec !== 'none');

  if (!n && (gallery || entries?.length > 1)) {
    // Post z wieloma elementami: lista do wyboru (filmy po numerze, zdjęcia przez /picker).
    const videos = entries ?? (hasVideo(j) ? [j] : []);
    const pickerId = randomUUID();
    pickers.set(pickerId, { title: gallery?.title || j?.title || 'zdjecie', photos: gallery?.photos ?? [], created: Date.now() });
    return send(res, 200, {
      picker: pickerId,
      url,
      title: j?.title || gallery?.title || 'Post',
      site: j?.extractor_key || gallery?.site || '',
      videos: videos.map((e, i) => ({ item: e.playlist_index ?? i + 1, thumbnail: e.thumbnail, duration: e.duration ?? null, title: e.title })),
      photos: (gallery?.photos ?? []).length,
    });
  }
  if (entries?.length) j = entries[0]; // jeden film z posta (albo wybrany numerem)
  if (!j || (n && !hasVideo(j))) {
    log('INFO', url, n ?? '', tail(yt.err));
    return send(res, 422, { error: yt.code !== 0 ? explain(yt.err) : 'Nie znalazłem tu filmu ani zdjęć.' });
  }

  const formats = j.formats || [];
  const duration = j.duration || null;
  // Rozmiar strumienia: podany przez serwis albo szacowany z bitrate (kb/s → bajty: × 125).
  const size = (f) => f?.filesize ?? f?.filesize_approx ?? (f?.tbr && duration ? Math.round(f.tbr * 125 * duration) : null);

  const videos = formats.filter((f) => f.height && f.vcodec && f.vcodec !== 'none');
  const heights = [...new Set(videos.map((f) => f.height))].sort((a, b) => b - a);
  const video = heights.map((h) => {
    const same = videos.filter((f) => f.height === h);
    const pick = same.find((f) => /^(avc|h264)/.test(f.vcodec)) ?? same[0]; // serwer woli H.264, jak -S
    return { height: h, size: size(pick) };
  });
  const bestAudio = formats.filter((f) => f.vcodec === 'none' && f.acodec && f.acodec !== 'none').sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0))[0];

  // Podgląd: odtwarzacz (plik 360p robiony na żądanie, patrz previewFile) dla materiałów
  // do PREVIEW_MAX; stopklatki z dowolnego strumienia z obrazem, im mniejszego, tym szybciej.
  const plain = (f) => /^https?$/.test(f.protocol ?? '');
  const frameSrc = formats
    .filter((f) => f.url && f.vcodec && f.vcodec !== 'none')
    .sort((a, b) => (plain(b) - plain(a)) || ((a.height ?? 9999) - (b.height ?? 9999)))[0];
  const previewId = randomUUID();
  previews.set(previewId, {
    id: previewId,
    url: n ? url : j.webpage_url || url,
    item: n,
    video: hasVideo(j) && duration && duration <= PREVIEW_MAX,
    file: null, // Promise<ścieżka | null>, tworzona przy pierwszym otwarciu odtwarzacza
    frame: frameSrc && { url: frameSrc.url, headers: srcHeaders(frameSrc) },
    created: Date.now(),
  });

  send(res, 200, {
    url: n ? url : j.webpage_url || url, // film z posta: adres posta + numer
    item: n,
    title: j.title,
    thumbnail: j.thumbnail,
    duration,
    site: j.extractor_key,
    heights,
    video, // [{ height, size }] rozmiar samego obrazu w danej jakości
    audioSize: size(bestAudio), // rozmiar najlepszego dźwięku
    preview: { id: previewId, video: Boolean(previews.get(previewId).video), frames: Boolean(frameSrc) },
  });
}

/* --- /jobs: pobranie + obróbka ------------------------------------------------ */

async function createJob(req, res) {
  const { url, item, kind, height, container, format, bitrate, from, to, name } = await readJson(req);
  if (!validUrl(url)) return send(res, 400, { error: 'To nie wygląda na link.' });
  const isAudio = kind === 'audio';
  if (!['video', 'mute', 'audio'].includes(kind) || (isAudio ? !AUDIO.includes(format) : !CONTAINERS.includes(container))) {
    return send(res, 400, { error: 'Nieznany format.' });
  }
  const br = BITRATES.includes(bitrate) ? bitrate : 256;
  const start = toSeconds(from);
  const end = toSeconds(to);
  if (Number.isNaN(start) || Number.isNaN(end) || (start !== null && end !== null && start >= end)) {
    return send(res, 400, { error: 'Nieprawidłowy czas fragmentu. Wpisz np. 1:05 albo 1:02:03, „od” mniejsze niż „do”.' });
  }

  const id = randomUUID();
  const dir = path.join(TMP, id);
  const srcDir = path.join(dir, 'src');
  await mkdir(srcDir, { recursive: true });

  const args = ['--newline', '-o', path.join(srcDir, '%(title).150B.%(ext)s')];
  if (Number.isInteger(item) && item > 0) args.push('--playlist-items', String(item)); // film z posta z wieloma
  if (isAudio) {
    args.push('-f', 'ba/b'); // obróbka do wybranego formatu i bitrate: ffmpeg w finalize()
  } else {
    // -f ogranicza do wybranej wysokości (? = przepuść formaty bez znanej wysokości),
    // -S wybiera wśród nich: najwyższa rozdzielczość, potem H.264/AAC.
    const h = Number.isInteger(height) ? height : null;
    const cap = h ? `[height<=?${h}]` : '';
    args.push('-f', kind === 'mute' ? `bv*${cap}/bv*` : `bv*${cap}+ba/b${cap}/bv*+ba/b`);
    args.push('-S', `${h ? `res:${h},` : ''}vcodec:h264,acodec:aac`, '--merge-output-format', 'mkv');
  }
  if (start !== null || end !== null) {
    args.push('--download-sections', `*${start ?? 0}-${end ?? 'inf'}`, '--force-keyframes-at-cuts');
  }

  const job = { status: 'running', progress: 0, stage: 'download', error: null, file: null, dir, created: Date.now() };
  jobs.set(id, job);
  send(res, 201, { id });

  // ponytail: postęp liczony per strumień; przy wideo obraz i dźwięk idą osobno, więc licznik
  // raz dobiega do 100 i zaczyna od nowa (dźwięk jest krótki). Suma ważona, gdyby to przeszkadzało.
  const { code, err } = await ytdlp([...cookieArgs(url), ...args, '--', url], (line) => {
    const pct = line.match(/^\[download\]\s+([\d.]+)%/);
    if (pct) {
      job.stage = 'download';
      job.progress = Math.floor(Number(pct[1]));
    } else if (/^\[(Merger|FixupM3u8|ModifyChapters)\]/.test(line)) {
      job.stage = 'processing';
    }
  });

  const file = (await readdir(srcDir).catch(() => [])).find((f) => !f.endsWith('.part') && !f.endsWith('.ytdl'));
  if (code !== 0 || !file) {
    log('JOB', url, tail(err));
    job.status = 'error';
    job.error = code !== 0 ? explain(err) : 'Pobieranie nie zwróciło pliku.';
    return;
  }
  const fallback = path.parse(file).name;
  const ok = await finalize(job, path.join(srcDir, file), { kind, container, format, bitrate: br, name: safeName(name) || fallback });
  if (!ok) {
    job.status = 'error';
    job.error = 'Nie udało się przygotować pliku. Szczegóły w server/server.log na komputerze.';
    return;
  }
  rm(srcDir, { recursive: true, force: true });
  job.status = 'done';
  job.progress = 100;
}

// Jeden przebieg ffmpeg robi plik końcowy: wybrany format, nazwa, a przy MP4 obraz w H.264,
// bo tylko H.264/HEVC iPhone zapisze do Zdjęć (Facebook i inni dają często VP9/AV1).
async function finalize(job, src, { kind, container, format, bitrate, name }) {
  const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name:format=duration', '-of', 'json', src]);
  const meta = JSON.parse(probe.out || '{}');
  const codecOf = (type) => meta.streams?.find((s) => s.codec_type === type)?.codec_name;
  const vcodec = codecOf('video');
  const acodec = codecOf('audio');
  const duration = Number(meta.format?.duration) || 0;

  let ext;
  let codecArgs;
  let slow;
  if (kind === 'audio') {
    ext = format;
    codecArgs = ['-map', '0:a:0', '-vn', ...{
      mp3: ['-c:a', 'libmp3lame', '-b:a', `${bitrate}k`],
      m4a: ['-c:a', 'aac', '-b:a', `${bitrate}k`],
      flac: ['-c:a', 'flac'],
      wav: ['-c:a', 'pcm_s16le'],
    }[format]];
    slow = true;
  } else {
    ext = container;
    const recode = container === 'mp4' && !['h264', 'hevc'].includes(vcodec);
    const audioArgs = kind === 'mute' || !acodec ? ['-an']
      : recode || (container === 'mp4' && !['aac', 'mp3'].includes(acodec)) ? ['-map', '0:a:0', '-c:a', 'aac', '-b:a', '192k']
      : ['-map', '0:a:0', '-c:a', 'copy'];
    codecArgs = [
      '-map', '0:v:0',
      ...(recode ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p'] : ['-c:v', 'copy']),
      ...audioArgs,
      ...(container === 'mp4' ? ['-movflags', '+faststart'] : []),
    ];
    slow = recode;
  }

  const out = path.join(job.dir, `${name}.${ext}`);
  job.stage = slow ? 'convert' : 'processing';
  job.progress = 0;
  const { code, err } = await run('ffmpeg', ['-y', '-v', 'error', '-nostats', '-progress', 'pipe:1', '-i', src, ...codecArgs, out], (line) => {
    const us = line.match(/^out_time_us=(\d+)/); // mikrosekundy → procent czasu trwania
    if (us && duration) job.progress = Math.min(99, Math.floor(Number(us[1]) / 1e4 / duration));
  });
  if (code !== 0) {
    log('FINALIZE', src, kind, ext, vcodec, acodec, tail(err));
    return false;
  }
  job.file = out;
  return true;
}

// Zdjęcie z posta: przez komputer, bo serwisy (np. Instagram) nie wpuszczają obrazów na obce strony.
async function sendPhoto(res, picker, n) {
  const photo = picker.photos[n];
  const upstream = await fetch(photo.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!upstream.ok || !upstream.body) return send(res, 502, { error: 'Nie udało się pobrać zdjęcia.' });
  const name = `${safeName(picker.title).slice(0, 80) || 'zdjecie'} ${n + 1}.${photo.ext}`;
  const headers = {
    'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    'Cache-Control': 'max-age=3600',
  };
  if (upstream.headers.get('content-length')) headers['Content-Length'] = upstream.headers.get('content-length');
  res.writeHead(200, headers);
  Readable.fromWeb(upstream.body).on('error', () => res.destroy()).pipe(res);
}

async function sendFile(res, job) {
  const name = path.basename(job.file);
  const { size } = await stat(job.file);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(name).slice(1)] || 'application/octet-stream',
    'Content-Length': size,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
  });
  createReadStream(job.file).pipe(res);
}

/* --- podgląd ------------------------------------------------------------------- */

// Odtwarzacz w aplikacji: mała kopia 360p (obraz + dźwięk, najlepiej H.264, żeby grał iPhone),
// pobierana przy pierwszym otwarciu i trzymana do TTL. YouTube nie ma już plików z obrazem
// i dźwiękiem razem, a jego adresy działają tylko z IP komputera, więc podgląd idzie przez serwer.
function previewFile(p) {
  p.file ??= (async () => {
    const dir = path.join(TMP, `podglad-${p.id}`);
    await mkdir(dir, { recursive: true });
    const { code, err } = await ytdlp([
      ...cookieArgs(p.url), ...(p.item ? ['--playlist-items', String(p.item)] : []),
      '-f', 'b[height<=?480]/bv*[height<=?360]+ba/wv*+ba/w', '-S', 'vcodec:h264,acodec:aac',
      '--merge-output-format', 'mp4', '-o', path.join(dir, 'podglad.%(ext)s'), '--', p.url,
    ]);
    const file = (await readdir(dir).catch(() => [])).find((f) => f.startsWith('podglad.') && !f.endsWith('.part'));
    if (code !== 0 || !file) {
      log('PREVIEW', p.url, tail(err));
      return null;
    }
    return path.join(dir, file);
  })();
  return p.file;
}

// Plik z obsługą Range: odtwarzacz przewija, pobierając tylko potrzebny kawałek.
async function sendRange(req, res, file) {
  const { size } = await stat(file);
  const type = MIME[path.extname(file).slice(1)] || 'video/mp4';
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (!m || (!m[1] && !m[2])) {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
    return createReadStream(file).pipe(res);
  }
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2])); // „bytes=-500” = ostatnie 500 B
  const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (start >= size || start > end) {
    res.writeHead(416, { 'Content-Range': `bytes */${size}` });
    return res.end();
  }
  res.writeHead(206, { 'Content-Type': type, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes' });
  createReadStream(file, { start, end }).pipe(res);
}

// Stopklatka w danej sekundzie (JPEG ok. 480 px szerokości), gdy odtwarzacz nie zadziała.
function previewFrame(res, src, seconds) {
  const headers = Object.entries(src.headers).map(([k, v]) => `${k}: ${v}\r\n`).join('');
  const p = spawn('ffmpeg', [
    '-v', 'error', '-ss', String(seconds), ...(headers ? ['-headers', headers] : []), '-i', src.url,
    '-frames:v', '1', '-vf', 'scale=480:-2', '-q:v', '5', '-f', 'image2pipe', '-c:v', 'mjpeg', 'pipe:1',
  ], { windowsHide: true });
  const chunks = [];
  const timer = setTimeout(() => p.kill(), 20_000);
  p.stdout.on('data', (d) => chunks.push(d));
  p.on('close', (code) => {
    clearTimeout(timer);
    if (code !== 0 || !chunks.length) return send(res, 502, { error: 'Nie udało się pobrać klatki.' });
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'max-age=3600' });
    res.end(Buffer.concat(chunks));
  });
}

/* --- sprzątanie ---------------------------------------------------------------- */

function dropJob(id) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.delete(id);
  rm(job.dir, { recursive: true, force: true });
}

setInterval(() => {
  for (const [id, job] of jobs) if (Date.now() - job.created > TTL) dropJob(id);
  for (const [id, p] of previews) {
    if (Date.now() - p.created < TTL) continue;
    previews.delete(id);
    rm(path.join(TMP, `podglad-${id}`), { recursive: true, force: true });
  }
  for (const [id, p] of pickers) if (Date.now() - p.created > TTL) pickers.delete(id);
}, 10 * 60 * 1000).unref();

/* --- serwer ---------------------------------------------------------------------- */

const server = http.createServer(async (req, res) => {
  // Hasło chroni dostęp, więc CORS może być otwarty (aplikacja: GitHub Pages i localhost).
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, range');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Range'); // nazwa pliku i postęp w aplikacji
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  const { pathname, searchParams } = new URL(req.url, 'http://x');
  const [, a, id, sub] = pathname.split('/'); // '/jobs/<id>/file' → ['', 'jobs', id, 'file']

  try {
    // Ktoś otworzył adres serwera w przeglądarce: powiedz, gdzie go wpisać.
    if (req.method === 'GET' && pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Serwer HandyTools działa.\n\nTo nie jest strona do otwierania. Wpisz ten adres w aplikacji HandyTools: Ustawienia → Pobieraczek → Adres serwera.');
    }

    // Plik i podgląd otwiera przeglądarka zwykłym linkiem (bez nagłówka z hasłem),
    // więc chroni je losowy identyfikator. Wygasają po TTL.
    if (req.method === 'GET' && a === 'jobs' && sub === 'file') {
      const job = jobs.get(id);
      if (job?.status !== 'done') return send(res, 404, { error: 'Plik wygasł albo jeszcze się pobiera.' });
      return await sendFile(res, job);
    }
    if (req.method === 'GET' && a === 'picker') {
      const picker = pickers.get(id);
      const n = Number(sub);
      if (!picker || !Number.isInteger(n) || !picker.photos[n]) return send(res, 404, { error: 'Zdjęcie wygasło. Sprawdź link jeszcze raz.' });
      return await sendPhoto(res, picker, n);
    }
    if (req.method === 'GET' && a === 'preview') {
      const p = previews.get(id);
      if (sub === 'video' && p?.video) {
        const file = await previewFile(p);
        return file ? await sendRange(req, res, file) : send(res, 502, { error: 'Nie udało się przygotować podglądu.' });
      }
      if (sub === 'frame' && p?.frame) return previewFrame(res, p.frame, Math.max(0, Number(searchParams.get('t')) || 0));
      return send(res, 404, { error: 'Podgląd wygasł. Sprawdź link jeszcze raz.' });
    }

    if (!authorized(req)) {
      await new Promise((r) => setTimeout(r, 1000)); // hamulec na zgadywanie hasła
      return send(res, 401, { error: 'Złe hasło serwera.' });
    }

    if (req.method === 'GET' && a === 'health') return send(res, 200, { ok: true });
    if (req.method === 'POST' && a === 'info') return await info(req, res);
    if (req.method === 'POST' && a === 'jobs' && !id) return await createJob(req, res);
    if (req.method === 'GET' && a === 'jobs' && id) {
      const job = jobs.get(id);
      if (!job) return send(res, 404, { error: 'Zadanie wygasło. Pobierz jeszcze raz.' });
      return send(res, 200, { status: job.status, progress: job.progress, stage: job.stage, error: job.error });
    }
    send(res, 404, { error: 'Nie ma takiego adresu.' });
  } catch (e) {
    if (e.name === 'AbortError') return; // telefon przerwał podgląd (przewinięcie, wyjście)
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: 'Błąd serwera. Szczegóły w oknie serwera na komputerze.' });
  }
});

await rm(TMP, { recursive: true, force: true }); // resztki po poprzednim uruchomieniu
server.listen(PORT, () => console.log(`HandyTools: serwer pobierania działa na http://localhost:${PORT}`));
