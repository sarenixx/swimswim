export interface DevicePosition {
  lat: number;
  lon: number;
  accuracyM?: number;
  label: string;
}

export function formatGpsLabel(lat: number, lon: number) {
  const latLabel = `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonLabel = `${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latLabel}, ${lonLabel}`;
}

export function parseGpsLabel(value: string): Pick<DevicePosition, 'lat' | 'lon' | 'label'> | undefined {
  const matches = [...value.matchAll(/(-?\d+(?:\.\d+)?)\s*°?\s*([NSEW])?/gi)];
  if (matches.length < 2) {
    return undefined;
  }

  const signed = (match: RegExpMatchArray) => {
    const number = Number(match[1]);
    const hemisphere = match[2]?.toUpperCase();
    return hemisphere === 'S' || hemisphere === 'W' ? -Math.abs(number) : number;
  };

  const lat = signed(matches[0]);
  const lon = signed(matches[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return undefined;
  }

  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return undefined;
  }

  return {
    lat,
    lon,
    label: formatGpsLabel(lat, lon)
  };
}

export function getDevicePosition(): Promise<DevicePosition> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('Geolocation is not available on this device.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        resolve({
          lat,
          lon,
          accuracyM: position.coords.accuracy,
          label: formatGpsLabel(lat, lon)
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('GPS permission was denied. Allow location access in the browser, or enter coordinates manually.'));
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(new Error('GPS timed out. Try again outdoors, or enter coordinates manually.'));
          return;
        }

        reject(new Error('GPS is unavailable on this device. Enter coordinates manually.'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}
