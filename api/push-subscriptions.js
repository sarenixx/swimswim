import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const json = (response, status, payload) => {
  response.status(status).json(payload);
};

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return { url, key };
};

const clampInterval = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 30;
  }

  return Math.max(5, Math.min(180, Math.round(parsed)));
};

const makeReminderId = (missionId, endpoint) =>
  crypto.createHash("sha256").update(`${missionId}:${endpoint}`).digest("hex");

const isMissingTableError = (error) =>
  error?.code === "PGRST205" ||
  error?.code === "42P01" ||
  /schema cache|could not find the table|does not exist/i.test(
    error?.message || "",
  );

const saveToSnapshotFallback = async (supabase, sessionRecord) => {
  const { error } = await supabase.from("mission_snapshots").upsert({
    id: `observation-reminder:${sessionRecord.id}`,
    payload: {
      recordType: "observation-reminder-session",
      ...sessionRecord,
    },
    updated_at: sessionRecord.updated_at,
    updated_by: "observation-reminder-service",
  });

  if (error) {
    throw new Error(error.message);
  }

  return "mission_snapshots";
};

const saveReminderSession = async (
  supabase,
  subscriptionRecord,
  sessionRecord,
) => {
  const { error: subscriptionError } = await supabase
    .from("observation_push_subscriptions")
    .upsert(subscriptionRecord, { onConflict: "endpoint" });

  if (subscriptionError) {
    if (isMissingTableError(subscriptionError)) {
      return saveToSnapshotFallback(supabase, sessionRecord);
    }

    throw new Error(subscriptionError.message);
  }

  const { error: sessionError } = await supabase
    .from("observation_reminder_sessions")
    .upsert(sessionRecord, { onConflict: "id" });

  if (sessionError) {
    if (isMissingTableError(sessionError)) {
      return saveToSnapshotFallback(supabase, sessionRecord);
    }

    throw new Error(sessionError.message);
  }

  return "observation_reminder_sessions";
};

const getBody = async (request) => {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed." });
  }

  try {
    const body = await getBody(request);
    const subscription = body.subscription;
    const endpoint = subscription?.endpoint;
    const missionId = String(body.missionId || "").trim();
    const status = ["active", "completed", "paused", "expired"].includes(
      body.status,
    )
      ? body.status
      : "active";

    if (!endpoint || !missionId) {
      return json(response, 400, {
        error: "A push subscription and missionId are required.",
      });
    }

    const { url, key } = getSupabaseConfig();
    const supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const now = new Date().toISOString();
    const startedAt = body.startedAt
      ? new Date(body.startedAt).toISOString()
      : now;
    const nextDueAt =
      body.nextDueAt && status === "active"
        ? new Date(body.nextDueAt).toISOString()
        : null;
    const intervalMinutes = clampInterval(body.intervalMinutes);

    const subscriptionRecord = {
      endpoint,
      mission_id: missionId,
      subscription,
      user_agent: request.headers["user-agent"] || "",
      updated_at: now,
    };

    const sessionRecord = {
      id: makeReminderId(missionId, endpoint),
      mission_id: missionId,
      endpoint,
      subscription,
      title: String(body.title || "WOWSA Observation Log").slice(0, 180),
      interval_minutes: intervalMinutes,
      started_at: startedAt,
      next_due_at: nextDueAt,
      status,
      updated_at: now,
    };

    const storage = await saveReminderSession(
      supabase,
      subscriptionRecord,
      sessionRecord,
    );

    return json(response, 200, {
      ok: true,
      sessionId: sessionRecord.id,
      nextDueAt,
      storage,
    });
  } catch (error) {
    return json(response, 500, {
      error:
        error instanceof Error ? error.message : "Push subscription failed.",
    });
  }
}
