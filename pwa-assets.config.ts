import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// iOS and Android mask icons themselves, so apple/maskable icons are full-bleed:
// the SVG's transparent rounded corners are filled with the brand colour.
const brand = { background: '#1f6f5c' }

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    apple: { sizes: [180], padding: 0, resizeOptions: brand },
    maskable: { sizes: [512], padding: 0, resizeOptions: brand },
  },
  images: ['public/favicon.svg'],
})
