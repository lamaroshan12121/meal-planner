import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// The app imports plan.js, targets.js, ingredients.js and test-fixtures.js from the project root (one level up),
// so the dev server must be allowed to serve files from there.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfig({
  plugins: [react()],
  server: {
    fs: { allow: [projectRoot] },
    proxy: {
      // Pass any request starting with /api on to the backend (vercel dev)
      '/api': 'http://localhost:3000',
    },
  },
})
