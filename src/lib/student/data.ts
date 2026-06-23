/**
 * Student data facade — progress, streaks, XP, rating, quiz sessions,
 * bookmarks, conversion events.
 *
 * Production path:  Supabase (RLS: students read own rows; ALL writes go
 *                   through these server functions with the service role).
 * Dev fallback:     data/student-store.json + mock user.
 *
 * SECURITY: callers must pass a userId obtained from getStudentId() —
 * never from the request body.
 */

import { useSupabaseStore } from "@/lib/content/config";
import { istToday } from "@/lib/utils/date";
import { XP_AWARDS } from "@/lib/gamification/xp";
import { isStreakQualified, calculateNewStreak } from "@/lib/gamification/streaks";
import { getLeagueForXP } from "@/lib/gamification/leagues";
import { withStore, readOnly } from "./local-store";
import { MOCK_USER } from "@/lib/mock-data";
import type {
  User,
  QuizSession,
  QuizAnswer,
  ConversionEvent,
  BattleResult,
  UserTopicMastery,
  DailyUserActivity,
} from "@/lib/types/database";
import { randomUUID } from "crypto";

// ── Identity ───────────────────────────────────────

/** Resolve the acting student. Mock mode: fixed demo user. Production:
 *  the authenticated Supabase user (null = not logged in). */
export async function getStudentId(): Promise<string | null> {
  if (!useSupabaseStore()) return MOCK_USER.id;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function admin() {
  // Lazy import keeps supabase-js out of paths that never use it
  const { createAdminClient } = require("@/lib/supabase/admin") as typeof import("@/lib/supabase/admin");
  return createAdminClient();
}

// ── Profile ────────────────────────────────────────

export async function getProfile(userId: string): Promise<User | null> {
  if (!useSupabaseStore()) {
    return readOnly((d) => d.profiles.find((p) => p.id === userId) ?? null);
  }
  const { data, error } = await admin().from("users").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return (data ?? null) as User | null;
}

async function updateProfile(userId: string, updates: Partial<User>): Promise<void> {
  if (!useSupabaseStore()) {
    withStore((d) => {
      const p = d.profiles.find((x) => x.id === userId);
      if (p) Object.assign(p, updates, { updated_at: new Date().toISOString() });
    });
    return;
  }
  const { error } = await admin()
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export async function touchLastActive(userId: string): Promise<void> {
  await updateProfile(userId, { last_active_at: new Date().toISOString() } as Partial<User>);
}

// ── Daily activity + streak ────────────────────────

async function getOrCreateActivity(userId: string, date: string): Promise<DailyUserActivity> {
  if (!useSupabaseStore()) {
    return withStore((d) => {
      let row = d.daily_activity.find((a) => a.user_id === userId && a.activity_date === date);
      if (!row) {
        row = {
          id: randomUUID(),
          user_id: userId,
          activity_date: date,
          shorts_read: 0,
          blogs_read: 0,
          battles_completed: 0,
          battles_won: 0,
          xp_earned: 0,
          streak_qualified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        d.daily_activity.push(row);
      }
      return { ...row };
    });
  }
  const supa = admin();
  const { data } = await supa
    .from("daily_user_activity")
    .select("*")
    .eq("user_id", userId)
    .eq("activity_date", date)
    .maybeSingle();
  if (data) return data as DailyUserActivity;
  const { data: created, error } = await supa
    .from("daily_user_activity")
    .insert({ user_id: userId, activity_date: date })
    .select()
    .single();
  if (error) throw error;
  return created as DailyUserActivity;
}

async function bumpActivity(
  userId: string,
  date: string,
  delta: Partial<Pick<DailyUserActivity, "shorts_read" | "blogs_read" | "battles_completed" | "battles_won" | "xp_earned">>
): Promise<DailyUserActivity> {
  const current = await getOrCreateActivity(userId, date);
  const next = {
    shorts_read: current.shorts_read + (delta.shorts_read ?? 0),
    blogs_read: current.blogs_read + (delta.blogs_read ?? 0),
    battles_completed: current.battles_completed + (delta.battles_completed ?? 0),
    battles_won: current.battles_won + (delta.battles_won ?? 0),
    xp_earned: current.xp_earned + (delta.xp_earned ?? 0),
  };
  const qualified = isStreakQualified(next.battles_completed, next.shorts_read);

  if (!useSupabaseStore()) {
    withStore((d) => {
      const row = d.daily_activity.find((a) => a.user_id === userId && a.activity_date === date);
      if (row) Object.assign(row, next, { streak_qualified: qualified, updated_at: new Date().toISOString() });
    });
  } else {
    const { error } = await admin()
      .from("daily_user_activity")
      .update({ ...next, streak_qualified: qualified, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("activity_date", date);
    if (error) throw error;
  }
  return { ...current, ...next, streak_qualified: qualified };
}

/** Apply streak rules after an activity change. Returns the new streak. */
async function refreshStreak(userId: string, qualifiedToday: boolean): Promise<number> {
  const profile = await getProfile(userId);
  if (!profile) return 0;
  const { newStreak, newBest } = calculateNewStreak(
    profile.streak_current,
    profile.streak_last_date,
    qualifiedToday
  );
  if (qualifiedToday && newStreak !== profile.streak_current) {
    await updateProfile(userId, {
      streak_current: newStreak,
      streak_best: Math.max(newBest, profile.streak_best),
      streak_last_date: istToday(),
    } as Partial<User>);
    return newStreak;
  }
  if (qualifiedToday && !profile.streak_last_date) {
    await updateProfile(userId, { streak_current: newStreak, streak_last_date: istToday() } as Partial<User>);
  }
  return profile.streak_current;
}

// ── Reading progress ───────────────────────────────

export interface ReadResult {
  newlyRead: boolean;
  readToday: number;
  readIds: string[];
  xp: number;
  streak: number;
}

export async function markShortRead(
  userId: string,
  contentItemId: string,
  todayContentIds: string[]
): Promise<ReadResult> {
  const date = istToday();
  let newlyRead = false;

  if (!useSupabaseStore()) {
    newlyRead = withStore((d) => {
      const exists = d.content_progress.some(
        (r) => r.user_id === userId && r.content_item_id === contentItemId
      );
      if (!exists) {
        d.content_progress.push({
          user_id: userId,
          content_item_id: contentItemId,
          read_short: true,
          created_at: new Date().toISOString(),
        });
        return true;
      }
      return false;
    });
  } else {
    const { error, data } = await admin()
      .from("user_content_progress")
      .upsert(
        { user_id: userId, content_item_id: contentItemId, read_short: true },
        { onConflict: "user_id,content_item_id", ignoreDuplicates: true }
      )
      .select();
    if (error) throw error;
    newlyRead = (data ?? []).length > 0;
  }

  let activity: DailyUserActivity | null = null;
  if (newlyRead) {
    activity = await bumpActivity(userId, date, {
      shorts_read: 1,
      xp_earned: XP_AWARDS.READ_SHORT,
    });
    const profile = await getProfile(userId);
    if (profile) {
      const newXp = profile.xp + XP_AWARDS.READ_SHORT;
      await updateProfile(userId, { xp: newXp, league: getLeagueForXP(newXp) } as Partial<User>);
    }
  } else {
    activity = await getOrCreateActivity(userId, date);
  }
  await touchLastActive(userId);
  const streak = await refreshStreak(userId, activity.streak_qualified);

  const readIds = await getReadContentIds(userId);
  const readToday = todayContentIds.filter((id) => readIds.includes(id)).length;
  const profile = await getProfile(userId);

  return { newlyRead, readToday, readIds, xp: profile?.xp ?? 0, streak };
}

export async function getReadContentIds(userId: string): Promise<string[]> {
  if (!useSupabaseStore()) {
    return readOnly((d) =>
      d.content_progress.filter((r) => r.user_id === userId && r.read_short).map((r) => r.content_item_id)
    );
  }
  const { data, error } = await admin()
    .from("user_content_progress")
    .select("content_item_id")
    .eq("user_id", userId)
    .eq("read_short", true);
  if (error) throw error;
  return (data ?? []).map((r: { content_item_id: string }) => r.content_item_id);
}

// ── Bookmarks ──────────────────────────────────────

export async function toggleBookmark(userId: string, contentItemId: string): Promise<boolean> {
  if (!useSupabaseStore()) {
    return withStore((d) => {
      const idx = d.bookmarks.findIndex(
        (b) => b.user_id === userId && b.content_item_id === contentItemId
      );
      if (idx >= 0) {
        d.bookmarks.splice(idx, 1);
        return false;
      }
      d.bookmarks.push({ user_id: userId, content_item_id: contentItemId, created_at: new Date().toISOString() });
      return true;
    });
  }
  const supa = admin();
  const { data } = await supa
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("content_item_id", contentItemId)
    .maybeSingle();
  if (data) {
    await supa.from("bookmarks").delete().eq("id", data.id);
    return false;
  }
  await supa.from("bookmarks").insert({ user_id: userId, content_item_id: contentItemId });
  return true;
}

export async function getBookmarkIds(userId: string): Promise<string[]> {
  if (!useSupabaseStore()) {
    return readOnly((d) =>
      d.bookmarks.filter((b) => b.user_id === userId).map((b) => b.content_item_id)
    );
  }
  const { data, error } = await admin()
    .from("bookmarks")
    .select("content_item_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r: { content_item_id: string }) => r.content_item_id);
}

// ── Topic mastery ──────────────────────────────────

export async function getMastery(userId: string): Promise<UserTopicMastery[]> {
  if (!useSupabaseStore()) {
    return readOnly((d) => d.topic_mastery.filter((m) => m.user_id === userId));
  }
  const { data, error } = await admin().from("user_topic_mastery").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as UserTopicMastery[];
}

export async function applyMasteryDeltas(
  userId: string,
  perTopic: Record<string, { total: number; correct: number }>
): Promise<void> {
  const existing = await getMastery(userId);
  for (const [topic, delta] of Object.entries(perTopic)) {
    const row = existing.find((m) => m.topic === topic);
    const total = (row?.total_questions ?? 0) + delta.total;
    const correct = (row?.correct_count ?? 0) + delta.correct;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    if (!useSupabaseStore()) {
      withStore((d) => {
        const m = d.topic_mastery.find((x) => x.user_id === userId && x.topic === topic);
        if (m) {
          m.total_questions = total;
          m.correct_count = correct;
          m.mastery_pct = pct;
          m.updated_at = new Date().toISOString();
        } else {
          d.topic_mastery.push({
            id: randomUUID(),
            user_id: userId,
            topic,
            total_questions: total,
            correct_count: correct,
            mastery_pct: pct,
            updated_at: new Date().toISOString(),
          });
        }
      });
    } else {
      const { error } = await admin()
        .from("user_topic_mastery")
        .upsert(
          {
            user_id: userId,
            topic,
            total_questions: total,
            correct_count: correct,
            mastery_pct: pct,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,topic" }
        );
      if (error) throw error;
    }
  }
}

// ── Quiz sessions (server-authoritative) ───────────

export async function createQuizSession(session: QuizSession): Promise<void> {
  if (!useSupabaseStore()) {
    withStore((d) => d.quiz_sessions.push(session));
    return;
  }
  const { error } = await admin().from("quiz_sessions").insert(session);
  if (error) throw error;
}

export async function getQuizSession(id: string): Promise<QuizSession | null> {
  if (!useSupabaseStore()) {
    return readOnly((d) => d.quiz_sessions.find((s) => s.id === id) ?? null);
  }
  const { data, error } = await admin().from("quiz_sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as QuizSession | null;
}

export async function updateQuizSession(id: string, updates: Partial<QuizSession>): Promise<void> {
  if (!useSupabaseStore()) {
    withStore((d) => {
      const s = d.quiz_sessions.find((x) => x.id === id);
      if (s) Object.assign(s, updates);
    });
    return;
  }
  const { error } = await admin().from("quiz_sessions").update(updates).eq("id", id);
  if (error) throw error;
}

export async function addQuizAnswer(answer: QuizAnswer): Promise<void> {
  if (!useSupabaseStore()) {
    withStore((d) => {
      const dup = d.quiz_answers.some(
        (a) => a.session_id === answer.session_id && a.question_index === answer.question_index
      );
      if (dup) throw new Error("Question already answered");
      d.quiz_answers.push(answer);
    });
    return;
  }
  const { error } = await admin().from("quiz_answers").insert(answer);
  if (error) throw error; // unique(session_id, question_index) rejects replays
}

export async function getSessionAnswers(sessionId: string): Promise<QuizAnswer[]> {
  if (!useSupabaseStore()) {
    return readOnly((d) =>
      d.quiz_answers
        .filter((a) => a.session_id === sessionId)
        .sort((a, b) => a.question_index - b.question_index)
    );
  }
  const { data, error } = await admin()
    .from("quiz_answers")
    .select("*")
    .eq("session_id", sessionId)
    .order("question_index");
  if (error) throw error;
  return (data ?? []) as QuizAnswer[];
}

// ── Battle completion side-effects ─────────────────

export async function recordBattleResult(result: BattleResult): Promise<void> {
  if (!useSupabaseStore()) {
    withStore((d) => d.battle_results.push(result));
    return;
  }
  const { error } = await admin().from("battle_results").insert(result);
  if (error) throw error;
}

export interface BattleCompletionInput {
  won: boolean;
  draw: boolean;
  ratingChange: number;
  xpEarned: number;
}

export async function applyBattleCompletion(
  userId: string,
  input: BattleCompletionInput
): Promise<{ newRating: number; newXp: number; streak: number }> {
  const profile = await getProfile(userId);
  if (!profile) throw new Error("Profile not found");

  const newRating = Math.max(0, profile.rating + input.ratingChange);
  const newXp = profile.xp + input.xpEarned;

  await updateProfile(userId, {
    rating: newRating,
    xp: newXp,
    league: getLeagueForXP(newXp),
    battles_played: profile.battles_played + 1,
    battles_won: profile.battles_won + (input.won ? 1 : 0),
    last_active_at: new Date().toISOString(),
  } as Partial<User>);

  const activity = await bumpActivity(userId, istToday(), {
    battles_completed: 1,
    battles_won: input.won ? 1 : 0,
    xp_earned: input.xpEarned,
  });
  const streak = await refreshStreak(userId, activity.streak_qualified);

  return { newRating, newXp, streak };
}

// ── Conversion events ──────────────────────────────

export async function recordEvent(event: ConversionEvent): Promise<void> {
  if (!useSupabaseStore()) {
    withStore((d) => d.conversion_events.push(event));
    return;
  }
  const { error } = await admin().from("conversion_events").insert(event);
  if (error) throw error;
}

/** Dates (YYYY-MM-DD) where the student qualified for a streak — powers
 *  the streak calendar. */
export async function getActiveDates(userId: string, limit = 60): Promise<string[]> {
  if (!useSupabaseStore()) {
    return readOnly((d) =>
      d.daily_activity
        .filter((a) => a.user_id === userId && a.streak_qualified)
        .map((a) => a.activity_date)
        .sort()
        .slice(-limit)
    );
  }
  const { data, error } = await admin()
    .from("daily_user_activity")
    .select("activity_date")
    .eq("user_id", userId)
    .eq("streak_qualified", true)
    .order("activity_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r: { activity_date: string }) => r.activity_date);
}

/** Recent conversion events, newest first — admin funnel dashboard. */
export async function getRecentEvents(limit = 200): Promise<ConversionEvent[]> {
  if (!useSupabaseStore()) {
    return readOnly((d) =>
      [...d.conversion_events]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit)
    );
  }
  const { data, error } = await admin()
    .from("conversion_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ConversionEvent[];
}
