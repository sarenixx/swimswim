import { AlertTriangle, Ban, PhoneCall, Waves, Wind } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMissionPath } from '../../app/missionNavigation';
import { formatClock, getActiveAlerts, getCrewLabel } from '../../state/selectors';
import { useMissionStore } from '../../state/useMissionStore';

const includesAny = (value: string, terms: string[]) => terms.some((term) => value.toLowerCase().includes(term.toLowerCase()));

export function ConditionsRisk() {
  const mission = useMissionStore((state) => state.mission);
  const activeAlerts = getActiveAlerts(mission);
  const riskPlan = mission.riskPlan ?? {
    tideWindow: 'Tide window pending',
    weatherSource: 'Weather source pending',
    abortConditions: [],
    medicalConcerns: [],
    mitigationNotes: []
  };
  const stopConditions = riskPlan.abortConditions
    .filter((condition) =>
      includesAny(condition, ['distress', 'medical veto', 'wind exceeds', 'visibility', 'shark', 'vessel emergency'])
    )
    .slice(0, 6);
  const medicalStopSigns = riskPlan.medicalConcerns
    .filter((concern) => includesAny(concern, ['rhabdomyolysis', 'hypothermia', 'pulmonary edema', 'oliguria']))
    .slice(0, 4);
  const commandControls = riskPlan.mitigationNotes
    .filter((note) => includesAny(note, ['final authority', 'go/no-go veto', 'communication loop']))
    .slice(0, 3);
  const latestRiskChange = [...mission.timeline]
    .filter((event) => event.summary === 'Safety/risk plan updated' || ['weather', 'condition', 'emergency'].includes(event.type))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];

  return (
    <div className="page-grid">
      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Conditions Snapshot</h3>
            <p className="panel-subtitle">Observed {formatClock(mission.conditions.observedAt)} · {mission.conditions.summary}</p>
          </div>
          <Waves aria-hidden="true" />
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="metric-label">Water</span>
            <span className="metric-value">{mission.conditions.waterTempF} F</span>
          </div>
          <div className="metric">
            <span className="metric-label">Air</span>
            <span className="metric-value">{mission.conditions.airTempF} F</span>
          </div>
          <div className="metric">
            <span className="metric-label">Wind</span>
            <span className="metric-value">{mission.conditions.windKts} kt</span>
          </div>
          <div className="metric">
            <span className="metric-label">Current</span>
            <span className="metric-value">{mission.conditions.currentKts} kt</span>
          </div>
          <div className="metric">
            <span className="metric-label">Swell</span>
            <span className="metric-value">{mission.conditions.swellFt} ft</span>
          </div>
          <div className="metric">
            <span className="metric-label">Visibility</span>
            <span className="metric-value">{mission.conditions.visibilityNm} nm</span>
          </div>
        </div>
        <div className="risk-source-strip">
          <span>Source: SwimCalifornia_Playbook.docx</span>
          <span>{riskPlan.weatherSource}</span>
          {latestRiskChange ? (
            <span>
              Last change: {formatClock(latestRiskChange.at)} · {getCrewLabel(mission, latestRiskChange.actorId)}
            </span>
          ) : null}
          <span className={activeAlerts.length ? 'severity-pill warning' : 'severity-pill info'}>
            {activeAlerts.length ? `${activeAlerts.length} active alert${activeAlerts.length > 1 ? 's' : ''}` : 'clear'}
          </span>
        </div>
      </section>

      <section className="panel span-7">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Stop Swim If</h3>
            <p className="panel-subtitle">Operational stop triggers.</p>
          </div>
          <Ban aria-hidden="true" />
        </div>
        <ul className="row-list compact-risk-list">
          {stopConditions.map((condition) => (
            <li className="list-row" key={condition}>
              <div className="split-row">
                <span className="row-title">{condition}</span>
                <span className="severity-pill critical">stop</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel span-5">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Review Before Launch</h3>
            <p className="panel-subtitle">Weather window, authority, and communication loop.</p>
          </div>
          <Wind aria-hidden="true" />
        </div>
        <div className="risk-callout">
          <span>{riskPlan.tideWindow}</span>
        </div>
        <ul className="row-list compact-risk-list">
          {commandControls.map((note) => (
            <li className="list-row" key={note}>
              <span className="row-title">{note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel span-7">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Medical Stop Signs</h3>
            <p className="panel-subtitle">Rhabdo, cold stress, SIPE, and urine output.</p>
          </div>
          <AlertTriangle aria-hidden="true" />
        </div>
        <ul className="row-list compact-risk-list">
          {medicalStopSigns.map((concern) => (
            <li className="list-row" key={concern}>
              <div className="split-row">
                <span className="row-title">{concern}</span>
                <span className="severity-pill warning">watch</span>
              </div>
            </li>
          ))}
        </ul>
        <Link className="button" to={getMissionPath(mission.mode, 'safety#medical-record')}>
          Open Medical Record
        </Link>
      </section>

      <section className="panel span-5">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Protocol Scenarios</h3>
            <p className="panel-subtitle">Medical, distress, and abort response.</p>
          </div>
          <PhoneCall aria-hidden="true" />
        </div>
        <Link className="protocol-button" to={getMissionPath(mission.mode, 'safety')}>
          Protocol
        </Link>
        <div className="contact-grid risk-contact-grid">
          {mission.contacts.slice(0, 3).map((contact) => (
            <article className="contact-card" key={contact.id}>
              <div>
                <div className="row-title">{contact.name}</div>
                <div className="row-meta">{contact.role}</div>
              </div>
              <a className="button primary" href={`tel:${contact.phone}`}>
                <PhoneCall aria-hidden="true" />
                Call
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
