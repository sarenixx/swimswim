import {
  Camera,
  CheckCircle2,
  CloudSun,
  Database,
  FileDown,
  Image as ImageIcon,
  Mail,
  MapPin,
  Plus,
  Timer,
  Trash2,
  Utensils,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatGpsLabel,
  getDevicePosition,
  parseGpsLabel,
} from "../../lib/gps";
import {
  enableObservationPushReminders,
  updateObservationPushReminder,
} from "../../lib/pushReminders";
import { buildWowsaReport, mailtoHref } from "../../lib/reports";
import {
  deleteEvidenceImage,
  getEvidenceImage,
  makeEvidenceImageKey,
  saveEvidenceImage,
} from "../../lib/storage/evidenceStore";
import {
  backupMissionSnapshot,
  getEvidenceImageUrl,
  getSyncMissionId,
  isRemoteSyncAvailable,
  removeEvidenceImage as removeRemoteEvidenceImage,
  uploadEvidenceImage,
} from "../../lib/sync/supabaseClient";
import { getCurrentWeather, type CapturedWeather } from "../../lib/weather";
import {
  formatWaterTemperatureSource,
  getCurrentWaterTemperature,
  type CapturedWaterTemperature,
} from "../../lib/waterTemperature";
import { useNow } from "../../lib/useNow";
import {
  formatClock,
  getCrewLabel,
  getElapsedLabel,
  getWowsaNextDueAt,
} from "../../state/selectors";
import type { Mission, TimelineEventType } from "../../state/types";
import { useMissionStore } from "../../state/useMissionStore";

interface WakeLockSentinel {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
  removeEventListener: (type: "release", listener: () => void) => void;
}

interface WakeLockCapableNavigator {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
}

interface PhotoDraft {
  gps: string;
  lat?: number;
  lon?: number;
  gpsAccuracyM?: number;
  latText: string;
  lonText: string;
  weatherSummary: string;
  airTempF: string;
  waterTempF: string;
  windKts: string;
  windDirection: string;
  notes: string;
  feedCompleted: boolean;
  eventTag: string;
  imageName: string;
  imageFile?: File;
  imagePreviewUrl: string;
}

const observationEmail = "swimcalifornia2026@gmail.com";

const quickEvents: Array<{
  label: string;
  type: TimelineEventType;
  detail: string;
}> = [
  {
    label: "Feed completed",
    type: "feeding",
    detail: "Feed completed between scheduled observations.",
  },
  {
    label: "Saw dolphin",
    type: "note",
    detail: "Dolphin sighting logged near swimmer.",
  },
  {
    label: "Increased chop",
    type: "weather",
    detail: "Sea state changed; observer noted increased chop.",
  },
  {
    label: "Equipment adjustment",
    type: "note",
    detail: "Swimmer or crew equipment adjusted.",
  },
];

const emptyPhotoDraft = (missionWaterTemp?: number): PhotoDraft => ({
  gps: "",
  lat: undefined,
  lon: undefined,
  gpsAccuracyM: undefined,
  latText: "",
  lonText: "",
  weatherSummary: "",
  airTempF: "",
  waterTempF: missionWaterTemp !== undefined ? String(missionWaterTemp) : "",
  windKts: "",
  windDirection: "",
  notes: "",
  feedCompleted: false,
  eventTag: "",
  imageName: "",
  imageFile: undefined,
  imagePreviewUrl: "",
});

function formatTimer(secondsUntil: number) {
  const absoluteSeconds = Math.abs(secondsUntil);
  const minutes = Math.floor(absoluteSeconds / 60);
  const seconds = absoluteSeconds % 60;
  const label = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  return secondsUntil < 0 ? `Overdue ${label}` : label;
}

function numberOrUndefined(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function coordinateFromText(value: string, min: number, max: number) {
  const parsed = numberOrUndefined(value.trim());
  return parsed !== undefined && parsed >= min && parsed <= max
    ? parsed
    : undefined;
}

function fallbackWeather(mission: Mission): CapturedWeather {
  return {
    summary: mission.conditions.summary,
    airTempF: mission.conditions.airTempF,
    windKts: mission.conditions.windKts,
  };
}

function addMinutesIso(isoTime: string, minutes: number) {
  return new Date(
    new Date(isoTime).getTime() + minutes * 60 * 1000,
  ).toISOString();
}

function getTimelineDateKey(isoTime: string) {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) {
    return "undated";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimelineDate(isoTime: string) {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) {
    return "Undated";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function recordCountLabel(count: number) {
  return `${count} ${count === 1 ? "record" : "records"}`;
}

function getManualEntrySummary(note: string) {
  const trimmed = note.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "Manual timeline entry";
  }

  return trimmed.length > 64 ? `${trimmed.slice(0, 61)}...` : trimmed;
}

function getWakeLockNavigator() {
  return navigator as unknown as WakeLockCapableNavigator;
}

export function PartnersMedia() {
  const now = useNow(1000);
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const startObservationSession = useMissionStore(
    (state) => state.startObservationSession,
  );
  const completeObservationSession = useMissionStore(
    (state) => state.completeObservationSession,
  );
  const addWowsaPhoto = useMissionStore((state) => state.addWowsaPhoto);
  const removeWowsaPhoto = useMissionStore((state) => state.removeWowsaPhoto);
  const logEvent = useMissionStore((state) => state.logEvent);
  const removeTimelineEvent = useMissionStore(
    (state) => state.removeTimelineEvent,
  );
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft>(() =>
    emptyPhotoDraft(mission.conditions.waterTempF),
  );
  const [gpsStatus, setGpsStatus] = useState("");
  const [weatherStatus, setWeatherStatus] = useState("");
  const [waterStatus, setWaterStatus] = useState("");
  const [storageStatus, setStorageStatus] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const [manualEventText, setManualEventText] = useState("");
  const [manualEventStatus, setManualEventStatus] = useState("");
  const [isSavingManualEvent, setIsSavingManualEvent] = useState(false);
  const [wakeLockStatus, setWakeLockStatus] = useState("Session timer ready.");
  const [pushReminderStatus, setPushReminderStatus] = useState(
    "Sleep reminders ready.",
  );
  const [isSavingEvidence, setIsSavingEvidence] = useState(false);
  const [storedImageUrls, setStoredImageUrls] = useState<
    Record<string, string>
  >({});

  const wowsaPhotos = mission.wowsaPhotos ?? [];
  const sortedPhotos = useMemo(
    () =>
      [...wowsaPhotos].sort(
        (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
      ),
    [wowsaPhotos],
  );
  const manualEvents = useMemo(
    () =>
      [...mission.timeline]
        .filter((event) => !event.summary.startsWith("Observation #"))
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
    [mission.timeline],
  );
  const timelineItems = useMemo(
    () =>
      [
        ...sortedPhotos.map((photo) => ({
          kind: "observation" as const,
          at: photo.at,
          photo,
        })),
        ...manualEvents.map((event) => ({
          kind: "event" as const,
          at: event.at,
          event,
        })),
      ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
    [manualEvents, sortedPhotos],
  );
  const timelineGroups = useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      items: typeof timelineItems;
    }> = [];

    timelineItems.forEach((item) => {
      const key = getTimelineDateKey(item.at);
      let group = groups.find((candidate) => candidate.key === key);
      if (!group) {
        group = {
          key,
          label: formatTimelineDate(item.at),
          items: [],
        };
        groups.push(group);
      }

      group.items.push(item);
    });

    return groups;
  }, [timelineItems]);
  const nextDueAt = getWowsaNextDueAt(mission);
  const secondsUntilNext = Math.floor(
    (new Date(nextDueAt).getTime() - now.getTime()) / 1000,
  );
  const readyCount = wowsaPhotos.filter(
    (photo) => photo.evidenceStatus === "ready",
  ).length;
  const activeSession = mission.status === "active";

  useEffect(() => {
    if (!activeSession) {
      setWakeLockStatus("Session timer ready.");
      return undefined;
    }

    let cancelled = false;
    let sentinel: WakeLockSentinel | undefined;
    const wakeNavigator = getWakeLockNavigator();

    const releaseListener = () => {
      if (!cancelled) {
        setWakeLockStatus(
          "Screen wake lock released. Timer will recover when the page is visible.",
        );
      }
    };

    async function requestWakeLock() {
      if (!wakeNavigator.wakeLock) {
        setWakeLockStatus(
          "Long session active. On-screen timer resumes when visible.",
        );
        return;
      }

      try {
        sentinel = await wakeNavigator.wakeLock.request("screen");
        sentinel.addEventListener("release", releaseListener);
        if (!cancelled) {
          setWakeLockStatus("Long session active. Screen wake lock is on.");
        }
      } catch {
        if (!cancelled) {
          setWakeLockStatus(
            "Long session active. On-screen timer resumes when visible.",
          );
        }
      }
    }

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        (!sentinel || sentinel.released)
      ) {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (sentinel) {
        sentinel.removeEventListener("release", releaseListener);
        sentinel.release().catch(() => undefined);
      }
    };
  }, [activeSession]);

  useEffect(() => {
    let cancelled = false;
    const urlsToRevoke: string[] = [];

    async function loadStoredImages() {
      const nextUrls: Record<string, string> = {};

      await Promise.all(
        wowsaPhotos.map(async (photo) => {
          if (!photo.imageStorageKey || photo.imageDataUrl) {
            return;
          }

          const remoteUrl = await getEvidenceImageUrl(photo.imageStorageKey);
          if (remoteUrl) {
            nextUrls[photo.id] = remoteUrl;
            return;
          }

          const stored = await getEvidenceImage(photo.imageStorageKey);
          if (stored?.blob) {
            const url = URL.createObjectURL(stored.blob);
            urlsToRevoke.push(url);
            nextUrls[photo.id] = url;
          }
        }),
      );

      if (!cancelled) {
        setStoredImageUrls(nextUrls);
      }
    }

    loadStoredImages().catch(() => setStoredImageUrls({}));

    return () => {
      cancelled = true;
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [wowsaPhotos]);

  useEffect(() => {
    return () => {
      if (photoDraft.imagePreviewUrl) {
        URL.revokeObjectURL(photoDraft.imagePreviewUrl);
      }
    };
  }, [photoDraft.imagePreviewUrl]);

  const resetDraft = () => {
    if (photoDraft.imagePreviewUrl) {
      URL.revokeObjectURL(photoDraft.imagePreviewUrl);
    }
    setPhotoDraft(emptyPhotoDraft(mission.conditions.waterTempF));
  };

  const capturePosition = async () => {
    setGpsStatus("Capturing GPS...");
    try {
      const position = await getDevicePosition();
      setGpsStatus(
        `GPS captured${position.accuracyM ? ` +/- ${Math.round(position.accuracyM)}m` : ""}`,
      );
      return position;
    } catch (error) {
      setGpsStatus(
        error instanceof Error
          ? error.message
          : "GPS unavailable; using last known support position.",
      );
      return {
        lat: mission.position.lat,
        lon: mission.position.lon,
        label: mission.position.label,
        accuracyM: undefined,
      };
    }
  };

  const captureWeather = async (lat: number, lon: number) => {
    setWeatherStatus("Checking weather...");
    try {
      const weather = await getCurrentWeather(lat, lon);
      setWeatherStatus("Weather captured");
      return weather;
    } catch (error) {
      setWeatherStatus(
        error instanceof Error
          ? error.message
          : "Weather unavailable; using last recorded conditions.",
      );
      return fallbackWeather(mission);
    }
  };

  const captureWaterTemperature = async (lat: number, lon: number) => {
    setWaterStatus("Checking NDBC water temp...");
    try {
      const water = await getCurrentWaterTemperature(lat, lon);
      setWaterStatus(
        formatWaterTemperatureSource(water, mission.conditions.waterTempF),
      );
      return water;
    } catch (error) {
      setWaterStatus(
        error instanceof Error
          ? `${error.message}; using onboard water temp ${Math.round(mission.conditions.waterTempF)}F.`
          : `Using onboard water temp ${Math.round(mission.conditions.waterTempF)}F.`,
      );
      return {
        source: "mission-fallback",
        waterTempF: mission.conditions.waterTempF,
      } satisfies CapturedWaterTemperature;
    }
  };

  const updateDraftFromContext = async () => {
    const position = await capturePosition();
    const [weather, water] = await Promise.all([
      captureWeather(position.lat, position.lon),
      captureWaterTemperature(position.lat, position.lon),
    ]);
    setPhotoDraft((draft) => ({
      ...draft,
      gps: position.label,
      lat: position.lat,
      lon: position.lon,
      gpsAccuracyM: position.accuracyM,
      latText: String(position.lat),
      lonText: String(position.lon),
      weatherSummary: weather.summary,
      airTempF:
        weather.airTempF !== undefined
          ? String(Math.round(weather.airTempF))
          : draft.airTempF,
      windKts:
        weather.windKts !== undefined
          ? String(Math.round(weather.windKts))
          : draft.windKts,
      windDirection: weather.windDirection ?? draft.windDirection,
      waterTempF:
        water.waterTempF !== undefined
          ? String(Math.round(water.waterTempF))
          : draft.waterTempF,
    }));
    return { position, weather, water };
  };

  const startSession = async () => {
    setStorageStatus("Starting observation session...");
    setPushReminderStatus("Preparing sleep reminders...");
    const at = new Date().toISOString();
    const intervalMinutes = 30;
    const reminderSession = {
      missionId: getSyncMissionId(mission),
      title: mission.name,
      intervalMinutes,
      startedAt: at,
      nextDueAt: addMinutesIso(at, intervalMinutes),
      status: "active" as const,
    };
    const reminderPromise = enableObservationPushReminders(reminderSession)
      .then((result) => setPushReminderStatus(result.message))
      .catch((error) =>
        setPushReminderStatus(
          error instanceof Error
            ? error.message
            : "Sleep reminders unavailable.",
        ),
      );
    const position = await capturePosition();
    const [weather, water] = await Promise.all([
      captureWeather(position.lat, position.lon),
      captureWaterTemperature(position.lat, position.lon),
    ]);
    startObservationSession({
      at,
      gps: position.label,
      lat: position.lat,
      lon: position.lon,
      gpsAccuracyM: position.accuracyM,
      weatherSummary: weather.summary,
      airTempF: weather.airTempF,
      waterTempF: water.waterTempF ?? mission.conditions.waterTempF,
      windKts: weather.windKts,
      windDirection: weather.windDirection,
      actorId: activeActorId,
    });
    setStorageStatus(
      "Session started. First observation is ready for swimmer photo.",
    );
    await reminderPromise;
  };

  const handlePhotoFile = (file?: File) => {
    if (!file) {
      return;
    }

    if (photoDraft.imagePreviewUrl) {
      URL.revokeObjectURL(photoDraft.imagePreviewUrl);
    }

    setPhotoDraft((draft) => ({
      ...draft,
      imageFile: file,
      imageName: file.name,
      imagePreviewUrl: URL.createObjectURL(file),
    }));
    setStorageStatus("Photo ready.");
    updateDraftFromContext().catch(() => undefined);
  };

  const saveObservation = async () => {
    setIsSavingEvidence(true);
    setStorageStatus("Saving observation...");

    try {
      const at = new Date().toISOString();
      let lat = photoDraft.lat;
      let lon = photoDraft.lon;
      let gps = photoDraft.gps;
      let gpsAccuracyM = photoDraft.gpsAccuracyM;
      let waterTempF =
        numberOrUndefined(photoDraft.waterTempF) ??
        mission.conditions.waterTempF;
      let weather: CapturedWeather = {
        summary: photoDraft.weatherSummary || mission.conditions.summary,
        airTempF:
          numberOrUndefined(photoDraft.airTempF) ?? mission.conditions.airTempF,
        windKts:
          numberOrUndefined(photoDraft.windKts) ?? mission.conditions.windKts,
        windDirection: photoDraft.windDirection || undefined,
      };

      if (
        !photoDraft.imageFile ||
        lat === undefined ||
        lon === undefined ||
        !gps
      ) {
        const context = await updateDraftFromContext();
        lat = context.position.lat;
        lon = context.position.lon;
        gps = context.position.label;
        gpsAccuracyM = context.position.accuracyM;
        weather = context.weather;
        waterTempF = context.water.waterTempF ?? waterTempF;
      }

      let imageStorageKey: string | undefined;
      if (photoDraft.imageFile) {
        imageStorageKey = makeEvidenceImageKey(
          getSyncMissionId(mission),
          at,
          photoDraft.imageFile.name,
        );
        if (isRemoteSyncAvailable()) {
          await uploadEvidenceImage(imageStorageKey, photoDraft.imageFile);
        } else {
          await saveEvidenceImage(imageStorageKey, photoDraft.imageFile);
        }
      }

      addWowsaPhoto({
        at,
        gps,
        lat,
        lon,
        gpsAccuracyM,
        distanceSwum: "",
        notes: photoDraft.notes.trim(),
        weatherSummary: weather.summary,
        airTempF: weather.airTempF,
        waterTempF,
        windKts: weather.windKts,
        windDirection: weather.windDirection,
        feedCompleted: photoDraft.feedCompleted,
        eventTag: photoDraft.eventTag.trim(),
        hasPhoto: Boolean(photoDraft.imageFile),
        imageName: photoDraft.imageFile?.name,
        imageStorageKey,
        imageSizeBytes: photoDraft.imageFile?.size,
        actorId: activeActorId,
      });
      updateObservationPushReminder({
        missionId: getSyncMissionId(mission),
        title: mission.name,
        intervalMinutes: mission.wowsaPhotoIntervalMinutes || 30,
        startedAt: mission.startedAt,
        nextDueAt: addMinutesIso(at, mission.wowsaPhotoIntervalMinutes || 30),
        status: "active",
      })
        .then((result) => setPushReminderStatus(result.message))
        .catch((error) =>
          setPushReminderStatus(
            error instanceof Error
              ? error.message
              : "Sleep reminders not updated.",
          ),
        );
      setStorageStatus(
        photoDraft.imageFile
          ? isRemoteSyncAvailable()
            ? "Observation saved to Supabase storage."
            : "Observation saved on this device."
          : "Observation saved. Photo evidence still needed.",
      );
      resetDraft();
    } catch (error) {
      setStorageStatus(
        error instanceof Error
          ? error.message
          : "Observation could not be saved.",
      );
    } finally {
      setIsSavingEvidence(false);
    }
  };

  const addQuickEvent = async (
    label: string,
    type: TimelineEventType,
    detail: string,
  ) => {
    const position = await capturePosition();
    const [weather, water] = await Promise.all([
      captureWeather(position.lat, position.lon),
      captureWaterTemperature(position.lat, position.lon),
    ]);
    logEvent({
      type,
      actorId: activeActorId,
      summary: label,
      detail,
      gps: position.label,
      lat: position.lat,
      lon: position.lon,
      gpsAccuracyM: position.accuracyM,
      weatherSummary: weather.summary,
      airTempF: weather.airTempF,
      waterTempF: water.waterTempF ?? mission.conditions.waterTempF,
      windKts: weather.windKts,
      windDirection: weather.windDirection,
      severity: type === "weather" ? "warning" : "info",
    });
  };

  const saveManualEvent = async () => {
    const note = manualEventText.trim();
    if (!note) {
      setManualEventStatus("Write a note first.");
      return;
    }

    setIsSavingManualEvent(true);
    setManualEventStatus("Saving manual entry...");

    try {
      const position = await capturePosition();
      const [weather, water] = await Promise.all([
        captureWeather(position.lat, position.lon),
        captureWaterTemperature(position.lat, position.lon),
      ]);
      logEvent({
        type: "note",
        actorId: activeActorId,
        summary: getManualEntrySummary(note),
        detail: note,
        gps: position.label,
        lat: position.lat,
        lon: position.lon,
        gpsAccuracyM: position.accuracyM,
        weatherSummary: weather.summary,
        airTempF: weather.airTempF,
        waterTempF: water.waterTempF ?? mission.conditions.waterTempF,
        windKts: weather.windKts,
        windDirection: weather.windDirection,
        severity: "info",
      });
      setManualEventText("");
      setManualEventStatus("Manual entry saved.");
    } catch (error) {
      setManualEventStatus(
        error instanceof Error
          ? error.message
          : "Manual entry could not be saved.",
      );
    } finally {
      setIsSavingManualEvent(false);
    }
  };

  const handleRemovePhoto = async (
    photoId: string,
    imageStorageKey?: string,
  ) => {
    if (imageStorageKey) {
      if (isRemoteSyncAvailable()) {
        await removeRemoteEvidenceImage(imageStorageKey);
      } else {
        await deleteEvidenceImage(imageStorageKey);
      }
    }

    removeWowsaPhoto(photoId);
  };

  const observationRecord = {
    generatedAt: new Date().toISOString(),
    recordType: "wowsa-observation-record",
    mission: {
      id: mission.id,
      name: mission.name,
      status: mission.status,
      swimmer: mission.session.swimmerName,
      location: mission.session.location,
      startedAt: mission.startedAt,
      observerIntervalMinutes: mission.wowsaPhotoIntervalMinutes,
      primaryVessel: mission.session.primaryVessel,
      supportVessels: mission.session.supportVessels,
      operationsEmail: mission.session.operationsEmail || observationEmail,
    },
    crew: mission.crew,
    observations: sortedPhotos,
    timeline: timelineItems,
    gpsHistory: mission.expeditionCheckpoints ?? [],
    weatherHistory: sortedPhotos.map((photo) => ({
      at: photo.at,
      gps: photo.gps,
      weatherSummary: photo.weatherSummary,
      airTempF: photo.airTempF,
      waterTempF: photo.waterTempF,
      windKts: photo.windKts,
      windDirection: photo.windDirection,
    })),
    manualEvents,
  };
  const observationJson = JSON.stringify(observationRecord, null, 2);
  const observationJsonHref = `data:application/json;charset=utf-8,${encodeURIComponent(observationJson)}`;

  const backupAndClose = async () => {
    completeObservationSession(activeActorId);
    setBackupStatus("Closing record...");
    updateObservationPushReminder({
      missionId: getSyncMissionId(mission),
      title: mission.name,
      intervalMinutes: mission.wowsaPhotoIntervalMinutes || 30,
      startedAt: mission.startedAt,
      status: "completed",
    })
      .then((result) => setPushReminderStatus(result.message))
      .catch((error) =>
        setPushReminderStatus(
          error instanceof Error
            ? error.message
            : "Sleep reminders not stopped.",
        ),
      );

    try {
      if (isRemoteSyncAvailable()) {
        await backupMissionSnapshot({ ...mission, status: "completed" });
        setBackupStatus("Supabase backup saved.");
      } else {
        setBackupStatus("Supabase is not configured; email backup prepared.");
      }
    } catch (error) {
      setBackupStatus(
        error instanceof Error
          ? error.message
          : "Supabase backup failed; email backup prepared.",
      );
    }

    if (import.meta.env.MODE !== "test") {
      window.location.href = mailtoHref(
        mission.session.operationsEmail || observationEmail,
        `${mission.name} - WOWSA Observation Record - ${new Date().toLocaleDateString("en-US")}`,
        buildWowsaReport(mission),
      );
    }
  };

  return (
    <div className="observation-console">
      <section
        className={`observation-hero ${activeSession ? "active" : "ready"}`}
      >
        <div>
          <p className="page-kicker">WOWSA Observation Log</p>
          <h3 className="observation-hero-title">
            {activeSession
              ? `${formatTimer(secondsUntilNext)} to next photo`
              : "Start official observation session"}
          </h3>
          <p className="observation-hero-meta">
            {activeSession
              ? `Started ${formatClock(mission.startedAt)} - elapsed ${getElapsedLabel(mission, now)} - next due ${formatClock(nextDueAt)}`
              : "One tap records time, GPS, weather, and opens the first 30-minute observation."}
          </p>
          {activeSession ? (
            <p className="observation-hero-meta long-session-status">
              {wakeLockStatus}
            </p>
          ) : null}
          {activeSession ? (
            <p className="observation-hero-meta long-session-status">
              Sleep reminders: {pushReminderStatus}
            </p>
          ) : null}
        </div>
        <div className="observation-hero-actions">
          {!activeSession ? (
            <button
              className="button primary observation-start-button"
              type="button"
              onClick={startSession}
            >
              <Timer aria-hidden="true" />
              Start Session
            </button>
          ) : (
            <label className="button primary observation-start-button">
              <Camera aria-hidden="true" />
              Capture Swimmer Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="visually-hidden-input"
                aria-label="Capture swimmer photo"
                onChange={(event) => handlePhotoFile(event.target.files?.[0])}
              />
            </label>
          )}
        </div>
      </section>

      <div className="page-grid">
        <section className="panel span-4">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Live Conditions</h3>
              <p className="panel-subtitle">Last automatic capture</p>
            </div>
            <CloudSun aria-hidden="true" />
          </div>
          <div className="metric-grid observation-metrics">
            <div className="metric">
              <span className="metric-label">GPS</span>
              <span className="metric-value">{mission.position.label}</span>
              <span className="metric-note">
                {formatClock(mission.position.updatedAt)}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Weather</span>
              <span className="metric-value">{mission.conditions.summary}</span>
              <span className="metric-note">
                {Math.round(mission.conditions.airTempF)}F air
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Water</span>
              <span className="metric-value">
                {Math.round(mission.conditions.waterTempF)}F
              </span>
              <span className="metric-note">editable per photo</span>
            </div>
            <div className="metric">
              <span className="metric-label">Wind</span>
              <span className="metric-value">
                {Math.round(mission.conditions.windKts)} kt
              </span>
              <span className="metric-note">
                {mission.conditions.swellFt} ft swell
              </span>
            </div>
          </div>
        </section>

        <section className="panel span-8">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Observation Capture</h3>
              <p className="panel-subtitle">
                {readyCount}/{wowsaPhotos.length} entries have photo and GPS
                evidence
              </p>
            </div>
            <Camera aria-hidden="true" />
          </div>

          <div className="observation-capture-grid">
            <div className="observation-photo-drop">
              {photoDraft.imagePreviewUrl ? (
                <img
                  src={photoDraft.imagePreviewUrl}
                  alt="Selected swimmer observation"
                />
              ) : (
                <label className="photo-prompt">
                  <ImageIcon aria-hidden="true" />
                  Capture Swimmer Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="visually-hidden-input"
                    aria-label="Add image"
                    onChange={(event) =>
                      handlePhotoFile(event.target.files?.[0])
                    }
                  />
                </label>
              )}
            </div>

            <div className="observation-form">
              <div className="two-column-form">
                <label className="field-label">
                  GPS
                  <input
                    className="input"
                    value={photoDraft.gps}
                    onChange={(event) => {
                      const parsed = parseGpsLabel(event.target.value);
                      setPhotoDraft((draft) => ({
                        ...draft,
                        gps: event.target.value,
                        lat: parsed?.lat,
                        lon: parsed?.lon,
                        latText: parsed ? String(parsed.lat) : draft.latText,
                        lonText: parsed ? String(parsed.lon) : draft.lonText,
                      }));
                    }}
                    placeholder={mission.position.label}
                  />
                </label>
                <label className="field-label">
                  Weather
                  <input
                    className="input"
                    value={photoDraft.weatherSummary}
                    onChange={(event) =>
                      setPhotoDraft((draft) => ({
                        ...draft,
                        weatherSummary: event.target.value,
                      }))
                    }
                    placeholder={mission.conditions.summary}
                  />
                </label>
                <label className="field-label">
                  Water temp
                  <input
                    className="input"
                    inputMode="decimal"
                    value={photoDraft.waterTempF}
                    onChange={(event) =>
                      setPhotoDraft((draft) => ({
                        ...draft,
                        waterTempF: event.target.value,
                      }))
                    }
                    placeholder={`${mission.conditions.waterTempF}`}
                  />
                </label>
                <label className="field-label">
                  Wind
                  <input
                    className="input"
                    inputMode="decimal"
                    value={photoDraft.windKts}
                    onChange={(event) =>
                      setPhotoDraft((draft) => ({
                        ...draft,
                        windKts: event.target.value,
                      }))
                    }
                    placeholder={`${mission.conditions.windKts} kt`}
                  />
                </label>
              </div>

              <details className="manual-gps-details">
                <summary>Manual GPS backup</summary>
                <div className="two-column-form">
                  <label className="field-label">
                    Latitude
                    <input
                      className="input"
                      inputMode="decimal"
                      value={photoDraft.latText}
                      onChange={(event) => {
                        const lat = coordinateFromText(
                          event.target.value,
                          -90,
                          90,
                        );
                        setPhotoDraft((draft) => ({
                          ...draft,
                          latText: event.target.value,
                          lat,
                          gps:
                            lat !== undefined && draft.lon !== undefined
                              ? formatGpsLabel(lat, draft.lon)
                              : draft.gps,
                        }));
                      }}
                    />
                  </label>
                  <label className="field-label">
                    Longitude
                    <input
                      className="input"
                      inputMode="decimal"
                      value={photoDraft.lonText}
                      onChange={(event) => {
                        const lon = coordinateFromText(
                          event.target.value,
                          -180,
                          180,
                        );
                        setPhotoDraft((draft) => ({
                          ...draft,
                          lonText: event.target.value,
                          lon,
                          gps:
                            draft.lat !== undefined && lon !== undefined
                              ? formatGpsLabel(draft.lat, lon)
                              : draft.gps,
                        }));
                      }}
                    />
                  </label>
                </div>
              </details>

              <label className="checkbox-row observation-checkbox">
                <input
                  type="checkbox"
                  checked={photoDraft.feedCompleted}
                  onChange={(event) =>
                    setPhotoDraft((draft) => ({
                      ...draft,
                      feedCompleted: event.target.checked,
                    }))
                  }
                />
                Feed completed
              </label>

              <label className="field-label">
                Notes
                <textarea
                  className="textarea"
                  value={photoDraft.notes}
                  onChange={(event) =>
                    setPhotoDraft((draft) => ({
                      ...draft,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Dolphin sighting, chop, equipment adjustment, swimmer response"
                />
              </label>

              <div className="row-actions">
                <button
                  className="button"
                  type="button"
                  onClick={updateDraftFromContext}
                >
                  <MapPin aria-hidden="true" />
                  Refresh GPS + Weather
                </button>
                <button
                  className="button primary"
                  type="button"
                  onClick={saveObservation}
                  disabled={isSavingEvidence}
                >
                  <Plus aria-hidden="true" />
                  {isSavingEvidence ? "Saving" : "Save Observation"}
                </button>
              </div>
              {[gpsStatus, weatherStatus, waterStatus, storageStatus]
                .filter(Boolean)
                .map((status) => (
                  <p className="row-meta observation-status" key={status}>
                    {status}
                  </p>
                ))}
            </div>
          </div>
        </section>

        <section className="panel span-12">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Manual Timeline Entry</h3>
              <p className="panel-subtitle">
                Timestamp, GPS, and weather are attached automatically
              </p>
            </div>
            <Waves aria-hidden="true" />
          </div>
          <div className="manual-event-box">
            <label className="field-label">
              Manual note
              <textarea
                className="textarea"
                value={manualEventText}
                onChange={(event) => setManualEventText(event.target.value)}
                placeholder="Type anything notable: swimmer status, crew action, course change, wildlife, equipment, feed, conditions"
              />
            </label>
            <div className="row-actions">
              <button
                className="button primary"
                type="button"
                onClick={saveManualEvent}
                disabled={isSavingManualEvent}
              >
                <Plus aria-hidden="true" />
                {isSavingManualEvent ? "Saving" : "Save Manual Entry"}
              </button>
            </div>
            {manualEventStatus ? (
              <p className="row-meta observation-status">{manualEventStatus}</p>
            ) : null}
          </div>
          <div className="quick-event-grid">
            {quickEvents.map((event) => (
              <button
                className="quick-event-button"
                type="button"
                key={event.label}
                onClick={() =>
                  addQuickEvent(event.label, event.type, event.detail)
                }
              >
                {event.type === "feeding" ? (
                  <Utensils aria-hidden="true" />
                ) : event.type === "weather" ? (
                  <CloudSun aria-hidden="true" />
                ) : (
                  <Plus aria-hidden="true" />
                )}
                {event.label}
              </button>
            ))}
          </div>
        </section>

        <section className="panel span-12">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Session Export</h3>
              <p className="panel-subtitle">
                Complete observation record with photos, GPS history, weather
                history, and notes
              </p>
            </div>
            <Database aria-hidden="true" />
          </div>
          <div className="row-actions">
            <a
              className="button primary"
              href={observationJsonHref}
              download="wowsa-observation-record.json"
            >
              <FileDown aria-hidden="true" />
              Official JSON
            </a>
            <a
              className="button"
              href={mailtoHref(
                mission.session.operationsEmail || observationEmail,
                `${mission.name} - WOWSA Observation Record - ${new Date().toLocaleDateString("en-US")}`,
                buildWowsaReport(mission),
              )}
            >
              <Mail aria-hidden="true" />
              Gmail Backup
            </a>
            <button className="button" type="button" onClick={backupAndClose}>
              <CheckCircle2 aria-hidden="true" />
              End & Backup
            </button>
          </div>
          {backupStatus ? (
            <p className="row-meta observation-status">{backupStatus}</p>
          ) : null}
        </section>

        <section className="panel span-12">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Complete Swim Timeline</h3>
              <p className="panel-subtitle">
                {recordCountLabel(timelineItems.length)} grouped by date
              </p>
            </div>
            <Timer aria-hidden="true" />
          </div>
          {timelineItems.length ? (
            <div className="timeline-date-groups">
              {timelineGroups.map((group) => (
                <section className="timeline-date-group" key={group.key}>
                  <div className="timeline-date-header">
                    <h4>{group.label}</h4>
                    <span>{recordCountLabel(group.items.length)}</span>
                  </div>
                  <ol className="observation-timeline">
                    {group.items.map((item) => {
                      if (item.kind === "observation") {
                        const imageUrl =
                          item.photo.imageDataUrl ||
                          storedImageUrls[item.photo.id];
                        return (
                          <li
                            className="observation-timeline-row photo"
                            key={`photo-${item.photo.id}`}
                          >
                            <span className="timeline-time">
                              {formatClock(item.photo.at)}
                            </span>
                            <div className="observation-card-main">
                              <div className="timeline-row-titleline">
                                <div>
                                  <div className="timeline-summary">
                                    Observation #{item.photo.number}
                                  </div>
                                  <div className="timeline-detail">
                                    {item.photo.gps || "GPS pending"}
                                  </div>
                                </div>
                                <span
                                  className={
                                    item.photo.evidenceStatus === "ready"
                                      ? "status-pill done"
                                      : "status-pill overdue"
                                  }
                                >
                                  {item.photo.evidenceStatus === "ready"
                                    ? "photo saved"
                                    : "photo needed"}
                                </span>
                              </div>
                              <div className="timeline-chip-row">
                                <span>
                                  Water{" "}
                                  {item.photo.waterTempF ??
                                    mission.conditions.waterTempF}
                                  F
                                </span>
                                <span>
                                  Wind{" "}
                                  {item.photo.windKts ??
                                    mission.conditions.windKts}{" "}
                                  kt
                                </span>
                                {item.photo.weatherSummary ? (
                                  <span>{item.photo.weatherSummary}</span>
                                ) : null}
                                {item.photo.feedCompleted ? (
                                  <span>Feed done</span>
                                ) : null}
                              </div>
                              {item.photo.notes ? (
                                <p className="observation-note">
                                  {item.photo.notes}
                                </p>
                              ) : null}
                            </div>
                            {imageUrl ? (
                              <img
                                className="observation-thumb compact"
                                src={imageUrl}
                                alt={`Observation ${item.photo.number}`}
                              />
                            ) : null}
                            <button
                              className="button-icon danger"
                              type="button"
                              aria-label={`Delete observation ${item.photo.number}`}
                              onClick={() =>
                                handleRemovePhoto(
                                  item.photo.id,
                                  item.photo.imageStorageKey,
                                )
                              }
                            >
                              <Trash2 aria-hidden="true" />
                            </button>
                          </li>
                        );
                      }

                      return (
                        <li
                          className="observation-timeline-row event"
                          key={`event-${item.event.id}`}
                        >
                          <span className="timeline-time">
                            {formatClock(item.event.at)}
                          </span>
                          <div className="observation-card-main">
                            <div className="timeline-row-titleline">
                              <div>
                                <div className="timeline-summary">
                                  {item.event.summary}
                                </div>
                                <div className="timeline-detail">
                                  {item.event.detail || "Timeline note"}
                                </div>
                              </div>
                              <span
                                className={`severity-pill ${item.event.severity ?? "info"}`}
                              >
                                {item.event.type}
                              </span>
                            </div>
                            <div className="timeline-chip-row">
                              <span>
                                {item.event.gps || mission.position.label}
                              </span>
                              <span>
                                {getCrewLabel(mission, item.event.actorId)}
                              </span>
                            </div>
                          </div>
                          <button
                            className="button-icon danger"
                            type="button"
                            aria-label={`Delete timeline entry ${item.event.summary}`}
                            onClick={() => removeTimelineEvent(item.event.id)}
                          >
                            <Trash2 aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state">No observations logged yet.</div>
          )}
        </section>
      </div>
    </div>
  );
}
