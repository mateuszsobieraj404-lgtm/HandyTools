import { fileURLToPath } from 'node:url';

const nm = (p) => fileURLToPath(new URL(`./node_modules/${p}`, import.meta.url));

// Ścieżki względne: działa pod dowolnym adresem, także na GitHub Pages (/HandyTools/).
export default {
  base: './',
  resolve: {
    alias: [
      // pandoc-wasm eksportuje tylko wejście, które samo ładuje .wasm przez import("./pandoc.wasm");
      // Konwerter bierze rdzeń i plik .wasm wprost, żeby Vite podał go jako zwykły adres (?url).
      { find: /^pandoc-wasm-core$/, replacement: nm('pandoc-wasm/src/core.js') },
      { find: /^pandoc-wasm-binary(\?.*)?$/, replacement: `${nm('pandoc-wasm/src/pandoc.wasm')}$1` },
    ],
  },
  // ffmpeg.wasm uruchamia własny worker (new URL(..., import.meta.url)); wstępna optymalizacja Vite go psuje.
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] },
};
