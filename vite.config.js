import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/FidelityHackathon/',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        loginAuth: resolve(__dirname, 'LoginAuth.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        optionsCenter: resolve(__dirname, 'OptionsCenter.html'),
        portfolio: resolve(__dirname, 'Portfolio.html'),
        askAI: resolve(__dirname, 'AskAI.html'),
        optionsPlayground: resolve(__dirname, 'optionsPlayground.html'),
      },
    },
  },
});
