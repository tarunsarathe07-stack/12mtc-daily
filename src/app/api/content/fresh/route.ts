import Parser from "rss-parser";
import type { TopicTag } from "@/lib/types/database";
import { requireAdmin, adminDenied } from "@/lib/auth/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FeedItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
  score: number;
  topics: TopicTag[];
};

const parser = new Parser();

const feeds = [
  { source: "PIB", url: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1" },
  { source: "PRS Legislative Research", url: "https://prsindia.org/theprsblog/rss.xml" },
  { source: "RBI", url: "https://rbi.org.in/Rss.aspx?ID=Annual" },
  { source: "LiveLaw", url: "https://www.livelaw.in/rss/updates" },
  { source: "Bar and Bench", url: "https://www.barandbench.com/feed" },
  { source: "Indian Express", url: "https://indianexpress.com/section/india/feed/" },
  { source: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
];

const topicKeywords: Record<TopicTag, string[]> = {
  legal: ["court", "supreme court", "high court", "judgment", "law", "bill", "act", "constitution", "justice", "tribunal"],
  polity: ["parliament", "government", "ministry", "election", "commission", "policy", "governance", "constitutional"],
  international: ["united nations", "un ", "treaty", "summit", "foreign", "bilateral", "global", "g20", "security council"],
  economy: ["rbi", "inflation", "repo", "gdp", "budget", "tax", "finance", "sebi", "monetary", "economic"],
  environment: ["climate", "environment", "forest", "biodiversity", "pollution", "cop", "wildlife", "carbon"],
  awards: ["award", "prize", "honour", "honor", "ranked"],
  reports: ["report", "index", "survey", "data", "ranking"],
};

function classify(text: string) {
  const lower = text.toLowerCase();
  const topics = (Object.entries(topicKeywords) as [TopicTag, string[]][])
    .filter(([, words]) => words.some((word) => lower.includes(word)))
    .map(([topic]) => topic);

  const score = topics.length * 2 + (lower.includes("clat") ? 3 : 0);
  return { topics: topics.length > 0 ? topics : (["polity"] as TopicTag[]), score };
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return adminDenied(auth);

  const settled = await Promise.allSettled(
    feeds.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return (parsed.items || []).slice(0, 8).map((item) => {
        const title = item.title?.trim() || "Untitled update";
        const { topics, score } = classify(`${title} ${item.contentSnippet || ""}`);
        return {
          title,
          link: item.link || feed.url,
          source: feed.source,
          publishedAt: item.isoDate || item.pubDate || null,
          score,
          topics,
        } satisfies FeedItem;
      });
    })
  );

  const items = settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => item.link)
    .sort((a, b) => {
      const byScore = b.score - a.score;
      if (byScore !== 0) return byScore;
      return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
    })
    .slice(0, 12);

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      mode: "rss-discovery",
      note: "Fresh source discovery only. AI summaries, quizzes, and citations still require the content pipeline approval step.",
      items,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
