import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routes } from "../app/router";
import { getEvidenceImage } from "../lib/storage/evidenceStore";
import {
  useMissionStore,
  useTemplateMissionStore,
} from "../state/useMissionStore";

function renderRoute(path = "/") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

function mockGeolocationSuccess() {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((success) =>
        success({
          coords: {
            latitude: 33.71,
            longitude: -118.28,
            accuracy: 7,
          },
        }),
      ),
    },
  });
}

function mockWeatherSuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            current: {
              temperature_2m: 64,
              weather_code: 2,
              wind_speed_10m: 9,
              wind_direction_10m: 270,
            },
          }),
      }),
    ),
  );
}

function mockWakeLock() {
  const sentinel = {
    released: false,
    release: vi.fn(() => Promise.resolve()),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const request = vi.fn(() => Promise.resolve(sentinel));

  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request },
  });

  return request;
}

describe("observer-first swim flows", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocationSuccess();
    mockWeatherSuccess();
    mockWakeLock();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:wowsa-test"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    useMissionStore.getState().resetMission();
    useTemplateMissionStore.getState().resetMission();
    useMissionStore.getState().setOnlineStatus(true);
  });

  it("opens the WOWSA observation log as the primary screen", async () => {
    renderRoute("/");

    expect(
      await screen.findByRole("heading", { name: "WOWSA Observation Log" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Start Session/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Medical").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /Reset live mission/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /offline simulation/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Planned Distance/i)).not.toBeInTheDocument();
  });

  it("starts a session with automatic GPS and weather and creates the first observation entry", async () => {
    const user = userEvent.setup();
    const wakeLockRequest = mockWakeLock();
    renderRoute("/");

    await user.click(
      await screen.findByRole("button", { name: /Start Session/i }),
    );

    await waitFor(() =>
      expect(useMissionStore.getState().mission.status).toBe("active"),
    );
    const mission = useMissionStore.getState().mission;
    expect(mission.wowsaPhotos).toHaveLength(1);
    expect(mission.wowsaPhotos[0]).toMatchObject({
      number: 1,
      gps: "33.71000° N, 118.28000° W",
      weatherSummary: "Partly cloudy - 64F air - 9 kt W",
      evidenceStatus: "needs-image",
      eventTag: "session-start",
    });
    expect(mission.timeline[0].summary).toBe("Observation session started");
    await waitFor(() => expect(wakeLockRequest).toHaveBeenCalledWith("screen"));
    expect(screen.getByText(/Long session active/i)).toBeInTheDocument();
  });

  it("captures a swimmer photo into the first scheduled observation", async () => {
    const user = userEvent.setup();
    renderRoute("/");

    await user.click(
      await screen.findByRole("button", { name: /Start Session/i }),
    );
    const photoInputs = await screen.findAllByLabelText(
      /Capture swimmer photo/i,
    );
    await user.upload(
      photoInputs[0],
      new File(["photo"], "swimmer.jpg", { type: "image/jpeg" }),
    );
    expect(await screen.findByText(/Photo saved locally/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Save Observation/i }),
      ).toBeEnabled(),
    );
    await user.type(
      screen.getByLabelText(/^Notes$/i),
      "Increased chop but swimmer steady.",
    );
    await user.click(screen.getByRole("button", { name: /Save Observation/i }));

    await waitFor(() =>
      expect(
        useMissionStore.getState().mission.wowsaPhotos[0].evidenceStatus,
      ).toBe("ready"),
    );
    const photo = useMissionStore.getState().mission.wowsaPhotos[0];
    expect(useMissionStore.getState().mission.wowsaPhotos).toHaveLength(1);
    expect(photo).toMatchObject({
      number: 1,
      imageName: "swimmer.jpg",
      notes: "Increased chop but swimmer steady.",
      waterTempF: 61,
      windKts: 9,
    });
    expect(photo.imageStorageKey).toBeDefined();
    await expect(getEvidenceImage(photo.imageStorageKey!)).resolves.toMatchObject({
      name: "swimmer.jpg",
      size: 5,
      type: "image/jpeg",
    });
    expect(useMissionStore.getState().mission.timeline[0].summary).toBe(
      "Observation #1 logged",
    );
  });

  it("saves an observation at any moment even when photo evidence is still pending", async () => {
    const user = userEvent.setup();
    renderRoute("/");

    await user.click(
      await screen.findByRole("button", { name: /Start Session/i }),
    );
    await waitFor(() =>
      expect(useMissionStore.getState().mission.status).toBe("active"),
    );
    await user.type(
      screen.getByLabelText(/^Notes$/i),
      "Boat repositioned before the scheduled photo.",
    );
    await user.click(screen.getByRole("button", { name: /Save Observation/i }));

    await waitFor(() =>
      expect(useMissionStore.getState().mission.timeline[0].summary).toBe(
        "Observation #1 logged",
      ),
    );
    const photo = useMissionStore.getState().mission.wowsaPhotos[0];
    expect(photo).toMatchObject({
      number: 1,
      hasPhoto: false,
      evidenceStatus: "needs-image",
      notes: "Boat repositioned before the scheduled photo.",
      gps: "33.71000° N, 118.28000° W",
    });
  });

  it("adds manual timeline entries with GPS and weather context", async () => {
    const user = userEvent.setup();
    renderRoute("/");

    await user.click(
      await screen.findByRole("button", { name: /Saw wildlife/i }),
    );

    const event = useMissionStore.getState().mission.timeline[0];
    expect(event).toMatchObject({
      summary: "Saw wildlife",
      gps: "33.71000° N, 118.28000° W",
      weatherSummary: "Partly cloudy - 64F air - 9 kt W",
    });
    const dateLabel = new Date(event.at).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    expect(
      await screen.findByRole("heading", { name: dateLabel }),
    ).toBeInTheDocument();
    expect(screen.getByText("Observer")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Delete timeline entry Saw wildlife/i,
      }),
    );

    expect(useMissionStore.getState().mission.timeline).toHaveLength(0);
  });

  it("adds a free-text manual timeline entry from the blank note box", async () => {
    const user = userEvent.setup();
    renderRoute("/");

    await user.type(
      await screen.findByLabelText(/Manual note/i),
      "Crew moved the boat to the swimmer's left shoulder.",
    );
    await user.click(
      screen.getByRole("button", { name: /Save Manual Entry/i }),
    );

    await waitFor(() =>
      expect(useMissionStore.getState().mission.timeline[0].summary).toBe(
        "Crew moved the boat to the swimmer's left shoulder.",
      ),
    );
    expect(useMissionStore.getState().mission.timeline[0]).toMatchObject({
      detail: "Crew moved the boat to the swimmer's left shoulder.",
      gps: "33.71000° N, 118.28000° W",
      weatherSummary: "Partly cloudy - 64F air - 9 kt W",
    });
    expect(screen.getByLabelText(/Manual note/i)).toHaveValue("");
  });

  it("exports a single official observation JSON record", async () => {
    renderRoute("/");

    const exportLink = await screen.findByRole("link", {
      name: /Official JSON/i,
    });
    const encodedRecord =
      exportLink
        .getAttribute("href")
        ?.replace("data:application/json;charset=utf-8,", "") ?? "";
    const record = JSON.parse(decodeURIComponent(encodedRecord));

    expect(record.recordType).toBe("wowsa-observation-record");
    expect(record.mission.swimmer).toBe("Catherine Breed");
    expect(record.mission.primaryVessel).toBe("M/V Catalyst (52ft Beneteau)");
    expect(
      record.crew.some(
        (member: { name: string }) => member.name === "Heather Hitchcock",
      ),
    ).toBe(true);
    expect(
      record.crew.some(
        (member: { name: string }) => member.name === "Sarah Scheltz",
      ),
    ).toBe(true);
  });

  it("creates a backup checkpoint from Session Export during a swim", async () => {
    const user = userEvent.setup();
    renderRoute("/");

    await user.click(
      await screen.findByRole("button", { name: /Start Session/i }),
    );
    await waitFor(() =>
      expect(useMissionStore.getState().mission.status).toBe("active"),
    );
    await user.click(screen.getByRole("button", { name: /Backup Now/i }));

    expect(await screen.findByText(/Local backup saved/i)).toBeInTheDocument();

    const backupIndex = JSON.parse(
      localStorage.getItem("swim-california-mission-backup-index") ?? "[]",
    );
    expect(backupIndex).toHaveLength(1);
    expect(backupIndex[0]).toMatchObject({
      reason: "manual-checkpoint",
      status: "active",
      observationCount: 1,
    });
  });

  it("downloads saved photo evidence when ending the observation session", async () => {
    const user = userEvent.setup();
    const downloadClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    renderRoute("/");

    await user.click(
      await screen.findByRole("button", { name: /Start Session/i }),
    );
    const photoInputs = await screen.findAllByLabelText(
      /Capture swimmer photo/i,
    );
    await user.upload(
      photoInputs[0],
      new File(["photo"], "swimmer.jpg", { type: "image/jpeg" }),
    );
    await user.click(screen.getByRole("button", { name: /Save Observation/i }));
    await waitFor(() =>
      expect(
        useMissionStore.getState().mission.wowsaPhotos[0].evidenceStatus,
      ).toBe("ready"),
    );

    await user.click(screen.getByRole("button", { name: /End & Backup/i }));

    expect(
      await screen.findByText(/Photo ZIP ready \(1\/1 photos\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Download Photo ZIP/i }),
    ).toBeInTheDocument();
    expect(useMissionStore.getState().mission.status).toBe("completed");
    expect(downloadClick).toHaveBeenCalled();
    downloadClick.mockRestore();
  });

  it("keeps medical monitoring focused on today's checklists and adverse events", async () => {
    const user = userEvent.setup();
    renderRoute("/medical");

    expect(
      await screen.findByRole("heading", { name: "Medical Monitoring" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Today's required checklists")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Athlete Pre-Swim/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Medic Pre-Swim/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Athlete Post-Swim/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Medic Post-Swim/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Log Adverse Event/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Past Logs/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trends/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Data & Export/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Safety & Emergency/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Start Session/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Data & Export/i }));
    expect(
      await screen.findByRole("heading", { name: "Data & Export" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Shared Save Status")).toBeInTheDocument();
    expect(screen.getByText("Email Recipients")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download Daily Summary/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download Full Medical Record/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Today" }));

    await user.click(screen.getByRole("button", { name: /Athlete Pre-Swim/i }));
    await user.type(screen.getByLabelText(/Sleep duration/i), "7.5");
    await user.type(screen.getByLabelText(/General comments/i), "Baseline complete.");
    await user.click(screen.getByRole("button", { name: /Mark Complete/i }));

    const dailyRecord =
      useMissionStore.getState().mission.medicalDailyRecords[0];
    expect(
      dailyRecord.checklists?.["athlete-pre-swim"]?.fields.generalComments
        .value,
    ).toBe("Baseline complete.");
    expect(dailyRecord.checklists?.["athlete-pre-swim"]?.status).toBe(
      "complete",
    );

    await user.click(screen.getByRole("button", { name: /Past Logs/i }));
    expect(
      await screen.findByRole("heading", { name: "Past Logs" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Athlete Pre-Swim - complete")).toBeInTheDocument();
    await user.dblClick(screen.getByText(dailyRecord.date));
    expect(
      await screen.findByRole("heading", { name: "Athlete Pre-Swim" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Sleep duration/i)).toHaveValue(7.5);
    expect(screen.getByLabelText(/General comments/i)).toHaveValue(
      "Baseline complete.",
    );

    await user.click(screen.getByRole("button", { name: "Today" }));
    await user.click(screen.getByRole("button", { name: /Medic Post-Swim/i }));
    await user.selectOptions(
      screen.getByLabelText(/Urine dipstick results/i),
      "Trace blood",
    );
    expect(
      useMissionStore.getState().mission.medicalAdverseEvents[0].description,
    ).toMatch(/Abnormal urine dipstick/i);

    await user.click(screen.getByRole("button", { name: "Today" }));
    await user.click(screen.getByLabelText(/Recovery day/i));
    expect(
      screen.getByRole("button", { name: /Athlete Recovery/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Medic Recovery/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Athlete Pre-Swim/i }),
    ).not.toBeInTheDocument();
  });

  it("logs adverse events from the permanent medical event form", async () => {
    const user = userEvent.setup();
    renderRoute("/medical");

    await user.click(
      await screen.findByRole("button", { name: /Log Adverse Event/i }),
    );
    await user.type(
      screen.getByLabelText(/Description/i),
      "Jellyfish sting on left arm",
    );
    await user.type(
      screen.getByLabelText(/Immediate actions taken/i),
      "Rinsed and monitored.",
    );
    const adverseButtons = screen.getAllByRole("button", {
      name: /Log Adverse Event/i,
    });
    await user.click(adverseButtons[adverseButtons.length - 1]);

    expect(
      useMissionStore.getState().mission.medicalAdverseEvents[0].description,
    ).toBe("Jellyfish sting on left arm");
  });
});
