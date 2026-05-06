import { Megaphone, MessageSquare, SendHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatClock, getCrewLabel } from '../../state/selectors';
import type { CommunicationMessage } from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';

const channels: CommunicationMessage['channel'][] = ['broadcast', 'captain', 'safety', 'medical', 'kayak'];

const templates = [
  'Prepare for feeding',
  'Weather shift incoming',
  'All teams confirm status',
  'Kayak team confirm readiness',
  'Medical confirm recovery kit'
];

export function CommunicationHub() {
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const sendMessage = useMissionStore((state) => state.sendMessage);
  const [channel, setChannel] = useState<CommunicationMessage['channel']>('broadcast');
  const [messageBody, setMessageBody] = useState('All teams confirm status');

  const channelMessages = useMemo(
    () =>
      mission.communications
        .filter((message) => channel === 'broadcast' || message.channel === channel || message.channel === 'broadcast')
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [channel, mission.communications]
  );

  const submitMessage = (body = messageBody, targetChannel = channel) => {
    const trimmed = body.trim();
    if (!trimmed) {
      return;
    }

    sendMessage({
      channel: targetChannel,
      actorId: activeActorId,
      body: trimmed,
      requiresConfirmation: targetChannel === 'broadcast'
    });
    setMessageBody('');
  };

  return (
    <div className="page-grid">
      <section className="panel span-5">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Channels</h3>
            <p className="panel-subtitle">Active channel: {channel}</p>
          </div>
          <MessageSquare aria-hidden="true" />
        </div>
        <div className="segmented">
          {channels.map((item) => (
            <button className={channel === item ? 'segment active' : 'segment'} key={item} type="button" onClick={() => setChannel(item)}>
              {item}
            </button>
          ))}
        </div>

        <label className="field-label" style={{ marginTop: 16 }}>
          Message
          <textarea className="textarea" value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
        </label>
        <button className="button primary" type="button" style={{ marginTop: 12 }} onClick={() => submitMessage()}>
          <SendHorizontal aria-hidden="true" />
          Send
        </button>
      </section>

      <section className="panel span-7">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Quick Broadcasts</h3>
            <p className="panel-subtitle">Captain templates for common coordination moments.</p>
          </div>
          <Megaphone aria-hidden="true" />
        </div>
        <div className="template-grid">
          {templates.map((template) => (
            <button
              className="quick-button"
              key={template}
              type="button"
              onClick={() => {
                setChannel('broadcast');
                submitMessage(template, 'broadcast');
              }}
            >
              <Megaphone aria-hidden="true" />
              {template}
            </button>
          ))}
        </div>
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Message Log</h3>
            <p className="panel-subtitle">{channelMessages.length} messages visible in this view.</p>
          </div>
          <MessageSquare aria-hidden="true" />
        </div>
        <ul className="timeline-list">
          {channelMessages.map((message) => (
            <li className="timeline-item" key={message.id}>
              <span className="timeline-time">{formatClock(message.at)}</span>
              <div>
                <div className="timeline-summary">{message.body}</div>
                <div className="timeline-detail">
                  {getCrewLabel(mission, message.actorId)} · {message.channel}
                </div>
              </div>
              {message.requiresConfirmation ? <span className="severity-pill warning">confirm</span> : <span className="severity-pill info">sent</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
