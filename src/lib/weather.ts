export interface CapturedWeather {
  summary: string;
  airTempF?: number;
  windKts?: number;
  windDirection?: string;
}

const weatherCodeLabels: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  80: 'Light showers',
  81: 'Showers',
  82: 'Heavy showers',
  95: 'Thunderstorm'
};

function compassFromDegrees(degrees?: number) {
  if (!Number.isFinite(degrees)) {
    return undefined;
  }

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round((degrees as number) / 45) % directions.length];
}

export async function getCurrentWeather(lat: number, lon: number): Promise<CapturedWeather> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit', 'kn');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Weather is unavailable right now.');
  }

  const data = (await response.json()) as {
    current?: {
      temperature_2m?: number;
      weather_code?: number;
      wind_speed_10m?: number;
      wind_direction_10m?: number;
    };
  };
  const current = data.current;
  if (!current) {
    throw new Error('Weather response did not include current conditions.');
  }

  const windDirection = compassFromDegrees(current.wind_direction_10m);
  const summary = [
    weatherCodeLabels[current.weather_code ?? -1] ?? 'Current weather',
    current.temperature_2m !== undefined ? `${Math.round(current.temperature_2m)}F air` : undefined,
    current.wind_speed_10m !== undefined
      ? `${Math.round(current.wind_speed_10m)} kt${windDirection ? ` ${windDirection}` : ''}`
      : undefined
  ]
    .filter(Boolean)
    .join(' - ');

  return {
    summary,
    airTempF: current.temperature_2m,
    windKts: current.wind_speed_10m,
    windDirection
  };
}
