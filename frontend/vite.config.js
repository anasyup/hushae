import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react-router')) return 'router';
          if (id.includes('react-dom') || /node_modules\/react\//.test(id)
              || id.includes('scheduler') || id.includes('react/jsx')) return 'react';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
