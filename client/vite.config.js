import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/Currensee-core/',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        loginAuth: resolve(__dirname, 'src/pages/LoginAuth.html'),
        dashboard: resolve(__dirname, 'src/pages/dashboard.html'),
        optionsCenter: resolve(__dirname, 'src/pages/OptionsCenter.html'),
        portfolio: resolve(__dirname, 'src/pages/Portfolio.html'),
        askAI: resolve(__dirname, 'src/pages/AskAI.html'),
        optionsPlayground: resolve(__dirname, 'src/pages/optionsPlayground.html'),
      },
    },
  },
});
