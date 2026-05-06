import { Camera, CheckCircle2, Handshake, Image as ImageIcon, Mail, MapPin, Plus, Timer, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import logoUrl from '../../assets/logo.webp';
import { getDevicePosition, readFileAsDataUrl } from '../../lib/gps';
import {
  buildRouteCsv,
  buildWowsaEvidenceManifest,
  buildWowsaReport,
  getWowsaEvidenceChecks,
  mailtoHref
} from '../../lib/reports';
import { formatClock, getCrewLabel } from '../../state/selectors';
import { useMissionStore } from '../../state/useMissionStore';

export function PartnersMedia() {
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const completePartnerTask = useMissionStore((state) => state.completePartnerTask);
  const addWowsaPhoto = useMissionStore((state) => state.addWowsaPhoto);
  const removeWowsaPhoto = useMissionStore((state) => state.removeWowsaPhoto);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30 * 60);
  const [photoDraft, setPhotoDraft] = useState({
    gps: '',
    gpsAccuracyM: undefined as number | undefined,
    distanceSwum: '',
    notes: '',
    hasPhoto: false,
    imageName: '',
    imageDataUrl: ''
  });
  const [gpsStatus, setGpsStatus] = useState('');

  useEffect(() => {
    if (!timerRunning) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setTimerSeconds((seconds) => (seconds <= 1 ? 30 * 60 : seconds - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const timerLabel = `${Math.floor(timerSeconds / 60)
    .toString()
    .padStart(2, '0')}:${(timerSeconds % 60).toString().padStart(2, '0')}`;

  const logPhoto = () => {
    addWowsaPhoto({
      gps: photoDraft.gps || mission.position.label,
      gpsAccuracyM: photoDraft.gpsAccuracyM,
      distanceSwum: photoDraft.distanceSwum,
      notes: photoDraft.notes,
      hasPhoto: photoDraft.hasPhoto,
      imageName: photoDraft.imageName,
      imageDataUrl: photoDraft.imageDataUrl,
      actorId: activeActorId
    });
    setTimerSeconds(30 * 60);
    setPhotoDraft({ gps: '', gpsAccuracyM: undefined, distanceSwum: '', notes: '', hasPhoto: false, imageName: '', imageDataUrl: '' });
  };

  const capturePhotoGps = async () => {
    setGpsStatus('Capturing GPS...');
    try {
      const position = await getDevicePosition();
      setPhotoDraft((draft) => ({
        ...draft,
        gps: position.label,
        gpsAccuracyM: position.accuracyM
      }));
      setGpsStatus(`GPS captured ${position.accuracyM ? `±${Math.round(position.accuracyM)}m` : ''}`);
    } catch (error) {
      setGpsStatus(error instanceof Error ? error.message : 'GPS capture failed.');
    }
  };

  const handlePhotoFile = async (file?: File) => {
    if (!file) {
      return;
    }

    const imageDataUrl = await readFileAsDataUrl(file);
    setPhotoDraft((draft) => ({
      ...draft,
      hasPhoto: true,
      imageName: file.name,
      imageDataUrl
    }));
  };

  const reportDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const wowsaPhotos = mission.wowsaPhotos ?? [];
  const evidenceManifestHref = `data:application/json;charset=utf-8,${encodeURIComponent(buildWowsaEvidenceManifest(mission))}`;
  const routeCsvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(buildRouteCsv(mission))}`;

  return (
    <div className="page-grid">
      <section className="panel span-4">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">WOWSA Evidence Summary</h3>
            <p className="panel-subtitle">{wowsaPhotos.length} GPS photo records logged.</p>
          </div>
          <Camera aria-hidden="true" />
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="metric-label">Ready Evidence</span>
            <span className="metric-value">{wowsaPhotos.filter((photo) => photo.evidenceStatus === 'ready').length}</span>
            <span className="metric-note">Image + GPS</span>
          </div>
          <div className="metric">
            <span className="metric-label">Needs Review</span>
            <span className="metric-value">{wowsaPhotos.filter((photo) => photo.evidenceStatus !== 'ready').length}</span>
            <span className="metric-note">Missing image or GPS</span>
          </div>
        </div>
        <img className="logo-watermark" src={logoUrl} alt="Swim California" style={{ marginTop: 16 }} />
      </section>

      <section className="panel span-8">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">WOWSA GPS Photo Evidence</h3>
            <p className="panel-subtitle">Every record needs a photo, GPS, timestamp, and distance note.</p>
          </div>
          <Timer aria-hidden="true" />
        </div>
        <div className={`critical-action compact ${timerSeconds <= 120 ? 'warning' : 'normal'}`} style={{ marginBottom: 16 }}>
          <p className="page-kicker">Next Photo Due In</p>
          <h3 className="critical-title">{timerLabel}</h3>
          <div className="critical-meta">
            <button className="button primary" type="button" onClick={() => setTimerRunning((running) => !running)}>
              <Timer aria-hidden="true" />
              {timerRunning ? 'Pause' : 'Start'}
            </button>
            <button className="button" type="button" onClick={logPhoto}>
              <Camera aria-hidden="true" />
              Mark photo taken
            </button>
          </div>
        </div>
        <div className="two-column-form">
          <label className="field-label">
            Photo GPS
            <input
              className="input"
              value={photoDraft.gps}
              onChange={(event) => setPhotoDraft((draft) => ({ ...draft, gps: event.target.value }))}
              placeholder={mission.position.label}
            />
          </label>
          <label className="field-label">
            Cumulative distance
            <input
              className="input"
              value={photoDraft.distanceSwum}
              onChange={(event) => setPhotoDraft((draft) => ({ ...draft, distanceSwum: event.target.value }))}
              placeholder="4.2 miles"
            />
          </label>
        </div>
        <div className="row-actions" style={{ marginTop: 12 }}>
          <button className="button" type="button" onClick={capturePhotoGps}>
            <MapPin aria-hidden="true" />
            Capture photo GPS
          </button>
          <label className="button">
            <ImageIcon aria-hidden="true" />
            Add image
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(event) => handlePhotoFile(event.target.files?.[0])}
            />
          </label>
          {gpsStatus ? <span className="row-meta">{gpsStatus}</span> : null}
          {photoDraft.imageName ? <span className="role-pill">{photoDraft.imageName}</span> : null}
        </div>
        {photoDraft.imageDataUrl ? (
          <img className="evidence-preview" src={photoDraft.imageDataUrl} alt="Selected WOWSA evidence" />
        ) : null}
        <label className="field-label" style={{ marginTop: 12 }}>
          Notes
          <textarea
            className="textarea"
            value={photoDraft.notes}
            onChange={(event) => setPhotoDraft((draft) => ({ ...draft, notes: event.target.value }))}
            placeholder="Conditions, landmarks, file name, or certification notes"
          />
        </label>
        <div className="row-actions" style={{ marginTop: 12 }}>
          <button className="button primary" type="button" onClick={logPhoto}>
            <Plus aria-hidden="true" />
            Add photo log
          </button>
          <a className="button" href={evidenceManifestHref} download="wowsa-evidence-manifest.json">
            <CheckCircle2 aria-hidden="true" />
            Evidence JSON
          </a>
          <a className="button" href={routeCsvHref} download="swim-route-checkpoints.csv">
            <MapPin aria-hidden="true" />
            Route CSV
          </a>
          <a
            className="button"
            href={mailtoHref(
              'swimcalifornia2026@gmail.com',
              `Swim California - WOWSA Certification Photo Log - ${mission.session.location || mission.name} - ${reportDate}`,
              buildWowsaReport(mission)
            )}
          >
            <Mail aria-hidden="true" />
            WOWSA Email
          </a>
        </div>
        {wowsaPhotos.length ? (
          <ul className="row-list" style={{ marginTop: 16 }}>
            {wowsaPhotos.map((photo) => (
              <li className="list-row" key={photo.id}>
                <div className="split-row">
                  <div>
                    <div className="row-title">Photo #{photo.number}</div>
                    <div className="row-meta">
                      {formatClock(photo.at)} · {photo.gps || 'GPS not set'}
                      {photo.gpsAccuracyM ? ` · ±${Math.round(photo.gpsAccuracyM)}m` : ''} · {photo.distanceSwum || 'distance not set'}
                    </div>
                    <div className="row-meta">{photo.imageName || 'No image name recorded'}</div>
                  </div>
                  <div className="row-actions">
                    <span className={photo.evidenceStatus === 'ready' ? 'status-pill done' : 'status-pill overdue'}>
                      {photo.evidenceStatus}
                    </span>
                    <button className="button-icon" type="button" aria-label={`Remove photo ${photo.number}`} onClick={() => removeWowsaPhoto(photo.id)}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {photo.imageDataUrl ? <img className="evidence-thumb" src={photo.imageDataUrl} alt={`WOWSA evidence ${photo.number}`} /> : null}
                <ul className="evidence-checks" aria-label={`Evidence checks for photo ${photo.number}`}>
                  {getWowsaEvidenceChecks(photo).map((check) => (
                    <li className={check.done ? 'evidence-check done' : 'evidence-check missing'} key={check.id}>
                      <CheckCircle2 aria-hidden="true" />
                      {check.label}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Route Evidence</h3>
            <p className="panel-subtitle">{(mission.expeditionCheckpoints ?? []).length} ordered GPS checkpoints.</p>
          </div>
          <MapPin aria-hidden="true" />
        </div>
        <ul className="timeline-list">
          {(mission.expeditionCheckpoints ?? []).map((checkpoint) => (
            <li className="timeline-item" key={checkpoint.id}>
              <span className="timeline-time">{formatClock(checkpoint.at)}</span>
              <div>
                <div className="timeline-summary">{checkpoint.label}</div>
                <div className="timeline-detail">
                  {checkpoint.gps} {checkpoint.accuracyM ? `· ±${Math.round(checkpoint.accuracyM)}m` : ''} · {checkpoint.note}
                </div>
              </div>
              <span className="severity-pill info">gps</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel span-8">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Sponsor Obligations</h3>
            <p className="panel-subtitle">Media window: hold unless safety is clear.</p>
          </div>
          <Handshake aria-hidden="true" />
        </div>
        <ul className="row-list">
          {mission.partnerTasks.map((task) => (
            <li className="list-row" key={task.id}>
              <div className="split-row">
                <div>
                  <div className="row-title">{task.title}</div>
                  <div className="row-meta">
                    {getCrewLabel(mission, task.ownerId)} · Due {formatClock(task.dueAt)}
                  </div>
                </div>
                <span className={`status-pill ${task.status}`}>{task.status}</span>
              </div>
              <span className="row-meta">{task.notes}</span>
              <div className="row-actions">
                <button
                  className="button primary"
                  type="button"
                  disabled={task.status === 'done'}
                  onClick={() => completePartnerTask(task.id)}
                >
                  <CheckCircle2 aria-hidden="true" />
                  Complete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
