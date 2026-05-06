import { Ambulance, Ban, PhoneCall, ShieldAlert, Siren } from 'lucide-react';
import { useState } from 'react';
import { emergencyLabels, roleLabels } from '../../state/seed';
import { formatClock, getActiveAlerts, getProtocolForKind } from '../../state/selectors';
import type { EmergencyKind } from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';

const emergencyButtons: Array<{ kind: EmergencyKind; icon: typeof ShieldAlert; className: string }> = [
  { kind: 'medical', icon: Ambulance, className: 'emergency-button medical' },
  { kind: 'distress', icon: Siren, className: 'emergency-button' },
  { kind: 'abort', icon: Ban, className: 'emergency-button abort' }
];

export function SafetyEmergency() {
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const triggerEmergency = useMissionStore((state) => state.triggerEmergency);
  const resolveAlert = useMissionStore((state) => state.resolveAlert);
  const [selectedKind, setSelectedKind] = useState<EmergencyKind>(mission.activeProtocolKind ?? 'distress');
  const selectedProtocol = getProtocolForKind(mission, selectedKind);
  const activeAlerts = getActiveAlerts(mission);

  const handleEmergency = (kind: EmergencyKind) => {
    setSelectedKind(kind);
    triggerEmergency(kind, activeActorId);
  };

  return (
    <div className="page-grid">
      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Emergency Triggers</h3>
            <p className="panel-subtitle">Current mission status: {mission.status}</p>
          </div>
          <ShieldAlert aria-hidden="true" />
        </div>
        <div className="emergency-grid">
          {emergencyButtons.map((button) => (
            <button className={button.className} key={button.kind} type="button" onClick={() => handleEmergency(button.kind)}>
              <button.icon aria-hidden="true" />
              {emergencyLabels[button.kind]}
            </button>
          ))}
        </div>
      </section>

      <section className="panel span-7">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">{selectedProtocol?.title ?? 'Emergency Protocol'}</h3>
            <p className="panel-subtitle">Step order and role ownership stay visible during response.</p>
          </div>
          <div className="segmented">
            {mission.protocols.map((protocol) => (
              <button
                className={selectedKind === protocol.kind ? 'segment active' : 'segment'}
                key={protocol.kind}
                type="button"
                onClick={() => setSelectedKind(protocol.kind)}
              >
                {emergencyLabels[protocol.kind]}
              </button>
            ))}
          </div>
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
          <Siren aria-hidden="true" />
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
