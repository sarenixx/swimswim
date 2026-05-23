import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addMinutes } from 'date-fns';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../app/router';
import { createLiveStateFromTemplate, useMissionStore, useTemplateMissionStore } from '../state/useMissionStore';

function renderRoute(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe('mission-critical flows', () => {
  beforeEach(() => {
    localStorage.clear();
    useMissionStore.getState().resetMission();
    useTemplateMissionStore.getState().resetMission();
    useMissionStore.getState().setOnlineStatus(true);
    useTemplateMissionStore.getState().setOnlineStatus(true);
  });

  it('surfaces the WOWSA GPS photo capture as the critical action', async () => {
    renderRoute('/');

    expect(await screen.findByText('Right Now')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /WOWSA GPS photo capture overdue/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Capture GPS photo/i })).toBeInTheDocument();
    expect(screen.getByText('Active Alerts')).toBeInTheDocument();
  });

  it('edits and saves the Catherine overview card', async () => {
    const user = userEvent.setup();
    renderRoute('/');

    const overview = await screen.findByRole('region', { name: /Swim Overview/i });
    await user.click(within(overview).getByRole('button', { name: /Edit/i }));
    await user.clear(within(overview).getByLabelText(/Location/i));
    await user.type(within(overview).getByLabelText(/Location/i), 'Santa Monica Test Swim');
    await user.click(within(overview).getByRole('button', { name: /Save/i }));

    expect(useMissionStore.getState().mission.session.location).toBe('Santa Monica Test Swim');
    expect(within(overview).getByText('Santa Monica Test Swim')).toBeInTheDocument();
  });

  it('opens the focused feeding plan with nutrition and backup options', async () => {
    renderRoute('/feeding');

    expect(await screen.findByText('Feeding Window')).toBeInTheDocument();
    expect(screen.getByText('Standard carb bottle')).toBeInTheDocument();
    expect(screen.getAllByText('Warm broth backup').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/350 mg sodium/i).length).toBeGreaterThan(0);
  });

  it('opens conditions and risk with abort criteria visible', async () => {
    renderRoute('/conditions-risk');

    expect(await screen.findByText('Abort Conditions')).toBeInTheDocument();
    expect(screen.getByText(/Flood easing/i)).toBeInTheDocument();
    expect(screen.getByText(/Wind above 18 kt/i)).toBeInTheDocument();
  });

  it('shows and completes planned swim timeline items', async () => {
    const user = userEvent.setup();
    renderRoute('/live-operations');

    expect(await screen.findByText('Planned Swim Timeline')).toBeInTheDocument();
    const item = screen.getAllByText('Next feed handoff window')[0].closest('li');
    expect(item).not.toBeNull();

    await user.click(within(item!).getByRole('button', { name: /Complete/i }));

    const state = useMissionStore.getState();
    expect(state.mission.operationalTimeline.find((entry) => entry.id === 'op-next-feed')?.status).toBe('done');
    expect(state.mission.timeline[0].summary).toBe('Planned timeline item completed');
  });

  it('shows crew backup coverage', async () => {
    renderRoute('/crew');

    expect(await screen.findByText('Coverage')).toBeInTheDocument();
    expect(screen.getAllByText(/Backup: Luis Ortega/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Safety lead holds command channel/i)).toBeInTheDocument();
  });

  it('adds a timestamped timeline entry from quick log', async () => {
    const user = userEvent.setup();
    renderRoute('/');

    await user.click(screen.getByRole('button', { name: /Fatigue observed/i }));

    const state = useMissionStore.getState();
    expect(state.mission.timeline[0].summary).toBe('Swimmer showing fatigue');
    expect(state.mission.timeline[0].actorId).toBe(state.activeActorId);
    expect(state.mission.alerts[0].kind).toBe('fatigue');
  });

  it('shows one protocol entry point without raising an alert signal', async () => {
    const user = userEvent.setup();
    renderRoute('/safety');

    expect(await screen.findByText('Protocol Scenarios')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Protocol' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Medical' })).not.toBeInTheDocument();
    const statusBeforeScenarioReview = useMissionStore.getState().mission.status;

    await user.selectOptions(screen.getByLabelText(/Scenario/i), 'medical');

    const state = useMissionStore.getState();
    expect(state.mission.alerts).toHaveLength(0);
    expect(state.mission.status).toBe(statusBeforeScenarioReview);
    expect(screen.getByText('Medical Issue Protocol')).toBeInTheDocument();
  });

  it('queues writes while offline and keeps the mission log persisted', () => {
    useMissionStore.getState().setOnlineStatus(false);
    useMissionStore.getState().logEvent({
      type: 'note',
      actorId: 'crew-captain',
      summary: 'Persistence check',
      detail: 'Created during offline mode.',
      severity: 'info'
    });

    const state = useMissionStore.getState();
    const persisted = localStorage.getItem('swim-california-mission-live');

    expect(state.offlineQueue).toHaveLength(1);
    expect(state.mission.timeline[0].summary).toBe('Persistence check');
    expect(persisted).toContain('Persistence check');
  });

  it('starts a fresh expedition from mission setup data', () => {
    const startAt = '2026-05-06T20:45:00.000Z';
    const crew = useMissionStore.getState().mission.crew.map((member) => ({
      id: member.id,
      name: member.role === 'captain' ? 'Alex Captain' : member.name,
      phone: member.phone
    }));

    useMissionStore.getState().startMissionFromSetup({
      name: 'Santa Cruz Training Day',
      swimmerName: 'Jamie Rivera',
      location: 'Santa Cruz',
      plannedDistance: '12 miles',
      startAt,
      gpsStart: '36.96000° N, 122.02000° W',
      gpsEnd: '36.97000° N, 122.03000° W',
      primaryVessel: 'Support One',
      supportVessels: 'Kayak 1',
      leadCrew: 'Alex Captain',
      completedBy: 'Alex Captain',
      operationsEmail: 'ops@example.com',
      feedingIntervalMinutes: 20,
      wowsaPhotoIntervalMinutes: 15,
      crew
    });

    const mission = useMissionStore.getState().mission;

    expect(mission.status).toBe('active');
    expect(mission.name).toBe('Santa Cruz Training Day');
    expect(mission.session.swimmerName).toBe('Jamie Rivera');
    expect(mission.feedingIntervalMinutes).toBe(20);
    expect(mission.wowsaPhotoIntervalMinutes).toBe(15);
    expect(mission.nextFeedingAt).toBe(addMinutes(new Date(startAt), 20).toISOString());
    expect(mission.timeline[0].summary).toBe('Expedition started');
    expect(mission.wowsaPhotos).toHaveLength(0);
    expect(mission.expeditionCheckpoints[0]).toMatchObject({
      label: 'Start checkpoint',
      lat: 36.96,
      lon: -122.02
    });
  });

  it('loads the reusable template deliverable with placeholders and guidance', async () => {
    renderRoute('/template');

    expect(await screen.findByText('Template Onboarding')).toBeInTheDocument();
    expect(screen.getAllByText('Endurance Swim Expedition OS Template').length).toBeGreaterThan(0);
    expect(screen.getByText(/replace every bracketed placeholder/i)).toBeInTheDocument();
    expect(useTemplateMissionStore.getState().mission.mode).toBe('template');
  });

  it('duplicates template state into a clean live project state', () => {
    const templateMission = useTemplateMissionStore.getState().mission;
    const duplicated = createLiveStateFromTemplate(templateMission, new Date('2026-05-06T20:45:00.000Z'));

    expect(duplicated.mission.mode).toBe('live');
    expect(duplicated.mission.status).toBe('preparing');
    expect(duplicated.mission.timeline[0].summary).toBe('Template duplicated to live project');
    expect(duplicated.mission.alerts).toHaveLength(0);
    expect(duplicated.mission.wowsaPhotos).toHaveLength(0);
    expect(duplicated.offlineQueue).toHaveLength(0);
  });
});
