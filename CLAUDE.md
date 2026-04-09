# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

A personal static blog hosted on GitHub Pages, used to document topics related to DevOps, Platform Engineering, and other related technical topics.

## Commands

```bash
# Local development server (hot reload)
hugo server

# Production build (matches CI)
hugo --gc --minify --baseURL "https://joshwright10.github.io/"

# Create a new post
hugo new posts/my-post-title.md
```

Hugo version: **0.117.0** (pinned in `.github/workflows/hugo.yaml`). Dart Sass is also required for the build pipeline.

## Architecture

This is a Hugo static site ("DevOps Field Notes") deployed to GitHub Pages via `.github/workflows/hugo.yaml`.

**Theme:** [Beautiful Hugo](https://github.com/halogenica/beautifulhugo), included as a git submodule at `themes/beautifulhugo/`. When cloning, initialize submodules with `git clone --recurse-submodules` or `git submodule update --init`.

**Config structure:** Environment-aware split under `config/`:
- `config/_default/hugo.toml` — base config (theme, menus, Giscus comments, Pygments syntax highlighting)
- `config/production/hugo.toml` — production-only overrides (Google Analytics)

**Content:**
- `content/posts/` — blog articles (Markdown + YAML frontmatter with `title`, `date`, `draft`, `tags`)
- `content/page/` — static pages (e.g., About)
- `archetypes/default.md` — template used by `hugo new`

**Custom shortcode:** `{{< credly "BADGE_ID" >}}` — embeds a Credly credential badge; used in the About page.

**Comments:** Giscus (GitHub Discussions) — configured entirely in `config/_default/hugo.toml` under `[params.giscus]`. No backend required.

**Deployment:** Push to `main` triggers the GitHub Actions workflow, which builds with `--gc --minify` and deploys the `public/` artifact to GitHub Pages. No staging environment exists.
