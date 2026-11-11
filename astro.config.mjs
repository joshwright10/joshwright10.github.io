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
  },
  markdown: {
    remarkPlugins: [remarkMermaid, remarkAlert],
  },
  integrations: [
    expressiveCode({
      themes: ['github-dark-default', 'github-light-default'],
      themeCssSelector: (theme) => {
        if (theme.name === 'github-light-default') {
          return '[data-theme="light"]';
        }
        return '[data-theme="dark"], :root:not([data-theme="light"])';
      },
      styleOverrides: {
        borderRadius: '0.75rem',
        borderWidth: '1px',
        borderColor: 'var(--border-subtle)',
        codeFontFamily: 'var(--font-mono)',
        codeFontSize: '0.875rem',
        uiFontFamily: 'var(--font-mono)',
        frames: {
          frameBoxShadowCssValue: 'none',
          editorActiveTabBackground: 'var(--bg-elevated)',
          editorTabBarBackground: 'var(--bg-surface)',
          terminalTitlebarBackground: 'var(--bg-surface)',
          terminalBackground: 'var(--bg-surface)',
        },
      },
    }),
    sitemap(),
  ],
});
