import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset base so the static shell (including the preloaded
  // display face) also serves under subpath hosting (#15).
  base: './',
})
