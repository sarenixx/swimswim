import { ContactRound, Phone, ShieldCheck, UsersRound } from 'lucide-react';
import { roleLabels } from '../../state/seed';
import { formatClock, getActiveCrew } from '../../state/selectors';
import { useMissionStore } from '../../state/useMissionStore';
import { useNow } from '../../lib/useNow';

export function CrewRoles() {
  const now = useNow();
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const setActiveActor = useMissionStore((state) => state.setActiveActor);
  const activeCrew = getActiveCrew(mission, now);
  const findCrew = (memberId?: string) => mission.crew.find((member) => member.id === memberId);

  return (
    <div className="page-grid">
      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Coverage</h3>
            <p className="panel-subtitle">Who is currently accountable and who backs them up.</p>
          </div>
          <UsersRound aria-hidden="true" />
        </div>
        <div className="crew-coverage-grid">
          {mission.crew.map((member) => {
            const active = activeCrew.some((candidate) => candidate.id === member.id);
            const backup = findCrew(member.backupId);
            return (
              <article className="crew-coverage-card" key={`${member.id}-coverage`}>
                <div className="split-row">
                  <div>
                    <div className="row-title">{roleLabels[member.role]}</div>
                    <div className="row-meta">{member.name}</div>
                  </div>
                  <span className={active ? 'status-pill active' : 'status-pill pending'}>{active ? 'on duty' : 'standby'}</span>
                </div>
                <div className="row-meta">
                  Backup: {backup ? `${backup.name} · ${roleLabels[backup.role]}` : 'Not assigned'}
                </div>
                <div className="row-meta">{member.backupPlan ?? 'Confirm backup plan before launch.'}</div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Crew Directory</h3>
            <p className="panel-subtitle">Active actor: {mission.crew.find((member) => member.id === activeActorId)?.name}</p>
          </div>
          <ContactRound aria-hidden="true" />
        </div>
        <div className="crew-grid">
          {mission.crew.map((member) => (
            <article className="crew-card" key={member.id}>
              <div className="split-row">
                <div>
                  <div className="row-title">{member.name}</div>
                  <div className="row-meta">{roleLabels[member.role]}</div>
                </div>
                <span className={member.id === activeActorId ? 'status-pill active' : 'status-pill pending'}>
                  {member.id === activeActorId ? 'acting' : 'crew'}
                </span>
              </div>
              <div className="row-meta">
                Shift {formatClock(member.shiftStart)} to {formatClock(member.shiftEnd)}
              </div>
              <div className="row-meta">
                Backup: {findCrew(member.backupId)?.name ?? 'Not assigned'}
              </div>
              <a className="button" href={`tel:${member.phone}`}>
                <Phone aria-hidden="true" />
                {member.phone}
              </a>
              <button className="button primary" type="button" onClick={() => setActiveActor(member.id)}>
                Set active actor
              </button>
              <div>
                <div className="row-title">Responsibilities</div>
                <ul className="responsibility-list">
                  {member.responsibilities.map((responsibility) => (
                    <li className="responsibility-item" key={responsibility}>
                      <ShieldCheck aria-hidden="true" size={16} />
                      <span>{responsibility}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
