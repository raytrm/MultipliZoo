import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // <-- Fixes the relative paths for subdirectory deployments
})
