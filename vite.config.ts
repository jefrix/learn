import { defineConfig } from 'vitest/config';

// Published at https://jefrix.github.io/learn/ so every asset URL needs the /learn/ prefix.
export default defineConfig({
  base: '/learn/',
  build: { outDir: 'dist', sourcemap: true },
  test: { include: ['tests/**/*.test.ts'] },
});
