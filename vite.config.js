import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    allowedHosts: [
      '5175-dejonj95-faqmapper-z23tff9k1x6.ws-us120.gitpod.io',
      // Add other allowed hosts if necessary, e.g., 'localhost', '127.0.0.1'
    ],
  },
  plugins: [react()],
})
