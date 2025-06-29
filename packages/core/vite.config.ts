import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true
    })
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'WooHeadless',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'esm' : format}.js`
    },
    rollupOptions: {
      external: ['fuse.js', 'zod'],
      output: {
        globals: {
          'fuse.js': 'Fuse',
          'zod': 'z'
        }
      }
    },
    target: 'es2020',
    minify: 'terser',
    sourcemap: true
  }
}); 