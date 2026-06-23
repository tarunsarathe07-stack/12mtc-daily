/**
 * Blog source adapter — funnel/SEO content for 12 Minutes to CLAT.
 *
 * COMPLETELY SEPARATE from current affairs. Blogs convert students into
 * customers; current affairs is the daily product. Never mix them.
 *
 * The adapter lets us swap the backing source (local seed → Supabase →
 * CMS/Markdown) without touching the UI:
 *   - LocalBlogSource:   hardcoded seed posts (dev/demo)
 *   - SupabaseBlogSource: blog_posts table (production)
 */

import type { BlogPost } from "@/lib/types/database";
import { useSupabaseStore } from "@/lib/content/config";
import { SEED_BLOG_POSTS } from "./posts-seed";

export interface BlogSource {
  getAllPosts(): Promise<BlogPost[]>;
  getPostBySlug(slug: string): Promise<BlogPost | undefined>;
}

class LocalBlogSource implements BlogSource {
  async getAllPosts(): Promise<BlogPost[]> {
    return SEED_BLOG_POSTS.filter((p) => p.status === "published").sort((a, b) =>
      b.published_at.localeCompare(a.published_at)
    );
  }
  async getPostBySlug(slug: string): Promise<BlogPost | undefined> {
    return SEED_BLOG_POSTS.find((p) => p.slug === slug && p.status === "published");
  }
}

class SupabaseBlogSource implements BlogSource {
  async getAllPosts(): Promise<BlogPost[]> {
    try {
      const { getPublishedBlogPosts } = await import("@/lib/content/supabase-store");
      const posts = await getPublishedBlogPosts();
      return posts.length > 0 ? posts : new LocalBlogSource().getAllPosts();
    } catch {
      return new LocalBlogSource().getAllPosts();
    }
  }
  async getPostBySlug(slug: string): Promise<BlogPost | undefined> {
    try {
      const { getBlogPostBySlug } = await import("@/lib/content/supabase-store");
      return (await getBlogPostBySlug(slug)) ?? new LocalBlogSource().getPostBySlug(slug);
    } catch {
      return new LocalBlogSource().getPostBySlug(slug);
    }
  }
}

export function getBlogSource(): BlogSource {
  return useSupabaseStore() ? new SupabaseBlogSource() : new LocalBlogSource();
}
