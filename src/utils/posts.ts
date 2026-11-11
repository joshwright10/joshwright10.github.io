import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Returns true in local `astro dev` or when `INCLUDE_DRAFTS=true` is set
 * (e.g., during GitHub Pull Request preview builds).
 */
export function shouldIncludeDrafts(): boolean {
  return Boolean(import.meta.env.DEV || process.env.INCLUDE_DRAFTS === 'true');
}

export async function getVisiblePosts(): Promise<CollectionEntry<'posts'>[]> {
  const includeDrafts = shouldIncludeDrafts();
  const posts = await getCollection('posts', ({ data }) => includeDrafts || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
