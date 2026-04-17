# Build the Swim California Mission Control PWA

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.

This repository does not currently contain a separate PLANS.md file. Maintain this document in accordance with the ExecPlan guidance captured in /workspaces/swimswim/AGENTS.MD.

## Purpose / Big Picture

Swim California is not a generic checklist product. It is a mission-control application for a high-risk endurance swim where multiple teams must stay aligned under stress. After this plan is implemented, a captain or safety lead will be able to open one responsive web app, see the swimmer’s current state, see the next critical action, log operational events in seconds, trigger emergency protocols, and continue working even during poor connectivity.

The first demonstrably useful release is a responsive progressive web app, which means a web app that can be installed on a phone or tablet and can keep working with locally stored data when the network is weak. A working build is proven when a user can start the app locally, load seeded expedition data, see the Mission Control dashboard, complete a timed feeding workflow, trigger a distress alert, go offline in the browser, continue logging events, and then restore connectivity without losing those logs.

## Progress

- [x] (2026-04-17 00:00Z) Reviewed the repository state. The repo currently contains only /workspaces/swimswim/README.md, /workspaces/swimswim/AGENTS.MD, /workspaces/swimswim/plans.md, and the uploaded logo asset /workspaces/swimswim/swim+california+logo+transparent_dark.webp.
- [x] (2026-04-17 00:10Z) Converted /workspaces/swimswim/plans.md from a generic template into a concrete product and implementation ExecPlan for the first usable Swim California release.
- [ ] Scaffold the application with a Vite React TypeScript progressive web app, install dependencies, and commit the base folder structure described below.
- [ ] Implement the Mission Control shell, global state, seeded demo mission, and role-based navigation.
- [ ] Implement the operational workflows: checklist ownership, event timeline, quick logs, timed feedings, team shifts, and alerts.
- [ ] Implement the Safety & Emergency center, communication hub, crew directory, logs view, and sponsor/media holding area.
- [ ] Add offline storage, background synchronization, installable app support, and validation tests.

## Surprises & Discoveries

- Observation: The repository is effectively empty, so architecture choices that would normally be constrained by an existing stack must be made here.
  Evidence: Listing /workspaces/swimswim shows only planning files, README, and the uploaded logo.

- Observation: The uploaded logo already establishes a visual system strong enough to guide the first UI pass.
  Evidence: The mark combines deep navy, ocean blue, orange, and white, with a California silhouette and swimmer illustration that clearly communicates expedition swimming rather than generic fitness.

## Decision Log

- Decision: Build the first version as a responsive progressive web app instead of a native mobile app.
  Rationale: The product needs fast iteration, shared access across captain tablets and crew phones, installability, and offline resilience. A progressive web app reaches those goals sooner than maintaining separate native clients.
  Date/Author: 2026-04-17 / GitHub Copilot

- Decision: Optimize the first release around one core principle: always surface the next critical action.
  Rationale: The user brief explicitly rejects a tab-heavy checklist product. The interface must reduce cognitive load during stress and therefore prioritize active alerts, countdowns, and the next required action over passive information.
  Date/Author: 2026-04-17 / GitHub Copilot

- Decision: Use local-first data storage for core operations.
  Rationale: Open-water conditions make signal unreliable. Mission-critical actions such as feed logs, swimmer condition notes, and distress events must never depend on an active network request.
  Date/Author: 2026-04-17 / GitHub Copilot

- Decision: Use the uploaded logo as the basis of the visual system.
  Rationale: The asset is distinctive, already aligned to the expedition story, and provides a coherent brand palette for the initial product build.
  Date/Author: 2026-04-17 / GitHub Copilot

## Outcomes & Retrospective

At this stage, the main outcome is a concrete execution plan that resolves the otherwise open-ended product brief into an implementable first release. The largest remaining gap is code: the repo still needs to be scaffolded and built. The most important lesson from the initial planning pass is that this product should be treated like an operations console first and an administrative tool second.

## Context and Orientation

The current repository root is /workspaces/swimswim. There is no existing app code. The only product-specific asset is the uploaded logo at /workspaces/swimswim/swim+california+logo+transparent_dark.webp. Because there is no existing framework to extend, this plan defines the starting stack, the folder layout, the data model, the workflows, and the validation steps.

The product is for a multi-team endurance swim expedition. The core roles are Captain, Safety, Medical, Kayak Lead, Boat Crew, and Media. A role-based view means the screen should show the information most relevant to that role rather than exposing every feature equally to everyone. Mission Control is the home screen and must show the current swim state, active alerts, the swimmer condition, environmental conditions, team readiness, and the next scheduled event. A quick log is a one-tap event action such as “feeding completed” or “course adjustment” that creates a timestamped record without requiring long form entry.

The application should be organized as a single-page React app with client-side routing. Client-side routing means switching screens in the browser without reloading the whole page. The first implementation should include these repository paths after scaffolding:

/workspaces/swimswim/package.json will define scripts and dependencies.
/workspaces/swimswim/src/main.tsx will start the application.
/workspaces/swimswim/src/app/App.tsx will hold the shell layout and top-level routes.
/workspaces/swimswim/src/app/router.tsx will define navigation.
/workspaces/swimswim/src/styles/tokens.css will define color, spacing, type, elevation, and motion tokens.
/workspaces/swimswim/src/assets/logo.webp will store a copied and renamed version of the uploaded logo.
/workspaces/swimswim/src/features/mission-control will contain the home dashboard.
/workspaces/swimswim/src/features/checklists will contain checklist flows.
/workspaces/swimswim/src/features/live-ops will contain the timeline, feedings, quick logs, and shift rotation features.
/workspaces/swimswim/src/features/safety will contain emergency actions and protocols.
/workspaces/swimswim/src/features/comms will contain broadcast and role-based communication views.
/workspaces/swimswim/src/features/crew will contain the crew directory and responsibilities.
/workspaces/swimswim/src/features/logs will contain historical logs, filters, and export hooks.
/workspaces/swimswim/src/features/partners will contain sponsor, media, and content obligations.
/workspaces/swimswim/src/state will contain the local application store and seed data.
/workspaces/swimswim/src/lib/storage will contain browser persistence and offline queue logic.
/workspaces/swimswim/public/manifest.webmanifest will define installable app metadata.
/workspaces/swimswim/vitest.config.ts and /workspaces/swimswim/src/test will hold automated tests.

The first release does not require real chat infrastructure, live GPS hardware, or external weather integrations. Those are future enhancements. This release should instead provide realistic seeded data, local event handling, clear workflow structure, and interfaces that are ready to connect to live services later.

## Plan of Work

Start by scaffolding a Vite React TypeScript application in the repository root and add progressive web app support, React Router for navigation, and a lightweight client state library. Use TypeScript so the data model for missions, alerts, crew roles, checklists, and logs is explicit from the start. Add Vitest and Testing Library for component and flow tests.

Create a visual foundation before feature work. Copy the uploaded logo into /workspaces/swimswim/src/assets/logo.webp. In /workspaces/swimswim/src/styles/tokens.css define the primary palette from the logo: deep navy for structure and mission-critical emphasis, ocean blue for environmental and route surfaces, high-contrast orange for active countdowns and alerts that need attention, and white or near-white for content surfaces. Use a distinctive serif or display face only for headings tied to the brand and a clean sans-serif for operational text, because operational text must remain highly readable during stress. The shell should feel like an expedition console rather than a generic admin template.

Build the application shell in /workspaces/swimswim/src/app/App.tsx and /workspaces/swimswim/src/app/router.tsx. The shell must support desktop, tablet, and phone layouts. The top-level destinations are Mission Control, Checklists, Live Operations, Safety & Emergency, Communication Hub, Crew & Roles, Logs & Data, and Partners & Media. On smaller screens, show a bottom navigation bar for the most critical destinations and move lower-priority sections into a secondary menu. The first visible region on the Mission Control screen must be a “Next Critical Action” card showing the next timed event or unresolved alert.

Model expedition data in /workspaces/swimswim/src/state. Define types for Mission, CrewMember, RoleAssignment, ChecklistItem, ChecklistRun, TimelineEvent, FeedingEvent, SwimmerConditionEntry, Alert, ProtocolStep, and CommunicationMessage. Store state locally in browser storage so the app can be refreshed or used offline without losing mission data. Every action that changes state must record actor, timestamp, and lateness when relevant. Lateness means the difference between when a task was scheduled and when it was completed.

Implement Mission Control first because it is the operational center. The screen should show current swim status, elapsed time, last feeding, next feeding countdown, environmental conditions, swimmer condition trend, active crew on duty, and a prioritized alert stack. It should also include one-tap quick log buttons for Feeding Completed, Fatigue Observed, Weather Shift, Course Adjustment, Shift Handover, and Check-In Confirmed. Logging one of these actions must update the timeline instantly.

Implement Checklists next, but do not let them behave like static documents. Every checklist item must have an owner, status, optional due time, and completion record. Separate lists for Pre-Swim, In-Swim, Post-Swim, and Mental Health / Team Readiness should exist. In-Swim checklist items with due times must also surface in Mission Control when overdue.

Implement Live Operations as the structured event stream. The timeline should support filters by event type and role. Feedings should be schedulable at a fixed interval and visible as a countdown, with a five-minute warning state. Shift rotations should show who is on duty and who is next. Swimmer condition updates should support a structured severity scale so condition changes can generate alerts.

Implement Safety & Emergency as a dedicated fast-access surface. The top of the screen must include large emergency triggers for Medical Issue, Swimmer Distress, and Abort Swim. Triggering any of these should create a red priority alert, pin the relevant protocol steps to the top of Mission Control, and surface contact information for doctor, coast guard, and expedition leadership from locally stored seed data. The user should not need to navigate through nested screens during an emergency.

Implement Communication Hub as a simplified local-first messaging view with role-based channels and captain broadcasts. The first release can be simulated locally rather than backed by a server. What matters is the workflow structure: role channels, broadcast templates, and confirmation prompts. Add quick messages such as Prepare for Feeding, Weather Shift Incoming, and All Teams Confirm Status.

Implement Crew & Roles, Logs & Data, and Partners & Media after the core operational flows exist. Crew & Roles should show shift ownership and responsibilities to reduce ambiguity. Logs & Data should provide filtering and a simple export to JSON or CSV from locally stored data. Partners & Media should remain intentionally light so it does not compete with safety-critical features.

Finish by adding offline support, installability, and tests. Offline support must include browser persistence and queued writes so action logging continues with no network. Installability requires a manifest and service worker through the PWA plugin. Tests must prove that timed feedings appear, quick logs append timeline events, emergency actions raise alerts, and persisted state survives refresh.

## Milestones

### Milestone 1: Scaffold the installable shell

At the end of this milestone, the repository contains a working Vite React TypeScript progressive web app with routing, global styles, the copied logo asset, and placeholder screens for all top-level sections. Running the app shows the Swim California branded shell and navigation, and the browser offers installation metadata.

### Milestone 2: Make Mission Control operational

At the end of this milestone, a user can load seeded expedition data and use Mission Control as a real command center. The dashboard shows current status, countdowns, quick logs, and the next critical action. Triggering a quick log mutates state and updates the timeline immediately.

### Milestone 3: Add workflows for checklists, live operations, and safety

At the end of this milestone, timed feedings, due checklist items, shift rotations, swimmer condition updates, and emergency triggers all work in the same local data model. Alerts become the glue between modules, and Mission Control reflects operational state without manual refresh.

### Milestone 4: Add communication, logs, and offline resilience

At the end of this milestone, the remaining product sections are functional, the app continues working offline, and automated tests cover the core mission-critical flows. This is the first release candidate.

## Concrete Steps

All commands below are run from /workspaces/swimswim.

1. Scaffold the Vite React TypeScript app in the current directory.

    npm create vite@latest . -- --template react-ts

    Expected outcome: package.json, tsconfig files, index.html, src directory, and Vite config are created without deleting plans.md or the uploaded logo.

2. Install the initial dependencies.

    npm install react-router-dom zustand date-fns lucide-react clsx
    npm install -D vite-plugin-pwa vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom eslint prettier

    Expected outcome: package-lock.json is created and dependencies are added successfully.

3. Copy the uploaded logo into the application assets folder with a stable name.

    mkdir -p src/assets
    cp "swim+california+logo+transparent_dark.webp" src/assets/logo.webp

4. Create the feature folder structure and base files described in Context and Orientation.

    mkdir -p src/app src/styles src/state src/lib/storage src/features/mission-control src/features/checklists src/features/live-ops src/features/safety src/features/comms src/features/crew src/features/logs src/features/partners src/test public

5. Configure the progressive web app plugin, web manifest, and service worker behavior.

    Edit vite.config.ts, package.json scripts, and create public/manifest.webmanifest.

6. Build the app shell, routes, and seeded state.

    npm run dev

    Expected outcome: the app loads in the browser with branded navigation and placeholder content for each route.

7. Implement mission workflows and tests iteratively.

    npm run test

    Expected outcome: tests fail before each feature is added, then pass once the feature is implemented.

8. Verify the production build.

    npm run build
    npm run preview

    Expected outcome: the app builds successfully and the preview server serves the installable progressive web app.

## Validation and Acceptance

The implementation is accepted only when all of the following behaviors are observable:

1. Starting the development server shows a branded Swim California interface that uses the uploaded logo and a clear navy-blue-orange visual system.

2. Mission Control opens by default and shows seeded data for swim status, elapsed time, last and next feeding, swimmer condition, live conditions, active alerts, and active crew assignments.

3. The next critical action is visually dominant. If a feeding is due in five minutes, that card appears above passive information. If an emergency alert is active, it replaces the feeding card as the top priority.

4. Completing a quick log action immediately adds a timestamped event to the timeline and records who triggered it.

5. Checklist items support owner assignment, completion timestamps, and overdue highlighting.

6. Triggering Swimmer Distress or Abort Swim raises a persistent high-priority alert and surfaces the matching emergency protocol and contacts without deep navigation.

7. Turning the browser offline after the app loads still allows log creation and checklist completion. Reloading the page preserves previously entered local state.

8. Running the test suite completes successfully and includes automated coverage for Mission Control rendering, feeding countdown behavior, alert creation, and persistence across refresh.

9. Running the production build succeeds with no blocking type or test failures.

## Idempotence and Recovery

Scaffolding must be done carefully because the repository already contains planning files and the uploaded logo. Before running the Vite scaffold command, confirm it will write into the current directory rather than replacing it. If a command partially succeeds, rerun the install or scaffold command only after checking which files were created. Copying the logo into src/assets is idempotent because rerunning the copy command simply refreshes the same asset.

Use additive changes only. Do not delete plans.md, AGENTS.MD, or the original uploaded logo file. If a dependency installation fails, rerun npm install after fixing the specific package issue instead of removing the lockfile blindly. If offline storage logic causes stale data during development, add a visible reset mission action in a non-production debug menu rather than manually editing browser storage on every test pass.

## Artifacts and Notes

Brand tokens to establish during implementation:

    --color-ink: #0D2D4E;
    --color-ocean: #2B8FCC;
    --color-alert: #E84B0F;
    --color-foam: #F7FAFC;
    --color-night: #081B2D;

Core home-screen cards for Mission Control:

    Next Critical Action
    Swim Status
    Active Alerts
    Swimmer Condition
    Feed Countdown
    Team On Duty
    Conditions
    Recent Timeline

Quick log actions to expose on first release:

    Feeding Completed
    Swimmer Showing Fatigue
    Course Adjustment
    Weather Shift Incoming
    Shift Handover
    Team Check-In Confirmed

Suggested seeded mission for validation:

    Mission name: Catalina Channel Qualifier
    Status: Active
    Feeding interval: 30 minutes
    Crew roles: Captain, Kayak 1, Kayak 2, Medic, Boat Lead, Media
    Active alert at seed time: none
    First test emergency: Swimmer Distress

Revision note, 2026-04-17: Replaced the generic ExecPlan instructions with a concrete implementation plan tailored to the Swim California product brief and uploaded logo so implementation can begin directly from this file.

## Interfaces and Dependencies

Use React 18 with TypeScript for the UI. Use Vite for local development and production bundling. Use React Router for top-level route management. Use Zustand, or an equivalently small client store, for local mission state because the first release is local-first and does not need heavy server caching. Use date-fns for countdown and scheduling calculations. Use Vitest with Testing Library for automated tests. Use vite-plugin-pwa to generate the service worker and installable manifest.

Define these TypeScript interfaces in /workspaces/swimswim/src/state/types.ts:

    export type MissionStatus = 'preparing' | 'active' | 'paused' | 'completed' | 'aborted';

    export type CrewRole =
      | 'captain'
      | 'safety'
      | 'medical'
      | 'kayak-1'
      | 'kayak-2'
      | 'boat'
      | 'media';

    export interface CrewMember {
      id: string;
      name: string;
      role: CrewRole;
      phone: string;
      shiftStart: string;
      shiftEnd: string;
      responsibilities: string[];
    }

    export interface ChecklistItem {
      id: string;
      category: 'pre-swim' | 'in-swim' | 'post-swim' | 'mental-health';
      title: string;
      ownerId: string;
      dueAt?: string;
      completedAt?: string;
      completedBy?: string;
      status: 'pending' | 'done' | 'overdue';
    }

    export interface TimelineEvent {
      id: string;
      type:
        | 'feeding'
        | 'condition'
        | 'shift'
        | 'weather'
        | 'course'
        | 'check-in'
        | 'emergency'
        | 'note';
      at: string;
      actorId: string;
      summary: string;
      detail?: string;
      lateByMinutes?: number;
      severity?: 'info' | 'warning' | 'critical';
    }

    export interface Alert {
      id: string;
      kind: 'fatigue' | 'missed-feeding' | 'weather-threshold' | 'missed-check-in' | 'medical' | 'distress' | 'abort';
      title: string;
      detail: string;
      createdAt: string;
      status: 'active' | 'acknowledged' | 'resolved';
      severity: 'warning' | 'critical';
    }

    export interface Mission {
      id: string;
      name: string;
      status: MissionStatus;
      startedAt: string;
      feedingIntervalMinutes: number;
      nextFeedingAt: string;
      crew: CrewMember[];
      checklistItems: ChecklistItem[];
      timeline: TimelineEvent[];
      alerts: Alert[];
    }

The store in /workspaces/swimswim/src/state/useMissionStore.ts must expose functions with these signatures:

    loadSeedMission(): void;
    completeChecklistItem(itemId: string, actorId: string): void;
    logEvent(event: Omit<TimelineEvent, 'id' | 'at'> & { at?: string }): void;
    triggerEmergency(kind: 'medical' | 'distress' | 'abort', actorId: string): void;
    scheduleNextFeeding(fromIsoTime?: string): void;
    setOnlineStatus(isOnline: boolean): void;
    resetMission(): void;
