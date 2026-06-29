import { buildWowsaEvidenceManifest } from './reports';
import type { Mission, WowsaPhotoEntry } from '../state/types';
import { getEvidenceImage } from './storage/evidenceStore';
import { getEvidenceImageUrl } from './sync/supabaseClient';

interface ZipFileEntry {
  name: string;
  blob: Blob;
}

interface EvidenceFileRecord {
  number: number;
  path: string;
  originalName?: string;
  size: number;
  type: string;
  source: 'embedded' | 'local' | 'remote';
}

export interface EvidenceBundleResult {
  fileName: string;
  totalPhotos: number;
  exportedPhotos: number;
  missingPhotoNumbers: number[];
}

export interface PreparedEvidenceBundleDownload {
  href: string;
  fileName: string;
  result: EvidenceBundleResult;
  revoke: () => void;
}

const textEncoder = new TextEncoder();
let crcTable: Uint32Array | undefined;

function getCrcTable() {
  if (crcTable) {
    return crcTable;
  }

  crcTable = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    crcTable[index] = value >>> 0;
  }

  return crcTable;
}

function crc32(bytes: Uint8Array) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getDosTimeParts(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { dosDate, dosTime };
}

function makeZipHeader(byteLength: number) {
  return new Uint8Array(byteLength);
}

function writeLocalHeader(
  nameBytes: Uint8Array,
  data: Uint8Array,
  modifiedAt: Date,
) {
  const header = makeZipHeader(30 + nameBytes.byteLength);
  const view = new DataView(header.buffer);
  const { dosDate, dosTime } = getDosTimeParts(modifiedAt);
  const checksum = crc32(data);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, dosTime, true);
  view.setUint16(12, dosDate, true);
  view.setUint32(14, checksum, true);
  view.setUint32(18, data.byteLength, true);
  view.setUint32(22, data.byteLength, true);
  view.setUint16(26, nameBytes.byteLength, true);
  view.setUint16(28, 0, true);
  header.set(nameBytes, 30);

  return { checksum, header };
}

function writeCentralDirectoryHeader(input: {
  nameBytes: Uint8Array;
  data: Uint8Array;
  checksum: number;
  localHeaderOffset: number;
  modifiedAt: Date;
}) {
  const header = makeZipHeader(46 + input.nameBytes.byteLength);
  const view = new DataView(header.buffer);
  const { dosDate, dosTime } = getDosTimeParts(input.modifiedAt);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, dosTime, true);
  view.setUint16(14, dosDate, true);
  view.setUint32(16, input.checksum, true);
  view.setUint32(20, input.data.byteLength, true);
  view.setUint32(24, input.data.byteLength, true);
  view.setUint16(28, input.nameBytes.byteLength, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, input.localHeaderOffset, true);
  header.set(input.nameBytes, 46);

  return header;
}

async function createZip(files: ZipFileEntry[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const nameBytes = textEncoder.encode(file.name);
    const modifiedAt = new Date();
    const { checksum, header } = writeLocalHeader(nameBytes, data, modifiedAt);

    localParts.push(header, data);
    centralParts.push(
      writeCentralDirectoryHeader({
        nameBytes,
        data,
        checksum,
        localHeaderOffset: offset,
        modifiedAt,
      }),
    );
    offset += header.byteLength + data.byteLength;
  }

  const centralDirectoryOffset = offset;
  const centralDirectorySize = centralParts.reduce(
    (total, part) => total + part.byteLength,
    0,
  );
  const end = makeZipHeader(22);
  const endView = new DataView(end.buffer);

  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDirectorySize, true);
  endView.setUint32(16, centralDirectoryOffset, true);
  endView.setUint16(20, 0, true);

  const blobParts = [...localParts, ...centralParts, end].map((part) => {
    const copy = new ArrayBuffer(part.byteLength);
    new Uint8Array(copy).set(part);
    return copy;
  });

  return new Blob(blobParts, {
    type: 'application/zip',
  });
}

function safeFilePart(value: string, fallback: string) {
  const safe = value
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);

  return safe || fallback;
}

function safeTimestamp(value: string) {
  const date = new Date(value);
  const iso = Number.isNaN(date.getTime()) ? value : date.toISOString();

  return safeFilePart(iso.replace(/[:.]/g, '-'), 'undated');
}

function extensionFromType(type: string) {
  if (type === 'image/png') {
    return '.png';
  }
  if (type === 'image/webp') {
    return '.webp';
  }
  if (type === 'image/heic') {
    return '.heic';
  }
  if (type === 'image/heif') {
    return '.heif';
  }

  return '.jpg';
}

function extensionFromName(name: string | undefined, type: string) {
  const match = name?.match(/(\.[a-z0-9]{2,8})$/i);
  return match ? match[1].toLowerCase() : extensionFromType(type);
}

function makePhotoPath(photo: WowsaPhotoEntry, blob: Blob, usedPaths: Set<string>) {
  const originalName = photo.imageName?.replace(/\.[^.]+$/u, '') ?? 'photo';
  const baseName = safeFilePart(originalName, 'photo');
  const extension = extensionFromName(photo.imageName, blob.type);
  const prefix = `photos/observation-${String(photo.number).padStart(3, '0')}-${safeTimestamp(photo.at)}`;
  let path = `${prefix}-${baseName}${extension}`;
  let copy = 2;

  while (usedPaths.has(path)) {
    path = `${prefix}-${baseName}-${copy}${extension}`;
    copy += 1;
  }

  usedPaths.add(path);
  return path;
}

function blobFromDataUrl(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Embedded image data is invalid.');
  }

  const header = dataUrl.slice(0, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);
  const type = header.match(/^data:([^;,]+)/)?.[1] ?? 'application/octet-stream';
  const isBase64 = header.includes(';base64');
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type });
}

async function getPhotoBlob(photo: WowsaPhotoEntry) {
  if (photo.imageDataUrl) {
    return {
      blob: blobFromDataUrl(photo.imageDataUrl),
      source: 'embedded' as const,
    };
  }

  if (!photo.imageStorageKey) {
    return undefined;
  }

  const remoteUrl = await getEvidenceImageUrl(photo.imageStorageKey);
  if (remoteUrl) {
    try {
      const response = await fetch(remoteUrl);
      if (response.ok) {
        return {
          blob: await response.blob(),
          source: 'remote' as const,
        };
      }
    } catch {
      // Fall back to local storage below.
    }
  }

  const stored = await getEvidenceImage(photo.imageStorageKey);
  if (stored?.blob) {
    return {
      blob: stored.blob,
      source: 'local' as const,
    };
  }

  return undefined;
}

function makeBundleFileName(mission: Mission) {
  const missionName = safeFilePart(mission.name, 'swim');
  const date = safeTimestamp(new Date().toISOString()).slice(0, 10);

  return `${missionName}-wowsa-evidence-${date}.zip`;
}

function makeManifest(
  mission: Mission,
  files: EvidenceFileRecord[],
  missingPhotoNumbers: number[],
) {
  const manifest = JSON.parse(buildWowsaEvidenceManifest(mission));

  return JSON.stringify(
    {
      ...manifest,
      bundle: {
        generatedAt: new Date().toISOString(),
        photoDirectory: 'photos',
        exportedPhotos: files.length,
        missingPhotoNumbers,
        files,
      },
    },
    null,
    2,
  );
}

export async function createWowsaEvidenceBundle(mission: Mission) {
  const photos = [...(mission.wowsaPhotos ?? [])].sort(
    (first, second) => first.number - second.number,
  );
  const zipEntries: ZipFileEntry[] = [];
  const fileRecords: EvidenceFileRecord[] = [];
  const missingPhotoNumbers: number[] = [];
  const usedPaths = new Set<string>();

  for (const photo of photos) {
    const evidence = await getPhotoBlob(photo);
    if (!evidence) {
      missingPhotoNumbers.push(photo.number);
      continue;
    }

    const path = makePhotoPath(photo, evidence.blob, usedPaths);
    zipEntries.push({ name: path, blob: evidence.blob });
    fileRecords.push({
      number: photo.number,
      path,
      originalName: photo.imageName,
      size: evidence.blob.size,
      type: evidence.blob.type || 'application/octet-stream',
      source: evidence.source,
    });
  }

  if (!fileRecords.length) {
    throw new Error('No saved photo files are available yet.');
  }

  zipEntries.unshift({
    name: 'wowsa-evidence-manifest.json',
    blob: new Blob([makeManifest(mission, fileRecords, missingPhotoNumbers)], {
      type: 'application/json',
    }),
  });

  const fileName = makeBundleFileName(mission);
  const blob = await createZip(zipEntries);

  return {
    blob,
    result: {
      fileName,
      totalPhotos: photos.length,
      exportedPhotos: fileRecords.length,
      missingPhotoNumbers,
    } satisfies EvidenceBundleResult,
  };
}

export async function downloadWowsaEvidenceBundle(mission: Mission) {
  const prepared = await prepareWowsaEvidenceBundleDownload(mission);
  const link = document.createElement('a');

  link.href = prepared.href;
  link.download = prepared.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(prepared.revoke, 30_000);

  return prepared.result;
}

export async function prepareWowsaEvidenceBundleDownload(
  mission: Mission,
): Promise<PreparedEvidenceBundleDownload> {
  const { blob, result } = await createWowsaEvidenceBundle(mission);
  const href = URL.createObjectURL(blob);

  return {
    href,
    fileName: result.fileName,
    result,
    revoke: () => URL.revokeObjectURL(href),
  };
}
