import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routes } from "../app/router";
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
      await screen.findByRole("button", { name: /Saw dolphin/i }),
    );

    const event = useMissionStore.getState().mission.timeline[0];
    expect(event).toMatchObject({
      summary: "Saw dolphin",
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
        name: /Delete timeline entry Saw dolphin/i,
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

  it("keeps medical workflows independent with four checklists and one recovery-day checklist", async () => {
    const user = userEvent.setup();
    renderRoute("/medical");

    expect(
      (await screen.findAllByRole("heading", { name: "Medical" })).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Pre-Swim Checklist")).toBeInTheDocument();
    expect(screen.getByText("In-Swim Watch Checklist")).toBeInTheDocument();
    expect(screen.getByText("Post-Swim Checklist")).toBeInTheDocument();
    expect(
      screen.getByText("Medication / Treatment Checklist"),
    ).toBeInTheDocument();
    expect(screen.getByText("Recovery-Day Checklist")).toBeInTheDocument();
    expect(screen.queryByText(/Start Session/i)).not.toBeInTheDocument();

    const preSwim = screen.getByText("Pre-Swim Checklist").closest("section");
    expect(preSwim).not.toBeNull();
    await user.type(
      within(preSwim!).getByLabelText(
        /Daily note for Pre-swim vitals recorded/i,
      ),
      "Baseline complete.",
    );
    await user.click(
      within(preSwim!).getByRole("checkbox", {
        name: /Complete Pre-swim vitals recorded/i,
      }),
    );

    const dailyRecord =
      useMissionStore.getState().mission.medicalDailyRecords[0];
    const savedItem = dailyRecord.items.find(
      (item) => item.itemId === "med-pre-swim-vitals",
    );
    expect(savedItem?.status).toBe("done");
    expect(savedItem?.note).toBe("Baseline complete.");

    await user.type(
      screen.getByLabelText(/Symptom \/ change/i),
      "Cold hands after exit",
    );
    await user.click(
      screen.getByRole("button", { name: /Log Medical Change/i }),
    );

    expect(
      useMissionStore.getState().mission.medicalSymptomLog[0].symptom,
    ).toBe("Cold hands after exit");
  });
});
