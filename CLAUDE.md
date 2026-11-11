# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and AI coding agents when working with code in this repository.

## About

**DevOps Field Notes** (`https://joshwright10.github.io/`) — a personal technical publication by Josh Wright focused on Cloud Architecture, Kubernetes (AKS), Azure, .NET, Terraform, and Platform Engineering.

Built with **Astro 5**, **Tailwind CSS v4**, **Expressive Code**, and **Mermaid v11** using a **Dark-First Engineering Studio** aesthetic.

## Commands

```bash
# Start local development server with hot reload (http://localhost:4321)
npm run dev

# Type-check and build static production site into ./dist
npm run build

# Run post-build verification tests against ./dist
npm test

# Preview production build locally
npm run preview
```

## Content Authoring (Zero-Friction Markdown)

All blog posts live in `src/content/posts/<slug>.md` (or `.mdx`) and are validated by `src/content.config.ts`.

### Frontmatter Schema

```yaml
---
title: "Your Post Title"
date: 2026-11-11
draft: false
tags: ["azure", "kubernetes", "terraform"]
description: "Concise 1-2 sentence summary for cards, SEO, and RSS."
---
```

### Standard Markdown Features (No Shortcodes Required)

1. **Mermaid Architecture Diagrams:** Use standard fenced ` ```mermaid ` code blocks.
   - `src/plugins/remark-mermaid.mjs` automatically converts ` ```mermaid ` blocks into interactive diagram cards before syntax highlighting runs.
   - `src/components/MermaidRenderer.astro` renders them client-side with `mermaid@11`, automatic dark/light theme syncing, Zoom In/Out/Reset buttons, and a fullscreen lightbox viewer.
2. **Code Blocks:** Use standard fenced code blocks (` ```csharp `, ` ```yaml `, ` ```bash `, ` ```docker `, etc.). `astro-expressive-code` automatically adds IDE frames, language badges, and copy-to-clipboard buttons.
3. **Callouts / Alerts:** Use standard GitHub-style blockquote alerts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) powered by `remark-github-blockquote-alert`.

## Architecture

- `src/content/posts/` — Markdown articles rendered at `/posts/<slug>/`
- `src/content.config.ts` — Astro 5 Content Layer `glob` collection definition
- `src/plugins/remark-mermaid.mjs` — Custom Remark plugin that transforms ` ```mermaid ` fences into `.mermaid-wrapper` interactive containers
- `src/layouts/BaseLayout.astro` — Global shell (header, command-K search modal, footer, theme management)
- `src/layouts/PostLayout.astro` — 2-column technical reading layout with reading progress bar, sticky scrollspy TOC, prev/next navigation, related posts, Giscus comments, and Mermaid renderer
- `src/pages/page/about.astro` — Engineer profile and Credly badge showcase (`src/components/CredlyGrid.astro`)
- `src/styles/global.css` — Tailwind CSS v4 + Dark/Light custom properties (`#09090b` obsidian canvas default)
- `.github/workflows/deploy.yml` — Builds `./dist`, runs `npm test`, and deploys directly to GitHub Pages on push to `main`
