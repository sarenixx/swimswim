import { ContactRound, Phone, ShieldCheck } from 'lucide-react';
import { roleLabels } from '../../state/seed';
import { formatClock } from '../../state/selectors';
import { useMissionStore } from '../../state/useMissionStore';

export function CrewRoles() {
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const setActiveActor = useMissionStore((state) => state.setActiveActor);

  return (
    <div className="page-grid">
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
