import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      include: [/\.tsx?$/, /node_modules/],
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@/components/ui': path.resolve(__dirname, './src/app/components/ui'),
      '@/components': path.resolve(__dirname, './src/app/components'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            if (id.includes('@mui')) {
              return 'vendor-mui';
            }
            if (id.includes('framer-motion') || id.includes('motion')) {
              return 'vendor-motion';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('ethers')) {
              return 'vendor-ethers';
            }
          }
        },
      },
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
