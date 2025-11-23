import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import { nitro } from 'nitro/vite'

// Plugin to handle CSS imports during SSR build
const ignoreCssPlugin = (): Plugin => ({
  name: 'ignore-css-plugin',
  resolveId(id, _importer, options) {
    // During SSR, make CSS imports resolve to a virtual module
    if (id.endsWith('.css') && options?.ssr) {
      return '\0virtual:ignore-css'
    }
  },
  load(id) {
    // Return empty module for the virtual CSS module
    if (id === '\0virtual:ignore-css') {
      return 'export default {}'
    }
  },
})

const config = defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    ignoreCssPlugin(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      spa: {
        prerender: {
            crawlLinks: true,
            retryCount: 3,
        }
      },

    }),
    nitro(),
    viteReact(),
  ],

  nitro: {},
})

export default config
