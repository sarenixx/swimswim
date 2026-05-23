import { AlertTriangle, Ambulance, Ban, PhoneCall, ShieldAlert, Thermometer, Waves, Wind } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMissionPath } from '../../app/missionNavigation';
import { formatClock, getActiveAlerts } from '../../state/selectors';
import type { EmergencyKind } from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';

const emergencyKinds: EmergencyKind[] = ['medical', 'distress', 'abort'];
const protocolLabels: Record<EmergencyKind, string> = {
  medical: 'Medical',
  distress: 'Distress',
  abort: 'Abort'
};

export function ConditionsRisk() {
  const mission = useMissionStore((state) => state.mission);
  const openEmergencyProtocol = useMissionStore((state) => state.openEmergencyProtocol);
  const activeAlerts = getActiveAlerts(mission);
  const riskPlan = mission.riskPlan ?? {
    tideWindow: 'Tide window pending',
    weatherSource: 'Weather source pending',
    abortConditions: [],
    medicalConcerns: [],
    mitigationNotes: []
  };

  return (
    <div className="page-grid">
      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Conditions</h3>
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
      </section>

      <section className="panel span-5">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Weather + Tide</h3>
            <p className="panel-subtitle">{riskPlan.weatherSource}</p>
          </div>
          <Wind aria-hidden="true" />
        </div>
        <div className="risk-callout">
          <Thermometer aria-hidden="true" />
          <span>{riskPlan.tideWindow}</span>
        </div>
      </section>

      <section className="panel span-7">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Abort Conditions</h3>
            <p className="panel-subtitle">Captain owns the final call.</p>
          </div>
          <Ban aria-hidden="true" />
        </div>
        <ul className="row-list">
          {riskPlan.abortConditions.map((condition) => (
            <li className="list-row" key={condition}>
              <div className="split-row">
                <span className="row-title">{condition}</span>
                <span className="severity-pill warning">watch</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel span-6">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Medical Concerns</h3>
            <p className="panel-subtitle">Escalate when trend changes.</p>
          </div>
          <Ambulance aria-hidden="true" />
        </div>
        <ul className="row-list">
          {riskPlan.medicalConcerns.map((concern) => (
            <li className="list-row" key={concern}>
              <span className="row-title">{concern}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel span-6">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Risk Controls</h3>
            <p className="panel-subtitle">Current mitigation owners.</p>
          </div>
          <ShieldAlert aria-hidden="true" />
        </div>
        <ul className="row-list">
          {riskPlan.mitigationNotes.map((note) => (
            <li className="list-row" key={note}>
              <span className="row-title">{note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel span-7">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Active Risk Alerts</h3>
            <p className="panel-subtitle">{activeAlerts.length ? `${activeAlerts.length} open` : 'Clear'}</p>
          </div>
          <AlertTriangle aria-hidden="true" />
        </div>
        {activeAlerts.length ? (
          <ul className="alert-list">
            {activeAlerts.map((alert) => (
              <li className={`alert-row ${alert.severity}`} key={alert.id}>
                <div className="split-row">
                  <div>
                    <div className="row-title">{alert.title}</div>
                    <div className="alert-detail">
                      {alert.detail} · {formatClock(alert.createdAt)}
                    </div>
                  </div>
                  <span className={`severity-pill ${alert.severity}`}>{alert.severity}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">No active risk alerts.</div>
        )}
      </section>

      <section className="panel span-5">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Emergency Access</h3>
            <p className="panel-subtitle">Trigger protocol from here</p>
          </div>
          <PhoneCall aria-hidden="true" />
        </div>
        <div className="protocol-button-grid">
          {emergencyKinds.map((kind) => (
            <Link className="protocol-button" key={kind} to={getMissionPath(mission.mode, 'safety')} onClick={() => openEmergencyProtocol(kind)}>
              {protocolLabels[kind]}
            </Link>
          ))}
        </div>
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
