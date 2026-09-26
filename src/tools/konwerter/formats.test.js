import assert from 'node:assert/strict';
import test from 'node:test';
import { detect, targetsFor, enginesFor, optionsFor, outName } from './formats.js';

test('detect: rozszerzenie, wielkość liter, MIME, nieznane', () => {
  assert.equal(detect('IMG_0001.HEIC'), 'heic');
  assert.equal(detect('film.m4v'), 'mp4');
  assert.equal(detect('image', 'image/jpeg'), 'jpg');
  assert.equal(detect('plik.xyz'), null);
});

test('targetsFor: jeden rodzaj, bez formatu, który już mają wszystkie', () => {
  assert.deepEqual(targetsFor(['mp3']), ['m4a', 'wav', 'flac', 'ogg', 'opus']);
  assert.ok(targetsFor(['heic', 'jpg']).includes('jpg')); // mieszane formaty: JPG zostaje
  assert.ok(targetsFor(['jpg', 'png']).includes('pdf'));
  assert.deepEqual(targetsFor(['jpg', 'mp3']), []); // różne rodzaje
  assert.deepEqual(targetsFor([null]), []);
  assert.deepEqual(targetsFor(['pdf']), ['jpg', 'png', 'docx']);
});

test('enginesFor i optionsFor', () => {
  assert.deepEqual(enginesFor('heic', 'pdf'), ['magick', 'pdflib']);
  assert.deepEqual(enginesFor('docx', 'pdf'), ['pandoc', 'typst']);
  assert.deepEqual(enginesFor('pdf', 'docx'), ['pdfjs', 'pandoc']);
  assert.deepEqual(enginesFor('mov', 'mp3'), ['ffmpeg']);
  assert.deepEqual(optionsFor('video', 'gif'), ['gifWidth']);
  assert.deepEqual(optionsFor('video', 'mp3'), ['bitrate']);
  assert.deepEqual(optionsFor('image', 'png'), ['maxSize']);
  assert.deepEqual(optionsFor('doc', 'pdf'), []);
});

test('outName', () => {
  assert.equal(outName('IMG_1.HEIC', 'jpg'), 'IMG_1.jpg');
  assert.equal(outName('raport.pdf', 'png', 3), 'raport 3.png');
});

test('ffmpegArgs', async () => {
  const { ffmpegArgs } = await import('./formats.js');
  assert.deepEqual(ffmpegArgs('mp3', { bitrate: 320 }), ['-vn', '-c:a', 'libmp3lame', '-b:a', '320k']);
  assert.deepEqual(ffmpegArgs('wav'), ['-vn', '-c:a', 'pcm_s16le']);
  assert.ok(ffmpegArgs('mp4', { resolution: 720 }).join(' ').includes("scale=-2:'min(720,ih)'"));
  assert.ok(!ffmpegArgs('mp4').includes('-vf'));
  assert.ok(ffmpegArgs('gif', { gifWidth: 320 })[1].startsWith('fps=12,scale=320'));
  assert.ok(!ffmpegArgs('mkv').includes('-movflags'));
});
