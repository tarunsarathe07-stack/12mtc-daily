/**
 * Fetch full article text from a URL.
 *
 * Free sources (LiveLaw, Bar and Bench, PIB, PRS, RBI) usually give full HTML.
 * Paywalled sources (The Hindu, Indian Express) may only give partial text —
 * that's fine, the pipeline still has the RSS snippet as fallback.
 *
 * Uses basic HTML → text extraction (no heavy dependency like Puppeteer).
 */

/** Sources known to be free / no paywall */
const FREE_SOURCES = [
  "livelaw.in",
  "barandbench.com",
  "pib.gov.in",
  "prsindia.org",
  "rbi.org.in",
];

function isFreeSource(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    return FREE_SOURCES.some((s) => hostname.includes(s));
  } catch {
    return false;
  }
}

/**
 * Strip HTML tags and collapse whitespace to get readable text.
 * Intentionally simple — no DOM parser dependency.
 */
function htmlToText(html: string): string {
  return html
    // Remove script/style/noscript blocks entirely
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Replace common block elements with newlines
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|br\s*\/?)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Strip remaining tags
    .replace(/<[^>]+>/g, " ")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Collapse whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

/**
 * Extract the most article-like block from page text.
 * Looks for the longest continuous block of substantial paragraphs.
 */
function extractArticleBody(text: string): string {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 80);
  if (paragraphs.length === 0) return text.slice(0, 3000);

  // Take the longest consecutive run of substantial paragraphs
  let bestStart = 0;
  let bestLen = 1;
  let curStart = 0;

  for (let i = 1; i < paragraphs.length; i++) {
    // If gap between this and previous paragraph is reasonable, extend run
    if (paragraphs[i].trim().length > 40) {
      const runLen = i - curStart + 1;
      if (runLen > bestLen) {
        bestStart = curStart;
        bestLen = runLen;
      }
    } else {
      curStart = i + 1;
    }
  }

  return paragraphs.slice(bestStart, bestStart + bestLen).join("\n\n").slice(0, 5000);
}

export interface FetchedArticle {
  text: string;
  wordCount: number;
  isFull: boolean; // true if we got full article content
}

/**
 * Attempt to fetch and extract article text from a URL.
 *
 * Returns null if fetch fails or content is too short to be useful.
 * For paywalled sources, may return partial content — caller should check `isFull`.
 */
export async function fetchArticleText(
  url: string,
  timeoutMs = 8000
): Promise<FetchedArticle | null> {
  // Only attempt fetch on sources we know are free or partially accessible
  const free = isFreeSource(url);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Identify as a bot/fetcher, not pretending to be a browser
        "User-Agent": "CLATDailyArena/1.0 (Educational content pipeline)",
        Accept: "text/html",
      },
    });

    clearTimeout(timer);

    if (!response.ok) return null;

    const html = await response.text();
    const text = htmlToText(html);
    const articleBody = extractArticleBody(text);

    const wordCount = articleBody.split(/\s+/).length;

    // If we got fewer than 50 words, it's not useful
    if (wordCount < 50) return null;

    return {
      text: articleBody,
      wordCount,
      isFull: free && wordCount > 150,
    };
  } catch {
    // Timeout, network error, etc. — not a problem, pipeline still works
    return null;
  }
}
