# DevOps Field Notes (`joshwright10.github.io`)

Personal engineering blog by **Josh Wright** covering Azure, Kubernetes (AKS), Terraform, .NET, and Platform Engineering.

Live site: **[https://joshwright10.github.io/](https://joshwright10.github.io/)**

## Tech Stack

- **Framework:** [Astro 5](https://astro.build/) (Static output + Content Layer API)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) ("Dark-First Engineering Studio" design system)
- **Diagrams:** Native ` ```mermaid ` code blocks rendered via [Mermaid v11](https://mermaid.js.org/) with interactive zoom/reset & fullscreen lightbox
- **Code Blocks:** [Expressive Code](https://expressive-code.com/) with dark/light theme synchronization & copy buttons
- **Comments:** [Giscus](https://giscus.app/) (GitHub Discussions)

## Local Development

```bash
npm install
npm run dev
```

## Production Build & Verification

```bash
npm run build
npm test
```

## Writing a New Post

Create a Markdown file in `src/content/posts/my-new-post.md`:

```markdown
---
title: "My New Technical Post"
date: 2026-11-11
draft: false
tags: ["azure", "kubernetes"]
description: "Short summary of the post."
---

Write standard Markdown, fenced code blocks, and standard ```mermaid diagrams.
```
