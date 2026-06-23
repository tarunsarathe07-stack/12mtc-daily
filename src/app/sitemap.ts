import type { MetadataRoute } from "next";
import { getAllPublishedContent } from "@/lib/content/unified";
import { getBlogSource } from "@/lib/blog/source";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/today`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/shorts`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/battle`, changeFrequency: "weekly", priority: 0.6 },
  ];

  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await getBlogSource().getAllPosts();
    blogRoutes = posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.published_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    // blog source unavailable — static routes still serve
  }

  let dailyRoutes: MetadataRoute.Sitemap = [];
  try {
    const items = await getAllPublishedContent();
    dailyRoutes = items
      .filter((i) => !i.is_demo) // demo cards stay out of search
      .map((i) => ({
        url: `${base}/daily/${i.slug}`,
        lastModified: i.published_at ? new Date(i.published_at) : undefined,
        changeFrequency: "yearly" as const, // news days don't change once archived
        priority: 0.5,
      }));
  } catch {
    // content source unavailable
  }

  return [...staticRoutes, ...blogRoutes, ...dailyRoutes];
}
