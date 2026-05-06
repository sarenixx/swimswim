import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addMinutes } from 'date-fns';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../app/router';
import { useMissionStore } from '../state/useMissionStore';

function renderRoute(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe('mission-critical flows', () => {
  beforeEach(() => {
    localStorage.clear();
    useMissionStore.getState().resetMission();
    useMissionStore.getState().setOnlineStatus(true);
  });

  it('surfaces overdue WOWSA evidence as the critical action', async () => {
    renderRoute('/');

    expect(await screen.findByText('Next Critical Action')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /WOWSA photo overdue/i })).toBeInTheDocument();
    expect(screen.getByText('Active Alerts')).toBeInTheDocument();
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

  it('raises a critical alert and pins protocol on swimmer distress', async () => {
    const user = userEvent.setup();
    renderRoute('/safety');

    await user.click(screen.getAllByRole('button', { name: 'Swimmer Distress' })[0]);

    const state = useMissionStore.getState();
    expect(state.mission.activeProtocolKind).toBe('distress');
    expect(state.mission.alerts[0]).toMatchObject({
      kind: 'distress',
      severity: 'critical',
      status: 'active'
    });
    expect(screen.getByText('Swimmer distress active')).toBeInTheDocument();
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
    const persisted = localStorage.getItem('swim-california-mission');

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
});
