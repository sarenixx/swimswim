import { PhoneCall, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { roleLabels } from '../../state/seed';
import { formatClock, getActiveAlerts, getProtocolForKind } from '../../state/selectors';
import type { EmergencyKind } from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';

const protocolLabels: Record<EmergencyKind, string> = {
  medical: 'Medical',
  distress: 'Distress',
  abort: 'Abort'
};

export function SafetyEmergency() {
  const mission = useMissionStore((state) => state.mission);
  const resolveAlert = useMissionStore((state) => state.resolveAlert);
  const [selectedKind, setSelectedKind] = useState<EmergencyKind>(mission.activeProtocolKind ?? 'distress');
  const selectedProtocol = getProtocolForKind(mission, selectedKind);
  const activeAlerts = getActiveAlerts(mission);

  return (
    <div className="page-grid">
      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Protocol Scenarios</h3>
            <p className="panel-subtitle">Review what to do for medical, distress, and abort scenarios.</p>
          </div>
          <ShieldAlert aria-hidden="true" />
        </div>
        <a className="protocol-button large protocol-button-single" href="#scenario-protocol">
          Protocol
        </a>
      </section>

      <section className="panel span-7" id="scenario-protocol">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">{selectedProtocol?.title ?? 'Emergency Protocol'}</h3>
            <p className="panel-subtitle">Step order and role ownership stay visible during response.</p>
          </div>
          <label className="field-label scenario-picker">
            Scenario
            <select className="select" value={selectedKind} onChange={(event) => setSelectedKind(event.target.value as EmergencyKind)}>
              {mission.protocols.map((protocol) => (
                <option key={protocol.kind} value={protocol.kind}>
                  {protocolLabels[protocol.kind]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedProtocol ? (
          <ol className="protocol-list">
            {selectedProtocol.steps.map((step) => (
              <li className="protocol-step" key={step.id}>
                <span className="protocol-index">{step.order}</span>
                <div>
                  <div className="row-title">{step.label}</div>
                  <div className="protocol-owner">{roleLabels[step.ownerRole]}</div>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <section className="panel span-5">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Critical Contacts</h3>
            <p className="panel-subtitle">Primary response channels.</p>
          </div>
          <PhoneCall aria-hidden="true" />
        </div>
        <div className="contact-grid">
          {mission.contacts.map((contact) => (
            <article className="contact-card" key={contact.id}>
              <div>
                <div className="row-title">{contact.name}</div>
                <div className="row-meta">{contact.role}</div>
              </div>
              <div className="split-row">
                <a className="button primary" href={`tel:${contact.phone}`}>
                  <PhoneCall aria-hidden="true" />
                  Call
                </a>
                <span className="role-pill">{contact.channel}</span>
              </div>
              <span className="row-meta">{contact.phone}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Safety Alerts</h3>
            <p className="panel-subtitle">Active, acknowledged, and resolved emergency flags.</p>
          </div>
          <ShieldAlert aria-hidden="true" />
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
                <div className="alert-actions">
                  <button className="button ghost" type="button" onClick={() => resolveAlert(alert.id)}>
                    Resolve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">No active safety alerts.</div>
        )}
      </section>
    </div>
  );
}
