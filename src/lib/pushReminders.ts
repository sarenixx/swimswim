export type ObservationReminderLifecycleStatus =
  | "active"
  | "completed"
  | "paused"
  | "expired";

export interface ObservationReminderSessionInput {
  missionId: string;
  title: string;
  intervalMinutes: number;
  startedAt: string;
  nextDueAt?: string;
  status: ObservationReminderLifecycleStatus;
}

export interface ObservationReminderResult {
  enabled: boolean;
  message: string;
}

const vapidPublicKey = (
  import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
)?.trim();
const isTestMode = import.meta.env.MODE === "test";

function supportsPushReminders() {
  return (
    !isTestMode &&
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined" &&
    Boolean(vapidPublicKey)
  );
}

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}

async function postReminderSession(
  input: ObservationReminderSessionInput,
  subscription: PushSubscription,
) {
  const response = await fetch("/api/push-subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...input,
      subscription: subscription.toJSON(),
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      | { error?: string }
      | undefined;
    throw new Error(body?.error || "Sleep reminders could not be saved.");
  }
}

async function getExistingSubscription() {
  if (!supportsPushReminders() || Notification.permission !== "granted") {
    return undefined;
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enableObservationPushReminders(
  input: ObservationReminderSessionInput,
): Promise<ObservationReminderResult> {
  if (!supportsPushReminders()) {
    return {
      enabled: false,
      message: "Sleep reminders unavailable here.",
    };
  }

  if (
    window.location.protocol !== "https:" &&
    window.location.hostname !== "localhost"
  ) {
    return {
      enabled: false,
      message: "Sleep reminders need HTTPS.",
    };
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      enabled: false,
      message: "Sleep reminders blocked.",
    };
  }

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidPublicKey!),
    }));

  await postReminderSession(input, subscription);

  return {
    enabled: true,
    message: "Sleep reminders on.",
  };
}

export async function updateObservationPushReminder(
  input: ObservationReminderSessionInput,
): Promise<ObservationReminderResult> {
  const subscription = await getExistingSubscription();
  if (!subscription) {
    return {
      enabled: false,
      message: "Sleep reminders not enabled.",
    };
  }

  await postReminderSession(input, subscription);

  return {
    enabled: true,
    message:
      input.status === "completed"
        ? "Sleep reminders stopped."
        : "Sleep reminders updated.",
  };
}
