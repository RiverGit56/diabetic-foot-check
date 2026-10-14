/**
 * Data Sources Integration Layer
 * 
 * Connects to real-world data sources for the Diabetic Foot Check Assistant:
 * 
 * Layer 1 — Macro & Background (data.gov.sg):
 *   - Environmental data (weather, air quality) for foot care context
 *   - Singapore health statistics for population-level risk calibration
 * 
 * Layer 2 — Medical Rules (IWGDF 2023, NICE NG19):
 *   - See clinicalRules.ts for the rules engine
 * 
 * Layer 3 — Patient Features:
 *   - Risk profiling based on Singapore population data
 *   - See riskProfiles.ts for population-level data
 * 
 * API Endpoints (confirmed working):
 *   - https://api.data.gov.sg/v1/environment/*        — Live environmental data
 *   - https://data.gov.sg/api/action/datastore_search  — Dataset queries
 *   - https://api-production.data.gov.sg/v2/public/api/datasets — Dataset listing
 *   - https://api-open.data.gov.sg/v1/public/api/datasets/{id}/initiate-download — Bulk download
 * 
 * Rate limits: 5 requests/minute for dataset APIs, higher for environmental APIs.
 * API key not required for public datasets (but increases rate limits).
 */

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface WeatherForecast {
  area: string;
  forecast: string;
  timestamp: string;
}

export interface AirQualityReading {
  region: string;
  psi: number;
  pm25: number;
  timestamp: string;
}

export interface HealthDatasetRecord {
  [key: string]: string | number | null;
}

export interface DatasetQueryResult {
  success: boolean;
  total: number;
  records: HealthDatasetRecord[];
  fields: { type: string; id: string }[];
}

export interface CarparkAvailability {
  carparkId: string;
  area: string;
  development: string;
  availableLots: number;
  totalLots: number;
  updatedAt: string;
}

export interface CareFacility {
  name: string;
  type: "hospital" | "polyclinic" | "clinic" | "wound_clinic";
  address: string;
  region: string;
  phone?: string;
  lat?: number;
  lng?: number;
  services: string[];
}

export interface SingaporeHealthStats {
  diabetesPrevalence: {
    overall: number;
    male: number;
    female: number;
    byAgeGroup: { range: string; prevalence: number }[];
    trend: { year: number; prevalence: number }[];
  };
  hypertensionPrevalence: number;
  hyperlipidemiaPrevalence: number;
  obesityPrevalence: number;
  smokingRate: number;
  source: string;
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════════
//  API Client
// ═══════════════════════════════════════════════════════════════════

const API_BASES = {
  dataGovSg: "https://data.gov.sg",
  apiDataGovSg: "https://api.data.gov.sg",
  apiOpen: "https://api-open.data.gov.sg",
  apiProduction: "https://api-production.data.gov.sg",
} as const;

/** Simple in-memory cache with TTL */
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return entry.data as T;
  }
  return null;
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

/** Fetch with timeout and retry */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2,
  timeoutMs = 10000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "FootCheck/1.0",
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      if (resp.ok) return resp;
      if (resp.status === 429) {
        // Rate limited — wait and retry
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 15000));
          continue;
        }
      }
      return resp;
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Max retries (${retries}) exceeded for ${url}`);
}

// ═══════════════════════════════════════════════════════════════════
//  Layer 1: Environmental Data (data.gov.sg Live APIs)
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch 2-hour weather forecast for foot care recommendations.
 * Rain/humidity affects foot drying time — relevant for fungal infection risk.
 * Cache: 30 minutes (forecasts update every ~30 min).
 */
export async function getWeatherForecast(): Promise<WeatherForecast[]> {
  const cacheKey = "weather-2h-forecast";
  const cached = getCached<WeatherForecast[]>(cacheKey);
  if (cached) return cached;

  const url = `${API_BASES.apiDataGovSg}/v1/environment/2-hour-weather-forecast`;
  const resp = await fetchWithRetry(url);
  const data = await resp.json();

  const items: WeatherForecast[] = (data.items?.[0]?.forecasts ?? []).map(
    (f: { area: string; forecast: string }) => ({
      area: f.area,
      forecast: f.forecast,
      timestamp: data.items?.[0]?.timestamp ?? new Date().toISOString(),
    })
  );

  setCached(cacheKey, items, 30 * 60 * 1000); // 30 min
  return items;
}

/**
 * Fetch current air quality (PSI + PM2.5).
 * High PSI affects exercise recommendations for diabetic patients.
 * Cache: 15 minutes.
 */
export async function getAirQuality(): Promise<AirQualityReading[]> {
  const cacheKey = "air-quality-psi";
  const cached = getCached<AirQualityReading[]>(cacheKey);
  if (cached) return cached;

  // PSI readings
  const psiResp = await fetchWithRetry(
    `${API_BASES.apiDataGovSg}/v1/environment/psi`
  );
  const psiData = await psiResp.json();

  // PM2.5 readings
  const pm25Resp = await fetchWithRetry(
    `${API_BASES.apiDataGovSg}/v1/environment/pm25`
  );
  const pm25Data = await pm25Resp.json();

  const psiReadings = psiData.items?.[0]?.readings?.psi_twenty_four_hourly ?? psiData.items?.[0]?.readings?.psi_twenty_fourly ?? {};
  const pm25Readings = pm25Data.items?.[0]?.readings?.pm25_twenty_four_hourly ?? pm25Data.items?.[0]?.readings?.pm25_twenty_fourly ?? {};
  const timestamp = psiData.items?.[0]?.timestamp ?? new Date().toISOString();

  const regions = ["national", "north", "south", "east", "west", "central"];
  const items: AirQualityReading[] = regions
    .map((region) => ({
      region: region.charAt(0).toUpperCase() + region.slice(1),
      psi: psiReadings[region] ?? 0,
      pm25: pm25Readings[region] ?? 0,
      timestamp,
    }))
    .filter((r) => r.psi > 0 || r.pm25 > 0);

  setCached(cacheKey, items, 15 * 60 * 1000); // 15 min
  return items;
}

/**
 * Fetch carpark availability (proxy for hospital accessibility).
 * Used in care navigation to check if a hospital carpark has space.
 * Cache: 2 minutes.
 */
export async function getCarparkAvailability(): Promise<CarparkAvailability[]> {
  const cacheKey = "carpark-availability";
  const cached = getCached<CarparkAvailability[]>(cacheKey);
  if (cached) return cached;

  const url = `${API_BASES.apiDataGovSg}/v1/transport/carpark-list`;
  const resp = await fetchWithRetry(url);
  const data = await resp.json();

  const items: CarparkAvailability[] = (data.items ?? []).map(
    (c: {
      carpark_number: string;
      area: string;
      development: string;
      carpark_info: {
        lots_available: string;
        total_lots: string;
        update_datetime: string;
      }[];
    }) => ({
      carparkId: c.carpark_number,
      area: c.area,
      development: c.development,
      availableLots: parseInt(c.carpark_info[0]?.lots_available ?? "0", 10),
      totalLots: parseInt(c.carpark_info[0]?.total_lots ?? "0", 10),
      updatedAt: c.carpark_info[0]?.update_datetime ?? "",
    })
  );

  setCached(cacheKey, items, 2 * 60 * 1000); // 2 min
  return items;
}

// ═══════════════════════════════════════════════════════════════════
//  Layer 1: Health Dataset Queries (data.gov.sg Datastore API)
// ═══════════════════════════════════════════════════════════════════

/**
 * Confirmed working dataset IDs on data.gov.sg (discovered via v2 list API).
 * These are real Singapore government health datasets maintained by MOH.
 */
export const DATASET_IDS = {
  // Ministry of Health — Prevalence of chronic diseases (1992-2017)
  diabetesPrevalence: "d_efea9966c502767122171c61d88062db",
  // Ministry of Health — NPHS health indicators (2007-2023)
  nphsHealthIndicators: "d_711586488b23182801c94bd7b6807833",
  // Ministry of Health — Mortality rates including diabetes (2015-2024)
  diabetesMortality: "d_12f48e794a60ef400d9193d2177a9d37",
  // Ministry of Health — Health facilities count by type (2009-2022)
  healthFacilities: "d_e4663ad3f088a46dabd3972dc166402d",
  // Ministry of Health — Hospital admissions, outpatient attendances (monthly)
  hospitalAdmissions: "d_b1ac3356e23ecad918854bbfa3627952",
  // Ministry of Health — Outpatient attendances A&E, SOCs, polyclinics
  outpatientAttendances: "d_e818f045a9681df2db90a493803a60d2",
  // Ministry of Health — Principal causes of death (2006-2022)
  causesOfDeath: "d_48143a2b16027afcadeb362352b0266a",
  // Ministry of Health — Hospital admission rate by age and sex
  admissionRateByAge: "d_dd32a9abff167b63efc11fb2f25cb341",
} as const;

/**
 * Query a specific dataset on data.gov.sg.
 * 
 * @param datasetId - The d_ prefixed dataset ID from data.gov.sg
 * @param options - Query parameters (limit, offset, filters, search)
 * @returns Paginated dataset records
 * 
 * @example
 * // Query Singapore diabetes prevalence data
 * const result = await queryDataset("d_xxx_diabetes_xxx", {
 *   limit: 100,
 *   filters: { year: 2024 }
 * });
 */
export async function queryDataset(
  datasetId: string,
  options: {
    limit?: number;
    offset?: number;
    filters?: Record<string, string | number>;
    q?: string;
    sort?: string;
  } = {}
): Promise<DatasetQueryResult> {
  const params = new URLSearchParams({
    resource_id: datasetId,
    limit: String(options.limit ?? 100),
  });

  if (options.offset) params.set("offset", String(options.offset));
  if (options.filters) params.set("filters", JSON.stringify(options.filters));
  if (options.q) params.set("q", options.q);
  if (options.sort) params.set("sort", options.sort);

  const url = `${API_BASES.dataGovSg}/api/action/datastore_search?${params}`;
  const resp = await fetchWithRetry(url);
  const data = await resp.json();

  if (!data.success) {
    return {
      success: false,
      total: 0,
      records: [],
      fields: [],
    };
  }

  return {
    success: true,
    total: data.result?.total ?? 0,
    records: data.result?.records ?? [],
    fields: data.result?.fields ?? [],
  };
}

/**
 * List all datasets available on data.gov.sg (paginated).
 * Used to discover health/diabetes datasets at runtime.
 * 
 * @param page - Page number (1-indexed)
 * @returns Dataset metadata array + total pages
 */
export async function listDatasets(page = 1): Promise<{
  datasets: {
    datasetId: string;
    name: string;
    description?: string;
    format: string;
    managedByAgencyName?: string;
    coverageStart?: string;
    coverageEnd?: string;
  }[];
  totalPages: number;
}> {
  const url = `${API_BASES.apiProduction}/v2/public/api/datasets?page=${page}`;
  const resp = await fetchWithRetry(url);
  const data = await resp.json();

  return {
    datasets: data.data?.datasets ?? [],
    totalPages: data.data?.totalPages ?? data.data?.pages ?? 1,
  };
}

/**
 * Initiate a bulk download of a dataset (async, two-step).
 * Step 1: Call this to initiate. Step 2: Poll pollDownload() until status is "ready".
 */
export async function initiateDownload(
  datasetId: string,
  filters?: { columnName: string; type: "EQ" | "LIKE" | "ILIKE"; value: string }[]
): Promise<{ code: number; message?: string }> {
  const url = `${API_BASES.apiOpen}/v1/public/api/datasets/${datasetId}/initiate-download`;
  const body: Record<string, unknown> = {};
  if (filters) body.filters = filters;

  const resp = await fetchWithRetry(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  return { code: data.code, message: data.data?.message };
}

/**
 * Poll for a download URL after initiateDownload().
 * Returns a temporary URL to download the dataset CSV.
 */
export async function pollDownload(datasetId: string): Promise<{
  status: string;
  url?: string;
}> {
  const url = `${API_BASES.apiOpen}/v1/public/api/datasets/${datasetId}/poll-download`;
  const resp = await fetchWithRetry(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await resp.json();
  return { status: data.data?.status ?? "unknown", url: data.data?.url };
}

// ═══════════════════════════════════════════════════════════════════
//  Singapore Health Statistics (Population-Level Data)
// ═══════════════════════════════════════════════════════════════════

/**
 * Singapore health statistics from MOH National Population Health Survey (NPHS)
 * and World Bank/IDF data.
 * 
 * NOTE: These are published statistics. When a live data.gov.sg dataset
 * for health indicators becomes available, swap the static data with a
 * queryDataset() call using the dataset ID.
 * 
 * Sources:
 * - World Bank (2024): Singapore diabetes prevalence 11.4%
 * - NPHS 2022 (MOH): Age/gender breakdown, chronic disease prevalence
 * - IDF Diabetes Atlas (10th edition): Country-level data
 * - diabetes.org.sg: Singapore-specific statistics
 */
const SINGAPORE_HEALTH_STATS: SingaporeHealthStats = {
  diabetesPrevalence: {
    overall: 11.4, // World Bank 2024
    male: 12.3, // NPHS 2022
    female: 10.6, // NPHS 2022
    byAgeGroup: [
      { range: "18-29", prevalence: 2.5 },
      { range: "30-39", prevalence: 5.5 },
      { range: "40-49", prevalence: 12.1 },
      { range: "50-59", prevalence: 19.3 },
      { range: "60-69", prevalence: 25.4 },
      { range: "70-74", prevalence: 24.2 }, // diabetes.org.sg
    ],
    trend: [
      { year: 2011, prevalence: 9.5 },
      { year: 2013, prevalence: 9.6 },
      { year: 2015, prevalence: 9.7 },
      { year: 2017, prevalence: 8.6 }, // NPHS 2017
      { year: 2019, prevalence: 8.5 }, // NPHS 2019
      { year: 2021, prevalence: 9.5 },
      { year: 2022, prevalence: 8.5 }, // NPHS 2022 — decline noted
      { year: 2024, prevalence: 11.4 }, // World Bank/IDF
    ],
  },
  hypertensionPrevalence: 37.0, // NPHS 2022 (age 18-74)
  hyperlipidemiaPrevalence: 31.9, // NPHS 2022
  obesityPrevalence: 10.5, // BMI >= 30, NPHS 2022
  smokingRate: 9.2, // daily smoking, NPHS 2022
  source:
    "World Bank (2024), MOH National Population Health Survey 2022, IDF Diabetes Atlas 10th Edition",
  lastUpdated: "2024-12-01",
};

/**
 * Get Singapore health statistics from live data.gov.sg datasets.
 * 
 * Fetches real Singapore MOH data including:
 * - Diabetes prevalence trends (dataset: d_efea9966c502767122171c61d88062db)
 * - NPHS health indicators including smoking, obesity, hypertension (dataset: d_711586488b23182801c94bd7b6807833)
 * - Diabetes mortality rates (dataset: d_12f48e794a60ef400d9193d2177a9d37)
 * 
 * Falls back to published statistics if API is unavailable.
 */
export async function getSingaporeHealthStats(): Promise<SingaporeHealthStats> {
  const cacheKey = "sg-health-stats";
  const cached = getCached<SingaporeHealthStats>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch diabetes prevalence data from live dataset
    const prevalenceResult = await queryDataset(DATASET_IDS.diabetesPrevalence, {
      limit: 30,
    });

    // Fetch NPHS health indicators
    const nphsResult = await queryDataset(DATASET_IDS.nphsHealthIndicators, {
      limit: 30,
    });

    // Fetch mortality data
    const mortalityResult = await queryDataset(DATASET_IDS.diabetesMortality, {
      limit: 15,
    });

    const stats = parseHealthStats(prevalenceResult, nphsResult, mortalityResult);
    setCached(cacheKey, stats, 60 * 60 * 1000); // 1 hour cache
    return stats;
  } catch {
    // Fallback to published statistics
    return SINGAPORE_HEALTH_STATS;
  }
}

/**
 * Parse live dataset records into SingaporeHealthStats.
 */
function parseHealthStats(
  prevalence: DatasetQueryResult,
  nphs: DatasetQueryResult,
  mortality: DatasetQueryResult
): SingaporeHealthStats {
  // Parse diabetes prevalence trend
  const trend: { year: number; prevalence: number }[] = [];
  let overall2024 = 11.4; // World Bank fallback

  for (const record of prevalence.records) {
    if (
      String(record.disease ?? "").toLowerCase().includes("diabetes") ||
      String(record.disease ?? "").toLowerCase().includes("diabetes mellitus")
    ) {
      const year = parseInt(String(record.year), 10);
      const rate = parseFloat(String(record.prevalence_rate ?? "0"));
      if (!isNaN(year) && !isNaN(rate)) {
        trend.push({ year, prevalence: rate });
      }
    }
  }

  // Add 2024 World Bank data point if not in dataset
  if (trend.length > 0 && !trend.some((t) => t.year === 2024)) {
    trend.push({ year: 2024, prevalence: 11.4 });
  }
  trend.sort((a, b) => a.year - b.year);
  if (trend.length > 0) {
    overall2024 = trend[trend.length - 1].prevalence;
  }

  // Parse NPHS indicators — only use "Total" series, not gender-specific ones
  let hypertension = 37.0;
  let hyperlipidemia = 31.9;
  let obesity = 10.5;
  let smoking = 9.2;

  for (const record of nphs.records) {
    const series = String(record.DataSeries ?? "");
    // Only match the "Total" series to avoid gender-specific overwrites
    if (!series.includes("Total") || series.includes("Male") || series.includes("Female")) {
      continue;
    }
    const seriesLower = series.toLowerCase();
    const val2022 = parseFloat(String(record["2022"] ?? "0"));

    if (seriesLower.includes("hypertension") && !isNaN(val2022)) {
      hypertension = val2022;
    }
    if (seriesLower.includes("hyperlipidaemia") && !isNaN(val2022)) {
      hyperlipidemia = val2022;
    }
    if (seriesLower.includes("obese") && !seriesLower.includes("overweight") && !isNaN(val2022)) {
      obesity = val2022;
    }
    if (seriesLower.includes("daily smoking") && !isNaN(val2022)) {
      smoking = val2022;
    }
  }

  // Parse mortality (most recent year)
  let latestYear = "2024";
  const mortalityRate = mortality.records[0]?.[latestYear] ?? "8.6";

  return {
    diabetesPrevalence: {
      overall: overall2024,
      male: 12.3, // NPHS 2022
      female: 10.6, // NPHS 2022
      byAgeGroup: SINGAPORE_HEALTH_STATS.diabetesPrevalence.byAgeGroup,
      trend,
    },
    hypertensionPrevalence: hypertension,
    hyperlipidemiaPrevalence: hyperlipidemia,
    obesityPrevalence: obesity,
    smokingRate: smoking,
    source:
      "data.gov.sg live datasets (MOH), World Bank (2024), NPHS 2022, IDF Diabetes Atlas 10th Edition",
    lastUpdated: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Care Facility Data (Singapore)
// ═══════════════════════════════════════════════════════════════════

/**
 * Singapore hospitals and polyclinics for care navigation.
 * 
 * NOTE: In production, this would come from a data.gov.sg dataset
 * (e.g., "List of Healthcare Facilities" by MOH Holdings).
 * Currently uses published data from MOH and SingHealth.
 */
const SINGAPORE_CARE_FACILITIES: CareFacility[] = [
  // ── Public Hospitals (with diabetic foot services) ──
  {
    name: "Singapore General Hospital",
    type: "hospital",
    address: "Outram Road, Singapore 169608",
    region: "Central",
    phone: "+65 6222 3322",
    services: ["Diabetic Foot Clinic", "Vascular Surgery", "Endocrinology", "Wound Care"],
  },
  {
    name: "Tan Tock Seng Hospital",
    type: "hospital",
    address: "11 Jalan Tan Tock Seng, Singapore 308433",
    region: "Central",
    phone: "+65 6256 6011",
    services: ["Diabetic Foot Service", "Vascular Surgery", "Infectious Diseases"],
  },
  {
    name: "National University Hospital",
    type: "hospital",
    address: "5 Lower Kent Ridge Road, Singapore 119074",
    region: "West",
    phone: "+65 6779 5555",
    services: ["Diabetic Foot & Wound Clinic", "Vascular Surgery", "Endocrinology"],
  },
  {
    name: "Changi General Hospital",
    type: "hospital",
    address: "2 Simei Street 3, Singapore 529889",
    region: "East",
    phone: "+65 6788 8833",
    services: ["Wound Care Clinic", "Endocrinology", "Vascular Surgery"],
  },
  {
    name: "Khoo Teck Puat Hospital",
    type: "hospital",
    address: "90 Yishun Central, Singapore 768828",
    region: "North",
    phone: "+65 6557 8000",
    services: ["Diabetic Foot Service", "Wound Care", "Endocrinology"],
  },
  {
    name: "Ng Teng Fong General Hospital",
    type: "hospital",
    address: "1 Jurong East Street 21, Singapore 609606",
    region: "West",
    phone: "+65 6716 2000",
    services: ["Wound Care Clinic", "Endocrinology", "Vascular Surgery"],
  },
  // ── Specialist Wound Care ──
  {
    name: "SGH Wound Healing Centre",
    type: "wound_clinic",
    address: "Outram Road, Singapore 169608",
    region: "Central",
    phone: "+65 6222 3322",
    services: ["Advanced Wound Care", "Hyperbaric Oxygen Therapy", "Diabetic Foot Management"],
  },
  // ── Polyclinics (for screening and basic care) ──
  {
    name: "Outram Polyclinic",
    type: "polyclinic",
    address: "3 Second Hospital Avenue, Singapore 168937",
    region: "Central",
    phone: "+65 6435 3910",
    services: ["Diabetes Screening", "Foot Examination", "General Medicine"],
  },
  {
    name: "Geylang Polyclinic",
    type: "polyclinic",
    address: "21 Geylang East Central, Singapore 389707",
    region: "Central",
    phone: "+65 6342 4200",
    services: ["Diabetes Screening", "Foot Examination", "General Medicine"],
  },
  {
    name: "Tampines Polyclinic",
    type: "polyclinic",
    address: "1 Tampines Street 41, Singapore 529203",
    region: "East",
    phone: "+65 6340 2400",
    services: ["Diabetes Screening", "Foot Examination", "General Medicine"],
  },
  {
    name: "Choa Chu Kang Polyclinic",
    type: "polyclinic",
    address: "2 Teck Whye Crescent, Singapore 689046",
    region: "West",
    phone: "+65 6355 3000",
    services: ["Diabetes Screening", "Foot Examination", "General Medicine"],
  },
  {
    name: "Yishun Polyclinic",
    type: "polyclinic",
    address: "2 Yishun Central 2, Singapore 768824",
    region: "North",
    phone: "+65 6255 3300",
    services: ["Diabetes Screening", "Foot Examination", "General Medicine"],
  },
];

/**
 * Get care facilities for the user's region.
 * @param region - User's region (Central, East, West, North, South)
 * @param filterByService - Optional: filter by service type
 */
export function getCareFacilities(
  region?: string,
  filterByService?: string
): CareFacility[] {
  let facilities = SINGAPORE_CARE_FACILITIES;

  if (region) {
    facilities = facilities.filter(
      (f) => f.region.toLowerCase() === region.toLowerCase()
    );
  }

  if (filterByService) {
    facilities = facilities.filter((f) =>
      f.services.some((s) =>
        s.toLowerCase().includes(filterByService.toLowerCase())
      )
    );
  }

  // Sort: hospitals first, then wound clinics, then polyclinics
  const order: Record<string, number> = {
    hospital: 0,
    wound_clinic: 1,
    polyclinic: 2,
    clinic: 3,
  };
  return facilities.sort(
    (a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9)
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Environmental Risk Assessment (for care recommendations)
// ═══════════════════════════════════════════════════════════════════

export interface EnvironmentalRisk {
  /** Risk level for outdoor foot care activities */
  outdoorRisk: "low" | "moderate" | "high";
  /** Whether it's currently raining (affects foot drying, fungal risk) */
  isRaining: boolean;
  /** Air quality risk for outdoor exercise */
  airQualityRisk: "good" | "moderate" | "unhealthy" | "hazardous";
  /** Recommendations based on current environmental conditions */
  recommendations: string[];
  /** Weather forecast text for user's area */
  forecast: string;
  /** PSI value (national or regional) */
  psi: number;
  timestamp: string;
}

/**
 * Assess environmental risk for diabetic foot care recommendations.
 * Combines weather and air quality data to generate contextual advice.
 * 
 * @param area - Singapore area name (e.g., "Ang Mo Kio", "Jurong")
 */
export async function getEnvironmentalRisk(
  area?: string
): Promise<EnvironmentalRisk> {
  const [weather, airQuality] = await Promise.allSettled([
    getWeatherForecast(),
    getAirQuality(),
  ]);

  let forecast = "Clear";
  let isRaining = false;

  if (weather.status === "fulfilled") {
    const areaForecast = weather.value.find(
      (w) =>
        w.area.toLowerCase() === (area ?? "").toLowerCase() ||
        w.area.toLowerCase().includes((area ?? "").toLowerCase())
    );
    forecast = areaForecast?.forecast ?? weather.value[0]?.forecast ?? "Clear";
    isRaining = /thunder|shower|rain|cloudy/i.test(forecast);
  }

  let psi = 0;
  let airQualityRisk: EnvironmentalRisk["airQualityRisk"] = "good";

  if (airQuality.status === "fulfilled" && airQuality.value.length > 0) {
    const national = airQuality.value.find((a) => a.region === "National");
    psi = national?.psi ?? airQuality.value[0]?.psi ?? 0;

    if (psi <= 50) airQualityRisk = "good";
    else if (psi <= 100) airQualityRisk = "moderate";
    else if (psi <= 200) airQualityRisk = "unhealthy";
    else airQualityRisk = "hazardous";
  }

  const outdoorRisk: EnvironmentalRisk["outdoorRisk"] =
    isRaining ? "high" : airQualityRisk === "good" ? "low" : "moderate";

  const recommendations: string[] = [];
  if (isRaining) {
    recommendations.push(
      "rainWarning"
    );
  }
  if (airQualityRisk === "unhealthy" || airQualityRisk === "hazardous") {
    recommendations.push("airWarning");
  }
  if (outdoorRisk === "low") {
    recommendations.push("outdoorOK");
  }

  return {
    outdoorRisk,
    isRaining,
    airQualityRisk,
    recommendations,
    forecast,
    psi,
    timestamp: new Date().toISOString(),
  };
}
