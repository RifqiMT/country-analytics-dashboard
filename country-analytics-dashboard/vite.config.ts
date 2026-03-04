import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { chatApiPlugin } from './vite-plugin-chat-api'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), chatApiPlugin()],
})
