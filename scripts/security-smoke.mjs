const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const testBattleFlow = process.env.TEST_BATTLE_FLOW !== "false";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => null);
  return { response, body };
}

const home = await fetch(baseUrl);
assert(home.ok, "Home page did not load");
assert(home.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"), "CSP missing");
assert(home.headers.get("x-content-type-options") === "nosniff", "nosniff header missing");
assert(home.headers.get("x-frame-options") === "DENY", "frame protection missing");
assert(!home.headers.has("x-powered-by"), "Framework disclosure header is present");

const removedQuestions = await fetch(`${baseUrl}/api/content/questions?count=1`);
assert(removedQuestions.status === 404, "Public answer-key endpoint still exists");

const crossOrigin = await json("/api/events", {
  method: "POST",
  headers: { "content-type": "application/json", origin: "https://attacker.example" },
  body: JSON.stringify({ eventType: "blog_cta_click" }),
});
assert(crossOrigin.response.status === 403, "Cross-origin mutation was not rejected");

const invalidContentType = await json("/api/battle/session", {
  method: "POST",
  headers: { origin: baseUrl },
  body: JSON.stringify({ mode: "daily" }),
});
assert(
  invalidContentType.response.status === (testBattleFlow ? 415 : 401),
  `Unexpected non-JSON battle response: ${invalidContentType.response.status}`
);

const started = await json("/api/battle/session", {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ mode: "daily" }),
});

if (!testBattleFlow) {
  assert(started.response.status === 401, "Anonymous battle session was not rejected");
  console.log("Anonymous production security checks passed");
  process.exit(0);
}

assert(started.response.ok, `Battle session failed: ${JSON.stringify(started.body)}`);
assert(started.body?.questions?.length === 12, "Battle did not return 12 questions");
const serializedSession = JSON.stringify(started.body);
assert(!serializedSession.includes("correct_option"), "Session leaked correct_option");
assert(!serializedSession.includes("explanation"), "Session leaked explanations");
assert(!serializedSession.includes("bot_answers"), "Session leaked the bot answer plan");

const sessionId = started.body.sessionId;
for (let questionIndex = 0; questionIndex < 12; questionIndex += 1) {
  const answered = await json("/api/battle/answer", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({
      sessionId,
      questionIndex,
      selectedOption: null,
      timeMs: 1000,
    }),
  });
  assert(answered.response.ok, `Answer ${questionIndex} failed: ${JSON.stringify(answered.body)}`);

  if (questionIndex === 0) {
    const incomplete = await json("/api/battle/complete", {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ sessionId }),
    });
    assert(incomplete.response.status === 409, "Incomplete battle received rewards");
  }
}

const completed = await json("/api/battle/complete", {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ sessionId }),
});
assert(completed.response.ok, `Complete battle failed: ${JSON.stringify(completed.body)}`);
assert(completed.body?.skipped === 12, "Completion summary is inconsistent");

const duplicate = await json("/api/battle/complete", {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ sessionId }),
});
assert(duplicate.response.status === 409, "Duplicate completion was not blocked");

console.log("Security smoke checks passed");
