/**
 * Content ingest pipeline — shared by the admin-triggered route
 * (POST /api/content/ingest) and the daily cron (GET /api/cron/daily-ingest).
 *
 * RSS discovery → CLAT relevance scoring → dedup → Claude generation
 * (short + explainer + 3-5 MCQs) → stored as status "review".
 * NOTHING auto-publishes — an admin must approve in /admin/content.
 */

import Parser from "rss-parser";
import { randomUUID } from "crypto";
import type { TopicTag, ContentItem, Question } from "@/lib/types/database";
import {
  upsertContentItems,
  upsertQuestions,
  isUrlIngested,
  addPipelineRun,
  updatePipelineRun,
} from "@/lib/content/data";
import { generateContentFromArticle } from "@/lib/content/summarizer";
import { generateQuizQuestions } from "@/lib/content/quiz-generator";
import { fetchArticleText } from "@/lib/content/article-fetcher";
import { istToday } from "@/lib/utils/date";

const parser = new Parser();

const FEEDS = [
  { source: "PIB", url: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1" },
  { source: "PRS Legislative Research", url: "https://prsindia.org/theprsblog/rss.xml" },
  { source: "RBI", url: "https://rbi.org.in/Rss.aspx?ID=Annual" },
  { source: "LiveLaw", url: "https://www.livelaw.in/rss/updates" },
  { source: "Bar and Bench", url: "https://www.barandbench.com/feed" },
  { source: "Indian Express", url: "https://indianexpress.com/section/india/feed/" },
  { source: "Indian Express", url: "https://indianexpress.com/section/explained/feed/" },
  { source: "Indian Express", url: "https://indianexpress.com/section/opinion/feed/" },
  { source: "Indian Express", url: "https://indianexpress.com/section/opinion/editorials/feed/" },
  { source: "Indian Express", url: "https://indianexpress.com/section/world/feed/" },
  { source: "Indian Express", url: "https://indianexpress.com/section/business/feed/" },
  { source: "Indian Express", url: "https://indianexpress.com/section/political-pulse/feed/" },
  { source: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
  { source: "The Hindu", url: "https://www.thehindu.com/news/international/feeder/default.rss" },
  { source: "The Hindu", url: "https://www.thehindu.com/business/feeder/default.rss" },
  { source: "The Hindu", url: "https://www.thehindu.com/opinion/feeder/default.rss" },
  { source: "The Hindu", url: "https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss" },
];

const TOPIC_KEYWORDS: Record<TopicTag, string[]> = {
  legal: ["court", "supreme court", "high court", "judgment", "law", "act", "constitution", "justice", "tribunal", "plea", "rights", "aadhaar"],
  polity: ["parliament", "lok sabha", "rajya sabha", "speaker", "government", "ministry", "election", "voter", "commission", "policy", "governance", "constitutional"],
  international: ["united nations", "un", "treaty", "summit", "foreign", "bilateral", "global", "g20", "security council", "sovereignty", "china", "taiwan", "diplomacy", "conflict"],
  economy: ["rbi", "inflation", "repo", "gdp", "budget", "tax", "finance", "sebi", "monetary", "economic"],
  environment: ["climate", "environment", "forest", "biodiversity", "pollution", "cop", "wildlife", "carbon", "heatwave", "ozone", "conservation", "coral"],
  awards: ["award", "prize", "honour", "honor", "ranked"],
  reports: ["index", "survey", "data", "ranking", "study", "research", "law commission", "niti", "ncrb", "nfhs", "undp", "world bank", "imf", "who"],
};

const SOURCE_BONUS: Record<string, number> = {
  PIB: 2,
  "PRS Legislative Research": 3,
  RBI: 3,
  LiveLaw: 2,       // pure legal source — lower general bonus so it competes on merit
  "Bar and Bench": 1,
  "Indian Express": 2,
  "The Hindu": 2,
};

const EXAM_HOOKS = [
  // Legal / Constitutional — still important but no longer the only hooks
  "supreme court",
  "high court",
  "constitution",
  "constitutional",
  "fundamental rights",
  "directive principle",
  "parliament",
  "election",
  "commission",
  "tribunal",
  "treaty",
  "convention",
  "rti",
  "aadhaar",
  "sovereignty",

  // Governance / Polity
  "lok sabha",
  "rajya sabha",
  "speaker",
  "president",
  "prime minister",
  "cabinet",
  "policy",
  "scheme",
  "voter",
  "authority",

  // Economy / Finance
  "rbi",
  "sebi",
  "repo rate",
  "inflation",
  "gdp",
  "budget",
  "fiscal",
  "monetary policy",
  "gst",
  "foreign direct investment",

  // International Affairs
  "g7",
  "g20",
  "quad",
  "brics",
  "asean",
  "nato",
  "united nations",
  "security council",
  "india-us",
  "india-china",
  "bilateral",
  "diplomacy",
  "sanctions",
  "ceasefire",
  "ukraine",
  "israel",
  "iran",
  "summit",

  // Environment / Science / Technology
  "climate change",
  "cop",
  "heatwave",
  "biodiversity",
  "isro",
  "chandrayaan",
  "nuclear",
  "carbon",
  "net zero",

  // Reports / Indices
  "report",
  "index",
  "survey",
  "ranking",
  "human development",
  "hunger index",
  "press freedom",
  "happiness index",
  "niti aayog",

  // Arts / Culture / Heritage (official CLAT syllabus category)
  "heritage",
  "unesco",
  "padma",
  "national award",
  "sahitya akademi",
  "classical",
  "archaeological",
  "intangible heritage",
  "cultural significance",
  "art form",
];

const LOW_VALUE_PATTERNS = [
  "box office",
  "celebrity",
  "actor",
  "actress",
  "presenter",
  "cricket",
  "ipl",
  "football",
  "viral",
  "fashion",
  "recipe",
  "horoscope",
  "relationship",
  "film",
  "movie",
  "cinema",
  "zee5",
  "temple",
  "casualties",
  "ram charan",
  "peddi",
];

const HARD_LOW_VALUE_PATTERNS = [
  "box office",
  "celebrity",
  "actor",
  "actress",
  "presenter",
  "slags",
  "sluts",
  "bitches",
  "movie",
  "cinema",
  "zee5",
  "ott",
];

const LEGAL_NOISE_PATTERNS = [
  "judge should not sit",
  "must engage with lawyers",
  "implicating lawyers",
  "lawyers in criminal cases",
  "bar council election",
  "bcd elections",
  "counting of votes",
  "without its permission",
];

const MARKET_TICKER_PATTERNS = [
  "early trade",
  "rupee falls",
  "rupee gains",
  "sensex",
  "nifty",
  "stock market",
];

// Topic priority drives the round-robin edition selector.
// Legal moves below economy/environment to prevent court-news flooding
// the daily 12 — still selected but doesn't get first pick every round.
const TOPIC_PRIORITY: TopicTag[] = [
  "international",
  "polity",
  "economy",
  "environment",
  "legal",
  "reports",
  "awards",
];

const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "amid",
  "from",
  "into",
  "over",
  "says",
  "seeks",
  "that",
  "their",
  "this",
  "with",
  "will",
  "would",
  "under",
  "court",
  "india",
  "indian",
  "government",
]);

const IMPORTANT_SHORT_WORDS = new Set([
  "g7",
  "un",
  "uk",
  "us",
  "u.s",
  "rbi",
  "sebi",
  "eci",
  "sc",
  "hc",
  "iran",
  "neet",
]);

function matchesTerm(text: string, term: string) {
  const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return false;
  if (escaped.includes("\\ ")) {
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  }
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function matchingTerms(text: string, terms: string[]) {
  return terms.filter((term) => matchesTerm(text, term));
}

function titleWords(title: string) {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => !STOPWORDS.has(word))
      .filter((word) => word.length > 4 || IMPORTANT_SHORT_WORDS.has(word))
  );
}

function isNearDuplicateTitle(a: string, b: string) {
  const aWords = titleWords(a);
  const bWords = titleWords(b);
  if (aWords.size === 0 || bWords.size === 0) return false;
  const shared = [...aWords].filter((word) => bWords.has(word)).length;
  const smaller = Math.min(aWords.size, bWords.size);
  return shared / smaller >= 0.45;
}

function primaryTopic(item: FeedItem): TopicTag {
  return TOPIC_PRIORITY.find((topic) => item.topics.includes(topic)) ?? item.topics[0] ?? "polity";
}

function isCourtLegalItem(item: FeedItem) {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  return (
    item.topics.includes("legal") &&
    ["supreme court", "high court", "court", "tribunal", "plea"].some((term) =>
      matchesTerm(text, term)
    )
  );
}

function sourceCount(items: FeedItem[], source: string) {
  return items.filter((item) => item.source === source).length;
}

function courtLegalCount(items: FeedItem[]) {
  return items.filter(isCourtLegalItem).length;
}

function canAddToEdition(
  candidate: FeedItem,
  selected: FeedItem[],
  limit: number,
  options: { relaxedSourceCap?: boolean } = {}
) {
  if (selected.some((existing) => isNearDuplicateTitle(existing.title, candidate.title))) {
    return false;
  }

  const maxFromOneSource = options.relaxedSourceCap
    ? limit >= 12
      ? 5
      : Math.max(3, Math.ceil(limit / 2))
    : limit >= 12
    ? 4
    : Math.max(3, Math.ceil(limit / 2));
  if (sourceCount(selected, candidate.source) >= maxFromOneSource) {
    return false;
  }

  const maxCourtLegal = limit >= 12 ? 3 : Math.max(2, Math.ceil(limit / 3));
  if (isCourtLegalItem(candidate) && courtLegalCount(selected) >= maxCourtLegal) {
    return false;
  }

  return true;
}

async function selectEditorialEdition(scored: FeedItem[], limit: number) {
  const candidates: FeedItem[] = [];
  for (const item of scored) {
    if (await isUrlIngested(item.link)) continue;
    if (candidates.some((existing) => isNearDuplicateTitle(existing.title, item.title))) continue;
    candidates.push(item);
  }

  const selected: FeedItem[] = [];
  const byTopic = new Map<TopicTag, FeedItem[]>();
  for (const topic of TOPIC_PRIORITY) {
    byTopic.set(
      topic,
      candidates
        .filter((item) => primaryTopic(item) === topic)
        .sort((a, b) => b.score - a.score)
    );
  }

  let advanced = true;
  while (selected.length < limit && advanced) {
    advanced = false;
    for (const topic of TOPIC_PRIORITY) {
      if (selected.length >= limit) break;
      const bucket = byTopic.get(topic) ?? [];
      const nextIdx = bucket.findIndex((item) => canAddToEdition(item, selected, limit));
      if (nextIdx === -1) continue;
      selected.push(bucket.splice(nextIdx, 1)[0]);
      advanced = true;
    }
  }

  for (const item of candidates.sort((a, b) => b.score - a.score)) {
    if (selected.length >= limit) break;
    if (selected.some((existing) => existing.link === item.link)) continue;
    if (!canAddToEdition(item, selected, limit)) continue;
    selected.push(item);
  }

  for (const item of candidates.sort((a, b) => b.score - a.score)) {
    if (selected.length >= limit) break;
    if (selected.some((existing) => existing.link === item.link)) continue;
    if (!canAddToEdition(item, selected, limit, { relaxedSourceCap: true })) continue;
    selected.push(item);
  }

  return selected.slice(0, limit);
}

function classify(text: string, source: string) {
  const lower = text.toLowerCase();
  const reasons: string[] = [];
  let score = SOURCE_BONUS[source] ?? 0;

  const topics = (Object.entries(TOPIC_KEYWORDS) as [TopicTag, string[]][])
    .filter(([, words]) => matchingTerms(lower, words).length > 0)
    .map(([t]) => t);

  for (const topic of topics) {
    if (topic === "legal") {
      // Base score for any legal story — reduced so routine court news
      // doesn't automatically outrank major international/national events.
      score += 2;
      reasons.push("legal/current-law hook");
      // Extra bonus only for stories with genuine constitutional significance
      const constitutionalSignal = [
        "supreme court",
        "constitutional bench",
        "fundamental rights",
        "article 32",
        "article 226",
        "constitution",
        "constitutional validity",
        "landmark",
      ].some((term) => matchesTerm(lower, term));
      if (constitutionalSignal) {
        score += 2;
        reasons.push("constitutional significance");
      }
    } else if (topic === "polity" || topic === "international") {
      score += 3;
      reasons.push(`${topic} relevance`);
    } else if (topic === "economy" || topic === "environment") {
      score += 2;
      reasons.push(`${topic} relevance`);
    } else if (topic === "reports") {
      score += 2;
      reasons.push("report/index hook");
    } else {
      score += 1;
    }
  }

  const matchedHooks = matchingTerms(lower, EXAM_HOOKS);
  if (matchedHooks.length > 0) {
    score += Math.min(5, matchedHooks.length + 2);
    reasons.push(`testable static hook: ${matchedHooks.slice(0, 2).join(", ")}`);
  }

  if (matchesTerm(lower, "clat") || matchesTerm(lower, "ailet") || lower.includes("law entrance")) {
    score += 4;
    reasons.push("explicit law-entrance signal");
  }

  const lowValue = LOW_VALUE_PATTERNS.some((pattern) => matchesTerm(lower, pattern));
  const hardLowValue = HARD_LOW_VALUE_PATTERNS.some((pattern) => matchesTerm(lower, pattern));
  const legalNoise = LEGAL_NOISE_PATTERNS.some((pattern) => matchesTerm(lower, pattern));
  const marketTickerNoise = MARKET_TICKER_PATTERNS.some((pattern) => matchesTerm(lower, pattern));
  const hasInstitutionalHook = [
    "supreme court",
    "high court",
    "parliament",
    "election",
    "commission",
    "tribunal",
    "united nations",
    "security council",
    "rbi",
    "sebi",
  ].some((hook) => matchesTerm(lower, hook));
  if (hardLowValue) {
    score -= 10;
    reasons.push("low exam value despite news hook");
  } else if (lowValue && !hasInstitutionalHook) {
    score -= 8;
    reasons.push("rejected-style low exam value");
  }

  if (legalNoise) {
    score -= 6;
    reasons.push("procedural legal item, lower exam value");
  }

  if (
    marketTickerNoise &&
    !["rbi", "sebi", "monetary", "policy", "repo", "inflation"].some((hook) =>
      matchesTerm(lower, hook)
    )
  ) {
    score -= 6;
    reasons.push("market movement, not policy/current-affairs priority");
  }

  if (topics.length === 0) score -= 3;
  if (score > 0 && SOURCE_BONUS[source]) reasons.unshift(`trusted source: ${source}`);

  return {
    topics: topics.length > 0 ? topics : (["polity"] as TopicTag[]),
    score,
    reason: reasons.slice(0, 4).join(" · ") || "general current-affairs relevance",
  };
}

interface FeedItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
  snippet: string;
  score: number;
  topics: TopicTag[];
  reason: string;
}

export interface PipelineResult {
  runId: string;
  dryRun: boolean;
  totalFetched: number;
  relevant: number;
  generated?: number;
  questions?: number;
  errors?: string[];
  items?: Array<Record<string, unknown>>;
  error?: string;
}

export async function runIngestPipeline(options: {
  limit?: number;
  dryRun?: boolean;
}): Promise<PipelineResult> {
  const limit = Math.min(options.limit ?? 12, 12);
  const dryRun = options.dryRun ?? false;

  if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
    throw Object.assign(
      new Error("ANTHROPIC_API_KEY not set. Use dryRun to test RSS discovery without Claude."),
      { statusCode: 500 }
    );
  }

  const runId = randomUUID();
  const runDate = new Date().toISOString();

  await addPipelineRun({
    id: runId,
    run_date: istToday(),
    sources_queried: FEEDS.map((f) => f.source),
    urls_discovered: [],
    items_generated: 0,
    items_approved: 0,
    items_rejected: 0,
    status: "running",
    error_log: null,
    created_at: runDate,
  });

  try {
    // 1. Fetch RSS
    const settled = await Promise.allSettled(
      FEEDS.map(async (feed) => {
        const parsed = await parser.parseURL(feed.url);
        return (parsed.items || []).slice(0, 15).map((item) => {
          const title = item.title?.trim() || "Untitled";
          const snippet = item.contentSnippet?.slice(0, 300) || "";
          const { topics, score, reason } = classify(`${title} ${snippet}`, feed.source);
          return {
            title,
            link: item.link || feed.url,
            source: feed.source,
            publishedAt: item.isoDate || item.pubDate || null,
            snippet,
            score,
            topics,
            reason,
          } satisfies FeedItem;
        });
      })
    );

    const allItems = settled
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .filter((i) => i.link);

    // 2. Relevance + story clustering + soft topic balance.
    // This keeps legal/current-law important without letting court feeds
    // dominate the full daily 12 when major national/international stories exist.
    const scored = allItems
      .filter((i) => {
        if (i.score >= 7) return true;
        const hasBroadExamTopic = i.topics.some((topic) => topic !== "legal");
        const trustedInstitutionalSource = ["PIB", "PRS Legislative Research", "RBI"].includes(i.source);
        const trustedDailySource = ["Indian Express", "The Hindu"].includes(i.source);
        if (i.score >= 5 && hasBroadExamTopic && trustedDailySource) return true;
        return i.score >= 6 && (hasBroadExamTopic || trustedInstitutionalSource);
      })
      .sort((a, b) => b.score - a.score);
    const relevant = await selectEditorialEdition(scored, limit);

    await updatePipelineRun(runId, { urls_discovered: relevant.map((i) => i.link) });

    if (dryRun) {
      await updatePipelineRun(runId, { status: "completed" });
      return {
        runId,
        dryRun: true,
        totalFetched: allItems.length,
        relevant: relevant.length,
        items: relevant.map((i) => ({
          title: i.title,
          link: i.link,
          source: i.source,
          score: i.score,
          primaryTopic: primaryTopic(i),
          topics: i.topics,
          reason: i.reason,
        })),
      };
    }

    // 3. Generate via Claude — persist each item immediately so a Vercel
    //    function timeout mid-loop still preserves completed items.
    let savedCount = 0;
    const errors: string[] = [];

    for (const feedItem of relevant) {
      try {
        const fetched = await fetchArticleText(feedItem.link);
        const articleText = fetched?.text || feedItem.snippet || undefined;

        const content = await generateContentFromArticle(
          feedItem.title,
          feedItem.link,
          feedItem.source,
          feedItem.topics,
          articleText
        );

        const itemId = randomUUID();
        const now = new Date().toISOString();

        const newItem: ContentItem = {
          id: itemId,
          slug: content.slug,
          title: content.title,
          summary: content.summary,
          body: content.body,
          why_it_matters: content.why_it_matters,
          topic_tags: content.topic_tags,
          source_urls: [feedItem.link],
          citations: [{ source: feedItem.source, url: feedItem.link }],
          image_url: null,
          difficulty: content.difficulty,
          status: "review",
          reviewed_by: null,
          review_notes: `Score: ${feedItem.score} | Selected: ${feedItem.reason}`,
          published_at: null,
          content_date: istToday(),
          daily_slot: null,
          created_at: now,
          updated_at: now,
        };

        const rawQs = await generateQuizQuestions(
          content.title,
          content.summary,
          content.body,
          content.topic_tags[0],
          content.difficulty,
          4
        );

        const itemQuestions: Question[] = rawQs.map((rq) => ({
          id: randomUUID(),
          content_item_id: itemId,
          prompt: rq.prompt,
          options: rq.options,
          correct_option: rq.correct_option,
          explanation: rq.explanation,
          topic: content.topic_tags[0],
          difficulty: content.difficulty,
          source_citation: feedItem.source,
          status: "draft" as const,
          created_at: now,
        }));

        // Persist immediately — survives a mid-loop function timeout
        await upsertContentItems([newItem]);
        if (itemQuestions.length > 0) await upsertQuestions(itemQuestions);
        savedCount++;

        // Keep the run counter current so the dashboard reflects partial progress
        await updatePipelineRun(runId, { items_generated: savedCount });
      } catch (err) {
        errors.push(
          `Failed to process "${feedItem.title}": ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    const runErrorLog = errors.length > 0 ? errors.join("\n") : null;

    await updatePipelineRun(runId, {
      status: savedCount === 0 && runErrorLog ? "failed" : "completed",
      items_generated: savedCount,
      error_log: runErrorLog,
    });

    return {
      runId,
      dryRun: false,
      totalFetched: allItems.length,
      relevant: relevant.length,
      generated: savedCount,
      questions: 0, // counted per-item above; not tracked in aggregate return
      errors,
    };
  } catch (err) {
    await updatePipelineRun(runId, {
      status: "failed",
      error_log: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
