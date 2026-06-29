export interface CapturedWaterTemperature {
  waterTempF?: number;
  waterTempC?: number;
  observedAt?: string;
  source: "ndbc" | "mission-fallback";
  sourceDetail?: string;
  confidence?: "high" | "medium" | "low";
  station?: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    distanceNm: number;
  };
  message?: string;
}

export async function getCurrentWaterTemperature(
  lat: number,
  lon: number,
): Promise<CapturedWaterTemperature> {
  const url = new URL("/api/water-temperature", window.location.origin);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("NDBC water temperature is unavailable right now.");
  }

  const data = (await response.json()) as CapturedWaterTemperature & {
    ok?: boolean;
  };
  if (!data.ok || data.waterTempF === undefined) {
    return {
      source: "mission-fallback",
      message:
        data.message ||
        "No recent NDBC water temperature was available nearby.",
    };
  }

  return {
    ...data,
    source: "ndbc",
  };
}

export function formatWaterTemperatureSource(
  water: CapturedWaterTemperature,
  fallbackF: number,
) {
  if (
    water.source === "ndbc" &&
    water.waterTempF !== undefined &&
    water.station
  ) {
    return `NDBC ${Math.round(water.waterTempF)}F from ${water.station.id} (${Math.round(water.station.distanceNm)} nm, ${water.confidence})`;
  }

  return `Using onboard water temp ${Math.round(fallbackF)}F`;
}
