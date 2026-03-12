import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config: we only need the React plugin so JSX and Fast Refresh work
export default defineConfig({
  plugins: [react()],
})
