import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');

function readDistFile(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  assert.ok(fs.existsSync(fullPath), `Expected build artifact to exist: ${relativePath}`);
  return fs.readFileSync(fullPath, 'utf-8');
}

describe('Astro 5 Production Build Verification', () => {
  test('generates index, about, tags, RSS, sitemap, and all 4 preserved post routes', () => {
    const requiredFiles = [
      'index.html',
      'page/about/index.html',
      'tags/index.html',
      'rss.xml',
      'sitemap-index.xml',
      'posts/aspnet-data-protection-on-kubernetes/index.html',
      'posts/azure-ai-search-managed-identity-sql-failover-groups/index.html',
      'posts/create-dynamic-ado-variables-in-templates/index.html',
      'posts/nuget-authentication-docker-azdo-artifacts/index.html',
    ];

    for (const file of requiredFiles) {
      readDistFile(file);
    }
  });

  test('renders all 5 Mermaid diagrams across migrated posts as interactive .mermaid-wrapper blocks (not swallowed by Expressive Code)', () => {
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

    assert.ok(!dpHtml.includes('{{< mermaid >}}'), 'No raw Hugo mermaid shortcodes should remain');
    assert.ok(!searchHtml.includes('{{< mermaid >}}'), 'No raw Hugo mermaid shortcodes should remain');
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
