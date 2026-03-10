import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { chatApiPlugin } from './vite-plugin-chat-api';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), chatApiPlugin()],
  // Vitest config is typed separately in vitest.config.ts (runtime still reads this).
  // @ts-expect-error - Vite's UserConfig does not know about the test property.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setupTests.ts',
  },
});
