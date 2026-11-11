# AGENTS.md

Guidance for AI coding agents working in this repository.

## About

**DevOps Field Notes** (`https://joshwright10.github.io/`) is a personal engineering blog by **Josh Wright** covering Kubernetes (AKS), Azure, Terraform, .NET, and Platform Engineering.

## Tech Stack & Design System

- **Framework:** Astro 5 (`output: 'static'`, Content Layer API via `src/content.config.ts`)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`) in `src/styles/global.css`
- **Visual Direction:** Inspired by `tailscale.com/blog` — warm stone/alabaster header bands (`#f6f5f1`), crisp white reading canvas (`#ffffff`), deep warm charcoal ink (`#191817`), subtle `1px` hairlines (`#e4e2dc`), and indigo accents (`#3b5ccc`), with a matte warm-charcoal dark mode (`[data-theme="dark"]`). Avoid boxy neon cards, background grids, pulsing dots, or `//` cyberpunk labels.
- **Diagrams:** Standard ` ```mermaid ` fenced code blocks transformed by `src/plugins/remark-mermaid.mjs` and rendered client-side by `src/components/MermaidRenderer.astro` (`mermaid@11`) with zoom/reset and fullscreen lightbox controls.
- **Code Blocks:** `astro-expressive-code` (`github-light-default` / `github-dark-default`, line wrapping enabled by default).
- **Callouts:** GitHub-style blockquote alerts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) via `remark-github-blockquote-alert`.
- **Comments & Analytics:** Giscus (`src/components/Giscus.astro`) and Google Analytics GA4 (`G-L9PR34KNNJ` in `src/components/BaseHead.astro`).

## Commands

```bash
# Install dependencies
npm install

# Start local development server with hot reload (http://localhost:4321)
npm run dev

# Type-check and build static production site into ./dist
npm run build

# Run post-build verification suite against ./dist
npm test

# Preview production build locally
npm run preview
```

> **Important Dev Server Note:** Do not run `npm run build` while `npm run dev` is actively running. `astro build` rewrites `.astro/data-store.json` and `node_modules/.vite/deps` with production asset hashes, which causes a running `astro dev` instance to 404 on Expressive Code stylesheets and Vite pre-bundled dependencies until `.astro` is cleared or `npm run dev` is restarted.

## Writing & Generating Blog Posts

All blog posts live in `src/content/posts/<slug>.md` and are published at `/posts/<slug>/`.

### Frontmatter Schema (`src/content.config.ts`)

```yaml
---
title: "Your Post Title"
date: 2026-11-11
draft: false
tags: ["azure", "kubernetes", "terraform"]
description: "Concise 1-2 sentence summary for the article header, homepage feed, SEO, and RSS."
---
```

### Authoring Guidelines for AI Agents

1. **Pure Markdown Only:** Do not use Hugo shortcodes (`{{< ... >}}`).
2. **Mermaid Diagrams:**
   - Use standard ` ```mermaid ` code fences.
   - Use `<br/>` (not literal `\n`) for multi-line labels inside flowchart nodes or sequence diagram notes (e.g., `S1["Line 1<br/>Line 2"]`).
   - Quote node labels that contain parentheses, brackets, or special characters (e.g., `P[("sql-primary<br/>Primary")]`).
3. **Code Snippets:**
   - Use standard language tags (`csharp`, `yaml`, `powershell`, `bash`, `docker`, `xml`, `json`, `text`).
   - Long lines wrap automatically (`defaultProps: { wrap: true }` in `astro.config.mjs`).

## Repository Architecture

- `src/content/posts/` — Markdown blog articles
- `src/content.config.ts` — Content collection schema
- `src/plugins/remark-mermaid.mjs` — Remark plugin converting ` ```mermaid ` blocks into `.mermaid-wrapper` containers before Expressive Code runs
- `src/components/MermaidRenderer.astro` — Client-side Mermaid v11 renderer with theme sync, zoom controls, and fullscreen modal
- `src/components/TableOfContents.astro` — Tailscale-style right-hand `"On this page"` scrollspy rail
- `src/components/PostCard.astro` — Editorial article entry with automatic opening-paragraph excerpt fallback
- `src/components/CredlyGrid.astro` — Credly badge verification grid used on `/page/about/`
- `src/layouts/BaseLayout.astro` — Global page shell (`Header`, `Footer`, `SearchModal`)
- `src/layouts/PostLayout.astro` — Article layout with warm-stone header band, 2-column desktop reader + sticky TOC, prev/next links, related posts, and Giscus comments
- `src/pages/index.astro` — Homepage with featured latest dispatch, article feed, and topic filter rail
- `src/pages/page/about.astro` — Author bio, skills, and Credly credentials (`/page/about/`)
- `src/pages/tags/` — Topic archive (`/tags/` and `/tags/[tag]/`)
- `src/pages/rss.xml.js` — RSS feed (`/rss.xml`)
- `tests/build-verification.test.mjs` — Automated Node test runner suite verifying generated routes, Mermaid wrappers, Expressive Code frames, GA4, Giscus, and Credly badges in `dist/`
- `.github/workflows/deploy.yml` — GitHub Actions workflow validating PR builds and deploying `./dist` to GitHub Pages on push to `main`
- `.github/dependabot.yml` — Weekly grouped dependency checks (`npm` and `github-actions`, Mondays at 08:00 Europe/Madrid)
- `.github/workflows/dependabot-auto-merge.yml` — Runs `npm ci`, `npm run build`, and `npm test` on Dependabot PRs and auto-approves/merges them when verification passes
