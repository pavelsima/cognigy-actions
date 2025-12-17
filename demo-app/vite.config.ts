import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'

// Helper to copy directory contents
function copyDirContents(srcDir: string, destDir: string, label: string) {
  if (!existsSync(srcDir)) {
    console.warn(`[${label}] Warning: ${srcDir} not found.`)
    return
  }

  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }

  try {
    const files = readdirSync(srcDir)
    files.forEach(file => {
      const srcPath = join(srcDir, file)
      const destPath = join(destDir, file)
      const stat = statSync(srcPath)

      if (stat.isFile()) {
        copyFileSync(srcPath, destPath)
        console.log(`[${label}] Copied ${file}`)
      } else if (stat.isDirectory()) {
        copyDirContents(srcPath, destPath, label)
      }
    })
  } catch (error) {
    console.error(`[${label}] Error copying files:`, error)
  }
}

// Plugin to copy cxone-chat files to dist folder
function copyAssetsPlugin() {
  return {
    name: 'copy-assets',
    closeBundle() {
      const rootDir = join(process.cwd(), '..')

      // Copy cxone-chat/dist
      copyDirContents(
        join(rootDir, 'cxone-chat', 'dist'),
        join(process.cwd(), 'dist', 'cxone-chat'),
        'copy-cxone-chat'
      )
    },
  }
}

// Plugin to serve cxone-chat files during development
function serveWorkspaceAssetsPlugin() {
  const rootDir = resolve(process.cwd(), '..')

  return {
    name: 'serve-workspace-assets',
    configureServer(server: any) {
      // Run before internal middlewares (don't return a function)
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0] || ''

        // Serve /cxone-chat/* from cxone-chat/dist/*
        if (url.startsWith('/cxone-chat/')) {
          const fileName = url.replace('/cxone-chat/', '')
          const filePath = join(rootDir, 'cxone-chat', 'dist', fileName)

          if (existsSync(filePath) && statSync(filePath).isFile()) {
            const ext = filePath.split('.').pop()
            const contentTypes: Record<string, string> = {
              'js': 'application/javascript',
              'css': 'text/css',
              'map': 'application/json',
            }
            res.setHeader('Content-Type', contentTypes[ext || ''] || 'text/plain')
            res.end(readFileSync(filePath))
            return
          }
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), copyAssetsPlugin(), serveWorkspaceAssetsPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  publicDir: 'public',
  server: {
    fs: {
      // Allow serving files from parent directories
      allow: ['..'],
    },
  },
})
