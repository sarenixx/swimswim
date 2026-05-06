import { addMinutes } from 'date-fns';
import { Camera, ClipboardCheck, Clock3, MapPin, PlayCircle, Ship, UserRound, Utensils } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDevicePosition } from '../../lib/gps';
import { roleLabels } from '../../state/seed';
import { formatClock } from '../../state/selectors';
import type { MissionSetupCrewAssignment, MissionSetupInput } from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';

const toDateTimeLocal = (isoTime: string) => {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const fromDateTimeLocal = (value: string) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const numberFromInput = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function MissionSetup() {
  const navigate = useNavigate();
  const mission = useMissionStore((state) => state.mission);
  const startMissionFromSetup = useMissionStore((state) => state.startMissionFromSetup);
  const defaultStartAt = mission.status === 'preparing' ? mission.startedAt : new Date().toISOString();
  const [gpsStatus, setGpsStatus] = useState('');
  const [setup, setSetup] = useState({
    name: mission.name,
    swimmerName: mission.session.swimmerName,
    location: mission.session.location,
    plannedDistance: mission.session.plannedDistance,
    startAt: toDateTimeLocal(defaultStartAt),
    gpsStart: mission.session.gpsStart,
    gpsEnd: mission.session.gpsEnd,
    primaryVessel: mission.session.primaryVessel,
    supportVessels: mission.session.supportVessels,
    leadCrew: mission.session.leadCrew,
    completedBy: mission.session.completedBy,
    feedingIntervalMinutes: String(mission.feedingIntervalMinutes),
    wowsaPhotoIntervalMinutes: String(mission.wowsaPhotoIntervalMinutes ?? 30),
    crew: mission.crew.map<MissionSetupCrewAssignment>((member) => ({
      id: member.id,
      name: member.name,
      phone: member.phone
    }))
  });

  const startIso = fromDateTimeLocal(setup.startAt);
  const feedingInterval = numberFromInput(setup.feedingIntervalMinutes, mission.feedingIntervalMinutes);
  const wowsaInterval = numberFromInput(setup.wowsaPhotoIntervalMinutes, mission.wowsaPhotoIntervalMinutes ?? 30);
  const generatedCadence = useMemo(
    () => [
      {
        label: 'First feeding',
        at: addMinutes(new Date(startIso), Math.max(5, feedingInterval)).toISOString(),
        icon: Utensils
      },
      {
        label: 'First WOWSA photo',
        at: addMinutes(new Date(startIso), Math.max(5, wowsaInterval)).toISOString(),
        icon: Camera
      },
      {
        label: 'Kayak check-in',
        at: addMinutes(new Date(startIso), 20).toISOString(),
        icon: ClipboardCheck
      },
      {
        label: 'Condition scan',
        at: addMinutes(new Date(startIso), 15).toISOString(),
        icon: UserRound
      }
    ],
    [feedingInterval, startIso, wowsaInterval]
  );

  const updateSetup = (field: keyof Omit<typeof setup, 'crew'>, value: string) => {
    setSetup((current) => ({ ...current, [field]: value }));
  };

  const updateCrew = (memberId: string, field: keyof Omit<MissionSetupCrewAssignment, 'id'>, value: string) => {
    setSetup((current) => ({
      ...current,
      crew: current.crew.map((member) => (member.id === memberId ? { ...member, [field]: value } : member))
    }));
  };

  const captureStartGps = async () => {
    setGpsStatus('Capturing GPS...');
    try {
      const position = await getDevicePosition();
      updateSetup('gpsStart', position.label);
      setGpsStatus(position.accuracyM ? `Start GPS captured ±${Math.round(position.accuracyM)}m` : 'Start GPS captured');
    } catch (error) {
      setGpsStatus(error instanceof Error ? error.message : 'GPS capture failed.');
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const input: MissionSetupInput = {
      ...setup,
      startAt: fromDateTimeLocal(setup.startAt),
      feedingIntervalMinutes: numberFromInput(setup.feedingIntervalMinutes, 30),
      wowsaPhotoIntervalMinutes: numberFromInput(setup.wowsaPhotoIntervalMinutes, 30)
    };

    startMissionFromSetup(input);
    navigate('/');
  };

  return (
    <form className="page-grid setup-form" onSubmit={handleSubmit}>
      <section className="panel span-12 setup-command">
        <div>
          <p className="page-kicker">New Expedition</p>
          <h3 className="critical-title">Mission Setup</h3>
          <p className="critical-detail">
            {setup.swimmerName || 'Swimmer'} · {setup.location || 'Location'} · {setup.plannedDistance || 'Distance'}
          </p>
        </div>
        <div className="setup-command-actions">
          <span className="sync-pill online">Ready to start</span>
          <button className="button primary" type="submit">
            <PlayCircle aria-hidden="true" />
            Start Expedition
          </button>
        </div>
      </section>

      <section className="panel span-7">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Expedition Details</h3>
            <p className="panel-subtitle">Identity, route, and launch time.</p>
          </div>
          <Ship aria-hidden="true" />
        </div>
        <div className="setup-field-grid">
          <label className="field-label">
            <span>Mission name</span>
            <input className="input" value={setup.name} onChange={(event) => updateSetup('name', event.target.value)} />
          </label>
          <label className="field-label">
            <span>Swimmer</span>
            <input className="input" value={setup.swimmerName} onChange={(event) => updateSetup('swimmerName', event.target.value)} />
          </label>
          <label className="field-label">
            <span>Location</span>
            <input className="input" value={setup.location} onChange={(event) => updateSetup('location', event.target.value)} />
          </label>
          <label className="field-label">
            <span>Planned distance</span>
            <input className="input" value={setup.plannedDistance} onChange={(event) => updateSetup('plannedDistance', event.target.value)} />
          </label>
          <label className="field-label span-fields">
            <span>Start time</span>
            <input
              className="input"
              type="datetime-local"
              value={setup.startAt}
              onChange={(event) => updateSetup('startAt', event.target.value)}
            />
          </label>
          <button className="button setup-inline-action" type="button" onClick={() => updateSetup('startAt', toDateTimeLocal(new Date().toISOString()))}>
            <Clock3 aria-hidden="true" />
            Now
          </button>
        </div>
      </section>

      <section className="panel span-5">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Cadence</h3>
            <p className="panel-subtitle">Generated from the expedition start.</p>
          </div>
          <Clock3 aria-hidden="true" />
        </div>
        <div className="setup-field-grid one-column">
          <label className="field-label">
            <span>Feeding interval minutes</span>
            <input
              className="input"
              min="5"
              max="180"
              type="number"
              value={setup.feedingIntervalMinutes}
              onChange={(event) => updateSetup('feedingIntervalMinutes', event.target.value)}
            />
          </label>
          <label className="field-label">
            <span>WOWSA photo interval minutes</span>
            <input
              className="input"
              min="5"
              max="180"
              type="number"
              value={setup.wowsaPhotoIntervalMinutes}
              onChange={(event) => updateSetup('wowsaPhotoIntervalMinutes', event.target.value)}
            />
          </label>
        </div>
        <ul className="cadence-list setup-cadence">
          {generatedCadence.map((item) => (
            <li className="cadence-row" key={item.label}>
              <div>
                <div className="row-title">{item.label}</div>
                <div className="row-meta">{formatClock(item.at)}</div>
              </div>
              <item.icon aria-hidden="true" />
            </li>
          ))}
        </ul>
      </section>

      <section className="panel span-6">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Route Evidence</h3>
            <p className="panel-subtitle">Start and target GPS labels for reports.</p>
          </div>
          <MapPin aria-hidden="true" />
        </div>
        <div className="setup-field-grid one-column">
          <label className="field-label">
            <span>GPS start</span>
            <input className="input" value={setup.gpsStart} onChange={(event) => updateSetup('gpsStart', event.target.value)} />
          </label>
          <div className="row-actions">
            <button className="button" type="button" onClick={captureStartGps}>
              <MapPin aria-hidden="true" />
              Capture start GPS
            </button>
            {gpsStatus ? <span className="row-meta">{gpsStatus}</span> : null}
          </div>
          <label className="field-label">
            <span>GPS finish</span>
            <input className="input" value={setup.gpsEnd} onChange={(event) => updateSetup('gpsEnd', event.target.value)} />
          </label>
        </div>
      </section>

      <section className="panel span-6">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Vessels</h3>
            <p className="panel-subtitle">Support assets and report ownership.</p>
          </div>
          <Ship aria-hidden="true" />
        </div>
        <div className="setup-field-grid one-column">
          <label className="field-label">
            <span>Primary vessel</span>
            <input className="input" value={setup.primaryVessel} onChange={(event) => updateSetup('primaryVessel', event.target.value)} />
          </label>
          <label className="field-label">
            <span>Support vessels</span>
            <input className="input" value={setup.supportVessels} onChange={(event) => updateSetup('supportVessels', event.target.value)} />
          </label>
          <label className="field-label">
            <span>Lead crew</span>
            <input className="input" value={setup.leadCrew} onChange={(event) => updateSetup('leadCrew', event.target.value)} />
          </label>
          <label className="field-label">
            <span>Completed by</span>
            <input className="input" value={setup.completedBy} onChange={(event) => updateSetup('completedBy', event.target.value)} />
          </label>
        </div>
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Crew Assignments</h3>
            <p className="panel-subtitle">Names and phones carry into ownership, contacts, and logs.</p>
          </div>
          <UserRound aria-hidden="true" />
        </div>
        <div className="crew-setup-grid">
          {mission.crew.map((member) => {
            const assignment = setup.crew.find((candidate) => candidate.id === member.id) ?? member;
            return (
              <article className="crew-setup-card" key={member.id}>
                <div className="split-row">
                  <span className="role-pill">{roleLabels[member.role]}</span>
                </div>
                <label className="field-label">
                  <span>Name</span>
                  <input className="input" value={assignment.name} onChange={(event) => updateCrew(member.id, 'name', event.target.value)} />
                </label>
                <label className="field-label">
                  <span>Phone</span>
                  <input className="input" value={assignment.phone} onChange={(event) => updateCrew(member.id, 'phone', event.target.value)} />
                </label>
              </article>
            );
          })}
        </div>
      </section>
    </form>
  );
}
