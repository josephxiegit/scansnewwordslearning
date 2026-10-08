import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BOOK_EDITION === '2027' ? '/2027/' : '/',
  plugins: [vue()],
})
