import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } } },
  },
  renderer: {
    root: resolve(__dirname, '..'),
    base: './',
    build: { outDir: resolve(__dirname, 'out/renderer'), emptyOutDir: true,
      rollupOptions: { input: resolve(__dirname, '../index.html') } },
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': resolve(__dirname, '../src') } },
  },
})
