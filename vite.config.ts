import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  build: {
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // CRITICAL: Externalize server-side dependencies
      // These are only used in /api/* functions, not in the client bundle
      external: [
        '@google/genai',
        '@vercel/node',
        'firebase-admin'
      ],
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'firebase': ['firebase/compat/app', 'firebase/compat/auth', 'firebase/compat/firestore'],
          'date-utils': ['date-fns']
        }
      }
    }
  },
  
  // Resolve aliases for cleaner imports
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/components',
      '@services': '/services',
      '@hooks': '/hooks'
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'date-fns',
      'firebase/compat/app',
      'firebase/compat/auth', 
      'firebase/compat/firestore'
    ],
    // Exclude server-side packages from pre-bundling
    exclude: [
      '@google/genai',
      '@vercel/node'
    ]
  },
  
  // Development server configuration
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    open: true
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
    strictPort: false,
    host: true
  }
});
