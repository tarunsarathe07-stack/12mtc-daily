/**
 * Local student store — dev/mock fallback for student progress.
 * Persists to data/student-store.json so demo progress survives restarts.
 * Mirrors the Supabase tables (users, user_content_progress, bookmarks,
 * daily_user_activity, user_topic_mastery, quiz_sessions, quiz_answers,
 * battle_results, conversion_events).
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import type {
  User,
  QuizSession,
  QuizAnswer,
  ConversionEvent,
  UserTopicMastery,
  BattleResult,
  DailyUserActivity,
} from "@/lib/types/database";
import { MOCK_USER, MOCK_MASTERY } from "@/lib/mock-data";

const STORE_PATH = join(process.cwd(), "data", "student-store.json");

export interface ContentProgressRow {
  user_id: string;
  content_item_id: string;
  read_short: boolean;
  created_at: string;
}

export interface BookmarkRow {
  user_id: string;
  content_item_id: string;
  created_at: string;
}

interface StudentStoreData {
  profiles: User[];
  content_progress: ContentProgressRow[];
  bookmarks: BookmarkRow[];
  daily_activity: DailyUserActivity[];
  topic_mastery: UserTopicMastery[];
  quiz_sessions: QuizSession[];
  quiz_answers: QuizAnswer[];
  battle_results: BattleResult[];
  conversion_events: ConversionEvent[];
}

function emptyStore(): StudentStoreData {
  return {
    profiles: [{ ...MOCK_USER }],
    content_progress: [],
    bookmarks: [],
    daily_activity: [],
    topic_mastery: MOCK_MASTERY.map((m) => ({ ...m })),
    quiz_sessions: [],
    quiz_answers: [],
    battle_results: [],
    conversion_events: [],
  };
}

function readStore(): StudentStoreData {
  if (!existsSync(STORE_PATH)) return emptyStore();
  try {
    const data = JSON.parse(readFileSync(STORE_PATH, "utf-8")) as StudentStoreData;
    if (!data.profiles || data.profiles.length === 0) data.profiles = [{ ...MOCK_USER }];
    return data;
  } catch {
    return emptyStore();
  }
}

function writeStore(data: StudentStoreData): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/** Generic read-modify-write helper. */
export function withStore<T>(fn: (data: StudentStoreData) => T): T {
  const data = readStore();
  const result = fn(data);
  writeStore(data);
  return result;
}

export function readOnly<T>(fn: (data: StudentStoreData) => T): T {
  return fn(readStore());
}
