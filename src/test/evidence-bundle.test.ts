import { describe, expect, it } from 'vitest';
import { createWowsaEvidenceBundle } from '../lib/evidenceBundle';
import { saveEvidenceImage } from '../lib/storage/evidenceStore';
import { buildLiveSeedMission } from '../state/seed';
import type { WowsaPhotoEntry } from '../state/types';

const textDecoder = new TextDecoder();

function readUint32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

async function readUncompressedZip(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const entries = new Map<string, Uint8Array>();
  let offset = 0;

  while (readUint32(view, offset) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = textDecoder.decode(bytes.slice(nameStart, nameStart + nameLength));

    expect(method).toBe(0);
    entries.set(name, bytes.slice(dataStart, dataStart + compressedSize));
    offset = dataStart + compressedSize;
  }

  expect(readUint32(view, offset)).toBe(0x02014b50);

  return entries;
}

describe('WOWSA evidence bundle', () => {
  it('creates a readable ZIP with saved photos and a manifest', async () => {
    const at = '2026-06-29T19:30:00.000Z';
    const imageStorageKey = 'mission-test/evidence/swimmer.jpg';
    const imageFile = new File(['photo-bytes'], 'swimmer.jpg', {
      type: 'image/jpeg',
    });
    await saveEvidenceImage(imageStorageKey, imageFile);

    const photo: WowsaPhotoEntry = {
      id: 'photo-1',
      number: 1,
      at,
      actorId: 'crew-captain',
      gps: '33.71000° N, 118.28000° W',
      lat: 33.71,
      lon: -118.28,
      gpsAccuracyM: 7,
      distanceSwum: '',
      notes: 'Test photo',
      weatherSummary: 'Partly cloudy',
      waterTempF: 61,
      windKts: 9,
      feedCompleted: false,
      hasPhoto: true,
      imageName: 'swimmer.jpg',
      imageStorageKey,
      imageSizeBytes: imageFile.size,
      evidenceStatus: 'ready',
    };
    const mission = {
      ...buildLiveSeedMission(new Date(at)),
      wowsaPhotos: [photo],
    };

    const { blob, result } = await createWowsaEvidenceBundle(mission);
    const entries = await readUncompressedZip(blob);
    const photoEntryName = Array.from(entries.keys()).find((name) =>
      name.startsWith('photos/observation-001-'),
    );

    expect(result).toMatchObject({
      exportedPhotos: 1,
      totalPhotos: 1,
      missingPhotoNumbers: [],
    });
    expect(entries.has('wowsa-evidence-manifest.json')).toBe(true);
    expect(photoEntryName).toBeDefined();
    expect(textDecoder.decode(entries.get(photoEntryName!)!)).toBe('photo-bytes');

    const manifest = JSON.parse(
      textDecoder.decode(entries.get('wowsa-evidence-manifest.json')!),
    );
    expect(manifest.bundle.files[0]).toMatchObject({
      number: 1,
      path: photoEntryName,
      originalName: 'swimmer.jpg',
      size: imageFile.size,
      type: 'image/jpeg',
      source: 'local',
    });
    expect(manifest.photos[0]).toMatchObject({
      number: 1,
      gps: '33.71000° N, 118.28000° W',
      imageName: 'swimmer.jpg',
      evidenceStatus: 'ready',
    });
  });
});
