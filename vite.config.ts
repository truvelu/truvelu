import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'
import type { Plugin } from 'vite'

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
      prerender: {
         enabled: true,

        // Enable if you need pages to be at `/page/index.html` instead of `/page.html`
        autoSubfolderIndex: true,

        // How many prerender jobs to run at once
        concurrency: 14,

        // Whether to extract links from the HTML and prerender them also
        crawlLinks: true,


        // Number of times to retry a failed prerender job
        retryCount: 2,

        // Delay between retries in milliseconds
        retryDelay: 1000,

        // Fail if an error occurs during prerendering
        failOnError: true,
      }
    }),
    netlify(),
    viteReact(),
  ],
})

export default config
