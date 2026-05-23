import { Camera, CheckCircle2, Handshake, Image as ImageIcon, Mail, MapPin, Plus, Timer, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import logoUrl from '../../assets/logo.webp';
import { getDevicePosition } from '../../lib/gps';
import {
  buildRouteCsv,
  buildWowsaEvidenceManifest,
  buildWowsaReport,
  getWowsaEvidenceChecks,
  mailtoHref
} from '../../lib/reports';
import { deleteEvidenceImage, getEvidenceImage, makeEvidenceImageKey, saveEvidenceImage } from '../../lib/storage/evidenceStore';
import { useNow } from '../../lib/useNow';
import { formatClock, getCrewLabel, getWowsaNextDueAt } from '../../state/selectors';
import { useMissionStore } from '../../state/useMissionStore';

interface PhotoDraft {
  gps: string;
  lat?: number;
  lon?: number;
  gpsAccuracyM?: number;
  distanceSwum: string;
  notes: string;
  hasPhoto: boolean;
  imageName: string;
  imageFile?: File;
  imagePreviewUrl: string;
}

const emptyPhotoDraft = (): PhotoDraft => ({
  gps: '',
  lat: undefined,
  lon: undefined,
  gpsAccuracyM: undefined,
  distanceSwum: '',
  notes: '',
  hasPhoto: false,
  imageName: '',
  imageFile: undefined,
  imagePreviewUrl: ''
});

function formatDueLabel(secondsUntil: number) {
  const absoluteSeconds = Math.abs(secondsUntil);
  const minutes = Math.floor(absoluteSeconds / 60);
  const seconds = absoluteSeconds % 60;
  const clock = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return secondsUntil < 0 ? `Overdue ${clock}` : clock;
}

export function PartnersMedia() {
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const completePartnerTask = useMissionStore((state) => state.completePartnerTask);
  const addWowsaPhoto = useMissionStore((state) => state.addWowsaPhoto);
  const removeWowsaPhoto = useMissionStore((state) => state.removeWowsaPhoto);
  const now = useNow(1000);
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft>(() => emptyPhotoDraft());
  const [gpsStatus, setGpsStatus] = useState('');
  const [storageStatus, setStorageStatus] = useState('');
  const [storedImageUrls, setStoredImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (window.location.hash !== '#wowsa-capture') {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById('wowsa-capture')?.scrollIntoView({ block: 'start' });
    });
  }, []);

  useEffect(() => {
    return () => {
      if (photoDraft.imagePreviewUrl) {
        URL.revokeObjectURL(photoDraft.imagePreviewUrl);
      }
    };
  }, [photoDraft.imagePreviewUrl]);

  const wowsaPhotos = mission.wowsaPhotos ?? [];

  useEffect(() => {
    let cancelled = false;
    const urlsToRevoke: string[] = [];

    async function loadStoredImages() {
      const nextUrls: Record<string, string> = {};

      await Promise.all(
        wowsaPhotos.map(async (photo) => {
          if (!photo.imageStorageKey || photo.imageDataUrl) {
            return;
          }

          try {
            const stored = await getEvidenceImage(photo.imageStorageKey);
            if (stored?.blob) {
              const url = URL.createObjectURL(stored.blob);
              urlsToRevoke.push(url);
              nextUrls[photo.id] = url;
            }
          } catch {
            nextUrls[photo.id] = '';
          }
        })
      );

      if (!cancelled) {
        setStoredImageUrls(nextUrls);
      }
    }

    loadStoredImages();

    return () => {
      cancelled = true;
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [wowsaPhotos]);

  const nextWowsaDueAt = getWowsaNextDueAt(mission);
  const secondsUntilNextPhoto = Math.floor((new Date(nextWowsaDueAt).getTime() - now.getTime()) / 1000);
  const timerLabel = formatDueLabel(secondsUntilNextPhoto);

  const resetDraft = () => {
    if (photoDraft.imagePreviewUrl) {
      URL.revokeObjectURL(photoDraft.imagePreviewUrl);
    }
    setPhotoDraft(emptyPhotoDraft());
  };

  const logPhoto = async () => {
    const at = new Date().toISOString();
    let imageStorageKey: string | undefined;
    let imageSizeBytes: number | undefined;

    setStorageStatus(photoDraft.imageFile ? 'Saving image locally...' : 'Saving evidence record...');

    try {
      if (photoDraft.imageFile) {
        imageStorageKey = makeEvidenceImageKey(mission.id, at, photoDraft.imageFile.name);
        await saveEvidenceImage(imageStorageKey, photoDraft.imageFile);
        imageSizeBytes = photoDraft.imageFile.size;
      }

      addWowsaPhoto({
        at,
        gps: photoDraft.gps || mission.position.label,
        lat: photoDraft.lat,
        lon: photoDraft.lon,
        gpsAccuracyM: photoDraft.gpsAccuracyM,
        distanceSwum: photoDraft.distanceSwum,
        notes: photoDraft.notes,
        hasPhoto: photoDraft.hasPhoto,
        imageName: photoDraft.imageName,
        imageStorageKey,
        imageSizeBytes,
        actorId: activeActorId
      });
      setStorageStatus(imageStorageKey ? 'Evidence saved locally with image.' : 'Evidence record saved locally.');
      resetDraft();
    } catch (error) {
      setStorageStatus(error instanceof Error ? error.message : 'Could not save evidence locally.');
    }
  };

  const capturePhotoGps = async () => {
    setGpsStatus('Capturing GPS...');
    try {
      const position = await getDevicePosition();
      setPhotoDraft((draft) => ({
        ...draft,
        gps: position.label,
        lat: position.lat,
        lon: position.lon,
        gpsAccuracyM: position.accuracyM
      }));
      setGpsStatus(`GPS captured ${position.accuracyM ? `±${Math.round(position.accuracyM)}m` : ''}`);
    } catch (error) {
      setGpsStatus(error instanceof Error ? error.message : 'GPS capture failed.');
    }
  };

  const handlePhotoFile = (file?: File) => {
    if (!file) {
      return;
    }

    const imagePreviewUrl = URL.createObjectURL(file);
    setPhotoDraft((draft) => ({
      ...draft,
      imagePreviewUrl,
      imageFile: file,
      hasPhoto: true,
      imageName: file.name
    }));
    setStorageStatus('Image ready for local save.');
  };

  const handleRemovePhoto = async (photoId: string, imageStorageKey?: string) => {
    if (imageStorageKey) {
      try {
        await deleteEvidenceImage(imageStorageKey);
      } catch {
        setStorageStatus('Removed record. Could not remove cached image.');
      }
    }

    removeWowsaPhoto(photoId);
  };

  const reportDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const evidenceManifestHref = `data:application/json;charset=utf-8,${encodeURIComponent(buildWowsaEvidenceManifest(mission))}`;
  const routeCsvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(buildRouteCsv(mission))}`;
  const reportEmail = mission.session.operationsEmail || 'operations@example.com';
  const reportPrefix = mission.mode === 'template' ? 'Endurance Swim Template' : 'Swim California';
  const routeCsvName = mission.mode === 'template' ? 'expedition-route-template.csv' : 'swim-route-checkpoints.csv';

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
        <img className="logo-watermark" src={logoUrl} alt={reportPrefix} style={{ marginTop: 16 }} />
      </section>

      <section className="panel span-8" id="wowsa-capture">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">WOWSA GPS Photo Evidence</h3>
            <p className="panel-subtitle">Save photo, GPS, timestamp, and distance evidence locally on this device.</p>
          </div>
          <Timer aria-hidden="true" />
        </div>
        <div className={`critical-action compact ${secondsUntilNextPhoto <= 0 ? 'critical' : secondsUntilNextPhoto <= 120 ? 'warning' : 'normal'}`} style={{ marginBottom: 16 }}>
          <p className="page-kicker">Next GPS Photo</p>
          <h3 className="critical-title">{timerLabel}</h3>
          <p className="critical-detail">Due at {formatClock(nextWowsaDueAt)} based on the last saved WOWSA photo.</p>
          <div className="critical-meta">
            <button className="button primary" type="button" onClick={logPhoto}>
              <Camera aria-hidden="true" />
              Save evidence record
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
          <label className="field-label">
            GPS accuracy
            <input className="input" value={photoDraft.gpsAccuracyM ? `±${Math.round(photoDraft.gpsAccuracyM)}m` : ''} readOnly placeholder="Capture GPS to fill accuracy" />
          </label>
          <label className="field-label">
            Local image
            <input className="input" value={photoDraft.imageName} readOnly placeholder="Take or attach a photo" />
          </label>
        </div>
        <div className="two-column-form" style={{ marginTop: 12 }}>
          <label className="field-label">
            Latitude
            <input className="input" value={photoDraft.lat ?? ''} readOnly placeholder="Capture GPS" />
          </label>
          <label className="field-label">
            Longitude
            <input className="input" value={photoDraft.lon ?? ''} readOnly placeholder="Capture GPS" />
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
          <button className="button primary" type="button" onClick={logPhoto}>
            <Plus aria-hidden="true" />
            Save evidence
          </button>
          {gpsStatus ? <span className="row-meta">{gpsStatus}</span> : null}
          {storageStatus ? <span className="row-meta">{storageStatus}</span> : null}
        </div>
        {photoDraft.imagePreviewUrl ? (
          <img className="evidence-preview" src={photoDraft.imagePreviewUrl} alt="Selected WOWSA evidence" />
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
          <a className="button" href={evidenceManifestHref} download="wowsa-evidence-manifest.json">
            <CheckCircle2 aria-hidden="true" />
            Evidence JSON
          </a>
          <a className="button" href={routeCsvHref} download={routeCsvName}>
            <MapPin aria-hidden="true" />
            Route CSV
          </a>
          <a
            className="button"
            href={mailtoHref(
              reportEmail,
              `${reportPrefix} - WOWSA Certification Photo Log - ${mission.session.location || mission.name} - ${reportDate}`,
              buildWowsaReport(mission)
            )}
          >
            <Mail aria-hidden="true" />
            WOWSA Email
          </a>
        </div>
        {wowsaPhotos.length ? (
          <ul className="row-list" style={{ marginTop: 16 }}>
            {wowsaPhotos.map((photo) => {
              const imageUrl = photo.imageDataUrl || storedImageUrls[photo.id];

              return (
                <li className="list-row" key={photo.id}>
                  <div className="split-row">
                    <div>
                      <div className="row-title">Photo #{photo.number}</div>
                      <div className="row-meta">
                        {formatClock(photo.at)} · {photo.gps || 'GPS not set'}
                        {photo.gpsAccuracyM ? ` · ±${Math.round(photo.gpsAccuracyM)}m` : ''} · {photo.distanceSwum || 'distance not set'}
                      </div>
                      <div className="row-meta">
                        {photo.imageName || 'No image name recorded'}
                        {photo.imageStorageKey ? ' · stored in browser evidence cache' : ''}
                      </div>
                    </div>
                    <div className="row-actions">
                      <span className={photo.evidenceStatus === 'ready' ? 'status-pill done' : 'status-pill overdue'}>
                        {photo.evidenceStatus}
                      </span>
                      {imageUrl ? (
                        <a className="button" href={imageUrl} download={photo.imageName || `wowsa-photo-${photo.number}.jpg`}>
                          Image
                        </a>
                      ) : null}
                      <button className="button-icon" type="button" aria-label={`Remove photo ${photo.number}`} onClick={() => handleRemovePhoto(photo.id, photo.imageStorageKey)}>
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {imageUrl ? <img className="evidence-thumb" src={imageUrl} alt={`WOWSA evidence ${photo.number}`} /> : null}
                  <ul className="evidence-checks" aria-label={`Evidence checks for photo ${photo.number}`}>
                    {getWowsaEvidenceChecks(photo).map((check) => (
                      <li className={check.done ? 'evidence-check done' : 'evidence-check missing'} key={check.id}>
                        <CheckCircle2 aria-hidden="true" />
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
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
