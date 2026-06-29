const NDBC_ACTIVE_STATIONS_URL = "https://www.ndbc.noaa.gov/activestations.xml";
const NDBC_LATEST_OBS_BASE_URL = "https://www.ndbc.noaa.gov/data/latest_obs";
const NDBC_REALTIME_BASE_URL = "https://www.ndbc.noaa.gov/data/realtime2";
const MAX_CANDIDATES = 40;
const LATEST_OBS_BATCH_SIZE = 8;
const MAX_OBSERVATION_AGE_HOURS = 12;

const fallbackStations = [
  { id: "46015", lat: 42.752, lon: -124.839, name: "Port Orford, OR" },
  { id: "46027", lat: 41.85, lon: -124.38, name: "St Georges, CA" },
  { id: "46022", lat: 40.716, lon: -124.54, name: "Eel River, CA" },
  { id: "46014", lat: 39.225, lon: -123.974, name: "Point Arena, CA" },
  { id: "46013", lat: 38.242, lon: -123.301, name: "Bodega Bay, CA" },
  { id: "46012", lat: 37.356, lon: -122.881, name: "Half Moon Bay, CA" },
  { id: "46042", lat: 36.785, lon: -122.469, name: "Monterey Bay, CA" },
  { id: "46053", lat: 34.247, lon: -119.842, name: "East Santa Barbara, CA" },
  { id: "46025", lat: 33.749, lon: -119.053, name: "Santa Monica Basin, CA" },
];

const json = (response, status, payload) => {
  response.status(status).json(payload);
};

const toRad = (value) => (value * Math.PI) / 180;

const distanceNm = (fromLat, fromLon, toLat, toLon) => {
  const earthRadiusNm = 3440.065;
  const deltaLat = toRad(toLat - fromLat);
  const deltaLon = toRad(toLon - fromLon);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) *
      Math.cos(toRad(toLat)) *
      Math.sin(deltaLon / 2) ** 2;
  return earthRadiusNm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fahrenheitFromCelsius = (value) => (value * 9) / 5 + 32;

const roundOne = (value) => Math.round(value * 10) / 10;

const fetchText = async (url, timeoutMs = 6000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "swimswim-observation-log/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`NOAA returned ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const parseAttributes = (value) => {
  const attributes = {};
  for (const match of value.matchAll(/([a-zA-Z0-9_-]+)="([^"]*)"/g)) {
    attributes[match[1]] = match[2];
  }
  return attributes;
};

const parseStations = (xml) => {
  const stations = [];

  for (const match of xml.matchAll(/<station\s+([^>]+?)\/>/g)) {
    const attrs = parseAttributes(match[1]);
    const lat = Number(attrs.lat);
    const lon = Number(attrs.lon);
    const hasUsefulFeed = attrs.met === "y" || attrs.waterquality === "y";

    if (
      !attrs.id ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      !hasUsefulFeed
    ) {
      continue;
    }

    stations.push({
      id: attrs.id,
      lat,
      lon,
      name: attrs.name || attrs.id,
      type: attrs.type,
      met: attrs.met,
      waterquality: attrs.waterquality,
    });
  }

  return stations;
};

const getCandidateStations = async (lat, lon) => {
  try {
    const xml = await fetchText(NDBC_ACTIVE_STATIONS_URL, 8000);
    const stations = parseStations(xml);
    if (stations.length) {
      return stations
        .map((station) => ({
          ...station,
          distanceNm: distanceNm(lat, lon, station.lat, station.lon),
        }))
        .sort((a, b) => a.distanceNm - b.distanceNm)
        .slice(0, MAX_CANDIDATES);
    }
  } catch {
    // Fall back to the known West Coast stations below.
  }

  return fallbackStations
    .map((station) => ({
      ...station,
      distanceNm: distanceNm(lat, lon, station.lat, station.lon),
    }))
    .sort((a, b) => a.distanceNm - b.distanceNm);
};

const parseLatestObsTime = (text) => {
  const match = text.match(/(\d{2})(\d{2})\s+GMT\s+(\d{2})\/(\d{2})\/(\d{2})/);
  if (!match) {
    return undefined;
  }

  const [, hour, minute, month, day, year] = match;
  const fullYear =
    Number(year) >= 70 ? 1900 + Number(year) : 2000 + Number(year);
  const observedAt = new Date(
    Date.UTC(
      fullYear,
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    ),
  );

  return Number.isNaN(observedAt.getTime())
    ? undefined
    : observedAt.toISOString();
};

const parseLatestObsWaterTemp = (text) => {
  const match = text.match(
    /Water Temp:\s*(-?\d+(?:\.\d+)?)\s*[^0-9A-Za-z-]*F/i,
  );
  if (!match) {
    return undefined;
  }

  const waterTempF = Number(match[1]);
  if (!Number.isFinite(waterTempF)) {
    return undefined;
  }

  return {
    waterTempF,
    waterTempC: ((waterTempF - 32) * 5) / 9,
    observedAt: parseLatestObsTime(text),
    sourceDetail: "latest_obs",
  };
};

const parseRealtimeWaterTemp = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const header = lines.find((line) => line.startsWith("#YY"));
  const columns = header?.replace(/^#/, "").trim().split(/\s+/) || [];
  const wtmpIndex = columns.indexOf("WTMP");

  if (wtmpIndex === -1) {
    return undefined;
  }

  for (const line of lines) {
    if (line.startsWith("#")) {
      continue;
    }

    const values = line.split(/\s+/);
    const rawTemp = values[wtmpIndex];
    const tempC = Number(rawTemp);

    if (!Number.isFinite(tempC)) {
      continue;
    }

    const [year, month, day, hour, minute] = values.slice(0, 5).map(Number);
    const observedAt = new Date(Date.UTC(year, month - 1, day, hour, minute));

    return {
      waterTempF: fahrenheitFromCelsius(tempC),
      waterTempC: tempC,
      observedAt: Number.isNaN(observedAt.getTime())
        ? undefined
        : observedAt.toISOString(),
      sourceDetail: "realtime2",
    };
  }

  return undefined;
};

const isRecent = (observedAt) => {
  if (!observedAt) {
    return true;
  }

  const ageMs = Date.now() - new Date(observedAt).getTime();
  return (
    Number.isFinite(ageMs) &&
    ageMs <= MAX_OBSERVATION_AGE_HOURS * 60 * 60 * 1000
  );
};

const getConfidence = (stationDistanceNm) => {
  if (stationDistanceNm <= 25) {
    return "high";
  }

  if (stationDistanceNm <= 75) {
    return "medium";
  }

  return "low";
};

const getStationWaterTemperature = async (station) => {
  try {
    const latestObsText = await fetchText(
      `${NDBC_LATEST_OBS_BASE_URL}/${station.id}.txt`,
      5000,
    );
    const latestObs = parseLatestObsWaterTemp(latestObsText);
    if (latestObs && isRecent(latestObs.observedAt)) {
      return latestObs;
    }
  } catch {
    // Try the realtime2 feed before giving up on this station.
  }

  try {
    const realtimeText = await fetchText(
      `${NDBC_REALTIME_BASE_URL}/${station.id}.txt`,
      5000,
    );
    const realtime = parseRealtimeWaterTemp(realtimeText);
    if (realtime && isRecent(realtime.observedAt)) {
      return realtime;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const findNearestWaterTemperature = async (candidates) => {
  for (
    let index = 0;
    index < candidates.length;
    index += LATEST_OBS_BATCH_SIZE
  ) {
    const batch = candidates.slice(index, index + LATEST_OBS_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (station) => ({
        station,
        observation: await getStationWaterTemperature(station),
      })),
    );
    const usable = results
      .filter((result) => result.observation)
      .sort((a, b) => a.station.distanceNm - b.station.distanceNm)[0];

    if (usable) {
      return usable;
    }
  }

  return undefined;
};

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "Method not allowed." });
  }

  const lat = Number(request.query.lat);
  const lon = Number(request.query.lon);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    return json(response, 400, {
      error: "Valid lat and lon query parameters are required.",
    });
  }

  try {
    const candidates = await getCandidateStations(lat, lon);
    const nearest = await findNearestWaterTemperature(candidates);

    if (!nearest?.observation) {
      return json(response, 200, {
        ok: false,
        source: "mission-fallback",
        message: "No recent NDBC water temperature was available nearby.",
        checkedStationCount: candidates.length,
      });
    }

    const { station, observation } = nearest;

    return json(response, 200, {
      ok: true,
      source: "ndbc",
      sourceDetail: observation.sourceDetail,
      waterTempF: roundOne(observation.waterTempF),
      waterTempC: roundOne(observation.waterTempC),
      observedAt: observation.observedAt,
      confidence: getConfidence(station.distanceNm),
      station: {
        id: station.id,
        name: station.name,
        lat: station.lat,
        lon: station.lon,
        distanceNm: roundOne(station.distanceNm),
      },
    });
  } catch (error) {
    return json(response, 200, {
      ok: false,
      source: "mission-fallback",
      message:
        error instanceof Error
          ? error.message
          : "NDBC water temperature lookup failed.",
    });
  }
}
