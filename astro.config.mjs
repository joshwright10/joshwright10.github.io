import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import { remarkAlert } from 'remark-github-blockquote-alert';
import { remarkMermaid } from './src/plugins/remark-mermaid.mjs';

export default defineConfig({
  site: 'https://joshwright10.github.io',
  output: 'static',
  trailingSlash: 'ignore',
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['mermaid'],
    },
  },
  markdown: {
    remarkPlugins: [remarkMermaid, remarkAlert],
  },
  integrations: [
    expressiveCode({
      themes: ['github-light-default', 'github-dark-default'],
      useDarkModeMediaQuery: false,
      themeCssSelector: (theme) =>
        `[data-theme="${theme.name.includes('dark') ? 'dark' : 'light'}"]`,
      defaultProps: {
        wrap: true,
      },
      styleOverrides: {
        borderRadius: '0.5rem',
        borderWidth: '1px',
        borderColor: 'var(--border-subtle)',
        codeFontFamily: 'var(--font-mono)',
        codeFontSize: '0.85rem',
        uiFontFamily: 'var(--font-sans)',
        frames: {
          frameBoxShadowCssValue: 'none',
          editorActiveTabBackground: 'var(--bg-canvas)',
          editorTabBarBackground: 'var(--bg-surface)',
          terminalTitlebarBackground: 'var(--bg-surface)',
          terminalBackground: 'var(--bg-canvas)',
        },
      },
    }),
    sitemap(),
  ],
});
