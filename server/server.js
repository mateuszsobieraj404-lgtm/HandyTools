// Serwer pobierania dla narzędzia „Pobieranie”. Działa na komputerze w domu,
// telefon łączy się przez tunel HTTPS (Tailscale Funnel). Spec: .scratch/pobieranie/spec.md
//
// Uruchom: npm run server   (hasło w server/.env: HT_PASSWORD=...)
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { appendFile, mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { toSeconds } from '../src/time.js';

const PORT = Number(process.env.PORT) || 8787;
const PASSWORD = process.env.HT_PASSWORD;
const PYTHON = process.env.HT_PYTHON || 'python';
const TMP = path.join(os.tmpdir(), 'handytools');
const JOB_TTL = 60 * 60 * 1000; // plik czeka na odbiór najwyżej godzinę
const LOG = path.join(import.meta.dirname, 'server.log'); // błędy do diagnozy (poza repo)

if (!PASSWORD) {
  console.error('Brak hasła. Utwórz server/.env z linią HT_PASSWORD=twoje-haslo');
  process.exit(1);
}

// Serwisy często coś zmieniają; świeży yt-dlp przy każdym starcie. Bez sieci startujemy na starym.
console.log('Aktualizuję yt-dlp…');
spawnSync(PYTHON, ['-m', 'pip', 'install', '-U', '-q', 'yt-dlp'], { stdio: 'inherit' });

const jobs = new Map(); // id → { status, progress, stage, error, file, dir, created }

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

// Komunikaty yt-dlp → zdanie dla człowieka.
function explain(stderr) {
  const line = stderr.split('\n').filter((l) => l.startsWith('ERROR:')).pop() || stderr.trim().split('\n').pop() || '';
  if (/Unsupported URL/i.test(line)) return 'Ten serwis nie jest obsługiwany.';
  if (/DRM/i.test(line)) return 'Ta treść jest zabezpieczona (DRM) i nie da się jej pobrać.';
  if (/private|unavailable|removed|not exist|404/i.test(line)) return 'Materiał jest prywatny, usunięty albo niedostępny.';
  if (/sign in|log ?in|confirm you|cookies/i.test(line)) return 'Serwis wymaga zalogowania. Na razie nieobsługiwane.';
  if (/geo|country/i.test(line)) return 'Materiał jest niedostępny w Polsce.';
  return `Nie udało się: ${line.replace(/^ERROR:\s*/, '').slice(0, 160) || 'nieznany błąd'}`;
}

const log = (...parts) => appendFile(LOG, `${new Date().toISOString()} ${parts.join(' ')}\n`).catch(() => {});
const tail = (stderr) => stderr.trim().split('\n').slice(-3).join(' | ');

// Facebook dokleja do tytułu liczniki: „130K views · 2.8K reactions | Właściwy tytuł”.
const TITLE_FIX = ['--replace-in-metadata', 'title', String.raw`^[\d.,]+[KMB]? views · [\d.,]+[KMB]? reactions [|｜] `, ''];

const ytdlp = (args, onLine) => run(PYTHON, ['-m', 'yt_dlp', '--no-playlist', '--no-warnings', ...TITLE_FIX, ...args], onLine);

function run(cmd, args, onLine) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { windowsHide: true });
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

/* --- endpointy ------------------------------------------------------------ */

async function info(req, res) {
  const { url } = await readJson(req);
  if (!validUrl(url)) return send(res, 400, { error: 'To nie wygląda na link (musi zaczynać się od http).' });

  const { code, out, err } = await ytdlp(['-J', '--', url]);
  if (code !== 0) {
    log('INFO', url, tail(err));
    return send(res, 422, { error: explain(err) });
  }

  const j = JSON.parse(out);
  const heights = [...new Set((j.formats || []).filter((f) => f.height && f.vcodec && f.vcodec !== 'none').map((f) => f.height))];
  send(res, 200, {
    url: j.webpage_url || url,
    title: j.title,
    thumbnail: j.thumbnail,
    duration: j.duration || null,
    site: j.extractor_key,
    heights: heights.sort((a, b) => b - a),
  });
}

async function createJob(req, res) {
  const { url, type, height, format, from, to } = await readJson(req);
  if (!validUrl(url)) return send(res, 400, { error: 'To nie wygląda na link.' });
  if (!(type === 'video' && format === 'mp4') && !(type === 'audio' && ['mp3', 'm4a'].includes(format))) {
    return send(res, 400, { error: 'Nieznany format.' });
  }
  const start = toSeconds(from);
  const end = toSeconds(to);
  if (Number.isNaN(start) || Number.isNaN(end) || (start !== null && end !== null && start >= end)) {
    return send(res, 400, { error: 'Nieprawidłowy czas fragmentu. Wpisz np. 1:05 albo 1:02:03, „od” mniejsze niż „do”.' });
  }

  const id = randomUUID();
  const dir = path.join(TMP, id);
  await mkdir(dir, { recursive: true });

  const args = ['--newline', '-o', path.join(dir, '%(title).150B.%(ext)s')];
  if (type === 'video') {
    // -f ogranicza do wybranej wysokości (? = przepuść formaty bez znanej wysokości),
    // -S wybiera wśród nich: najwyższa rozdzielczość, potem H.264/AAC.
    const h = Number.isInteger(height) ? height : null;
    if (h) args.push('-f', `bv*[height<=?${h}]+ba/b[height<=?${h}]/bv*+ba/b`);
    args.push('-S', `${h ? `res:${h},` : ''}vcodec:h264,acodec:aac`, '--merge-output-format', 'mp4', '--remux-video', 'mp4');
  } else {
    args.push('-f', 'ba/b', '-x', '--audio-format', format, '--audio-quality', '0');
  }
  if (start !== null || end !== null) {
    args.push('--download-sections', `*${start ?? 0}-${end ?? 'inf'}`, '--force-keyframes-at-cuts');
  }

  const job = { status: 'running', progress: 0, stage: 'download', error: null, file: null, dir, created: Date.now() };
  jobs.set(id, job);
  send(res, 201, { id });

  // ponytail: postęp liczony per strumień; przy wideo obraz i dźwięk idą osobno, więc licznik
  // raz dobiega do 100 i zaczyna od nowa (dźwięk jest krótki). Suma ważona, gdyby to przeszkadzało.
  const { code, err } = await ytdlp([...args, '--', url], (line) => {
    const pct = line.match(/^\[download\]\s+([\d.]+)%/);
    if (pct) {
      job.stage = 'download';
      job.progress = Math.floor(Number(pct[1]));
    } else if (/^\[(Merger|ExtractAudio|FixupM3u8|VideoConvertor|ModifyChapters)\]/.test(line)) {
      job.stage = 'processing';
    }
  });

  const files = await readdir(dir).catch(() => []);
  const file = files.find((f) => !f.endsWith('.part') && !f.endsWith('.ytdl'));
  if (code !== 0 || !file) {
    log('JOB', url, tail(err));
    job.status = 'error';
    job.error = code !== 0 ? explain(err) : 'Pobieranie nie zwróciło pliku.';
    return;
  }
  job.file = path.join(dir, file);
  if (type === 'video' && !(await toPhoneCodec(job))) {
    job.status = 'error';
    job.error = 'Nie udało się przekonwertować wideo. Szczegóły w server/server.log na komputerze.';
    return;
  }
  job.status = 'done';
  job.progress = 100;
}

// iPhone zapisze do Zdjęć tylko H.264 albo HEVC. Facebook i część serwisów daje wyłącznie
// VP9/AV1, więc takie wideo przekodowujemy na komputerze (ffmpeg, libx264).
async function toPhoneCodec(job) {
  const probe = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name:format=duration', '-of', 'json', job.file]);
  const info = JSON.parse(probe.out || '{}');
  const codec = info.streams?.[0]?.codec_name;
  if (!codec || ['h264', 'hevc'].includes(codec)) return true;

  const duration = Number(info.format?.duration) || 0;
  const out = path.join(path.dirname(job.file), `h264-${path.basename(job.file)}`);
  job.stage = 'convert';
  job.progress = 0;
  const { code, err } = await run('ffmpeg', [
    '-y', '-v', 'error', '-nostats', '-progress', 'pipe:1', '-i', job.file,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out,
  ], (line) => {
    const us = line.match(/^out_time_us=(\d+)/); // mikrosekundy → procent czasu trwania
    if (us && duration) job.progress = Math.min(99, Math.floor(Number(us[1]) / 1e4 / duration));
  });
  if (code !== 0) {
    log('CONVERT', job.file, codec, tail(err));
    return false;
  }
  await rm(job.file);
  await rename(out, job.file);
  return true;
}

async function sendFile(res, job) {
  const name = path.basename(job.file);
  const { size } = await stat(job.file);
  const type = { mp4: 'video/mp4', mp3: 'audio/mpeg', m4a: 'audio/mp4' }[path.extname(name).slice(1)] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': size,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
  });
  createReadStream(job.file).pipe(res);
}

function dropJob(id) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.delete(id);
  rm(job.dir, { recursive: true, force: true });
}

setInterval(() => {
  for (const [id, job] of jobs) if (Date.now() - job.created > JOB_TTL) dropJob(id);
}, 10 * 60 * 1000).unref();

/* --- serwer --------------------------------------------------------------- */

const server = http.createServer(async (req, res) => {
  // Hasło chroni dostęp, więc CORS może być otwarty (aplikacja: GitHub Pages i localhost).
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length'); // nazwa pliku i postęp w aplikacji
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  const { pathname } = new URL(req.url, 'http://x');
  const [, a, id, sub] = pathname.split('/'); // '/jobs/<id>/file' → ['', 'jobs', id, 'file']

  try {
    // Ktoś otworzył adres serwera w przeglądarce: powiedz, gdzie go wpisać.
    if (req.method === 'GET' && pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Serwer HandyTools działa.\n\nTo nie jest strona do otwierania. Wpisz ten adres w aplikacji HandyTools: Pobieranie → Adres serwera.');
    }

    // Plik chroni losowy identyfikator zadania zamiast hasła (działa też jako zwykły link,
    // np. „Otwórz w Safari”). Zostaje do odbioru do JOB_TTL, żeby telefon mógł ponowić przesyłanie.
    if (req.method === 'GET' && a === 'jobs' && sub === 'file') {
      const job = jobs.get(id);
      if (job?.status !== 'done') return send(res, 404, { error: 'Plik wygasł albo jeszcze się pobiera.' });
      return await sendFile(res, job);
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
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: 'Błąd serwera. Szczegóły w oknie serwera na komputerze.' });
  }
});

await rm(TMP, { recursive: true, force: true }); // resztki po poprzednim uruchomieniu
server.listen(PORT, () => console.log(`HandyTools: serwer pobierania działa na http://localhost:${PORT}`));
