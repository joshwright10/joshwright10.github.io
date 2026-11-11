import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright-core';

const distDir = path.resolve(process.cwd(), 'dist');

function readDistFile(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  assert.ok(fs.existsSync(fullPath), `Expected build artifact to exist: ${relativePath}`);
  return fs.readFileSync(fullPath, 'utf-8');
}

function collectHtmlFiles(dir, base = '') {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, entry.name);
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectHtmlFiles(full, rel));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(rel);
    }
  }
  return results;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function startStaticServer(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
      let pathname = decodeURIComponent(reqUrl.pathname);
      let filePath = path.join(rootDir, pathname);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      } else if (!path.extname(filePath) && fs.existsSync(`${filePath}.html`)) {
        filePath = `${filePath}.html`;
      } else if (!path.extname(filePath) && fs.existsSync(path.join(filePath, 'index.html'))) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

describe('Astro Production Build Verification (Static Integrity)', () => {
  test('generates index, about, tags, RSS, sitemap, .nojekyll, favicon, and all 4 post routes', () => {
    const requiredFiles = [
      'index.html',
      'page/about/index.html',
      'tags/index.html',
      'rss.xml',
      'sitemap-index.xml',
      'sitemap-0.xml',
      '.nojekyll',
      'favicon.svg',
      'posts/aspnet-data-protection-on-kubernetes/index.html',
      'posts/azure-ai-search-managed-identity-sql-failover-groups/index.html',
      'posts/create-dynamic-ado-variables-in-templates/index.html',
      'posts/nuget-authentication-docker-azdo-artifacts/index.html',
    ];

    for (const file of requiredFiles) {
      readDistFile(file);
    }
  });

  test('every internal href and src across all generated HTML files resolves in dist/', () => {
    const htmlFiles = collectHtmlFiles(distDir);
    assert.ok(htmlFiles.length >= 20, `Expected at least 20 HTML files in dist/, found ${htmlFiles.length}`);

    const attrPattern = /(?:href|src)="(\/[^"#?]*)"/g;

    for (const relHtml of htmlFiles) {
      const content = readDistFile(relHtml);
      let match;
      while ((match = attrPattern.exec(content)) !== null) {
        const ref = decodeURIComponent(match[1]);
        if (ref.startsWith('//')) continue;

        const candidateFile = path.join(distDir, ref);
        const candidateIndex = path.join(distDir, ref, 'index.html');
        const exists =
          (fs.existsSync(candidateFile) && fs.statSync(candidateFile).isFile()) ||
          (fs.existsSync(candidateIndex) && fs.statSync(candidateIndex).isFile());

        assert.ok(exists, `Broken internal reference "${ref}" found in dist/${relHtml}`);
      }
    }
  });

  test('validates RSS and Sitemap XML feeds and ensures no Draft Preview badges leak into production', () => {
    const rssXml = readDistFile('rss.xml');
    assert.ok(rssXml.includes('<rss'), 'Expected valid <rss> root element');
    assert.ok(rssXml.includes('<title>Josh Wright</title>'), 'Expected blog title in RSS feed');
    assert.ok(
      rssXml.includes('https://joshwright10.github.io/posts/azure-ai-search-managed-identity-sql-failover-groups/'),
      'Expected post URLs in RSS feed'
    );

    const sitemapIndex = readDistFile('sitemap-index.xml');
    const sitemapZero = readDistFile('sitemap-0.xml');
    assert.ok(sitemapIndex.includes('https://joshwright10.github.io/sitemap-0.xml'));
    assert.ok(sitemapZero.includes('https://joshwright10.github.io/page/about'));

    const htmlFiles = collectHtmlFiles(distDir);
    for (const relHtml of htmlFiles) {
      const html = readDistFile(relHtml);
      assert.ok(!html.includes('Draft Preview'), `Draft Preview badge leaked into production file: ${relHtml}`);
    }
  });

  test('renders all 5 Mermaid diagrams across posts as interactive .mermaid-wrapper blocks (not swallowed by Expressive Code)', () => {
    const dpHtml = readDistFile('posts/aspnet-data-protection-on-kubernetes/index.html');
    const dpMatches = dpHtml.match(/class="mermaid-wrapper/g) || [];
    assert.equal(
      dpMatches.length,
      2,
      `Expected 2 Mermaid diagrams in aspnet-data-protection-on-kubernetes, found ${dpMatches.length}`
    );

    const searchHtml = readDistFile('posts/azure-ai-search-managed-identity-sql-failover-groups/index.html');
    const searchMatches = searchHtml.match(/class="mermaid-wrapper/g) || [];
    assert.equal(
      searchMatches.length,
      3,
      `Expected 3 Mermaid diagrams in azure-ai-search-managed-identity-sql-failover-groups, found ${searchMatches.length}`
    );
  });

  test('renders syntax-highlighted code blocks via Expressive Code', () => {
    const nugetHtml = readDistFile('posts/nuget-authentication-docker-azdo-artifacts/index.html');
    assert.ok(
      nugetHtml.includes('expressive-code'),
      'Expected Expressive Code frames in nuget-authentication-docker-azdo-artifacts'
    );
  });

  test('preserves Google Analytics (G-L9PR34KNNJ), disclaimer text, and Giscus comment settings', () => {
    const homeHtml = readDistFile('index.html');
    assert.ok(homeHtml.includes('G-L9PR34KNNJ'), 'Expected GA4 measurement ID G-L9PR34KNNJ');
    assert.ok(
      homeHtml.includes('The opinions expressed herein are my own personal opinions'),
      'Expected personal disclaimer text in footer'
    );

    const postHtml = readDistFile('posts/aspnet-data-protection-on-kubernetes/index.html');
    assert.ok(postHtml.includes('data-repo="joshwright10/joshwright10.github.io"'));
    assert.ok(postHtml.includes('data-repo-id="MDEwOlJlcG9zaXRvcnkxOTYwODUyODY="'));
    assert.ok(postHtml.includes('data-category="Announcements"'));
    assert.ok(postHtml.includes('data-category-id="DIC_kwDOC7AGJs4CUzdm"'));
  });

  test('preserves all 7 Credly badge IDs on /page/about/', () => {
    const aboutHtml = readDistFile('page/about/index.html');
    const expectedBadgeIds = [
      'f3244186-4287-4253-a05f-b05a1a1017ef',
      '215d0838-0830-4da8-8ffb-ba90dd821392',
      '8fcb5db2-8db0-42c9-8078-d05d6b30ff1d',
      '9c75f8cb-19d9-4ab2-9f30-2900fc88b199',
      '618f6171-828d-4bd7-a320-e48ff51eca5b',
      'b7730a22-302e-4438-9a59-3c97d7b2e33c',
      'bbee878c-078a-48f8-aa87-8e5f403a66c8',
    ];

    for (const id of expectedBadgeIds) {
      assert.ok(aboutHtml.includes(id), `Expected Credly badge ID ${id} on About page`);
    }
  });
});

describe('Headless Browser E2E Verification (Mermaid, Layout Overflow, Theme & Search)', () => {
  let server;
  let baseUrl;
  let browser;

  before(async () => {
    const started = await startStaticServer(distDir);
    server = started.server;
    baseUrl = started.baseUrl;
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
    });
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  async function createTrackedPage(viewport = { width: 1440, height: 900 }) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    // Block external analytics/embeds so offline/CI runs are deterministic and fast
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith(baseUrl) || url.startsWith('data:') || url.startsWith('blob:')) {
        return route.continue();
      }
      return route.fulfill({ status: 204, body: '' });
    });

    const errors = [];
    page.on('pageerror', (err) => errors.push(`PageError: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`ConsoleError: ${msg.text()}`);
      }
    });
    page.on('response', (res) => {
      if (res.url().startsWith(baseUrl) && res.status() >= 400) {
        errors.push(`HTTP ${res.status()} for ${res.url()}`);
      }
    });

    return { context, page, errors };
  }

  test('renders Mermaid diagrams into real <svg> elements with zoom & fullscreen controls and zero console/network errors', async () => {
    const { context, page, errors } = await createTrackedPage({ width: 1440, height: 900 });
    try {
      await page.goto(`${baseUrl}/posts/azure-ai-search-managed-identity-sql-failover-groups/`, {
        waitUntil: 'networkidle',
      });

      await page.waitForFunction(() => {
        const svgs = document.querySelectorAll('.mermaid-wrapper [data-mermaid-canvas] svg');
        return svgs.length === 3;
      }, { timeout: 10000 });

      const svgBoxes = await page.$$eval('.mermaid-wrapper [data-mermaid-canvas] svg', (svgs) =>
        svgs.map((svg) => {
          const rect = svg.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        })
      );

      assert.equal(svgBoxes.length, 3, 'Expected 3 rendered Mermaid <svg> elements');
      for (const [idx, box] of svgBoxes.entries()) {
        assert.ok(
          box.width > 100 && box.height > 50,
          `Mermaid SVG #${idx + 1} has invalid bounding box: ${JSON.stringify(box)}`
        );
      }

      // Test fullscreen lightbox modal opens cleanly
      await page.click('.mermaid-wrapper [data-mermaid-action="expand"]');
      const modalVisible = await page.$eval('#mermaid-lightbox', (el) => !el.classList.contains('hidden'));
      assert.ok(modalVisible, 'Expected Mermaid fullscreen modal to open when clicking Expand');
      await page.click('#mermaid-lightbox-close');

      assert.deepEqual(errors, [], `Unexpected runtime or network errors: ${errors.join('; ')}`);
    } finally {
      await context.close();
    }
  });

  test('code blocks do not overflow horizontally or overlap the sticky "On this page" TOC rail on desktop or mobile', async () => {
    // Desktop (1440x900)
    const desktop = await createTrackedPage({ width: 1440, height: 900 });
    try {
      await desktop.page.goto(`${baseUrl}/posts/azure-ai-search-managed-identity-sql-failover-groups/`, {
        waitUntil: 'networkidle',
      });

      const layoutMetrics = await desktop.page.evaluate(() => {
        const docOverflow = document.documentElement.scrollWidth > window.innerWidth;
        const toc = document.querySelector('nav[aria-label="On this page"]');
        const tocRect = toc ? toc.getBoundingClientRect() : null;
        const codeRects = Array.from(document.querySelectorAll('.expressive-code')).map((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width };
        });
        return { docOverflow, tocLeft: tocRect ? tocRect.left : null, codeRects };
      });

      assert.equal(layoutMetrics.docOverflow, false, 'Desktop page should not overflow horizontally');
      assert.ok(layoutMetrics.tocLeft && layoutMetrics.tocLeft > 800, 'Expected desktop TOC rail to be visible');
      assert.ok(layoutMetrics.codeRects.length > 0, 'Expected Expressive Code blocks on post page');

      for (const [idx, code] of layoutMetrics.codeRects.entries()) {
        assert.ok(
          code.right <= layoutMetrics.tocLeft,
          `Code block #${idx + 1} (right=${code.right}) overlaps TOC rail (left=${layoutMetrics.tocLeft})`
        );
      }
      assert.deepEqual(desktop.errors, []);
    } finally {
      await desktop.context.close();
    }

    // Mobile (390x844)
    const mobile = await createTrackedPage({ width: 390, height: 844 });
    try {
      await mobile.page.goto(`${baseUrl}/posts/azure-ai-search-managed-identity-sql-failover-groups/`, {
        waitUntil: 'networkidle',
      });

      const mobileOverflow = await mobile.page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      assert.equal(mobileOverflow, false, 'Mobile viewport should not overflow horizontally');
      assert.deepEqual(mobile.errors, []);
    } finally {
      await mobile.context.close();
    }
  });

  test('interactive UI controls (dark/light theme toggle, Cmd+K search modal, and homepage topic filter) work without errors', async () => {
    const { context, page, errors } = await createTrackedPage({ width: 1440, height: 900 });
    try {
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

      // 1. Theme toggle switches light -> dark and persists in localStorage
      const initialTheme = await page.getAttribute('html', 'data-theme');
      assert.equal(initialTheme, 'light');

      await page.click('#theme-toggle');
      const nextTheme = await page.getAttribute('html', 'data-theme');
      const storedTheme = await page.evaluate(() => localStorage.getItem('jw-theme'));
      assert.equal(nextTheme, 'dark');
      assert.equal(storedTheme, 'dark');

      // 2. Topic filter pill filters feed and reveals Clear filter button
      await page.click('.tag-filter-pill[data-filter-tag="azure"]');
      const headingText = await page.textContent('#feed-heading');
      assert.ok(headingText?.includes('azure'), `Expected feed heading to mention azure, got: ${headingText}`);
      await page.click('#clear-filter-btn');

      // 3. Search modal opens, filters results by keyword, and closes on Escape
      await page.click('[data-search-trigger]');
      const modalOpen = await page.$eval('#search-modal', (el) => !el.classList.contains('hidden'));
      assert.ok(modalOpen, 'Expected search modal to open');

      await page.fill('#search-input', 'Failover');
      const visibleResults = await page.$$eval('#search-results a', (items) => items.length);
      assert.equal(visibleResults, 1, `Expected 1 matching search result for "Failover", found ${visibleResults}`);

      await page.keyboard.press('Escape');
      const modalClosed = await page.$eval('#search-modal', (el) => el.classList.contains('hidden'));
      assert.ok(modalClosed, 'Expected search modal to close on Escape');

      assert.deepEqual(errors, [], `Unexpected errors during interactive UI tests: ${errors.join('; ')}`);
    } finally {
      await context.close();
    }
  });
});
