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
      () => reject(new Error('GPS permission denied or unavailable.')),
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
