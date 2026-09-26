// Katalog formatów Konwertera: co rozpoznajemy, na co da się zamienić i czym (spec: .scratch/konwerter/spec.md).
// Czyste dane i funkcje, bez przeglądarki: testowane w formats.test.js.

// kind: rodzaj pliku; out: czy może być formatem docelowym.
export const FORMATS = {
  jpg: { kind: 'image', label: 'JPG', mime: 'image/jpeg', ext: ['jpg', 'jpeg', 'jfif'], out: true },
  png: { kind: 'image', label: 'PNG', mime: 'image/png', ext: ['png'], out: true },
  webp: { kind: 'image', label: 'WEBP', mime: 'image/webp', ext: ['webp'], out: true },
  heic: { kind: 'image', label: 'HEIC', mime: 'image/heic', ext: ['heic', 'heif'], out: false },
  gif: { kind: 'image', label: 'GIF', mime: 'image/gif', ext: ['gif'], out: true },
  bmp: { kind: 'image', label: 'BMP', mime: 'image/bmp', ext: ['bmp'], out: true },
  tiff: { kind: 'image', label: 'TIFF', mime: 'image/tiff', ext: ['tif', 'tiff'], out: true },
  avif: { kind: 'image', label: 'AVIF', mime: 'image/avif', ext: ['avif'], out: true },

  mp3: { kind: 'audio', label: 'MP3', mime: 'audio/mpeg', ext: ['mp3'], out: true },
  m4a: { kind: 'audio', label: 'M4A', mime: 'audio/mp4', ext: ['m4a'], out: true },
  aac: { kind: 'audio', label: 'AAC', mime: 'audio/aac', ext: ['aac'], out: false },
  wav: { kind: 'audio', label: 'WAV', mime: 'audio/wav', ext: ['wav'], out: true },
  flac: { kind: 'audio', label: 'FLAC', mime: 'audio/flac', ext: ['flac'], out: true },
  ogg: { kind: 'audio', label: 'OGG', mime: 'audio/ogg', ext: ['ogg', 'oga'], out: true },
  opus: { kind: 'audio', label: 'OPUS', mime: 'audio/ogg', ext: ['opus'], out: true },
  wma: { kind: 'audio', label: 'WMA', mime: 'audio/x-ms-wma', ext: ['wma'], out: false },

  mp4: { kind: 'video', label: 'MP4', mime: 'video/mp4', ext: ['mp4', 'm4v'], out: true },
  mov: { kind: 'video', label: 'MOV', mime: 'video/quicktime', ext: ['mov'], out: true },
  mkv: { kind: 'video', label: 'MKV', mime: 'video/x-matroska', ext: ['mkv'], out: true },
  webm: { kind: 'video', label: 'WEBM', mime: 'video/webm', ext: ['webm'], out: true },
  avi: { kind: 'video', label: 'AVI', mime: 'video/x-msvideo', ext: ['avi'], out: false },

  pdf: { kind: 'pdf', label: 'PDF', mime: 'application/pdf', ext: ['pdf'], out: true },
  docx: { kind: 'doc', label: 'DOCX', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: ['docx'], out: true, pandoc: 'docx' },
  odt: { kind: 'doc', label: 'ODT', mime: 'application/vnd.oasis.opendocument.text', ext: ['odt'], out: true, pandoc: 'odt' },
  rtf: { kind: 'doc', label: 'RTF', mime: 'application/rtf', ext: ['rtf'], out: true, pandoc: 'rtf' },
  md: { kind: 'doc', label: 'MD', mime: 'text/markdown', ext: ['md', 'markdown'], out: true, pandoc: 'markdown' },
  html: { kind: 'doc', label: 'HTML', mime: 'text/html', ext: ['html', 'htm'], out: true, pandoc: 'html' },
  txt: { kind: 'doc', label: 'TXT', mime: 'text/plain', ext: ['txt'], out: true, pandoc: 'plain' },
  epub: { kind: 'doc', label: 'EPUB', mime: 'application/epub+zip', ext: ['epub'], out: true, pandoc: 'epub' },
};

// Na co da się zamienić plik danego rodzaju.
export const TARGETS = {
  image: ['jpg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'avif', 'pdf'],
  audio: ['mp3', 'm4a', 'wav', 'flac', 'ogg', 'opus'],
  video: ['mp4', 'mov', 'mkv', 'webm', 'gif', 'mp3', 'm4a'],
  pdf: ['jpg', 'png', 'docx'],
  doc: ['docx', 'odt', 'rtf', 'md', 'html', 'txt', 'epub', 'pdf'],
};

// Silnik ładowany przy pierwszym użyciu; `mb` to rozmiar do pobrania, pokazywany użytkownikowi.
export const ENGINES = {
  magick: { label: 'obrazów', mb: 15 },
  ffmpeg: { label: 'audio i wideo', mb: 31 },
  pdfjs: { label: 'PDF', mb: 2 },
  pdflib: { label: 'PDF', mb: 1 },
  pandoc: { label: 'dokumentów', mb: 58 },
  typst: { label: 'PDF z dokumentów', mb: 29 },
};

const BY_EXT = Object.fromEntries(Object.entries(FORMATS).flatMap(([id, f]) => f.ext.map((e) => [e, id])));
const BY_MIME = Object.fromEntries(Object.entries(FORMATS).map(([id, f]) => [f.mime, id]));

// Format pliku po rozszerzeniu, a gdy go brak (np. „image.jpeg” bez końcówki z schowka): po typie MIME.
export function detect(name, mime) {
  const ext = String(name).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  return (ext && BY_EXT[ext]) || BY_MIME[mime] || null;
}

// Formaty docelowe wspólne dla wszystkich wybranych plików (jeden rodzaj naraz).
// Pomija format, który mają już wszystkie pliki (MP3 → MP3 nie ma sensu).
export function targetsFor(ids) {
  if (!ids.length || ids.some((id) => !id)) return [];
  const kinds = new Set(ids.map((id) => FORMATS[id].kind));
  if (kinds.size > 1) return [];
  const [kind] = kinds;
  const same = ids.every((id) => id === ids[0]) ? ids[0] : null;
  return TARGETS[kind].filter((t) => t !== same);
}

// Czym zamienić: nazwy silników w kolejności użycia.
export function enginesFor(from, to) {
  const kind = FORMATS[from].kind;
  if (kind === 'image') return to === 'pdf' ? ['magick', 'pdflib'] : ['magick'];
  if (kind === 'audio' || kind === 'video') return ['ffmpeg'];
  if (kind === 'pdf') return to === 'docx' ? ['pdfjs', 'pandoc'] : ['pdfjs'];
  return to === 'pdf' ? ['pandoc', 'typst'] : ['pandoc'];
}

// Kluczowe opcje dla formatu docelowego (pokazywane w panelu).
export function optionsFor(fromKind, to) {
  if (to === 'gif' && fromKind === 'video') return ['gifWidth'];
  if (fromKind === 'image' && to !== 'pdf') return ['jpg', 'webp', 'avif'].includes(to) ? ['quality', 'maxSize'] : ['maxSize'];
  if (fromKind === 'image' && to === 'pdf') return ['maxSize'];
  if (['mp3', 'm4a', 'ogg', 'opus'].includes(to)) return ['bitrate'];
  if (fromKind === 'video') return ['resolution'];
  if (fromKind === 'pdf' && to !== 'docx') return ['dpi'];
  return [];
}

// Nazwa pliku wynikowego: ta sama nazwa, nowe rozszerzenie; strony PDF numerowane.
export function outName(name, to, page) {
  const base = String(name).replace(/\.[^.]+$/, '') || 'plik';
  return `${base}${page ? ` ${page}` : ''}.${FORMATS[to].ext[0]}`;
}

// Polecenie ffmpeg dla formatu docelowego (bez -i i nazwy wyjścia).
// ponytail: x264 „ultrafast” i VP8 „realtime”: w telefonie liczy się czas, nie najmniejszy plik.
export function ffmpegArgs(to, opts = {}) {
  const br = `${opts.bitrate ?? 192}k`;
  const audio = {
    mp3: ['-vn', '-c:a', 'libmp3lame', '-b:a', br],
    m4a: ['-vn', '-c:a', 'aac', '-b:a', br],
    wav: ['-vn', '-c:a', 'pcm_s16le'],
    flac: ['-vn', '-c:a', 'flac'],
    ogg: ['-vn', '-c:a', 'libvorbis', '-ar', '44100', '-b:a', br], // Vorbis nie przyjmuje niskich częstotliwości (np. 8 kHz z dyktafonu)
    opus: ['-vn', '-c:a', 'libopus', '-b:a', br],
  };
  if (audio[to]) return audio[to];
  if (to === 'gif') {
    const w = opts.gifWidth ?? 480;
    return ['-vf', `fps=12,scale=${w}:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse`, '-loop', '0'];
  }
  const scale = opts.resolution ? ['-vf', `scale=-2:'min(${opts.resolution},ih)'`] : []; // tylko zmniejszaj
  if (to === 'webm') return [...scale, '-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '8', '-b:v', '1500k', '-c:a', 'libvorbis', '-ar', '44100', '-b:a', '128k'];
  return [...scale, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', ...(to === 'mkv' ? [] : ['-movflags', '+faststart'])];
}
