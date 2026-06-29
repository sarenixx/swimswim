import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

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

const configureWebPush = () => {
  const publicKey =
    process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT || "mailto:swimcalifornia2026@gmail.com";

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are missing.");
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
};

const nextDueAfter = (dueAt, intervalMinutes, now) => {
  const intervalMs =
    Math.max(5, Math.min(180, Number(intervalMinutes) || 30)) * 60 * 1000;
  let nextDueMs = new Date(dueAt).getTime();

  if (!Number.isFinite(nextDueMs)) {
    nextDueMs = now.getTime();
  }

  while (nextDueMs <= now.getTime()) {
    nextDueMs += intervalMs;
  }

  return new Date(nextDueMs).toISOString();
};

const isMissingTableError = (error) =>
  error?.code === "PGRST205" ||
  error?.code === "42P01" ||
  /schema cache|could not find the table|does not exist/i.test(
    error?.message || "",
  );

const fetchDueSessions = async (supabase, nowIso) => {
  const tableResult = await supabase
    .from("observation_reminder_sessions")
    .select(
      "id, mission_id, endpoint, subscription, title, interval_minutes, next_due_at",
    )
    .eq("status", "active")
    .lte("next_due_at", nowIso)
    .limit(50);

  if (!tableResult.error) {
    return {
      storage: "observation_reminder_sessions",
      sessions: tableResult.data || [],
    };
  }

  if (!isMissingTableError(tableResult.error)) {
    throw new Error(tableResult.error.message);
  }

  const snapshotResult = await supabase
    .from("mission_snapshots")
    .select("id, payload")
    .like("id", "observation-reminder:%")
    .limit(200);

  if (snapshotResult.error) {
    throw new Error(snapshotResult.error.message);
  }

  const sessions = (snapshotResult.data || [])
    .map((row) => ({
      snapshot_id: row.id,
      ...(row.payload || {}),
    }))
    .filter(
      (session) =>
        session.status === "active" &&
        session.next_due_at &&
        session.next_due_at <= nowIso,
    )
    .slice(0, 50);

  return {
    storage: "mission_snapshots",
    sessions,
  };
};

const updateSession = async (supabase, storage, session, updates) => {
  if (storage === "mission_snapshots") {
    const payload = {
      ...session,
      ...updates,
      recordType: "observation-reminder-session",
    };
    delete payload.snapshot_id;

    return supabase
      .from("mission_snapshots")
      .update({
        payload,
        updated_at: updates.updated_at,
        updated_by: "observation-reminder-service",
      })
      .eq("id", session.snapshot_id || `observation-reminder:${session.id}`);
  }

  return supabase
    .from("observation_reminder_sessions")
    .update(updates)
    .eq("id", session.id);
};

export default async function handler(request, response) {
  if (!["GET", "POST"].includes(request.method || "")) {
    response.setHeader("Allow", "GET, POST");
    return json(response, 405, { error: "Method not allowed." });
  }

  if (process.env.CRON_SECRET) {
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (request.headers.authorization !== expected) {
      return json(response, 401, { error: "Unauthorized." });
    }
  }

  try {
    const { url, key } = getSupabaseConfig();
    configureWebPush();

    const supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const now = new Date();
    const nowIso = now.toISOString();
    const { storage, sessions } = await fetchDueSessions(supabase, nowIso);

    const results = [];

    for (const session of sessions || []) {
      const payload = JSON.stringify({
        title: "WOWSA observation due",
        body: `${session.title || "Swim"}: capture the swimmer photo and complete the 30-minute observation.`,
        url: "/",
        tag: `wowsa-${session.id}`,
        dueAt: session.next_due_at,
        missionId: session.mission_id,
        sessionId: session.id,
      });

      try {
        await webPush.sendNotification(session.subscription, payload, {
          TTL: 60 * 60,
          urgency: "high",
        });

        const nextDueAt = nextDueAfter(
          session.next_due_at,
          session.interval_minutes,
          now,
        );
        await updateSession(supabase, storage, session, {
          next_due_at: nextDueAt,
          last_sent_at: nowIso,
          last_attempt_at: nowIso,
          last_error: null,
          updated_at: nowIso,
        });

        results.push({ id: session.id, status: "sent", nextDueAt });
      } catch (sendError) {
        const statusCode = sendError?.statusCode;
        const expired = statusCode === 404 || statusCode === 410;
        await updateSession(supabase, storage, session, {
          status: expired ? "expired" : "active",
          last_attempt_at: nowIso,
          last_error:
            sendError instanceof Error
              ? sendError.message.slice(0, 500)
              : "Push send failed.",
          updated_at: nowIso,
        });

        results.push({
          id: session.id,
          status: expired ? "expired" : "failed",
        });
      }
    }

    return json(response, 200, {
      ok: true,
      checkedAt: nowIso,
      dueCount: sessions?.length || 0,
      storage,
      results,
    });
  } catch (error) {
    return json(response, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Observation reminder cron failed.",
    });
  }
}
