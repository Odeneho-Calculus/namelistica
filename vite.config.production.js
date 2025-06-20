import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
            }
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
                    'vendor-animation': ['framer-motion'],
                    'vendor-ui': ['lucide-react', 'react-icons', 'react-color'],
                    'export-utils': [
                        './src/utils/gifEncoder.js',
                        './src/utils/videoConverter.js',
                        './src/utils/realGifExporter.js',
                        './src/utils/videoRecorder.js',
                        './src/utils/canvasRecorder.js'
                    ]
                }
            }
        },
        chunkSizeWarningLimit: 1000
    },
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'three',
            '@react-three/fiber',
            '@react-three/drei',
            'framer-motion',
            'lucide-react',
            'react-icons',
            'react-color'
        ]
    },
    define: {
        'process.env.NODE_ENV': '"production"'
    },
    server: {
        port: 3000,
        host: true
    },
    preview: {
        port: 4173,
        host: true
    }
})