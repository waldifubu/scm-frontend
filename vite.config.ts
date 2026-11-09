// vp migrate: merged .oxlintrc.json (f23ec9c44500bc9b4a7cfcc8a60b845d).
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, lazyPlugins } from 'vite-plus'

// Where the backend runs. Another instance (a second port, say) is `API_TARGET=http://localhost:8099 pnpm dev`.
const apiTarget = process.env.API_TARGET ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  // The style of the code base (AGENTS.md): single quotes, no semicolons.
  fmt: {
    singleQuote: true,
    semi: false,
  },
  lint: {
    plugins: ['react', 'typescript', 'oxc'],
    rules: {
      'react/rules-of-hooks': 'error',
      'react/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
        },
      ],
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin',
      },
    ],
  },
  plugins: lazyPlugins(() => [react(), babel({ presets: [reactCompilerPreset()] })]),
  server: {
    proxy: {
      // The browser talks to this server only, so the session cookie is the page's own and no CORS
      // answer is needed. `changeOrigin` stays off on purpose: it would rewrite the Host header to the
      // backend's, the backend would then see an Origin that differs from its Host, and refuse the
      // request as cross-origin unless this page's origin were listed in app.cors.allowedOrigins.
      '/api': { target: apiTarget },
    },
  },
})
