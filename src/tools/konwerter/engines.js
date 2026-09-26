// Silniki Konwertera w WebAssembly, w całości w przeglądarce (spec: .scratch/konwerter/spec.md).
// Każdy silnik ładuje się raz, przy pierwszym użyciu; pliki .wasm podaje Vite jako zwykłe adresy (?url),
// więc przeglądarka trzyma je w pamięci podręcznej po pierwszym pobraniu.
import { FORMATS, ffmpegArgs, outName } from './formats.js';

import magickWasmUrl from '@imagemagick/magick-wasm/magick.wasm?url';
import ffmpegCoreUrl from '@ffmpeg/core?url';
import ffmpegWasmUrl from '@ffmpeg/core/wasm?url';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import pandocWasmUrl from 'pandoc-wasm-binary?url';
import typstWasmUrl from '@myriaddreamin/typst-ts-web-compiler/wasm?url';

// Pobranie pliku z postępem w bajtach (do napisu „Pobieram silnik 12 z 31 MB”).
async function fetchBytes(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Nie udało się pobrać silnika (${res.status}).`);
  const total = Number(res.headers.get('Content-Length')) || 0;
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress?.(got, total);
  }
  const out = new Uint8Array(got);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

// Każdy silnik jako obietnica: drugi plik czeka na ten sam load, zamiast pobierać drugi raz.
const loaded = {};
const once = (name, load) => (loaded[name] ??= load().catch((e) => {
  delete loaded[name]; // błąd sieci: następna próba pobiera od nowa
  throw e;
}));

export const isLoaded = (name) => name in loaded;

const engines = {
  magick: (p) => once('magick', async () => {
    const m = await import('@imagemagick/magick-wasm');
    await m.initializeImageMagick(await fetchBytes(magickWasmUrl, p));
    return m;
  }),
  ffmpeg: (p) => once('ffmpeg', async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const wasm = await fetchBytes(ffmpegWasmUrl, p);
    const ff = new FFmpeg();
    await ff.load({ coreURL: ffmpegCoreUrl, wasmURL: URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })) });
    return ff;
  }),
  pdfjs: () => once('pdfjs', async () => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    return pdfjs;
  }),
  pdflib: () => once('pdflib', () => import('pdf-lib')),
  pandoc: (p) => once('pandoc', async () => {
    const { createPandocInstance } = await import('pandoc-wasm-core');
    return createPandocInstance((await fetchBytes(pandocWasmUrl, p)).buffer);
  }),
  typst: (p) => once('typst', async () => {
    const { $typst } = await import('@myriaddreamin/typst.ts/contrib/snippet');
    const wasm = await fetchBytes(typstWasmUrl, p);
    // Czcionki (z polskimi znakami) typst.ts pobiera sam z typst-assets przy pierwszym PDF.
    $typst.setCompilerInitOptions({ getModule: () => wasm });
    return $typst;
  }),
};

export const load = (name, onProgress) => engines[name](onProgress);

const fileOf = (bytes, name, to) => new File([bytes], name, { type: FORMATS[to].mime });

/* --- obrazy (ImageMagick) -------------------------------------------------- */

const MAGICK_FORMAT = { jpg: 'Jpeg', png: 'Png', webp: 'WebP', gif: 'Gif', bmp: 'Bmp', tiff: 'Tiff', avif: 'Avif' };

async function imageTo(file, to, opts) {
  const m = await load('magick');
  const bytes = new Uint8Array(await file.arrayBuffer());
  return m.ImageMagick.read(bytes, (img) => {
    img.autoOrient(); // zdjęcia z telefonu: obrót z EXIF, jak w galerii
    if (opts.maxSize) {
      const g = new m.MagickGeometry(opts.maxSize, opts.maxSize);
      g.greater = true; // tylko zmniejszaj
      img.resize(g);
    }
    if (['jpg', 'bmp'].includes(to) && img.hasAlpha) {
      img.backgroundColor = new m.MagickColor('white'); // przezroczystość → białe tło, nie czarne
      img.alpha(m.AlphaAction.Remove);
    }
    if (opts.quality) img.quality = opts.quality;
    return img.write(m.MagickFormat[MAGICK_FORMAT[to]], (data) => new Uint8Array(data)); // kopia: bufor żyje tylko w callbacku
  });
}

// Wszystkie obrazy w jeden PDF: strona na obraz, szerokość A4, wysokość z proporcji.
async function imagesToPdf(files, opts, onFile) {
  const { PDFDocument } = await load('pdflib');
  const pdf = await PDFDocument.create();
  for (const [i, file] of files.entries()) {
    onFile(i);
    const jpg = await imageTo(file, 'jpg', { quality: 90, maxSize: opts.maxSize ?? 2480 });
    const img = await pdf.embedJpg(jpg);
    const w = 595.28;
    const h = (w * img.height) / img.width;
    pdf.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  const name = files.length === 1 ? outName(files[0].name, 'pdf') : 'obrazy.pdf';
  return [fileOf(await pdf.save(), name, 'pdf')];
}

/* --- audio i wideo (ffmpeg) -------------------------------------------------- */

async function mediaTo(file, fromKind, to, opts, onProgress) {
  const ff = await load('ffmpeg');
  const inName = `wejscie.${FORMATS[file.format].ext[0]}`;
  const outFile = `wyjscie.${FORMATS[to].ext[0]}`;
  const log = [];
  const onLog = ({ message }) => log.push(message);
  const onProg = ({ progress }) => onProgress(Math.max(0, Math.min(1, progress)));
  ff.on('log', onLog);
  ff.on('progress', onProg);
  try {
    await ff.writeFile(inName, new Uint8Array(await file.arrayBuffer()));
    const code = await ff.exec(['-i', inName, ...ffmpegArgs(to, opts, fromKind), outFile]);
    if (code !== 0) throw new Error(`Nie udało się przekonwertować: ${log.slice(-2).join(' ').slice(0, 160)}`);
    return await ff.readFile(outFile);
  } finally {
    ff.off('log', onLog);
    ff.off('progress', onProg);
    await ff.deleteFile(inName).catch(() => {});
    await ff.deleteFile(outFile).catch(() => {});
  }
}

/* --- PDF → obrazy, PDF → Word (pdf.js) --------------------------------------- */

async function openPdf(file) {
  const pdfjs = await load('pdfjs');
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
}

async function pdfToImages(file, to, opts, onProgress) {
  const doc = await openPdf(file);
  const out = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: (opts.dpi ?? 150) / 72 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // strona bez tła w PDF: białe, nie przezroczyste
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise((r) => canvas.toBlob(r, FORMATS[to].mime, 0.9));
    out.push(new File([blob], outName(file.name, to, doc.numPages > 1 ? n : 0), { type: FORMATS[to].mime }));
    canvas.width = 0; // zwolnij pamięć (iPhone ma limit na płótna)
    onProgress(n / doc.numPages);
  }
  return out;
}

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

// PDF → Word: tekst strona po stronie; akapity z odstępów między wierszami, nagłówki z większej czcionki.
// ponytail: bez tabel, kolumn i obrazów z PDF; wierny układ wymaga LibreOffice na serwerze.
async function pdfToDocx(file, onProgress) {
  const doc = await openPdf(file);
  const blocks = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    const sizes = items.filter((i) => i.str.trim()).map((i) => i.height).sort((a, b) => a - b);
    const body = sizes[Math.floor(sizes.length / 2)] || 12;
    let para = '';
    let lastY = null;
    let paraSize = 0;
    const flush = () => {
      if (para.trim()) blocks.push(paraSize > body * 1.3 ? `<h2>${esc(para.trim())}</h2>` : `<p>${esc(para.trim())}</p>`);
      para = '';
      paraSize = 0;
    };
    for (const it of items) {
      const y = it.transform[5];
      if (lastY !== null && Math.abs(lastY - y) > (it.height || body) * 1.6) flush(); // duża przerwa = nowy akapit
      para += it.str + (it.hasEOL ? ' ' : '');
      paraSize = Math.max(paraSize, it.height);
      lastY = y;
    }
    flush();
    onProgress((n / doc.numPages) * 0.8);
  }
  const html = `<!doctype html><html><body>${blocks.join('\n')}</body></html>`;
  return docTo(new File([html], 'wejscie.html'), 'html', 'docx');
}

/* --- dokumenty (pandoc, PDF przez Typst) ------------------------------------- */

async function docTo(file, from, to) {
  const pandoc = await load('pandoc');
  const input = `wejscie.${FORMATS[from].ext[0]}`;
  const target = to === 'pdf' ? 'typst' : FORMATS[to].pandoc;
  const output = to === 'pdf' ? 'wyjscie.typ' : `wyjscie.${FORMATS[to].ext[0]}`;
  const res = await pandoc.convert(
    { from: FORMATS[from].pandoc, to: target, standalone: true, 'input-files': [input], 'output-file': output, 'extract-media': 'media' },
    null,
    { [input]: file },
  );
  const result = res.files?.[output];
  if (!result) throw new Error(`Nie udało się przekonwertować: ${String(res.stderr || '').trim().slice(0, 160) || 'pandoc nie zwrócił pliku'}`);
  if (to !== 'pdf') return new Uint8Array(await result.arrayBuffer());

  const $typst = await load('typst');
  for (const [path, blob] of Object.entries(res.mediaFiles ?? {})) {
    await $typst.mapShadow(`/${path}`, new Uint8Array(await blob.arrayBuffer())); // obrazy z dokumentu
  }
  return $typst.pdf({ mainContent: await result.text() });
}

/* --- jedno wejście dla ekranu -------------------------------------------------- */

// Zamienia pliki (każdy z polem `format`) na format `to`. Zwraca listę File do zapisu.
// onProgress(indeksPliku, 0…1) – postęp bieżącego pliku.
export async function convert(files, to, opts, onProgress) {
  const kind = FORMATS[files[0].format].kind;
  if (kind === 'image' && to === 'pdf') return imagesToPdf(files, opts, (i) => onProgress(i, 0.5));
  const out = [];
  for (const [i, file] of files.entries()) {
    const p = (v) => onProgress(i, v);
    p(0);
    if (kind === 'image') out.push(fileOf(await imageTo(file, to, opts), outName(file.name, to), to));
    else if (kind === 'audio' || kind === 'video') out.push(fileOf(await mediaTo(file, kind, to, opts, p), outName(file.name, to), to));
    else if (kind === 'pdf' && to === 'docx') out.push(fileOf(await pdfToDocx(file, p), outName(file.name, to), to));
    else if (kind === 'pdf') out.push(...(await pdfToImages(file, to, opts, p)));
    else out.push(fileOf(await docTo(file, file.format, to), outName(file.name, to), to));
    p(1);
  }
  return out;
}

