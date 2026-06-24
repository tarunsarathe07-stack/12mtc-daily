// Manual types until Supabase CLI generates them
// These match the schema in supabase/migrations/001_initial_schema.sql

export type TopicTag =
  | "polity"
  | "legal"
  | "international"
  | "economy"
  | "environment"
  | "awards"
  | "reports";

export type ContentStatus = "draft" | "review" | "approved" | "published" | "rejected";
export type QuestionStatus = "draft" | "approved" | "rejected";
export type BattleMode = "daily" | "topic";
export type BattleStatus = "waiting" | "countdown" | "in_progress" | "completed" | "abandoned";
export type League = "bronze" | "silver" | "gold" | "platinum" | "diamond";
export type Difficulty = "easy" | "medium" | "hard";
export type UserRole = "admin" | "editor";

export interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
  rating: number;
  xp: number;
  streak_current: number;
  streak_best: number;
  streak_last_date: string | null;
  streak_freezes: number;
  league: League;
  battles_played: number;
  battles_won: number;
  phone?: string | null;
  target_exam_year?: number | null;
  city?: string | null;
  last_active_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Server-authoritative bot battle session. Questions snapshot (with
 *  correct answers) and the bot plan live ONLY on the server. */
export interface QuizSession {
  id: string;
  user_id: string;
  mode: "daily" | "topic";
  topic: string | null;
  bot_profile: BotProfile;
  questions: Question[]; // server-side snapshot, never sent whole to client
  bot_answers: Array<{ selectedOption: string; isCorrect: boolean; delayMs: number }>;
  status: "active" | "completed" | "abandoned";
  player_score: number | null;
  bot_score: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface QuizAnswer {
  id: string;
  session_id: string;
  user_id: string;
  question_id: string | null;
  question_index: number;
  selected_option: string | null;
  is_correct: boolean;
  points: number;
  time_ms: number | null;
  bot_option: string | null;
  bot_correct: boolean;
  bot_points: number;
  bot_time_ms: number | null;
  topic: string | null;
  created_at: string;
}

export type ConversionEventType =
  | "read_12_complete"
  | "battle_complete"
  | "weak_topic_shown"
  | "blog_cta_click"
  | "profile_cta_click";

export interface ConversionEvent {
  id: string;
  user_id: string | null;
  event_type: ConversionEventType;
  cta_label: string | null;
  meta: Record<string, unknown>;
  path: string | null;
  created_at: string;
}

export interface ContentItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  why_it_matters: string | null;
  topic_tags: TopicTag[];
  source_urls: string[];
  citations: Array<{ source: string; url: string }>;
  image_url: string | null;
  difficulty: Difficulty;
  status: ContentStatus;
  reviewed_by: string | null;
  review_notes: string | null;
  published_at: string | null;
  /** YYYY-MM-DD "news day" (Asia/Kolkata) this item belongs to — daily archive key. */
  content_date?: string;
  /** Position 1-12 in that day's edition. Assigned on publish; null until then. */
  daily_slot?: number | null;
  /** True for hardcoded demo/sample cards (dev mode only) — shown honestly
   *  as "Demo" in the UI and auto-replaced when real pipeline content
   *  exists for the same day. */
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Funnel/SEO blog post — marketing content for converting students into
 * 12 Minutes to CLAT customers. Completely separate from current affairs.
 */
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string; // markdown
  category: string; // e.g. "Strategy", "CLAT Prep", "Product"
  author: string;
  published_at: string;
  status: "draft" | "published";
  /** Which conversion CTA to show at the end of the post. */
  cta: "start-daily" | "join-12mtc" | "save-streak" | "prepare-12mtc";
}

export interface QuestionOption {
  label: string; // "A", "B", "C", "D"
  text: string;
}

export interface Question {
  id: string;
  content_item_id: string | null;
  prompt: string;
  options: QuestionOption[];
  correct_option: string;
  explanation: string;
  topic: string;
  difficulty: Difficulty;
  source_citation: string | null;
  status: QuestionStatus;
  created_at: string;
}

export interface BotProfile {
  name: string;
  avatar: string;
  accuracy: number;
  avg_speed_ms: number;
}

export interface BattleRoom {
  id: string;
  mode: BattleMode;
  topic: string | null;
  player1_id: string;
  player2_id: string | null;
  is_bot_match: boolean;
  bot_profile: BotProfile | null;
  status: BattleStatus;
  questions_per_round: number;
  time_per_question_sec: number;
  current_question_index: number;
  question_started_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface BattleAnswer {
  id: string;
  battle_room_id: string;
  question_id: string;
  user_id: string | null;
  is_bot: boolean;
  selected_option: string | null;
  is_correct: boolean;
  time_taken_ms: number | null;
  points: number;
  created_at: string;
}

export interface BattleResult {
  id: string;
  battle_room_id: string;
  user_id: string | null;
  is_bot: boolean;
  bot_profile_name: string | null;
  total_score: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  avg_time_ms: number | null;
  rating_change: number;
  xp_earned: number;
  is_winner: boolean;
  created_at: string;
}

export interface UserTopicMastery {
  id: string;
  user_id: string;
  topic: string;
  total_questions: number;
  correct_count: number;
  mastery_pct: number;
  updated_at: string;
}

export interface DailyUserActivity {
  id: string;
  user_id: string;
  activity_date: string;
  shorts_read: number;
  blogs_read: number;
  battles_completed: number;
  battles_won: number;
  xp_earned: number;
  streak_qualified: boolean;
  created_at: string;
  updated_at: string;
}

// Topic colors for UI
export const TOPIC_COLORS: Record<TopicTag, { bg: string; text: string; gradient: string }> = {
  polity: { bg: "bg-primary/10", text: "text-primary", gradient: "from-primary/10 to-primary/5" },
  legal: { bg: "bg-primary/10", text: "text-primary", gradient: "from-primary/10 to-primary/5" },
  international: { bg: "bg-saffron-soft", text: "text-[#9a5a00]", gradient: "from-saffron/20 to-saffron/5" },
  economy: { bg: "bg-[#eef1ff]", text: "text-[#283593]", gradient: "from-primary/10 to-saffron/10" },
  environment: { bg: "bg-[#fff4dc]", text: "text-[#8a5200]", gradient: "from-saffron/15 to-primary/5" },
  awards: { bg: "bg-saffron-soft", text: "text-[#8a5200]", gradient: "from-saffron/20 to-saffron/5" },
  reports: { bg: "bg-coral-soft", text: "text-coral", gradient: "from-coral/10 to-saffron/5" },
};

export const LEAGUE_CONFIG: Record<League, { label: string; min_xp: number; color: string; emoji: string }> = {
  bronze: { label: "Bronze", min_xp: 0, color: "text-amber-700", emoji: "🥉" },
  silver: { label: "Silver", min_xp: 1000, color: "text-gray-400", emoji: "🥈" },
  gold: { label: "Gold", min_xp: 3000, color: "text-yellow-500", emoji: "🥇" },
  platinum: { label: "Platinum", min_xp: 7000, color: "text-cyan-400", emoji: "💎" },
  diamond: { label: "Diamond", min_xp: 15000, color: "text-cyan-400", emoji: "👑" },
};
